import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("epub");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.name.endsWith(".epub")) return NextResponse.json({ error: "Must be an EPUB file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const filename = `book-${bookId}.epub`;
  await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(bytes));

  await prisma.book.update({ where: { id: bookId }, data: { epubPath: filename } });

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isFinite(bookId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { epubPath: true } });
  if (!book?.epubPath) return NextResponse.json({ error: "No epub" }, { status: 404 });

  const filePath = path.join(UPLOADS_DIR, book.epubPath);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `inline; filename="${book.epubPath}"`,
    },
  });
}
