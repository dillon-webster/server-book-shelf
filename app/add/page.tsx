import { addBook } from "@/app/actions/books";
import { searchOpenLibrary } from "@/lib/open-library";
import { shelfLabels, shelfOrder } from "@/lib/shelves";

export const dynamic = "force-dynamic";

export default async function AddBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await searchOpenLibrary(query).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">Add Book</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search Open Library and add a result to your shelves.
        </p>
      </div>

      <form action="/add" className="flex max-w-2xl gap-2">
        <input
          aria-label="Search books"
          className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
          defaultValue={query}
          name="q"
          placeholder="Title, author, or ISBN"
          type="search"
        />
        <button className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]">
          Search
        </button>
      </form>

      <div className="grid gap-3">
        {results.map((book) => (
          <article
            className="grid gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[72px_minmax(0,1fr)]"
            key={book.externalId}
          >
            <div className="h-28 overflow-hidden rounded-sm bg-[var(--line)]">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={book.coverUrl}
                />
              ) : null}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold">
                  {book.title}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  {book.author ?? "Unknown author"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {book.pageCount
                    ? `${book.pageCount} pages`
                    : "Page count unknown"}
                </p>
              </div>
              <form action={addBook} className="flex flex-wrap gap-2">
                <input name="externalId" type="hidden" value={book.externalId} />
                <input name="title" type="hidden" value={book.title} />
                <input name="author" type="hidden" value={book.author ?? ""} />
                <input
                  name="coverUrl"
                  type="hidden"
                  value={book.coverUrl ?? ""}
                />
                <input
                  name="pageCount"
                  type="hidden"
                  value={book.pageCount ?? ""}
                />
                <select
                  aria-label={`Shelf for ${book.title}`}
                  className="max-w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  name="status"
                >
                  {shelfOrder.map((status) => (
                    <option key={status} value={status}>
                      {shelfLabels[status]}
                    </option>
                  ))}
                </select>
                <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#12100e] hover:bg-[var(--accent-strong)]">
                  Add
                </button>
              </form>
            </div>
          </article>
        ))}
        {query && results.length === 0 ? (
          <p className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            No results found, or Open Library is unavailable.
          </p>
        ) : null}
      </div>
    </div>
  );
}
