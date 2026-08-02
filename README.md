[![Editorial illustration of a weekly AI news digest](docs/assets/weekly-ai-news-digest-header.png)](docs/assets/weekly-ai-news-digest-header.png)

# Weekly AI News Digest

> **Agentic digest of the best AI and technology news, generated daily with [GitHub Agentic Workflows](https://github.github.com/gh-aw/).**

[![Weekly Digest](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news-digest.lock.yml/badge.svg)](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news-digest.lock.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://elbruno.github.io/weekly-ai-news-digest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Live Site

**[Read the latest digest](https://elbruno.github.io/weekly-ai-news-digest)**

**[View daily, weekly, and monthly AI Credit usage](https://elbruno.github.io/weekly-ai-news-digest/ai-credits.html)**

A new digest is published every day. The project tracks the exact AI Credits used by every successful scheduled and manual run; the dashboard shows the resulting daily, ISO-weekly, and monthly totals. You can also trigger a run manually from [Actions](../../actions/workflows/weekly-news-digest.lock.yml).

## How It Works

```text
GitHub Agentic Workflows (daily)
  -> Research eight RSS feeds from the last 14 days
  -> Deduplicate and curate up to 30 developer-relevant stories
  -> Write docs/index.html
  -> Create a scoped safe-outputs pull request
  -> Auto-merge the trusted digest PR
  -> Deterministically audit and record final AI Credit usage
  -> Deploy the finalized docs/ with GitHub Pages
```

The agent has read-only repository permissions in a sandboxed container. It researches approved sources and prepares its output; a separate `safe_outputs` job creates the pull request after threat detection. The agent never writes directly to the repository.

After auto-merge, a traditional GitHub Actions job reads the authoritative `gh aw audit` total, updates the digest's AI Credit stat, appends the run to `docs/data/ai-credits.json`, and deploys the exact finalized commit. This second job uses no AI. The [AI Credit dashboard](https://elbruno.github.io/weekly-ai-news-digest/ai-credits.html) groups every successful scheduled and manual run by UTC day, ISO week, and calendar month.

The merge, credit reconciliation, and Pages deployment jobs share one serialized workflow. Credit updates retry from the latest `main` branch when another writer wins the push race, and Pages deploys the exact reconciled commit rather than a moving branch tip.

## What the Digest Includes

- A GitHub and Microsoft Developer-priority selection of AI and developer-platform news.
- At least 15 combined GitHub/Microsoft Developer stories when enough qualifying entries are available.
- Cross-feed deduplication for stories republished by the unified Microsoft Developer feed.
- A GitHub-only TL;DR highlights section.
- Concise summaries, developer impact notes, and Low/Medium/High importance indicators for every story.
- Source, tag, and importance filters; rank/importance/date sorting; clear-all controls; full-text search; and a responsive dark, light, or system theme.
- The exact AI Credits used by the workflow run that generated the published digest.
- A no-AI usage dashboard with per-run history and UTC daily, ISO-weekly, and monthly totals.

## AI Credit Tracking

The generated digest initially contains a stable pending-credit marker associated with its GitHub Actions run ID. After the digest pull request is merged, the deterministic publishing job:

1. Audits successful digest runs with `gh aw audit`.
2. Upserts exact `metrics.aic` values into `docs/data/ai-credits.json`, keyed by run ID.
3. Replaces the published digest's pending marker only when its run ID matches the history record.
4. Deploys that finalized commit to GitHub Pages.

`scripts/update-ai-credit-usage.mjs` performs the validation and updates using only Node.js standard-library APIs. Scheduled and manually dispatched successful runs are both included; multiple runs on the same day are summed in the UTC period charts.

### News Sources

| Source | Feed |
| --- | --- |
| GitHub Changelog | `github.blog/changelog/feed/` |
| Microsoft Developer Changelog | `developer.microsoft.com/api/changelog/rss` |
| TechCrunch AI | `techcrunch.com/category/artificial-intelligence/feed/` |
| MIT Technology Review | `technologyreview.com/feed/` |
| Hacker News | `hnrss.org/frontpage` |
| Ars Technica | `feeds.arstechnica.com/arstechnica/technology-lab` |
| The Verge | `theverge.com/rss/tech/index.xml` |
| VentureBeat AI | `venturebeat.com/category/ai/feed/` |

## Project Structure

```text
weekly-ai-news-digest/
├── .github/
│   ├── agents/agentic-workflows.md       # Agent instructions
│   ├── workflows/weekly-news-digest.md   # Workflow prompt and frontmatter
│   ├── workflows/weekly-news-digest.lock.yml # Compiled workflow
│   └── workflows/auto-merge-digest.yml   # Merge, credit collector, and exact-SHA deploy
├── docs/
│   ├── assets/                           # README media
│   ├── blog/                             # Blog post, visuals, and screenshots
│   ├── data/ai-credits.json              # Per-run AI Credit history
│   ├── ai-credits.html                   # Daily/weekly/monthly usage dashboard
│   ├── index.html                        # Generated digest site
│   └── template.html                     # Reference design for the agent
├── scripts/
│   ├── update-ai-credit-usage.mjs        # Audit/history/page updater
│   └── update-ai-credit-usage.test.mjs   # Deterministic updater tests
└── README.md
```

## Customizing the Workflow

Edit [`.github/workflows/weekly-news-digest.md`](.github/workflows/weekly-news-digest.md) to change the prompt. If you change frontmatter such as triggers, network rules, or safe outputs, recompile it:

```bash
gh extension install github/gh-aw
gh aw compile .github/workflows/weekly-news-digest.md
```

Commit both the Markdown definition and its updated `.lock.yml` file.

If you change the AI Credit marker, data schema, or publishing flow, update `docs/template.html`, `scripts/update-ai-credit-usage.mjs`, and `.github/workflows/auto-merge-digest.yml` together.

## About the Author

Hi! I'm **ElBruno** 🧡, a passionate developer and content creator exploring AI, .NET, and modern development practices.

**Made with ❤️ by [ElBruno](https://github.com/elbruno)**

- Podcast: [No Tienen Nombre](https://notienenombre.com) — Spanish-language episodes on AI, development, and tech culture.
- Blog: [ElBruno.com](https://elbruno.com) — Deep dives on embeddings, RAG, .NET, and local AI.
- YouTube: [youtube.com/elbruno](https://www.youtube.com/elbruno) — Demos, tutorials, and live coding.
- LinkedIn: [@elbruno](https://www.linkedin.com/in/elbruno/) — Professional updates and insights.
- X: [@elbruno](https://www.x.com/elbruno/) — Quick tips, releases, and tech news.

## License

[MIT](LICENSE) © [ElBruno](https://github.com/elbruno)
