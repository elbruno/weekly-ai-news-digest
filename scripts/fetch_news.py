"""Fetch and score news stories from RSS feeds."""

import logging
from datetime import datetime, timezone, timedelta

import feedparser
import requests
from dateutil import parser as dateutil_parser

from config import FEEDS, DAYS_BACK, MAX_STORIES

logger = logging.getLogger(__name__)


def _parse_date(entry) -> datetime | None:
    """Extract and normalise a published date from a feed entry."""
    for attr in ("published", "updated", "created"):
        raw = entry.get(f"{attr}_parsed") or entry.get(attr)
        if raw is None:
            continue
        try:
            if hasattr(raw, "tm_year"):
                import time
                return datetime(*raw[:6], tzinfo=timezone.utc)
            return dateutil_parser.parse(str(raw)).astimezone(timezone.utc)
        except Exception:
            continue
    return None


def _score_entry(entry: dict, feed_weight: float, now: datetime) -> float:
    """
    Score a story on recency and source weight.
    Newer stories score higher; source weight amplifies the base score.
    """
    pub = entry.get("_published")
    if pub is None:
        return 0.0
    age_hours = max(0.0, (now - pub).total_seconds() / 3600)
    # Exponential decay: half-life ~36 h
    recency = 1.0 / (1.0 + age_hours / 36.0)
    return recency * feed_weight


def fetch_stories() -> list[dict]:
    """
    Fetch stories from all configured feeds published in the last DAYS_BACK days.
    Returns a ranked list of up to MAX_STORIES dicts, each with keys:
      title, url, summary, source, icon, published, score
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)
    now = datetime.now(timezone.utc)
    all_stories: list[dict] = []
    seen_urls: set[str] = set()

    for feed_cfg in FEEDS:
        feed_name = feed_cfg["name"]
        feed_url = feed_cfg["url"]
        weight = feed_cfg.get("weight", 1.0)
        icon = feed_cfg.get("icon", "📰")

        logger.info("Fetching %s …", feed_name)
        try:
            # feedparser follows redirects and handles most encoding issues
            parsed = feedparser.parse(
                feed_url,
                request_headers={"User-Agent": "weekly-ai-news-digest/1.0"},
            )
        except Exception as exc:
            logger.warning("Failed to fetch %s: %s", feed_name, exc)
            continue

        for entry in parsed.entries:
            url = entry.get("link", "").strip()
            if not url or url in seen_urls:
                continue

            pub = _parse_date(entry)
            if pub is None or pub < cutoff:
                continue

            # Build a clean summary from description / content
            summary = ""
            if entry.get("summary"):
                summary = entry.summary
            elif entry.get("content"):
                summary = entry.content[0].get("value", "")

            # Strip HTML tags for the AI prompt (keep it lightweight)
            from html.parser import HTMLParser

            class _Strip(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.parts: list[str] = []

                def handle_data(self, data):
                    self.parts.append(data)

            stripper = _Strip()
            stripper.feed(summary)
            plain_summary = " ".join(stripper.parts).strip()
            plain_summary = " ".join(plain_summary.split())[:600]  # cap at 600 chars

            story = {
                "title": entry.get("title", "Untitled").strip(),
                "url": url,
                "summary": plain_summary,
                "source": feed_name,
                "icon": icon,
                "published": pub,
                "_published": pub,
            }
            story["score"] = _score_entry(story, weight, now)
            all_stories.append(story)
            seen_urls.add(url)

    # Sort descending by score, keep top N
    all_stories.sort(key=lambda s: s["score"], reverse=True)
    top = all_stories[:MAX_STORIES]

    logger.info("Fetched %d total stories, keeping top %d", len(all_stories), len(top))
    return top
