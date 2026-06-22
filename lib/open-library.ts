export type BookSearchResult = {
  externalId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pageCount: number | null;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDoc[];
};

export function normalizeOpenLibrarySearch(
  payload: OpenLibrarySearchResponse,
): BookSearchResult[] {
  return (payload.docs ?? [])
    .filter((doc) => doc.key && doc.title)
    .slice(0, 12)
    .map((doc) => {
      const externalId = doc.key?.split("/").pop() ?? doc.key ?? "";

      return {
        externalId,
        title: doc.title ?? "Untitled",
        author: doc.author_name?.[0] ?? null,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null,
        pageCount: doc.number_of_pages_median ?? null,
      };
    });
}

export async function searchOpenLibrary(
  query: string,
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    fields: "key,title,author_name,cover_i,number_of_pages_median",
    limit: "12",
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Open Library search failed");
  }

  return normalizeOpenLibrarySearch(await response.json());
}
