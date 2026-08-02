const assert = require("node:assert/strict");
const test = require("node:test");

const {
  aggregate,
  selectDailyRuns,
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
