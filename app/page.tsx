import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";
import type { ShelfStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const shelfAccents: Record<ShelfStatus, string> = {
  READING: "#c8923a",
  WANT_TO_READ: "#6b8cba",
  FINISHED: "#6baa8e",
  DNF: "#a87878",
};

function progressLabel(
  currentPage: number,
  pageCount: number | null,
  currentPercent: number | null,
) {
  if (pageCount) {
    return `${currentPage}/${pageCount} pages`;
  }
  if (currentPercent !== null) {
    return `${currentPercent}%`;
  }
  return currentPage > 0 ? `${currentPage} pages` : null;
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
          const accentColor = shelfAccents[status];

          return (
            <section
              className="min-h-64 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)]"
              key={status}
              style={{ borderTop: `3px solid ${accentColor}` }}
            >
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h2
                  className="text-sm font-semibold"
                  style={{ color: accentColor }}
                >
                  {shelfLabels[status]}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {shelfEntries.length}{" "}
                  {shelfEntries.length === 1 ? "book" : "books"}
                </p>
              </div>
              <div className="space-y-3 p-3">
                {shelfEntries.map((entry) => {
                  const progress: number | null =
                    entry.currentPercent ??
                    (entry.book.pageCount && entry.currentPage > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (entry.currentPage / entry.book.pageCount) * 100,
                          ),
                        )
                      : null);
                  const label = progressLabel(
                    entry.currentPage,
                    entry.book.pageCount,
                    entry.currentPercent,
                  );

                  return (
                    <Link
                      className="grid min-h-20 grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-raised)] p-2 transition hover:border-[var(--accent)]"
                      href={`/books/${entry.book.id}`}
                      key={entry.id}
                    >
                      <div className="h-16 overflow-hidden rounded-sm bg-[var(--line)]">
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
                        {label ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {label}
                          </p>
                        ) : null}
                        {progress !== null ? (
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${progress}%`,
                                background: accentColor,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
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
