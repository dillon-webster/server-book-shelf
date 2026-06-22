"use server";

import type { ShelfStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clampCurrentPage, deriveStatusDates } from "@/lib/progress";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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

  revalidatePath("/");
  redirect(`/books/${book.id}`);
}

export async function updateShelfEntry(bookId: number, formData: FormData) {
  const entry = await prisma.shelfEntry.findUniqueOrThrow({
    where: { bookId },
    include: { book: true },
  });
  const status = parseStatus(formData.get("status"));
  const currentPage = clampCurrentPage(
    parseOptionalInt(formData.get("currentPage")) ?? 0,
    entry.book.pageCount,
  );
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
        startedAt: dates.startedAt,
        finishedAt: dates.finishedAt,
        rating,
        notes,
      },
    }),
    prisma.progressLog.create({
      data: { shelfEntryId: entry.id, currentPage },
    }),
  ]);

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
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
