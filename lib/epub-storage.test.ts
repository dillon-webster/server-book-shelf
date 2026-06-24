import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { saveEpubFile } from "./epub-storage";

test("creates the uploads directory before saving an epub", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bookshelf-epub-"));
  const uploadsDir = path.join(root, "missing-uploads");

  try {
    const filename = await saveEpubFile({
      bookId: 42,
      bytes: Buffer.from("epub bytes"),
      uploadsDir,
    });

    assert.equal(filename, "book-42.epub");
    assert.equal(await readFile(path.join(uploadsDir, filename), "utf8"), "epub bytes");
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
