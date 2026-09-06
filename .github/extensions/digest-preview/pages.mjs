// Catalog of the pages this repository publishes to GitHub Pages, plus the
// helpers that read each page's publication markers straight out of the file
// on disk. Nothing here is cached: the point of the canvas is to show what is
// currently in the working tree, so every read hits the file.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Published pages, keyed by the short id used in canvas input and actions.
 * `path` is relative to the docs/ root and is also the durable identity of the
 * artifact each entry renders.
 */
export const PAGES = [
    {
        id: "control",
        path: "index.html",
        label: "Control digest",
        note: "The primary published page (docs/index.html).",
    },
    {
        id: "economy",
        path: "economy/index.html",
        label: "Economy digest",
        note: "The small-model digest built from the same snapshot.",
    },
    {
        id: "comparison",
        path: "model-comparison.html",
        label: "Model comparison",
        note: "Paired cost and publication results per snapshot.",
    },
    {
        id: "credits",
        path: "ai-credits.html",
        label: "Credit usage",
        note: "Daily, weekly, and monthly control-variant usage.",
    },
];

export const DEFAULT_PAGE_ID = "control";

export function findPage(id) {
    return PAGES.find((page) => page.id === id);
}

function attribute(html, name) {
    const match = html.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : null;
}

/**
 * Read the publication markers a digest page carries on its <body> element,
 * plus the newest story date on the page. Returns `exists: false` rather than
 * throwing when a page has not been generated yet.
 */
export async function readPageMetadata(docsRoot, page) {
    const absolute = join(docsRoot, page.path);
    let html;
    let modifiedAt = null;
    try {
        [html, modifiedAt] = await Promise.all([
            readFile(absolute, "utf8"),
            stat(absolute).then((info) => info.mtime.toISOString()),
        ]);
    } catch {
        return { ...page, exists: false };
    }

    const published = [...html.matchAll(/data-published="([^"]+)"/g)].map((match) => match[1]).sort();

    return {
        ...page,
        exists: true,
        modifiedAt,
        variant: attribute(html, "data-digest-variant"),
        model: attribute(html, "data-digest-model"),
        snapshotId: attribute(html, "data-snapshot-id"),
        promptVersion: attribute(html, "data-prompt-version"),
        storyCount: published.length,
        newestStory: published.length ? published[published.length - 1] : null,
        oldestStory: published.length ? published[0] : null,
    };
}

export function readAllPageMetadata(docsRoot) {
    return Promise.all(PAGES.map((page) => readPageMetadata(docsRoot, page)));
}
