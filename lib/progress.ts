export type ShelfStatusValue = "READING" | "WANT_TO_READ" | "FINISHED" | "DNF";

export function clampCurrentPage(
  requestedPage: number,
  pageCount: number | null,
): number {
  const safePage = Math.max(0, Math.floor(requestedPage));

  if (!pageCount || pageCount < 1) {
    return safePage;
  }

  return Math.min(safePage, pageCount);
}

export function deriveStatusDates({
  nextStatus,
  previousStartedAt,
  previousFinishedAt,
  now,
}: {
  nextStatus: ShelfStatusValue;
  previousStartedAt: Date | null;
  previousFinishedAt: Date | null;
  now: Date;
}): { startedAt: Date | null; finishedAt: Date | null } {
  if (nextStatus === "FINISHED") {
    return {
      startedAt: previousStartedAt,
      finishedAt: previousFinishedAt ?? now,
    };
  }

  if (nextStatus === "READING") {
    return {
      startedAt: previousStartedAt ?? now,
      finishedAt: previousFinishedAt,
    };
  }

  return {
    startedAt: previousStartedAt,
    finishedAt: previousFinishedAt,
  };
}
