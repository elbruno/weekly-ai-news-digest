const assert = require("node:assert/strict");
const test = require("node:test");

const {
  aggregate,
  pairBySnapshot,
  selectDailyRuns,
  summarizePairs,
  summarizeVariant,
} = require("../docs/assets/ai-credit-utils.js");

const runs = [
  {
    runId: 1,
    timestamp: "2026-08-01T10:00:00Z",
    event: "workflow_dispatch",
    aic: 10,
  },
  {
    runId: 2,
    timestamp: "2026-08-01T12:00:00Z",
    event: "schedule",
    aic: 20,
  },
  {
    runId: 3,
    timestamp: "2026-08-01T14:00:00Z",
    event: "workflow_dispatch",
    aic: 30,
  },
  {
    runId: 4,
    timestamp: "2026-08-02T10:00:00Z",
    event: "workflow_dispatch",
    aic: 40,
  },
  {
    runId: 5,
    timestamp: "2026-08-02T11:00:00Z",
    event: "workflow_dispatch",
    aic: 50,
  },
];

test("prefers the scheduled run for a UTC day", () => {
  assert.deepEqual(
    selectDailyRuns(runs).map((run) => run.runId),
    [2, 5],
  );
});

test("uses the latest manual run when no scheduled run exists", () => {
  assert.equal(selectDailyRuns(runs)[1].aic, 50);
});

test("aggregates canonical daily records into weekly totals", () => {
  assert.deepEqual(aggregate(selectDailyRuns(runs), "weekly"), [
    { key: "2026-07-27", days: 2, aic: 70 },
  ]);
});

const pairedRuns = [
  {
    runId: 10,
    timestamp: "2026-08-03T10:00:00Z",
    event: "workflow_dispatch",
    variant: "control",
    snapshotId: "snapshot-a",
    conclusion: "success",
    published: true,
    durationSeconds: 600,
    aic: 100,
  },
  {
    runId: 11,
    timestamp: "2026-08-03T10:01:00Z",
    event: "workflow_dispatch",
    variant: "economy",
    snapshotId: "snapshot-a",
    conclusion: "success",
    published: true,
    durationSeconds: 300,
    aic: 40,
  },
  {
    runId: 12,
    timestamp: "2026-08-04T10:00:00Z",
    event: "workflow_dispatch",
    variant: "control",
    snapshotId: "snapshot-b",
    conclusion: "failure",
    published: false,
    durationSeconds: 100,
    aic: null,
  },
];

test("selects daily usage within one variant", () => {
  assert.deepEqual(
    selectDailyRuns(pairedRuns, "control").map((run) => run.runId),
    [10],
  );
});

test("pairs runs by immutable snapshot", () => {
  const pairs = pairBySnapshot(pairedRuns);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].control.runId, 10);
  assert.equal(pairs[0].economy.runId, 11);
  assert.equal(pairs[1].economy, null);
});

test("summarizes paired savings and publication results", () => {
  assert.deepEqual(summarizePairs(pairBySnapshot(pairedRuns)), {
    total: 2,
    complete: 1,
    controlAic: 100,
    economyAic: 40,
    savedAic: 60,
    savingsPercent: 60,
  });
  assert.deepEqual(summarizeVariant(pairedRuns, "control"), {
    runs: 2,
    successful: 1,
    published: 1,
    measured: 1,
    totalAic: 100,
    averageAic: 100,
    averageDurationSeconds: 600,
  });
});
