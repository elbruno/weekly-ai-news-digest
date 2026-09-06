// The canvas shell: a thin chrome of page tabs and publication metadata around
// an iframe that renders the real published page. Styling uses the documented
// canvas theme tokens so the shell matches the app, while the inner iframe is
// left completely untouched — it has to look exactly like GitHub Pages will
// serve it.

import { PAGES } from "./pages.mjs";

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (char) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
}

export function renderShell({ initialPageId }) {
    const tabs = PAGES.map(
        (page) =>
            `<button type="button" role="tab" data-page="${escapeHtml(page.id)}" title="${escapeHtml(page.note)}">${escapeHtml(page.label)}</button>`,
    ).join("");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Digest preview</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    display: flex;
    flex-direction: column;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: var(--text-body-medium, 14px);
    line-height: var(--leading-body-medium, 20px);
  }
  header {
    flex: 0 0 auto;
    border-bottom: 1px solid var(--border-color-default, #d1d9e0);
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tabs button {
    font: inherit;
    color: var(--text-color-muted, #59636e);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
  }
  .tabs button:hover { background: var(--background-color-muted, rgba(0,0,0,.04)); }
  .tabs button[aria-selected="true"] {
    color: var(--text-color-default, #1f2328);
    border-color: var(--border-color-default, #d1d9e0);
    background: var(--background-color-muted, rgba(0,0,0,.04));
    font-weight: var(--font-weight-semibold, 600);
  }
  .tabs button:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 1px; }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    color: var(--text-color-muted, #59636e);
    font-size: var(--text-body-small, 12px);
    line-height: var(--leading-body-small, 16px);
    min-height: 16px;
  }
  .meta code {
    font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace);
    font-size: var(--text-code-inline, 12px);
    color: var(--text-color-default, #1f2328);
  }
  .spacer { flex: 1 1 auto; }
  .meta button {
    font: inherit;
    color: var(--text-color-muted, #59636e);
    background: transparent;
    border: 1px solid var(--border-color-default, #d1d9e0);
    border-radius: 6px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .meta button:hover { color: var(--text-color-default, #1f2328); }
  .stale { color: var(--true-color-red, #cf222e); }
  .fresh { color: var(--true-color-blue, #0969da); }
  main { flex: 1 1 auto; min-height: 0; position: relative; }
  iframe { width: 100%; height: 100%; border: 0; display: block; background: var(--color-white, #ffffff); }
  .missing {
    position: absolute; inset: 0; display: none;
    align-items: center; justify-content: center; text-align: center;
    padding: 24px; color: var(--text-color-muted, #59636e);
  }
  body[data-missing="true"] .missing { display: flex; }
  body[data-missing="true"] iframe { visibility: hidden; }
</style>
</head>
<body data-missing="false">
  <header>
    <div class="tabs" role="tablist" id="tabs">${tabs}</div>
    <div class="meta">
      <span id="summary">Loading…</span>
      <span class="spacer"></span>
      <button type="button" id="reload" title="Reload the page from disk">Reload</button>
    </div>
  </header>
  <main>
    <iframe id="frame" title="Published page preview"></iframe>
    <div class="missing"><p id="missingText">This page has not been generated yet.</p></div>
  </main>

<script>
(function () {
  var initial = ${JSON.stringify(initialPageId)};
  var current = initial;
  var meta = {};
  var frame = document.getElementById("frame");
  var tabs = document.getElementById("tabs");
  var summary = document.getElementById("summary");

  function describe(entry) {
    if (!entry) return "";
    if (!entry.exists) return "Not generated yet.";
    var bits = [];
    if (entry.model) bits.push('<code>' + entry.model + '</code>');
    if (entry.snapshotId) bits.push("snapshot <code>" + entry.snapshotId + "</code>");
    if (entry.newestStory) {
      // Flag a page whose newest story is more than two days old, which is the
      // symptom of a worker that has silently stopped publishing.
      var age = (Date.now() - Date.parse(entry.newestStory + "T00:00:00Z")) / 86400000;
      var cls = age > 2 ? "stale" : "fresh";
      bits.push('<span class="' + cls + '">newest story ' + entry.newestStory + "</span>");
    }
    if (entry.storyCount) bits.push(entry.storyCount + " stories");
    // Dashboard pages carry no digest markers, so fall back to describing the
    // page itself rather than leaving the strip blank.
    if (!bits.length && entry.note) bits.push(entry.note);
    if (entry.modifiedAt) {
      bits.push("updated " + new Date(entry.modifiedAt).toLocaleString());
    }
    return bits.join(" · ");
  }

  function paint() {
    var entry = meta[current];
    Array.prototype.forEach.call(tabs.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-selected", String(button.dataset.page === current));
    });
    summary.innerHTML = describe(entry);
    document.body.dataset.missing = entry && entry.exists === false ? "true" : "false";
  }

  function show(pageId, force) {
    if (!force && pageId === current && frame.getAttribute("src")) return;
    current = pageId;
    var entry = meta[pageId];
    var path = entry ? entry.path : "";
    // Cache-bust so a regenerated page is never served from the iframe cache.
    frame.setAttribute("src", "./site/" + path + "?t=" + Date.now());
    paint();
    fetch("./api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pageId })
    }).catch(function () {});
  }

  function refresh(force) {
    return fetch("./api/pages", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        meta = {};
        data.pages.forEach(function (entry) { meta[entry.id] = entry; });
        show(current, force);
      })
      .catch(function () { summary.textContent = "Unable to read pages from disk."; });
  }

  tabs.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-page]");
    if (button) show(button.dataset.page, true);
  });

  document.getElementById("reload").addEventListener("click", function () { refresh(true); });

  // The extension pushes changes here: agent-driven navigation and file writes
  // both arrive as events so the canvas tracks the working tree on its own.
  var events = new EventSource("./events");
  events.addEventListener("navigate", function (event) {
    var payload = JSON.parse(event.data);
    refresh(false).then(function () { show(payload.page, true); });
  });
  events.addEventListener("changed", function () { refresh(true); });

  refresh(true);
})();
</script>
</body>
</html>`;
}
