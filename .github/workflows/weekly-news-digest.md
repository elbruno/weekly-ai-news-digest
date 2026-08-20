---
on:
  schedule:
    - cron: "0 10 * * *"       # 06:00 ET during daylight saving (UTC schedule)
  workflow_dispatch:            # Manual trigger from Actions tab

engine:
  id: copilot
  model: gpt-5-mini

permissions:
  contents: read
  pull-requests: read
  copilot-requests: write

network:
  allowed:
    - defaults
    - "techcrunch.com"
    - "technologyreview.com"
    - "hnrss.org"
    - "feeds.arstechnica.com"
    - "arstechnica.com"
    - "theverge.com"
    - "venturebeat.com"
    - "github.blog"
    - "developer.microsoft.com"
    - "feeds.feedburner.com"

safe-outputs:
  create-pull-request:
    title-prefix: "📰 Daily AI News Digest – "
    labels: [digest, automated]
    draft: false
    base-branch: main
    allowed-files: [docs/index.html]
    preserve-branch-name: true
    recreate-ref: true
    max-patch-files: 5
    auto-close-issue: false

---

# Daily AI & Tech News Digest

You are an expert bilingual tech journalist. Your job is to research, curate, and summarize **up to 30 of the most important AI and technology stories from the last 14 days**, then write a polished static HTML page to `docs/index.html` with the final reader experience available in **English by default** and **Spanish**.

## Step 1 — Research

Fetch the following RSS feeds and extract all entries published in the last 14 days:

- `https://github.blog/changelog/feed/` ← **GitHub Changelog** (product & API updates)
- `https://developer.microsoft.com/api/changelog/rss` ← **Microsoft Developer Changelog** (unified Azure, GitHub, and Microsoft developer updates)
- `https://techcrunch.com/category/artificial-intelligence/feed/`
- `https://technologyreview.com/feed/`
- `https://hnrss.org/frontpage?count=30`
- `https://feeds.arstechnica.com/arstechnica/technology-lab`
- `https://theverge.com/rss/tech/index.xml`
- `https://venturebeat.com/category/ai/feed/`

For each entry capture: **title**, **URL**, **source name**, **published date**, **RSS categories/product metadata**, and a **plain-text excerpt**.

Before curation, deduplicate entries across all feeds:
- Normalize each URL by lowercasing the host and removing fragments, tracking parameters, and trailing slashes.
- Treat matching normalized URLs as the same story.
- When URLs differ or are missing, use a normalized title match as a fallback.
- The Microsoft Developer feed republishes some GitHub Changelog entries. Keep one copy; if the canonical URL is on `github.blog` or the RSS entry is categorized as GitHub, use **GitHub Changelog** as the source. Use **Microsoft Developer** for the other entries from that feed.
- Assign source from the canonical article origin, not from the feed that exposed it. A card whose URL host is `github.blog` must never use **Microsoft Developer** as its source.
- Every selected story must link to its exact article or changelog entry. Never substitute a publisher homepage or root URL (for example, `https://arstechnica.com/`) when the article URL is unavailable; omit that candidate instead.

## Step 2 — Curate

Select **up to 30 unique, important, and impactful stories**. Do not pad the digest with weak or out-of-window entries when fewer than 30 qualify. Apply these **hard allocation rules**:

**MANDATORY: The final digest MUST include:**
- **At least 15 stories combined from GitHub Changelog and Microsoft Developer** when those sources provide at least 15 qualifying unique entries. There is no separate minimum for either source.
- If the two priority sources provide fewer than 15 qualifying unique entries, include all of them.
- After satisfying the priority-source minimum, fill the remaining slots by developer-community importance. Additional GitHub Changelog and Microsoft Developer stories may be selected when they outrank other candidates.
- **At most 4 stories from any single other source** (e.g., TechCrunch, Ars Technica, The Verge, etc.)

Fill remaining slots with stories in this priority order:
1. Breakthrough AI/ML research or product launches (non-GitHub)
2. Developer tools or open-source announcements
3. Industry-shaping business or policy news

For each selected story, write:
- **TL;DR (English)** — 2 concise sentences with the key facts
- **TL;DR (Spanish)** — a faithful Spanish version of the English TL;DR, adapted for natural Spanish phrasing without adding new facts
- **Why it matters (English)** — 1 sentence on real-world impact
- **Why it matters (Spanish)** — a faithful Spanish version of the English impact sentence, adapted for natural Spanish phrasing without adding new facts
- **Importance** — exactly one of `High`, `Medium`, or `Low`, based on this rubric:
  - `High`: broad developer impact, urgent security or migration implications, a major platform/tooling change, or immediate action required.
  - `Medium`: a meaningful product, API, framework, research, or ecosystem change relevant to a substantial developer segment.
  - `Low`: a narrower announcement, regional availability update, incremental enhancement, or informational change with limited immediate action.
- **Tags** — 2–5 tags chosen only from: `AI`, `LLMs`, `Open Source`, `Security`, `Cloud`, `GitHub`, `Microsoft`, `Azure`, `.NET`, `DevOps`, `APIs`, `Databases`, `Data`, `Web`, `Mobile`, `Enterprise`, `Productivity`, `Developer Experience`, `Startups`, `Research`, `Tools`, `Policy`

Also produce a separate **GitHub-only highlights set**:
- Exactly 5 concise bullets in English and exactly 5 faithful Spanish versions for a top-page section named **"TL;DR — GitHub highlights"**
- These 5 bullets must be derived **only** from GitHub sources (`github.blog/changelog/` and any GitHub Blog items), not from other outlets

Also produce a separate **top takeaways set**:
- Exactly 5 concise bullets in English and exactly 5 faithful Spanish versions for the top-page section named **"TL;DR — Top takeaways"**
- These bullets must summarize the current digest across all selected sources.

## Step 3 — Generate Page

Read the reference design from `docs/template.html` to understand the visual style, then write a **complete, self-contained HTML5 file** to `docs/index.html`.

Requirements:
- Dark GitHub-themed design — background `#0d1117`, cards `#161b22`, accent `#58a6ff`
- **No external dependencies** — all CSS inline in a `<style>` block; no CDN links
- Header with "Daily AI & Tech News" title, covered date range, and story count
- Add a **language selector** with `English` and `Español`; English must be selected by default, and the selected language must persist in `localStorage`
- All user-facing digest content must be available in both languages: title, metadata, controls, filter labels, active-filter/result messages, AI Credit note, summary headings and bullets, story titles, TL;DR text, "Why it matters" labels/text, dates, read-more links, footer, and empty/result states
- Preserve source names, URLs, dates, tags, importance values, and machine-readable data attributes as language-neutral values; do not translate tags or importance values used in filtering/sorting
- Use `lang="en"` on the document by default and update it to `es` when Spanish is selected
- Add a **"TL;DR — Top takeaways" section at the top** (above the story list) with exactly 5 concise bullets summarizing the week in the selected language
- Add the **"TL;DR — GitHub highlights"** section with exactly 5 concise bullets in the selected language
- Implement **theme modes**: `system` (default), `light`, and `dark`; include a visible theme selector and persist user choice in `localStorage`
- Implement **filters**:
  - Source filter chips (e.g., GitHub Changelog, Microsoft Developer, TechCrunch, Ars Technica, The Verge, etc.) with multi-select support
  - Source filter must default to **GitHub Changelog and Microsoft Developer selected** on first load
  - Free-text keyword search that filters stories by title, source, TL;DR, why-it-matters text, importance, and tags in both English and Spanish
  - Label/tag filter chips that can be toggled (multi-select)
  - Importance filter chips for `Low`, `Medium`, and `High`
  - Visible active-filter summary and a **Clear all** control that clears search and every source/tag/importance selection, shows all stories, and returns sorting to curated rank
  - Display "Showing X of Y stories" based on active filters, where Y is the actual generated story count
- Implement **sorting** for curated rank, importance high-to-low, importance low-to-high, newest, and oldest
- Up to 30 ranked story cards, each showing in the selected language: numbered badge, source icon + name, linked title, accessible low-to-high importance icon plus visible importance label, TL;DR paragraph, "💡 Why it matters" callout, tag chips, publication date, "Read full story →" link
- Each card must include machine-readable `data-rank`, `data-published` (ISO date), `data-source`, `data-tags`, and `data-importance` attributes for filtering and sorting
- Stats bar showing story count and breakdown by source
- Read the numeric `workflow-run-id` from the built-in workflow context. In the stats bar, include this stable block once, replacing `RUN_ID` with that numeric value, so a deterministic post-run workflow can insert the final workflow AI Credit total without another AI call:
  `<!-- AI_CREDITS_START --><div class="stat" data-ai-credits-run-id="RUN_ID">AI Credits: <span data-ai-credits-value>Pending finalization</span> · <a href="./ai-credits.html">Usage history</a></div><!-- AI_CREDITS_END -->`
- Do not estimate, calculate, or replace the pending AI Credit value; the exact total is only available after this workflow finishes
- Immediately below the stats bar, explain that every successful scheduled and manual run is tracked and link to `./ai-credits.html` for daily, weekly, and monthly usage
- Footer: "Generated by [GitHub Agentic Workflows](https://github.github.com/gh-aw/) · Source: [elbruno/weekly-ai-news-digest](https://github.com/elbruno/weekly-ai-news-digest) · Deployed via GitHub Pages"
- Fully responsive for mobile

## Step 4 — Mandatory Preflight

Before writing `docs/index.html`, validate the final data and client behavior. Fix every failure instead of publishing a partial or non-compliant page:

- The page contains between 1 and 30 story cards.
- Canonical article URLs are unique, normalized titles are unique, and no story URL is only a site homepage/root path.
- GitHub Changelog plus Microsoft Developer account for at least 15 unique cards when at least 15 qualifying priority entries were available.
- Every `github.blog` story is labeled **GitHub Changelog**; **Microsoft Developer** is used only for non-GitHub entries discovered through the Microsoft Developer feed.
- Every card has exactly one `High`, `Medium`, or `Low` importance and 2–5 tags from the controlled taxonomy.
- Every card has non-empty `data-rank`, `data-published`, `data-source`, `data-tags`, `data-importance`, and `data-search` attributes.
- Search includes title, source, TL;DR, why-it-matters, importance, and tags.
- Search includes both English and Spanish story title, TL;DR, and why-it-matters content.
- Source, tag, and importance controls cover every distinct value present in the cards.
- English is the default visible language on first load, the language selector switches every user-facing digest string to Spanish without reloading, and the selected language persists in `localStorage`.
- The page contains exactly one `AI_CREDITS_START`/`AI_CREDITS_END` block whose numeric run ID equals the built-in `workflow-run-id`, with the pending value and `./ai-credits.html` link unchanged.
- The explanatory AI Credit tracking text and dashboard link are visible immediately below the stats bar.
- The **Clear all** handler empties all source/tag/importance selections, clears search, resets sorting to curated rank, visually deactivates every filter chip, and shows all stories.
- Sorting and filtering update the visible result count without changing the original curated rank badges.

The output file `docs/index.html` must be a valid, complete HTML document that renders correctly in a browser with no external resources.

## Step 5 — Publish

- After `docs/index.html` passes every preflight check, call the `create_pull_request` safe-output tool exactly once so the generated page is committed and proposed for publication.
- Use branch `digest/YYYY-MM-DD`, replacing the date with the current UTC date, and summarize the covered date range and story count in the pull request title and body.
- Never call `noop` after creating or modifying `docs/index.html`. Call `noop` only when the generated page is byte-for-byte identical to the existing file and no publication is needed.
