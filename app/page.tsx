import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";

export const dynamic = "force-dynamic";

function progressLabel(currentPage: number, pageCount: number | null) {
  if (!pageCount) {
    return `${currentPage} pages`;
  }

  return `${currentPage}/${pageCount} pages`;
}

export default async function Home() {
  const entries = await prisma.shelfEntry.findMany({
    include: { book: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const entriesByStatus = new Map(
    shelfOrder.map((status) => [
      status,
      entries.filter((entry) => entry.status === status),
    ]),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight">
            Reading Tracker
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Manual shelves and progress for your books.
          </p>
        </div>
        <div className="text-sm text-[var(--muted)]">
          {entries.length} {entries.length === 1 ? "book" : "books"} tracked
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {shelfOrder.map((status) => {
          const shelfEntries = entriesByStatus.get(status) ?? [];

          return (
            <section
              className="min-h-64 rounded-md border border-[var(--line)] bg-[var(--surface)]"
              key={status}
            >
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="font-semibold">{shelfLabels[status]}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {shelfEntries.length}{" "}
                  {shelfEntries.length === 1 ? "book" : "books"}
                </p>
              </div>
              <div className="space-y-3 p-3">
                {shelfEntries.map((entry) => (
                  <Link
                    className="grid min-h-20 grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--line)] p-2 transition hover:border-[var(--accent)]"
                    href={`/books/${entry.book.id}`}
                    key={entry.id}
                  >
                    <div className="h-16 overflow-hidden rounded-sm bg-slate-200">
                      {entry.book.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={entry.book.coverUrl}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {entry.book.title}
                      </h3>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {entry.book.author ?? "Unknown author"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {progressLabel(
                          entry.currentPage,
                          entry.book.pageCount,
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
                {shelfEntries.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                    No books yet.
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
