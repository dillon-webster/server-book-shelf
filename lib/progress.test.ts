import assert from "node:assert/strict";
import test from "node:test";
import {
  clampCurrentPage,
  deriveEpubLocationPercentage,
  deriveReadingProgress,
  deriveStatusDates,
} from "./progress";

test("clamps current page between zero and page count", () => {
  assert.equal(clampCurrentPage(-4, 300), 0);
  assert.equal(clampCurrentPage(120, 300), 120);
  assert.equal(clampCurrentPage(450, 300), 300);
});

test("allows current page above unknown page count", () => {
  assert.equal(clampCurrentPage(450, null), 450);
});

test("sets finished date when marking finished", () => {
  const result = deriveStatusDates({
    nextStatus: "FINISHED",
    previousFinishedAt: null,
    previousStartedAt: null,
    now: new Date("2026-06-22T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    startedAt: null,
    finishedAt: new Date("2026-06-22T12:00:00.000Z"),
  });
});

test("sets started date when moving to reading", () => {
  const result = deriveStatusDates({
    nextStatus: "READING",
    previousFinishedAt: null,
    previousStartedAt: null,
    now: new Date("2026-06-22T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    startedAt: new Date("2026-06-22T12:00:00.000Z"),
    finishedAt: null,
  });
});

test("derives reader progress from epub percentage", () => {
  assert.deepEqual(deriveReadingProgress(0.4272, 320), {
    currentPercent: 42.72,
    currentPage: 137,
  });
});

test("clamps reader progress into a valid percent range", () => {
  assert.deepEqual(deriveReadingProgress(1.2, 250), {
    currentPercent: 100,
    currentPage: 250,
  });

  assert.deepEqual(deriveReadingProgress(-0.1, 250), {
    currentPercent: 0,
    currentPage: 0,
  });
});

test("supports reader progress without a page count", () => {
  assert.deepEqual(deriveReadingProgress(0.5, null), {
    currentPercent: 50,
    currentPage: 0,
  });
});

test("uses generated epub percentage when it is meaningful", () => {
  assert.equal(
    deriveEpubLocationPercentage({
      generatedPercentage: 0.42,
      spineIndex: 1,
      spineLength: 10,
      displayedPage: 1,
      displayedTotal: 5,
    }),
    0.42,
  );
});

test("estimates epub percentage from spine position when generated percentage is zero", () => {
  assert.equal(
    deriveEpubLocationPercentage({
      generatedPercentage: 0,
      spineIndex: 1,
      spineLength: 4,
      displayedPage: 3,
      displayedTotal: 10,
    }),
    0.3,
  );
});

test("keeps epub percentage at zero for the start of the first spine item", () => {
  assert.equal(
    deriveEpubLocationPercentage({
      generatedPercentage: 0,
      spineIndex: 0,
      spineLength: 4,
      displayedPage: 1,
      displayedTotal: 10,
    }),
    0,
  );
});
