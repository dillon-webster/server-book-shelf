import { prisma } from "@/lib/prisma";
import { shelfLabels, shelfOrder } from "@/lib/shelves";
import type { ShelfStatus } from "@prisma/client";
import BookShelfView from "./components/BookShelfView";

export const dynamic = "force-dynamic";

const shelfAccents: Record<ShelfStatus, string> = {
  READING: "#c8923a",
  WANT_TO_READ: "#6b8cba",
  FINISHED: "#6baa8e",
  DNF: "#a87878",
};

const emptyMessages: Record<ShelfStatus, string> = {
  READING: "Pick up where\nyou left off.",
  WANT_TO_READ: "Your next great\nadventure awaits.",
  FINISHED: "Celebrate the stories\nyou've completed.",
  DNF: "Not every story is\nmeant to be finished.",
};

export default async function Home() {
  const entries = await prisma.shelfEntry.findMany({
    include: { book: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const shelves = shelfOrder.map((status) => {
    const shelfEntries = entries.filter((e) => e.status === status);
    return {
      status,
      label: shelfLabels[status],
      accentColor: shelfAccents[status],
      emptyMessage: emptyMessages[status],
      entries: shelfEntries.map((entry) => ({
        id: entry.id,
        bookId: entry.book.id,
        title: entry.book.title,
        author: entry.book.author,
        coverUrl: entry.book.coverUrl,
        spineImageData: entry.book.spineImageData,
        currentPage: entry.currentPage,
        currentPercent: entry.currentPercent,
        pageCount: entry.book.pageCount,
      })),
    };
  });

  return <BookShelfView shelves={shelves} totalBooks={entries.length} />;
}
