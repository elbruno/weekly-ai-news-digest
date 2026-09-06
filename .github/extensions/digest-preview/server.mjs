// Per-instance loopback server. It serves the canvas shell at `/`, the real
// docs/ tree under `/site/`, page metadata under `/api/`, and pushes updates
// over SSE at `/events`. Bound to 127.0.0.1 only — the host embeds loopback
// URLs exclusively.

import { createReadStream, watch } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

import { DEFAULT_PAGE_ID, findPage, readAllPageMetadata } from "./pages.mjs";
import { renderShell } from "./shell.mjs";

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
};

/**
 * Resolve a request path inside docsRoot, refusing anything that escapes it.
 * Returns null for traversal attempts.
 */
function resolveWithinRoot(docsRoot, requestPath) {
    const decoded = decodeURIComponent(requestPath);
    const candidate = resolve(docsRoot, `.${normalize(`/${decoded}`)}`);
    const prefix = docsRoot.endsWith(sep) ? docsRoot : docsRoot + sep;
    return candidate === docsRoot || candidate.startsWith(prefix) ? candidate : null;
}

function sendJson(res, status, body) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
}

async function serveStatic(docsRoot, res, requestPath) {
    const absolute = resolveWithinRoot(docsRoot, requestPath);
    if (!absolute) {
        res.writeHead(403).end("Forbidden");
        return;
    }

    let target = absolute;
    try {
        const info = await stat(target);
        if (info.isDirectory()) target = join(target, "index.html");
        await stat(target);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
        return;
    }

    res.writeHead(200, {
        "Content-Type": MIME_TYPES[extname(target).toLowerCase()] || "application/octet-stream",
        // Always re-read from disk; a preview that serves a cached page is worse
        // than useless.
        "Cache-Control": "no-store, must-revalidate",
    });
    createReadStream(target).pipe(res);
}

export async function startInstanceServer({ docsRoot, initialPageId }) {
    const clients = new Set();
    let currentPageId = initialPageId || DEFAULT_PAGE_ID;

    function broadcast(event, payload) {
        const frame = `event: ${event}\ndata: ${JSON.stringify(payload ?? {})}\n\n`;
        for (const client of clients) {
            try {
                client.write(frame);
            } catch {
                clients.delete(client);
            }
        }
    }

    const server = createServer((req, res) => {
        const url = new URL(req.url, "http://127.0.0.1");
        const path = url.pathname;

        if (path === "/" || path === "/index.html") {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
            });
            res.end(renderShell({ initialPageId: currentPageId }));
            return;
        }

        if (path === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-store",
                Connection: "keep-alive",
            });
            res.write("retry: 2000\n\n");
            clients.add(res);
            req.on("close", () => clients.delete(res));
            return;
        }

        if (path === "/api/pages") {
            readAllPageMetadata(docsRoot)
                .then((pages) => sendJson(res, 200, { current: currentPageId, pages }))
                .catch((error) => sendJson(res, 500, { error: String(error) }));
            return;
        }

        if (path === "/api/select" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk;
                if (body.length > 4096) req.destroy();
            });
            req.on("end", () => {
                try {
                    const requested = JSON.parse(body || "{}").page;
                    if (findPage(requested)) currentPageId = requested;
                    sendJson(res, 200, { current: currentPageId });
                } catch {
                    sendJson(res, 400, { error: "Invalid JSON body" });
                }
            });
            return;
        }

        if (path.startsWith("/site/")) {
            void serveStatic(docsRoot, res, path.slice("/site".length));
            return;
        }

        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    });

    await new Promise((resolvePromise, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolvePromise);
    });

    // Re-render when the pipeline (or a local edit) rewrites a page, so the
    // canvas keeps showing what is actually on disk. Debounced because a single
    // write produces several change events.
    let debounce = null;
    let watcher = null;
    try {
        watcher = watch(docsRoot, { recursive: true }, (_event, filename) => {
            if (filename && !/\.(html|json|css|js)$/i.test(String(filename))) return;
            clearTimeout(debounce);
            debounce = setTimeout(() => broadcast("changed", {}), 250);
        });
    } catch {
        // Recursive watch is not supported everywhere; the manual Reload button
        // and the refresh action still work without it.
    }

    const { port } = server.address();

    return {
        url: `http://127.0.0.1:${port}/`,
        get currentPageId() {
            return currentPageId;
        },
        navigate(pageId) {
            currentPageId = pageId;
            broadcast("navigate", { page: pageId });
        },
        refresh() {
            broadcast("changed", {});
        },
        async close() {
            clearTimeout(debounce);
            watcher?.close();
            for (const client of clients) client.end();
            clients.clear();
            await new Promise((done) => server.close(() => done()));
        },
    };
}
