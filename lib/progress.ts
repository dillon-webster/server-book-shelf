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

export function deriveReadingProgress(
  percentage: number,
  pageCount: number | null,
): { currentPage: number; currentPercent: number } {
  const safePercentage = Math.min(1, Math.max(0, percentage));
  const currentPercent = Math.round(safePercentage * 10000) / 100;
  const currentPage = pageCount
    ? clampCurrentPage(Math.round(safePercentage * pageCount), pageCount)
    : 0;

  return { currentPage, currentPercent };
}

export function deriveEpubLocationPercentage({
  generatedPercentage,
  spineIndex,
  spineLength,
  displayedPage,
  displayedTotal,
}: {
  generatedPercentage: number | null | undefined;
  spineIndex: number;
  spineLength: number;
  displayedPage: number;
  displayedTotal: number;
}): number {
  if (typeof generatedPercentage === "number" && generatedPercentage > 0) {
    return Math.min(1, generatedPercentage);
  }

  if (spineLength < 1 || spineIndex < 0) {
    return 0;
  }

  const safeSpineIndex = Math.min(spineIndex, spineLength - 1);
  const sectionSize = 1 / spineLength;
  const pageOffset =
    displayedTotal > 1
      ? (Math.max(1, displayedPage) - 1) / displayedTotal
      : 0;

  return Math.min(1, (safeSpineIndex + pageOffset) * sectionSize);
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
