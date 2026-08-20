import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const CREDIT_BLOCK_PATTERN =
  /<!-- AI_CREDITS_START -->[\s\S]*?<!-- AI_CREDITS_END -->/g;

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing or invalid ${name}`);
  }
  return value;
}

function optionalAic(audit) {
  if (!audit) return null;
  const aic = Number(audit?.metrics?.aic);
  if (!Number.isFinite(aic) || aic < 0) {
    throw new Error("Missing or invalid metrics.aic");
  }
  return aic;
}

export function recordFromRun({
  run,
  audit = null,
  variant,
  model,
  originEvent,
  snapshotId,
  promptVersion,
  pagePath,
  published = false,
}) {
  const runId = Number(run?.databaseId ?? audit?.overview?.run_id);
  if (!Number.isSafeInteger(runId) || runId <= 0) {
    throw new Error("Missing or invalid run ID");
  }
  if (!["control", "economy"].includes(variant)) {
    throw new Error(`Unsupported variant: ${variant}`);
  }

  const startedAt = run?.startedAt || run?.createdAt;
  const completedAt =
    run?.updatedAt ||
    audit?.overview?.updated_at ||
    audit?.overview?.created_at;
  const durationSeconds =
    startedAt && completedAt
      ? Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000))
      : null;

  return {
    runId,
    timestamp: requireString(completedAt, "run timestamp"),
    event: requireString(
      originEvent || run?.event || audit?.overview?.event,
      "run event",
    ),
    workflow: requireString(run?.workflowName, "workflow name"),
    variant,
    model: requireString(model, "model"),
    snapshotId: requireString(snapshotId, "snapshot ID"),
    promptVersion: requireString(promptVersion, "prompt version"),
    aic: optionalAic(audit),
    durationSeconds,
    conclusion: requireString(run?.conclusion, "run conclusion"),
    published: Boolean(published),
    quality: published
      ? "published"
      : run?.conclusion === "success"
        ? "not-published"
        : "failed",
    pagePath: requireString(pagePath, "page path"),
    url: requireString(run?.url || audit?.overview?.url, "run URL"),
  };
}

export function upsertHistory(history, record, now = new Date()) {
  if (history?.schemaVersion !== 2 || !Array.isArray(history?.runs)) {
    throw new Error("Unsupported AI Credit history schema");
  }

  const existing = history.runs.find((item) => item.runId === record.runId);
  const merged = existing
    ? {
        ...existing,
        ...record,
        aic: record.aic ?? existing.aic,
        published: existing.published || record.published,
        quality:
          existing.published || record.published
            ? "published"
            : record.quality,
      }
    : record;
  if (existing && JSON.stringify(existing) === JSON.stringify(merged)) {
    return history;
  }

  const runs = history.runs
    .filter((item) => item.runId !== record.runId)
    .concat(merged)
    .sort((left, right) => {
      const timestampOrder =
        Date.parse(left.timestamp) - Date.parse(right.timestamp);
      return timestampOrder || left.runId - right.runId;
    });

  return {
    schemaVersion: 2,
    updatedAt: now.toISOString(),
    runs,
  };
}

export function digestContainsRun(html, runId) {
  return html.includes(`data-ai-credits-run-id="${Number(runId)}"`);
}

export function updateDigestHtml(html, record) {
  const matches = html.match(CREDIT_BLOCK_PATTERN) || [];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one AI Credit marker block, found ${matches.length}`,
    );
  }
  if (!digestContainsRun(html, record.runId)) {
    throw new Error(`Digest marker does not belong to run ${record.runId}`);
  }
  if (!Number.isFinite(record.aic) || record.aic < 0) {
    throw new Error(`Run ${record.runId} does not have AI Credit data`);
  }

  const formattedAic = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(record.aic);
  const block = matches[0];
  const valuePattern =
    /(<span\s+data-ai-credits-value(?:="")?>)[\s\S]*?(<\/span>)/;
  if (!valuePattern.test(block)) {
    throw new Error("AI Credit marker is missing its value element");
  }
  return html.replace(
    block,
    block.replace(valuePattern, `$1${formattedAic}$2`),
  );
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(
        "Usage: node scripts/update-ai-credit-usage.mjs --history <path> --run <path> --variant <name> --model <id> --event <name> --snapshot-id <id> --prompt-version <id> --digest <path> [--audit <path>]",
      );
    }
    values[key.slice(2)] = value;
  }
  return values;
}

export async function updateFiles({
  runPath,
  auditPath,
  historyPath,
  digestPath,
  variant,
  model,
  originEvent,
  snapshotId,
  promptVersion,
}) {
  const [runText, historyText, digestHtml] = await Promise.all([
    readFile(runPath, "utf8"),
    readFile(historyPath, "utf8"),
    readFile(digestPath, "utf8"),
  ]);
  const audit = auditPath
    ? JSON.parse(await readFile(auditPath, "utf8"))
    : null;
  const run = JSON.parse(runText);
  const record = recordFromRun({
    run,
    audit,
    variant,
    model,
    originEvent,
    snapshotId,
    promptVersion,
    pagePath: digestPath.replaceAll("\\", "/"),
    published: digestContainsRun(digestHtml, run.databaseId),
  });

  const currentHistory = JSON.parse(historyText);
  const history = upsertHistory(currentHistory, record);
  const effectiveRecord = history.runs.find((item) => item.runId === record.runId);
  if (effectiveRecord.published && effectiveRecord.aic !== null) {
    await writeFile(
      digestPath,
      updateDigestHtml(digestHtml, effectiveRecord),
      "utf8",
    );
  }
  if (history !== currentHistory) {
    await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`, "utf8");
  }
  return effectiveRecord;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  await updateFiles({
    runPath: requireString(args.run, "--run"),
    auditPath: args.audit,
    historyPath: requireString(args.history, "--history"),
    digestPath: requireString(args.digest, "--digest"),
    variant: requireString(args.variant, "--variant"),
    model: requireString(args.model, "--model"),
    originEvent: requireString(args.event, "--event"),
    snapshotId: requireString(args["snapshot-id"], "--snapshot-id"),
    promptVersion: requireString(args["prompt-version"], "--prompt-version"),
  });
}
