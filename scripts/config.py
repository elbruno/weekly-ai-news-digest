"""Configuration for the weekly AI news digest."""

# Number of top stories to include in the digest
MAX_STORIES = 15

# Number of days back to look for news
DAYS_BACK = 7

# GitHub Models endpoint and model
GITHUB_MODELS_ENDPOINT = "https://models.inference.ai.azure.com"
MODEL = "gpt-4o-mini"

# RSS feeds to fetch (title, url)
FEEDS = [
    {
        "name": "TechCrunch AI",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "icon": "🤖",
        "weight": 1.3,
    },
    {
        "name": "GitHub Blog",
        "url": "https://github.blog/feed/",
        "icon": "🐙",
        "weight": 1.4,
    },
    {
        "name": "MIT Technology Review",
        "url": "https://www.technologyreview.com/feed/",
        "icon": "🔬",
        "weight": 1.2,
    },
    {
        "name": "Hacker News",
        "url": "https://hnrss.org/frontpage?count=30",
        "icon": "🔶",
        "weight": 1.0,
    },
    {
        "name": "Ars Technica",
        "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",
        "icon": "🔭",
        "weight": 1.1,
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/tech/index.xml",
        "icon": "📡",
        "weight": 1.0,
    },
    {
        "name": "VentureBeat AI",
        "url": "https://venturebeat.com/category/ai/feed/",
        "icon": "🧠",
        "weight": 1.2,
    },
]

# Output directory (relative to repo root)
OUTPUT_DIR = "output"

# Page metadata
SITE_TITLE = "Weekly AI News Digest"
SITE_DESCRIPTION = "The best AI & tech stories from last week, curated and summarized by AI."
SITE_URL = "https://elbruno.github.io/weekly-ai-news-digest"
AUTHOR = "El Bruno"
AUTHOR_URL = "https://github.com/elbruno"
REPO_URL = "https://github.com/elbruno/weekly-ai-news-digest"
