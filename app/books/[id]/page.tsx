import { notFound } from "next/navigation";
import {
  addTenPages,
  deleteBook,
  deleteProgressLog,
  resetBookProgress,
  updateShelfEntry,
} from "@/app/actions/books";
import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";
import EpubUpload from "@/app/components/EpubUpload";

export const dynamic = "force-dynamic";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const bookId = Number(id);

  const entry = await prisma.shelfEntry.findUnique({
    where: { bookId },
    include: {
      book: { select: { id: true, title: true, author: true, coverUrl: true, pageCount: true, epubPath: true } },
      progressLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!entry) {
    notFound();
  }

  const updateAction = updateShelfEntry.bind(null, bookId);
  const addTenAction = addTenPages.bind(null, bookId);
  const deleteAction = deleteBook.bind(null, bookId);
  const resetProgressAction = resetBookProgress.bind(null, bookId);
  const progressPercent: number | null =
    entry.currentPercent ??
    (entry.book.pageCount && entry.currentPage > 0
      ? Math.min(100, Math.round((entry.currentPage / entry.book.pageCount) * 100))
      : null);

  const progressText = entry.book.pageCount
    ? `${entry.currentPage}/${entry.book.pageCount} pages`
    : entry.currentPercent !== null
      ? `${entry.currentPercent}%`
      : `${entry.currentPage} pages`;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)]">
          <div className="aspect-[2/3] bg-[var(--line)]">
            {entry.book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={entry.book.coverUrl}
              />
            ) : null}
          </div>
          {progressPercent !== null ? (
            <div className="px-3 py-2">
              <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                <span>{progressText}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <form action={addTenAction}>
          <button className="w-full rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]">
            +10 pages
          </button>
        </form>
        <EpubUpload bookId={bookId} hasEpub={!!entry.book.epubPath} />

        <form action={resetProgressAction}>
          <button className="w-full rounded-md border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)] hover:border-red-900 hover:bg-red-950 hover:text-red-300">
            Clear progress
          </button>
        </form>

        <form action={deleteAction}>
          <button className="w-full rounded-md border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950">
            Remove book
          </button>
        </form>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold leading-tight">
            {entry.book.title}
          </h1>
          <p className="text-[var(--muted)]">
            {entry.book.author ?? "Unknown author"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{progressText}</p>
        </div>

        <form
          action={updateAction}
          className="grid gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Shelf
              <select
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.status}
                name="status"
              >
                {shelfOrder.map((status) => (
                  <option key={status} value={status}>
                    {shelfLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Progress % <span className="font-normal text-[var(--muted)]">(Kindle)</span>
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.currentPercent ?? ""}
                max="100"
                min="0"
                name="currentPercent"
                placeholder="e.g. 42"
                step="0.1"
                type="number"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Current page
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.currentPage || ""}
                min="0"
                name="currentPage"
                placeholder="e.g. 124"
                type="number"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Started
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={dateInputValue(entry.startedAt)}
                name="startedAt"
                type="date"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Finished
              <input
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={dateInputValue(entry.finishedAt)}
                name="finishedAt"
                type="date"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Rating
              <select
                className="rounded-md border border-[var(--line)] px-3 py-2"
                defaultValue={entry.rating ?? ""}
                name="rating"
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Session notes <span className="font-normal text-[var(--muted)]">(saved with this session, then cleared)</span>
            <textarea
              className="min-h-32 rounded-md border border-[var(--line)] px-3 py-2"
              defaultValue=""
              name="notes"
              placeholder="What did you read? What stood out?"
            />
          </label>

          <button className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]">
            Save
          </button>
        </form>

        <section className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Reading Journal</h2>
          <div className="mt-3 space-y-4">
            {entry.progressLogs.map((log) => {
              const deleteAction = deleteProgressLog.bind(null, bookId, log.id);
              const position = log.currentPercent !== null
                ? `${log.currentPercent}%`
                : `page ${log.currentPage}`;

              return (
                <div
                  className="border-l-2 border-[var(--line)] pl-3 text-sm"
                  key={log.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--muted)]">
                      {log.createdAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {position}
                    </span>
                    <form action={deleteAction}>
                      <button
                        className="text-xs text-[var(--muted)] hover:text-red-400"
                        type="submit"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                  {log.notes ? (
                    <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">
                      {log.notes}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {entry.progressLogs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No sessions logged yet.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
