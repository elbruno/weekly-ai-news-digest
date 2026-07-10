# Agentic Workflow Blog Post Plan

Date: 2026-07-10

## Hired specialist agent (for this project workflow)

**Agent name:** DigestOps Editor  
**Role:** Docs/Blog Specialist for Agentic Workflow content  
**Mission:** Explain workflow changes clearly, keep technical accuracy with `.github/workflows/weekly-news-digest.md`, and prepare publish-ready blog content in `docs/blog/`.

### Responsibilities

1. Draft blog post structure and technical narrative.
2. Keep terminology aligned with GitHub Agentic Workflows (gh-aw), safe outputs, and GitHub Pages deployment.
3. Use the `t2i` skill to generate supporting editorial visuals from approved prompts; use predictable filenames, store assets in `docs/blog/assets/`, and never include credentials in prompts or source files.
4. Capture screenshots of the implemented digest UI and workflow behavior rather than substituting generated images for product evidence.
5. Ensure final post and visual assets remain consistent with this repo’s GitHub-first digest strategy.

---

## Implementation plan

## Phase 1 — Blog draft and approval (now)

### Goal
Produce an approval-ready draft for how the new Agentic Workflow works.

### Deliverables
1. `docs/blog/2026-07-10-how-agentic-workflow-works.md` (draft)
2. Sections:
   - Why this workflow exists
   - Architecture overview (gh-aw + Pages)
   - Daily run and 14-day lookback
   - Curation rules (GitHub-first + source caps)
   - UI behavior (theme, source/tag/search filters)
   - Safety and delivery path (safe-outputs PR + merge + deploy)
   - Operational tips and troubleshooting
3. Approval gate: your review comments on scope, tone, and depth.

## Phase 2 — Supporting visuals and product screenshots

### Goal
Add clearly labeled generated supporting visuals and accurate screenshots of the implemented experience.

### Deliverables
1. Asset brief (`docs/blog/assets/brief-agentic-workflow-visuals.md`) with the prompt, intended placement, filename, dimensions, alt text, and caption for every asset.
2. Generate 3–5 supporting visuals with the `t2i` skill (default provider: `foundry-flux2`) and explicit `--output` paths:
   - End-to-end workflow diagram
   - Data source/cadence diagram
   - Editorial hero image or conceptual illustration
   Do not generate screenshot-style product UI; reserve UI claims for actual screenshots.
3. Capture actual screenshots in `docs/blog/assets/screenshots/` from the locally rendered or deployed digest:
   - Default GitHub source filter and GitHub-only TL;DR block
   - Source/tag/search filtering interaction
   - Theme behavior, when relevant to the narrative
   Use stable viewport dimensions, remove/redact any sensitive or personal data, and record the URL or local route plus capture date in the asset brief.
4. Add alt text + captions that distinguish **Generated illustration** from **Product screenshot**.
5. Embed only approved assets into the post using relative paths.
6. Approval gate: visual style, screenshot accuracy, and technical correctness approved.

## Phase 3 — Publication QA and release

### Goal
Publish final blog post with visuals and valid links.

### Checklist
1. Verify links to:
   - `https://github.github.com/gh-aw/`
   - `https://github.blog/changelog/feed/`
   - repo workflow files
2. Verify screenshots match implemented behavior (GitHub default source filter + GitHub-only TL;DR block), current UI labels, and the cited capture context.
3. Verify generated illustrations are labeled as such and do not imply product behavior.
4. Verify Markdown rendering in `docs/blog/`.
5. Merge and confirm Pages reflects content.

Approval gate: final content sign-off from you.

---

## Draft outline for the post

1. Introduction: what changed and why
2. What is GitHub Agentic Workflows in this project
3. Workflow anatomy (trigger, research, curate, generate, PR, deploy)
4. Why GitHub is the default lens
5. UX enhancements (TL;DR, source filter, labels, search, themes)
6. Reliability and safety model
7. Supporting visuals and product screenshots
8. Closing notes

---

## Open decisions for your next review

1. Preferred tone: technical deep dive vs builder-friendly walkthrough
2. Desired post length: short (5–7 min read) vs long (10–12 min read)
3. Visual style direction for generated assets: clean diagrams vs stylized illustrations
4. Whether to include a “lessons learned” section from real runs
