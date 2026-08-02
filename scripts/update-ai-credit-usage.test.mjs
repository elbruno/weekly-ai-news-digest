import assert from "node:assert/strict";
import test from "node:test";

import {
  finalizeDigest,
  recordFromAudit,
  updateDigestHtml,
  upsertHistory,
} from "./update-ai-credit-usage.mjs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const audit = {
  overview: {
    run_id: 123,
    updated_at: "2026-08-02T16:55:12Z",
    event: "workflow_dispatch",
    url: "https://github.com/example/repo/actions/runs/123",
  },
  metrics: { aic: 124.58013 },
};

test("extracts a validated record from audit JSON", () => {
  assert.deepEqual(recordFromAudit(audit), {
    runId: 123,
    timestamp: "2026-08-02T16:55:12Z",
    event: "workflow_dispatch",
    aic: 124.58013,
    url: "https://github.com/example/repo/actions/runs/123",
  });
});

test("upserts by run ID and sorts chronologically", () => {
  const history = {
    schemaVersion: 1,
    updatedAt: null,
    runs: [
      {
        runId: 123,
        timestamp: "2026-08-02T16:55:12Z",
        event: "schedule",
        aic: 1,
        url: "https://example.test/123",
      },
      {
        runId: 122,
        timestamp: "2026-08-01T10:00:00Z",
        event: "schedule",
        aic: 2,
        url: "https://example.test/122",
      },
    ],
  };

  const updated = upsertHistory(history, recordFromAudit(audit));
  assert.deepEqual(
    updated.runs.map(({ runId, aic }) => ({ runId, aic })),
    [
      { runId: 122, aic: 2 },
      { runId: 123, aic: 124.58013 },
    ],
  );
});

test("leaves history unchanged when the same run is processed again", () => {
  const record = recordFromAudit(audit);
  const history = {
    schemaVersion: 1,
    updatedAt: "2026-08-02T17:00:00.000Z",
    runs: [record],
  };

  assert.strictEqual(upsertHistory(history, record), history);
});

test("replaces exactly one digest marker and formats credits", () => {
  const html =
    '<main><!-- AI_CREDITS_START --><div>Pending</div><!-- AI_CREDITS_END --></main>';
  const updated = updateDigestHtml(html, recordFromAudit(audit));
  assert.match(updated, /data-ai-credits-run-id="123"/);
  assert.match(updated, />124\.58<\/span>/);
});

test("rejects invalid audit data and missing digest markers", () => {
  assert.throws(
    () => recordFromAudit({ overview: audit.overview, metrics: { aic: -1 } }),
    /metrics\.aic/,
  );
  assert.throws(
    () => updateDigestHtml("<main></main>", recordFromAudit(audit)),
    /found 0/,
  );
});

test("finalizes only the digest that belongs to the recorded run", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-credit-test-"));
  const historyPath = join(directory, "history.json");
  const digestPath = join(directory, "index.html");
  const record = recordFromAudit(audit);
  await writeFile(
    historyPath,
    JSON.stringify({ schemaVersion: 1, updatedAt: null, runs: [record] }),
  );
  await writeFile(
    digestPath,
    '<!-- AI_CREDITS_START --><div data-ai-credits-run-id="123">Pending</div><!-- AI_CREDITS_END -->',
  );

  await finalizeDigest({ historyPath, digestPath, runId: "123" });
  assert.match(await readFile(digestPath, "utf8"), />124\.58<\/span>/);
  await assert.rejects(
    finalizeDigest({ historyPath, digestPath, runId: "999" }),
    /does not contain run 999/,
  );
});
