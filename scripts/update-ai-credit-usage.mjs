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

export function recordFromAudit(audit) {
  const runId = Number(audit?.overview?.run_id);
  const aic = Number(audit?.metrics?.aic);

  if (!Number.isSafeInteger(runId) || runId <= 0) {
    throw new Error("Missing or invalid overview.run_id");
  }
  if (!Number.isFinite(aic) || aic < 0) {
    throw new Error("Missing or invalid metrics.aic");
  }

  return {
    runId,
    timestamp: requireString(
      audit?.overview?.updated_at || audit?.overview?.created_at,
      "overview timestamp",
    ),
    event: requireString(audit?.overview?.event, "overview.event"),
    aic,
    url: requireString(audit?.overview?.url, "overview.url"),
  };
}

export function upsertHistory(history, record) {
  if (history?.schemaVersion !== 1 || !Array.isArray(history?.runs)) {
    throw new Error("Unsupported AI Credit history schema");
  }

  const existing = history.runs.find((item) => item.runId === record.runId);
  if (existing && JSON.stringify(existing) === JSON.stringify(record)) {
    return history;
  }

  const runs = history.runs
    .filter((item) => item.runId !== record.runId)
    .concat(record)
    .sort((left, right) => {
      const timestampOrder =
        Date.parse(left.timestamp) - Date.parse(right.timestamp);
      return timestampOrder || left.runId - right.runId;
    });

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    runs,
  };
}

export function renderCreditBlock(record) {
  const formattedAic = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(record.aic);

  return `<!-- AI_CREDITS_START --><div class="stat" data-ai-credits-run-id="${record.runId}">AI Credits: <span data-ai-credits-value>${formattedAic}</span> · <a href="./ai-credits.html">Usage history</a></div><!-- AI_CREDITS_END -->`;
}

export function updateDigestHtml(html, record) {
  const matches = html.match(CREDIT_BLOCK_PATTERN) || [];
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one AI Credit marker block, found ${matches.length}`,
    );
  }
  return html.replace(CREDIT_BLOCK_PATTERN, renderCreditBlock(record));
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(
        "Usage: node scripts/update-ai-credit-usage.mjs --history <path> [--audit <path>] [--run-id <id> --digest <path>]",
      );
    }
    values[key.slice(2)] = value;
  }
  return values;
}

export async function updateFiles({ auditPath, historyPath, digestPath }) {
  const [auditText, historyText] = await Promise.all([
    readFile(auditPath, "utf8"),
    readFile(historyPath, "utf8"),
  ]);

  const record = recordFromAudit(JSON.parse(auditText));
  const history = upsertHistory(JSON.parse(historyText), record);
  await writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`, "utf8");

  if (digestPath) {
    const digestHtml = await readFile(digestPath, "utf8");
    await writeFile(digestPath, updateDigestHtml(digestHtml, record), "utf8");
  }
}

export async function finalizeDigest({ historyPath, digestPath, runId }) {
  const [historyText, digestHtml] = await Promise.all([
    readFile(historyPath, "utf8"),
    readFile(digestPath, "utf8"),
  ]);
  const history = JSON.parse(historyText);
  const numericRunId = Number(runId);
  const record = history.runs?.find((item) => item.runId === numericRunId);
  if (!record) {
    throw new Error(`AI Credit history does not contain run ${runId}`);
  }
  if (!digestHtml.includes(`data-ai-credits-run-id="${numericRunId}"`)) {
    throw new Error(`Digest marker does not belong to run ${runId}`);
  }
  await writeFile(digestPath, updateDigestHtml(digestHtml, record), "utf8");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const historyPath = requireString(args.history, "--history");
  if (args.audit) {
    await updateFiles({
      auditPath: args.audit,
      historyPath,
      digestPath: args.digest,
    });
  } else {
    await finalizeDigest({
      historyPath,
      digestPath: requireString(args.digest, "--digest"),
      runId: requireString(args["run-id"], "--run-id"),
    });
  }
}
