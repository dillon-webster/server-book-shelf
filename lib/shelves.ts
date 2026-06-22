import type { ShelfStatus } from "@prisma/client";

export const shelfOrder: ShelfStatus[] = [
  "READING",
  "WANT_TO_READ",
  "FINISHED",
  "DNF",
];

export const shelfLabels: Record<ShelfStatus, string> = {
  READING: "Currently Reading",
  WANT_TO_READ: "Want to Read",
  FINISHED: "Finished",
  DNF: "DNF",
};
