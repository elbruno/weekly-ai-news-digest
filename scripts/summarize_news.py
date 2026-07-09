"""Summarise news stories using GitHub Models (GPT-4o-mini)."""

import logging
import os

from openai import OpenAI

from config import GITHUB_MODELS_ENDPOINT, MODEL

logger = logging.getLogger(__name__)


def _build_client() -> OpenAI:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError(
            "GITHUB_TOKEN environment variable is required for GitHub Models."
        )
    return OpenAI(base_url=GITHUB_MODELS_ENDPOINT, api_key=token)


_SYSTEM_PROMPT = """\
You are an expert tech journalist writing a weekly digest for developers and AI practitioners.
For each news story you receive, respond with a JSON object (no markdown fences) with exactly:
  "tldr": "<2 concise sentences that capture the key facts>",
  "why_it_matters": "<1 sentence on impact or significance>",
  "tags": ["<tag1>", "<tag2>"]  (2-4 relevant tags from: AI, LLMs, Open Source, Security, Cloud, GitHub, Startups, Research, Tools, Policy)

Be factual, direct, and avoid hype. No marketing language."""

_USER_TEMPLATE = """\
Title: {title}
Source: {source}
Published: {published}
Original summary: {summary}

Summarise this story."""


def summarise_story(client: OpenAI, story: dict) -> dict:
    """Add 'tldr', 'why_it_matters', and 'tags' keys to the story dict."""
    import json

    prompt = _USER_TEMPLATE.format(
        title=story["title"],
        source=story["source"],
        published=story["published"].strftime("%Y-%m-%d"),
        summary=story["summary"] or "(no summary available)",
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        # Strip potential markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        story["tldr"] = data.get("tldr", "")
        story["why_it_matters"] = data.get("why_it_matters", "")
        story["tags"] = data.get("tags", [])
    except Exception as exc:
        logger.warning("Failed to summarise '%s': %s", story["title"], exc)
        story["tldr"] = story.get("summary", "")[:200]
        story["why_it_matters"] = ""
        story["tags"] = []

    return story


def summarise_all(stories: list[dict]) -> list[dict]:
    """Summarise all stories, returning them with AI fields populated."""
    client = _build_client()
    total = len(stories)
    for i, story in enumerate(stories, 1):
        logger.info("Summarising %d/%d: %s", i, total, story["title"])
        summarise_story(client, story)
    return stories
