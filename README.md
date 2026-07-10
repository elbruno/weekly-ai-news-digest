[![Editorial illustration of a weekly AI news digest](docs/assets/weekly-ai-news-digest-header.png)](docs/assets/weekly-ai-news-digest-header.png)

# Weekly AI News Digest

> **Agentic weekly digest of the best AI and technology news, generated every Monday with [GitHub Agentic Workflows](https://github.github.com/gh-aw/).**

[![Weekly Digest](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news-digest.lock.yml/badge.svg)](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news-digest.lock.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://elbruno.github.io/weekly-ai-news-digest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Live Site

**[Read the latest digest](https://elbruno.github.io/weekly-ai-news-digest)**

A new digest is published every Monday. You can also trigger a run manually from [Actions](../../actions/workflows/weekly-news-digest.lock.yml).

## How It Works

```text
GitHub Agentic Workflows (every Monday)
  -> Research seven RSS feeds from the last 14 days
  -> Curate 15 developer-relevant stories
  -> Write docs/index.html
  -> Create a scoped safe-outputs pull request
  -> Auto-merge the trusted digest PR
  -> Deploy docs/ with GitHub Pages
```

The agent has read-only repository permissions in a sandboxed container. It researches approved sources and prepares its output; a separate `safe_outputs` job creates the pull request after threat detection. The agent never writes directly to the repository.

## What the Digest Includes

- A GitHub-first selection of AI and developer-platform news.
- A GitHub-only TL;DR highlights section.
- Concise summaries and developer impact notes for every story.
- Source and tag filters, full-text search, and a responsive dark, light, or system theme.

### News Sources

| Source | Feed |
| --- | --- |
| GitHub Changelog | `github.blog/changelog/feed/` |
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
│   └── workflows/auto-merge-digest.yml   # Trusted digest PR auto-merge
├── docs/
│   ├── assets/                           # README media
│   ├── blog/                             # Blog post, visuals, and screenshots
│   ├── index.html                        # Generated digest site
│   └── template.html                     # Reference design for the agent
└── README.md
```

## Customizing the Workflow

Edit [`.github/workflows/weekly-news-digest.md`](.github/workflows/weekly-news-digest.md) to change the prompt. If you change frontmatter such as triggers, network rules, or safe outputs, recompile it:

```bash
gh extension install github/gh-aw
gh aw compile .github/workflows/weekly-news-digest.md
```

Commit both the Markdown definition and its updated `.lock.yml` file.

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
