"use server";

import type { ShelfStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateSpine } from "@/lib/spine";
import { clampCurrentPage, deriveStatusDates } from "@/lib/progress";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalFloat(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveProgress(
  rawPage: number | null,
  rawPercent: number | null,
  pageCount: number | null,
): { currentPage: number; currentPercent: number | null } {
  if (rawPercent !== null) {
    const percent = Math.min(100, Math.max(0, rawPercent));
    const page = pageCount ? Math.round((percent / 100) * pageCount) : 0;
    return { currentPage: page, currentPercent: percent };
  }

  const page = rawPage ?? 0;
  const percent = pageCount && page > 0 ? Math.round((page / pageCount) * 100) : null;
  return { currentPage: page, currentPercent: percent };
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return new Date(`${value}T12:00:00.000Z`);
}

function parseStatus(value: FormDataEntryValue | null): ShelfStatus {
  if (
    value === "READING" ||
    value === "WANT_TO_READ" ||
    value === "FINISHED" ||
    value === "DNF"
  ) {
    return value;
  }

  return "WANT_TO_READ";
}

function deriveShelfDates({
  status,
  previousStartedAt,
  previousFinishedAt,
  now,
}: {
  status: ShelfStatus;
  previousStartedAt: Date | null;
  previousFinishedAt: Date | null;
  now: Date;
}): { startedAt: Date | null; finishedAt: Date | null } {
  const dates = deriveStatusDates({
    nextStatus: status,
    previousStartedAt,
    previousFinishedAt,
    now,
  });

  if (status !== "FINISHED") {
    return { ...dates, finishedAt: null };
  }

  return dates;
}

function getOptionalDateField(
  formData: FormData,
  name: string,
  fallback: Date | null,
): Date | null {
  if (!formData.has(name)) {
    return fallback;
  }

  return parseOptionalDate(formData.get(name));
}

function hasBlankDateField(formData: FormData, name: string): boolean {
  const value = formData.get(name);

  return typeof value === "string" && value.trim() === "";
}

export async function addBook(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const externalId = String(formData.get("externalId") ?? "").trim();

  if (!title || !externalId) {
    throw new Error("A title and external ID are required.");
  }

  const author = String(formData.get("author") ?? "").trim() || null;
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;
  const pageCount = parseOptionalInt(formData.get("pageCount"));
  const status = parseStatus(formData.get("status"));
  const now = new Date();

  const book = await prisma.$transaction(async (tx) => {
    const book = await tx.book.upsert({
      where: { externalId },
      update: { title, author, coverUrl, pageCount },
      create: { title, author, coverUrl, pageCount, externalId },
    });

    const existingEntry = await tx.shelfEntry.findUnique({
      where: { bookId: book.id },
      select: { startedAt: true, finishedAt: true },
    });
    const dates = deriveShelfDates({
      status,
      previousStartedAt: existingEntry?.startedAt ?? null,
      previousFinishedAt: existingEntry?.finishedAt ?? null,
      now,
    });

    await tx.shelfEntry.upsert({
      where: { bookId: book.id },
      update: {
        status,
        startedAt: dates.startedAt,
        finishedAt: dates.finishedAt,
      },
      create: {
        bookId: book.id,
        status,
        startedAt: dates.startedAt,
        finishedAt: dates.finishedAt,
      },
    });

    return book;
  });

  after(() => generateSpine(book.id));

  revalidatePath("/");
  redirect(status === "WANT_TO_READ" ? "/" : `/books/${book.id}`);
}

export async function updateShelfEntry(bookId: number, formData: FormData) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({
    where: { bookId },
    include: { book: true },
  });
  const status = parseStatus(formData.get("status"));
  const rawPage = parseOptionalInt(formData.get("currentPage"));
  const rawPercent = parseOptionalFloat(formData.get("currentPercent"));
  const { currentPage: resolvedPage, currentPercent } = resolveProgress(
    rawPage,
    rawPercent,
    entry.book.pageCount,
  );
  const currentPage = clampCurrentPage(resolvedPage, entry.book.pageCount);
  const hasBlankStartedAt = hasBlankDateField(formData, "startedAt");
  const hasBlankFinishedAt = hasBlankDateField(formData, "finishedAt");
  const dates = deriveShelfDates({
    status,
    previousStartedAt: getOptionalDateField(
      formData,
      "startedAt",
      entry.startedAt,
    ),
    previousFinishedAt: getOptionalDateField(
      formData,
      "finishedAt",
      entry.finishedAt,
    ),
    now: new Date(),
  });
  const rating = parseOptionalInt(formData.get("rating"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.$transaction([
    prisma.shelfEntry.update({
      where: { id: entry.id },
      data: {
        status,
        currentPage,
        currentPercent,
        startedAt: hasBlankStartedAt ? null : dates.startedAt,
        finishedAt: hasBlankFinishedAt ? null : dates.finishedAt,
        rating,
        notes: null,
      },
    }),
    prisma.progressLog.create({
      data: { shelfEntryId: entry.id, currentPage, currentPercent, notes: notes || null },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
}

export async function deleteBook(bookId: number) {
  await prisma.book.delete({ where: { id: bookId } });
  revalidatePath("/");
  redirect("/");
}

export async function deleteProgressLog(bookId: number, logId: number) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({ where: { bookId } });
  await prisma.progressLog.deleteMany({
    where: { id: logId, shelfEntryId: entry.id },
  });

  revalidatePath(`/books/${bookId}`);
}

export async function resetBookProgress(bookId: number) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({ where: { bookId } });

  await prisma.$transaction([
    prisma.progressLog.deleteMany({
      where: { shelfEntryId: entry.id },
    }),
    prisma.shelfEntry.update({
      where: { id: entry.id },
      data: {
        currentPage: 0,
        currentPercent: null,
        epubCfi: null,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/read`);
}

export async function addTenPages(bookId: number) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({
    where: { bookId },
    include: { book: true },
  });
  const currentPage = clampCurrentPage(entry.currentPage + 10, entry.book.pageCount);

  await prisma.$transaction([
    prisma.shelfEntry.update({
      where: { id: entry.id },
      data: { currentPage },
    }),
    prisma.progressLog.create({
      data: { shelfEntryId: entry.id, currentPage },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
}
