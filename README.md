# 📰 Weekly AI News Digest

> **Agentic weekly digest of the best AI & tech news — auto-generated every Monday via GitHub Actions + GitHub Models.**

[![Weekly Digest](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news.yml/badge.svg)](https://github.com/elbruno/weekly-ai-news-digest/actions/workflows/weekly-news.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://elbruno.github.io/weekly-ai-news-digest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌐 Live Site

👉 **[https://elbruno.github.io/weekly-ai-news-digest](https://elbruno.github.io/weekly-ai-news-digest)**

A new digest is published every **Monday at 9:00 AM UTC** — or trigger one manually via [Actions → Run workflow](../../actions/workflows/weekly-news.yml).

---

## 🤖 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                  GitHub Actions (Monday 9am UTC)         │
│                                                         │
│  1. Fetch RSS feeds  →  AI/Tech sources (last 7 days)   │
│  2. Rank stories     →  Score by recency + engagement   │
│  3. Summarize        →  GitHub Models (GPT-4o-mini)     │
│  4. Generate HTML    →  Beautiful static page           │
│  5. Deploy           →  GitHub Pages (gh-pages branch)  │
└─────────────────────────────────────────────────────────┘
```

### News Sources

| Source | Feed |
|--------|------|
| 🤖 TechCrunch AI | `techcrunch.com/category/artificial-intelligence/feed/` |
| 🔬 MIT Tech Review | `technologyreview.com/feed/` |
| 🛠️ Hacker News | `hnrss.org/frontpage` |
| 🔭 Ars Technica | `feeds.arstechnica.com/arstechnica/technology-lab` |
| 🧠 VentureBeat AI | `feeds.feedburner.com/venturebeat/SFSN` |
| 📡 The Verge Tech | `theverge.com/rss/tech/index.xml` |
| 🐙 GitHub Blog | `github.blog/feed/` |

### AI Summarization

Summaries are generated using **[GitHub Models](https://github.com/marketplace/models)** (`gpt-4o-mini`) — free with your GitHub token, no extra API keys needed.

Each story gets:
- 📌 **TL;DR** — 2-sentence summary
- 🔑 **Why it matters** — impact explanation  
- 🔗 **Source link**

---

## 🛠️ Local Development

### Prerequisites

```bash
python >= 3.12
pip install -r requirements.txt
```

### Run Locally

```bash
# Set your GitHub token (for GitHub Models)
export GITHUB_TOKEN=ghp_your_token_here

# Generate digest for last 7 days
python scripts/generate_digest.py

# Output will be in ./output/index.html
```

### Manual Workflow Trigger

You can trigger the workflow manually from the [Actions tab](../../actions/workflows/weekly-news.yml) — no code push needed.

---

## ⚙️ Configuration

Edit [`scripts/config.py`](scripts/config.py) to customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_STORIES` | `15` | Max stories per digest |
| `DAYS_BACK` | `7` | Days of news to fetch |
| `MODEL` | `gpt-4o-mini` | GitHub Models model |
| `FEEDS` | (list) | RSS feeds to include |

---

## 📂 Project Structure

```
weekly-ai-news-digest/
├── .github/
│   └── workflows/
│       └── weekly-news.yml     # Scheduled workflow
├── scripts/
│   ├── config.py               # Configuration
│   ├── fetch_news.py           # RSS fetcher + scorer
│   ├── summarize_news.py       # GitHub Models AI summarizer
│   ├── generate_page.py        # HTML page generator
│   └── generate_digest.py      # Main entrypoint
├── docs/
│   └── template.html           # Page HTML template
├── output/                     # Generated site (git-ignored)
│   └── index.html
├── requirements.txt
└── README.md
```

---

## 🤝 Contributing

Suggestions for new news sources or improvements? Open an [issue](../../issues) or a PR!

---

## 📄 License

[MIT](LICENSE) © [El Bruno](https://github.com/elbruno)
