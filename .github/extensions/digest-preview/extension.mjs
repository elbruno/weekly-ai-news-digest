// Extension: digest-preview
// Preview the published digest pages (control, economy, comparison, credits)
// exactly as they will appear on GitHub Pages.
//
// The canvas serves the repository's docs/ directory over loopback and renders
// it in an iframe, so what you see is the real artifact — same HTML, same CSS,
// same fetch of docs/data/ai-credits.json — rather than a reconstruction.

import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";

import { DEFAULT_PAGE_ID, PAGES, findPage, readAllPageMetadata } from "./pages.mjs";
import { startInstanceServer } from "./server.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Walk up from the extension directory to the repository that owns it and
 * return its docs/ folder. The docs/ path is the durable identity here: every
 * instance of this canvas renders the same working-tree files, so no per-panel
 * state is persisted anywhere.
 */
async function findDocsRoot(workspacePath) {
    const candidates = [];
    if (workspacePath) candidates.push(resolve(workspacePath, "docs"));
    let dir = here;
    for (let depth = 0; depth < 6; depth += 1) {
        candidates.push(join(dir, "docs"));
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    for (const candidate of candidates) {
        try {
            await access(join(candidate, "index.html"));
            return candidate;
        } catch {
            // Not this level; keep walking up.
        }
    }
    return null;
}

/** instanceId → running loopback server. Panel-scoped and intentionally ephemeral. */
const instances = new Map();

let workspacePath;
let docsRootPromise;

function docsRoot() {
    docsRootPromise ??= findDocsRoot(workspacePath);
    return docsRootPromise;
}

async function requireDocsRoot() {
    const root = await docsRoot();
    if (!root) {
        throw new CanvasError(
            "docs_not_found",
            "Could not locate a docs/ directory containing index.html for this repository.",
        );
    }
    return root;
}

function requireInstance(instanceId) {
    const instance = instances.get(instanceId);
    if (!instance) {
        throw new CanvasError("canvas_not_open", `No open digest preview for instance ${instanceId}.`);
    }
    return instance;
}

const pageIds = PAGES.map((page) => page.id);

const canvas = createCanvas({
    id: "digest-preview",
    displayName: "Digest preview",
    description:
        "Preview the digest pages exactly as GitHub Pages will publish them, with their model, snapshot, and freshness.",
    inputSchema: {
        type: "object",
        properties: {
            page: {
                type: "string",
                enum: pageIds,
                description: "Which published page to show first.",
            },
        },
        additionalProperties: false,
    },
    actions: [
        {
            name: "show_page",
            description: "Switch the open preview to another published page.",
            inputSchema: {
                type: "object",
                properties: {
                    page: { type: "string", enum: pageIds, description: "The page to display." },
                },
                required: ["page"],
                additionalProperties: false,
            },
            handler: (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                const page = findPage(ctx.input.page);
                if (!page) throw new CanvasError("unknown_page", `Unknown page: ${ctx.input.page}`);
                instance.navigate(page.id);
                return { page: page.id, path: page.path };
            },
        },
        {
            name: "refresh",
            description: "Re-read the pages from disk and reload the preview.",
            handler: (ctx) => {
                const instance = requireInstance(ctx.instanceId);
                instance.refresh();
                return { refreshed: true, page: instance.currentPageId };
            },
        },
        {
            name: "get_status",
            description:
                "Report each published page's model, snapshot, story count, and newest story date, for checking freshness.",
            handler: async () => {
                const root = await requireDocsRoot();
                return { docsRoot: root, pages: await readAllPageMetadata(root) };
            },
        },
    ],
    // Idempotent: the same instanceId arrives again on host re-open and after
    // extensions_reload, and reuses the server already running for that panel.
    open: async (ctx) => {
        const root = await requireDocsRoot();
        const requested = findPage(ctx.input?.page)?.id ?? DEFAULT_PAGE_ID;

        let instance = instances.get(ctx.instanceId);
        if (!instance) {
            instance = await startInstanceServer({ docsRoot: root, initialPageId: requested });
            instances.set(ctx.instanceId, instance);
        } else if (requested !== instance.currentPageId) {
            instance.navigate(requested);
        }

        const label = findPage(requested)?.label ?? "Digest preview";
        return { title: `Digest preview — ${label}`, url: instance.url };
    },
    onClose: async (ctx) => {
        const instance = instances.get(ctx.instanceId);
        if (!instance) return;
        instances.delete(ctx.instanceId);
        await instance.close();
    },
});

const session = await joinSession({ canvases: [canvas] });
workspacePath = session.workspacePath;

process.on("exit", () => {
    for (const instance of instances.values()) void instance.close();
});
