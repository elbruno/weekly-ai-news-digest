"""
Main entrypoint: fetch → summarise → generate page.

Usage:
    python scripts/generate_digest.py

Environment:
    GITHUB_TOKEN  — required; used for GitHub Models API
"""

import logging
import sys
from pathlib import Path

# Make scripts/ importable regardless of working directory
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    from fetch_news import fetch_stories
    from summarize_news import summarise_all
    from generate_page import generate_page

    logger.info("=== Weekly AI News Digest ===")

    logger.info("Step 1/3 — Fetching stories from RSS feeds …")
    stories = fetch_stories()
    if not stories:
        logger.warning("No stories found. Exiting.")
        sys.exit(0)
    logger.info("  → %d stories fetched", len(stories))

    logger.info("Step 2/3 — Summarising with GitHub Models …")
    stories = summarise_all(stories)
    logger.info("  → All stories summarised")

    logger.info("Step 3/3 — Generating HTML page …")
    out = generate_page(stories)
    logger.info("  → Done: %s", out)


if __name__ == "__main__":
    main()
