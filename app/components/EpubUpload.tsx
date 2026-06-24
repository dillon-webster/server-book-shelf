'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

export default function EpubUpload({ bookId, hasEpub }: { bookId: number; hasEpub: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(hasEpub);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.epub')) return;
    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('epub', file);
      const res = await fetch(`/api/books/${bookId}/epub`, { method: 'POST', body: fd });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Upload failed');
      }

      setUploaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {uploaded && (
        <Link
          href={`/books/${bookId}/read`}
          className="block w-full rounded-md bg-[var(--accent)] px-4 py-2 text-center font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]"
        >
          Read
        </Link>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-md border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : uploaded ? 'Replace EPUB' : 'Upload EPUB'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
