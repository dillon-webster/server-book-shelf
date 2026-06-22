import { NextResponse } from "next/server";
import { generateSpine } from "@/lib/spine";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookId = parseInt(id, 10);

  if (isNaN(bookId)) {
    return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
  }

  // Clear existing spine so generateSpine won't skip it
  await prisma.book.update({ where: { id: bookId }, data: { spineImageData: null } });

  await generateSpine(bookId);

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { spineImageData: true },
  });

  return NextResponse.json({ success: !!book?.spineImageData });
}
