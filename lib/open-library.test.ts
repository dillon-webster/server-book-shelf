import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpenLibrarySearch } from "./open-library";

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
