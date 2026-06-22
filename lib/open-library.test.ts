import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpenLibrarySearch, searchOpenLibrary } from "./open-library";

test("normalizes Open Library docs into app search results", () => {
  const results = normalizeOpenLibrarySearch({
    docs: [
      {
        key: "/works/OL82563W",
        title: "The Left Hand of Darkness",
        author_name: ["Ursula K. Le Guin"],
        cover_i: 8739161,
        number_of_pages_median: 304,
      },
    ],
  });

  assert.deepEqual(results, [
    {
      externalId: "OL82563W",
      title: "The Left Hand of Darkness",
      author: "Ursula K. Le Guin",
      coverUrl: "https://covers.openlibrary.org/b/id/8739161-L.jpg",
      pageCount: 304,
    },
  ]);
});

test("keeps partial Open Library records usable", () => {
  const results = normalizeOpenLibrarySearch({
    docs: [{ key: "/works/OL1W", title: "Untitled" }],
  });

  assert.deepEqual(results, [
    {
      externalId: "OL1W",
      title: "Untitled",
      author: null,
      coverUrl: null,
      pageCount: null,
    },
  ]);
});

test("passes an abort signal when searching Open Library", async (t) => {
  let requestUrl = "";
  let requestInit: (RequestInit & { next?: { revalidate?: number } }) | undefined;

  t.mock.method(globalThis, "fetch", async (url, init) => {
    requestUrl = String(url);
    requestInit = init;

    return Response.json({
      docs: [
        {
          key: "/works/OL82563W",
          title: "The Left Hand of Darkness",
        },
      ],
    });
  });

  const results = await searchOpenLibrary("left hand");
  const url = new URL(requestUrl);

  assert.equal(url.origin, "https://openlibrary.org");
  assert.equal(url.pathname, "/search.json");
  assert.equal(url.searchParams.get("q"), "left hand");
  assert.equal(
    url.searchParams.get("fields"),
    "key,title,author_name,cover_i,number_of_pages_median",
  );
  assert.equal(url.searchParams.get("limit"), "12");
  assert.equal(requestInit?.headers?.["Accept"], "application/json");
  assert.equal(requestInit?.next?.revalidate, 3600);
  assert.ok(requestInit?.signal instanceof AbortSignal);
  assert.deepEqual(results, [
    {
      externalId: "OL82563W",
      title: "The Left Hand of Darkness",
      author: null,
      coverUrl: null,
      pageCount: null,
    },
  ]);
});

test("throws an app-level error when Open Library fetch fails", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new DOMException("Timed out", "TimeoutError");
  });

  await assert.rejects(searchOpenLibrary("left hand"), {
    message: "Open Library search failed",
  });
});
