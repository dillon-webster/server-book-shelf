import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readEpubFile, saveEpubFile } from "@/lib/epub-storage";

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
  const filename = await saveEpubFile({ bookId, bytes: Buffer.from(bytes) });

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

  const buffer = await readEpubFile(book.epubPath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `inline; filename="${book.epubPath}"`,
    },
  });
}
