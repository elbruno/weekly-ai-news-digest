import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  digestContainsRun,
  recordFromRun,
  updateDigestHtml,
  updateFiles,
  upsertHistory,
} from "./update-ai-credit-usage.mjs";

const audit = {
  overview: {
    run_id: 123,
    updated_at: "2026-08-02T16:55:12Z",
    event: "workflow_dispatch",
    url: "https://github.com/example/repo/actions/runs/123",
  },
  metrics: { aic: 124.58013 },
};

const run = {
  databaseId: 123,
  startedAt: "2026-08-02T16:50:12Z",
  updatedAt: "2026-08-02T16:55:12Z",
  event: "workflow_dispatch",
  workflowName: "Daily Digest - Control",
  conclusion: "success",
  url: "https://github.com/example/repo/actions/runs/123",
};

function makeRecord(overrides = {}) {
  return recordFromRun({
    run,
    audit,
    variant: "control",
    model: "claude-sonnet-4.6",
    snapshotId: "2026-08-02-abcdef123456",
    promptVersion: "v1",
    pagePath: "docs/index.html",
    published: true,
    ...overrides,
  });
}

test("creates a version-two experiment record", () => {
  assert.deepEqual(makeRecord(), {
    runId: 123,
    timestamp: "2026-08-02T16:55:12Z",
    event: "workflow_dispatch",
    workflow: "Daily Digest - Control",
    variant: "control",
    model: "claude-sonnet-4.6",
    snapshotId: "2026-08-02-abcdef123456",
    promptVersion: "v1",
    aic: 124.58013,
    durationSeconds: 300,
    conclusion: "success",
    published: true,
    quality: "published",
    pagePath: "docs/index.html",
    url: "https://github.com/example/repo/actions/runs/123",
  });
});

test("records the coordinator event instead of worker dispatch", () => {
  assert.equal(makeRecord({ originEvent: "schedule" }).event, "schedule");
});

test("keeps failed runs when audit data is unavailable", () => {
  const record = makeRecord({
    audit: null,
    run: { ...run, conclusion: "failure" },
    published: false,
  });
  assert.equal(record.aic, null);
  assert.equal(record.quality, "failed");
});

test("keeps failed runs when an audit omits AI Credit metrics", () => {
  const record = makeRecord({
    audit: { ...audit, metrics: {} },
    run: { ...run, conclusion: "failure" },
    published: false,
  });
  assert.equal(record.aic, null);
  assert.equal(record.quality, "failed");
});

test("upserts by run ID and preserves a prior publication", () => {
  const published = makeRecord();
  const retried = { ...published, aic: null, published: false, quality: "not-published" };
  const history = {
    schemaVersion: 2,
    updatedAt: null,
    runs: [published],
  };

  assert.strictEqual(upsertHistory(history, retried), history);
});

test("sorts records chronologically", () => {
  const later = makeRecord();
  const earlier = {
    ...later,
    runId: 122,
    timestamp: "2026-08-01T10:00:00Z",
  };
  const updated = upsertHistory(
    { schemaVersion: 2, updatedAt: null, runs: [later] },
    earlier,
    new Date("2026-08-03T00:00:00Z"),
  );
  assert.deepEqual(updated.runs.map(({ runId }) => runId), [122, 123]);
});

test("replaces only the credit value and preserves variant links", () => {
  const html =
    '<main><!-- AI_CREDITS_START --><div data-ai-credits-run-id="123">AI Credits: <span data-ai-credits-value>Pending finalization</span> · <a href="../ai-credits.html">Usage</a> · <a href="../model-comparison.html">Compare</a></div><!-- AI_CREDITS_END --></main>';
  const updated = updateDigestHtml(html, makeRecord());
  assert.match(updated, />124\.58<\/span>/);
  assert.match(updated, /\.\.\/model-comparison\.html/);
  assert.equal(digestContainsRun(updated, 123), true);
});

test("rejects invalid records and mismatched digest markers", () => {
  assert.throws(
    () => makeRecord({ audit: { ...audit, metrics: { aic: -1 } } }),
    /metrics\.aic/,
  );
  assert.throws(
    () =>
      updateDigestHtml(
        '<!-- AI_CREDITS_START --><div data-ai-credits-run-id="999"><span data-ai-credits-value>Pending</span></div><!-- AI_CREDITS_END -->',
        makeRecord(),
      ),
    /does not belong/,
  );
});

test("finalizes a newly published page from previously recorded credits", async () => {
  const directory = await mkdtemp(join(tmpdir(), "digest-credit-test-"));
  const runPath = join(directory, "run.json");
  const historyPath = join(directory, "history.json");
  const digestPath = join(directory, "index.html");
  const existing = makeRecord({ published: false });
  existing.quality = "not-published";

  try {
    await Promise.all([
      writeFile(runPath, JSON.stringify(run), "utf8"),
      writeFile(
        historyPath,
        JSON.stringify({ schemaVersion: 2, updatedAt: null, runs: [existing] }),
        "utf8",
      ),
      writeFile(
        digestPath,
        '<!-- AI_CREDITS_START --><div data-ai-credits-run-id="123"><span data-ai-credits-value>Pending finalization</span></div><!-- AI_CREDITS_END -->',
        "utf8",
      ),
    ]);

    const updated = await updateFiles({
      runPath,
      historyPath,
      digestPath,
      variant: "control",
      model: "claude-sonnet-4.6",
      originEvent: "schedule",
      snapshotId: "2026-08-02-abcdef123456",
      promptVersion: "v1",
    });

    assert.equal(updated.aic, 124.58013);
    assert.equal(updated.published, true);
    assert.match(await readFile(digestPath, "utf8"), />124\.58<\/span>/);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("does not rewrite a newer digest from a historical published record", async () => {
  const directory = await mkdtemp(join(tmpdir(), "digest-credit-history-test-"));
  const runPath = join(directory, "run.json");
  const historyPath = join(directory, "history.json");
  const digestPath = join(directory, "index.html");
  const newerDigest =
    '<!-- AI_CREDITS_START --><div data-ai-credits-run-id="999"><span data-ai-credits-value>Pending finalization</span></div><!-- AI_CREDITS_END -->';

  try {
    await Promise.all([
      writeFile(runPath, JSON.stringify(run), "utf8"),
      writeFile(
        historyPath,
        JSON.stringify({
          schemaVersion: 2,
          updatedAt: null,
          runs: [makeRecord()],
        }),
        "utf8",
      ),
      writeFile(digestPath, newerDigest, "utf8"),
    ]);

    const updated = await updateFiles({
      runPath,
      historyPath,
      digestPath,
      variant: "control",
      model: "claude-sonnet-4.6",
      originEvent: "schedule",
      snapshotId: "2026-08-02-abcdef123456",
      promptVersion: "v1",
    });

    assert.equal(updated.published, true);
    assert.equal(await readFile(digestPath, "utf8"), newerDigest);
  } finally {
    await rm(directory, { recursive: true });
  }
});
