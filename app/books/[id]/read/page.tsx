import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EpubReader from "@/app/components/EpubReader";

export const dynamic = "force-dynamic";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const bookId = Number(id);
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { title: true, epubPath: true },
  });

  if (!book) notFound();

  if (!book.epubPath) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
        <p>No EPUB uploaded for this book.</p>
        <Link href={`/books/${bookId}`} style={{ color: 'var(--accent)', marginTop: '12px', display: 'inline-block' }}>
          ← Back
        </Link>
      </div>
    );
  }

  return <EpubReader bookId={bookId} backHref={`/books/${bookId}`} />;
}
