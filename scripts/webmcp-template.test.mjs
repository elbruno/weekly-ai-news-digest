import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templatePath = new URL("../docs/template.html", import.meta.url);
const template = await readFile(templatePath, "utf8");

const tools = [
  "search_digest",
  "filter_digest",
  "list_visible_stories",
  "get_story_details",
  "get_story_url",
  "reset_digest_filters",
  "set_digest_language",
  "set_digest_sort"
];

test("the digest template progressively registers the WebMCP tool set", () => {
  assert.match(template, /document\.modelContext/);
  assert.match(template, /registerTool/);
  assert.match(template, /if \(!document\.modelContext \|\| typeof document\.modelContext\.registerTool !== "function"\) return;/);

  for (const tool of tools) {
    assert.match(template, new RegExp(`name: "${tool}"`));
  }
});

test("the digest template displays the current browser's WebMCP support", () => {
  assert.match(template, /id="webmcpSupport"/);
  assert.match(template, /WebMCP: Checking browser support/);
  assert.match(template, /WebMCP: Supported/);
  assert.match(template, /WebMCP: Not supported/);
  assert.match(template, /function updateWebMcpSupport\(\)/);
  assert.match(template, /updateWebMcpSupport\(\);/);
});

test("WebMCP tools retain the digest's local story data contract", () => {
  for (const attribute of [
    "data-rank",
    "data-published",
    "data-tags",
    "data-source",
    "data-importance",
    "data-search"
  ]) {
    assert.match(template, new RegExp(attribute));
  }

  assert.match(template, /untrustedContentHint: true/);
  assert.match(template, /does not fetch external articles/);
  assert.doesNotMatch(template, /fetch\s*\(/);
});
