import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOADS_DIR = process.env.EPUB_UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function saveEpubFile({
  bookId,
  bytes,
  uploadsDir = UPLOADS_DIR,
}: {
  bookId: number;
  bytes: Buffer;
  uploadsDir?: string;
}): Promise<string> {
  await mkdir(uploadsDir, { recursive: true });

  const filename = `book-${bookId}.epub`;
  await writeFile(path.join(uploadsDir, filename), bytes);

  return filename;
}

export async function readEpubFile(filename: string): Promise<Buffer> {
  return readFile(path.join(UPLOADS_DIR, filename));
}
