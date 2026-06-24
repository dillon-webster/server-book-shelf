import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deriveReadingProgress } from "@/lib/progress";

type ReadingProgressPayload = {
  epubCfi?: unknown;
  percentage?: unknown;
};

function parsePayload(payload: ReadingProgressPayload): {
  epubCfi: string;
  percentage: number;
} | null {
  if (typeof payload.epubCfi !== "string" || payload.epubCfi.trim() === "") {
    return null;
  }

  if (typeof payload.percentage !== "number" || !Number.isFinite(payload.percentage)) {
    return null;
  }

  return {
    epubCfi: payload.epubCfi,
    percentage: payload.percentage,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = parsePayload(await req.json());
  if (!parsed) {
    return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
  }

  const entry = await prisma.shelfEntry.findUnique({
    where: { bookId },
    include: { book: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { currentPage, currentPercent } = deriveReadingProgress(
    parsed.percentage,
    entry.book.pageCount,
  );
  const now = new Date();

  await prisma.shelfEntry.update({
    where: { id: entry.id },
    data: {
      currentPage,
      currentPercent,
      epubCfi: parsed.epubCfi,
      status: entry.status === "WANT_TO_READ" ? "READING" : entry.status,
      startedAt:
        entry.status === "WANT_TO_READ" && !entry.startedAt
          ? now
          : entry.startedAt,
    },
  });

  return NextResponse.json({ ok: true, currentPage, currentPercent });
}
