"""Generate a static HTML page for the weekly digest."""

import os
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from config import (
    OUTPUT_DIR,
    SITE_TITLE,
    SITE_DESCRIPTION,
    SITE_URL,
    AUTHOR,
    AUTHOR_URL,
    REPO_URL,
    DAYS_BACK,
)


def generate_page(stories: list[dict]) -> Path:
    """Render and write output/index.html. Returns the output path."""
    repo_root = Path(__file__).parent.parent
    output_dir = repo_root / OUTPUT_DIR
    output_dir.mkdir(exist_ok=True)

    env = Environment(
        loader=FileSystemLoader(str(repo_root / "docs")),
        autoescape=True,
    )
    template = env.get_template("template.html")

    now = datetime.now(timezone.utc)
    week_label = now.strftime("Week of %B %d, %Y")

    # Group stories by source for the sidebar summary
    sources: dict[str, int] = {}
    for s in stories:
        sources[s["source"]] = sources.get(s["source"], 0) + 1

    html = template.render(
        title=SITE_TITLE,
        description=SITE_DESCRIPTION,
        site_url=SITE_URL,
        author=AUTHOR,
        author_url=AUTHOR_URL,
        repo_url=REPO_URL,
        week_label=week_label,
        generated_at=now.strftime("%Y-%m-%d %H:%M UTC"),
        days_back=DAYS_BACK,
        stories=stories,
        sources=sources,
        story_count=len(stories),
    )

    out_path = output_dir / "index.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"✅ Page written to {out_path}")
    return out_path
