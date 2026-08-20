#!/usr/bin/env python3
"""Collect RSS/Atom feeds into a deterministic, validated digest snapshot."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


SCHEMA_VERSION = 1
MAX_FEED_BYTES = 5 * 1024 * 1024
MAX_EXCERPT_LENGTH = 2_000
TRACKING_PARAMETERS = {
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
}


@dataclass(frozen=True)
class Feed:
    name: str
    url: str
    priority: bool = False


FEEDS = (
    Feed("GitHub Changelog", "https://github.blog/changelog/feed/", True),
    Feed(
        "Microsoft Developer",
        "https://developer.microsoft.com/api/changelog/rss",
        True,
    ),
    Feed(
        "TechCrunch AI",
        "https://techcrunch.com/category/artificial-intelligence/feed/",
    ),
    Feed("MIT Technology Review", "https://technologyreview.com/feed/"),
    Feed("Hacker News", "https://hnrss.org/frontpage?count=30"),
    Feed(
        "Ars Technica",
        "https://feeds.arstechnica.com/arstechnica/technology-lab",
    ),
    Feed("The Verge", "https://theverge.com/rss/tech/index.xml"),
    Feed("VentureBeat AI", "https://venturebeat.com/category/ai/feed/"),
)


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.ignored_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style"}:
            self.ignored_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style"} and self.ignored_depth:
            self.ignored_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.ignored_depth:
            self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.parts)).strip()


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def child_text(element: ET.Element, *names: str) -> str:
    wanted = {name.lower() for name in names}
    for child in element:
        if local_name(child.tag) in wanted:
            return "".join(child.itertext()).strip()
    return ""


def clean_text(value: str, limit: int = MAX_EXCERPT_LENGTH) -> str:
    parser = TextExtractor()
    parser.feed(html.unescape(value or ""))
    parser.close()
    return parser.text()[:limit]


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_url(value: str) -> str:
    value = html.unescape((value or "").strip())
    if not value:
        return ""
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    query = [
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in TRACKING_PARAMETERS
    ]
    path = parsed.path.rstrip("/") or "/"
    host = (parsed.hostname or "").lower()
    if parsed.port:
        host = f"{host}:{parsed.port}"
    return urlunsplit(
        (parsed.scheme.lower(), host, path, urlencode(sorted(query)), "")
    )


def normalize_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def article_source(feed: Feed, url: str, categories: list[str]) -> str:
    host = (urlsplit(url).hostname or "").lower()
    if host == "github.blog" or host.endswith(".github.blog"):
        return "GitHub Changelog"
    if feed.name == "Microsoft Developer" and any(
        "github" in category.lower() for category in categories
    ):
        return "GitHub Changelog"
    return feed.name


def entry_link(entry: ET.Element) -> str:
    for child in entry:
        if local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href", "")
        rel = child.attrib.get("rel", "alternate")
        if href and rel in {"alternate", ""}:
            return href
        if child.text and child.text.strip():
            return child.text.strip()
    return child_text(entry, "guid")


def parse_feed(document: bytes, feed: Feed) -> list[dict[str, object]]:
    root = ET.fromstring(document)
    entries = [
        element
        for element in root.iter()
        if local_name(element.tag) in {"item", "entry"}
    ]
    articles: list[dict[str, object]] = []
    for entry in entries:
        title = clean_text(child_text(entry, "title"), 500)
        url = normalize_url(entry_link(entry))
        published = parse_date(
            child_text(entry, "pubdate", "published", "updated", "date")
        )
        if not title or not url or published is None:
            continue
        categories = sorted(
            {
                clean_text(child.attrib.get("term", "") or (child.text or ""), 200)
                for child in entry
                if local_name(child.tag) == "category"
            }
            - {""}
        )
        excerpt = clean_text(
            child_text(entry, "description", "summary", "content", "encoded")
        )
        articles.append(
            {
                "title": title,
                "url": url,
                "source": article_source(feed, url, categories),
                "publishedAt": published.isoformat().replace("+00:00", "Z"),
                "categories": categories,
                "excerpt": excerpt,
            }
        )
    return articles


def fetch_url(url: str) -> bytes:
    request = Request(
        url,
        headers={
            "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml",
            "User-Agent": "weekly-ai-news-digest/1.0 (+https://github.com/elbruno/weekly-ai-news-digest)",
        },
    )
    with urlopen(request, timeout=30) as response:
        document = response.read(MAX_FEED_BYTES + 1)
    if len(document) > MAX_FEED_BYTES:
        raise ValueError(f"feed exceeds {MAX_FEED_BYTES} bytes")
    return document


def deduplicate(articles: list[dict[str, object]]) -> list[dict[str, object]]:
    by_url: dict[str, dict[str, object]] = {}
    title_to_url: dict[str, str] = {}
    for article in articles:
        url = str(article["url"])
        title_key = normalize_title(str(article["title"]))
        existing_url = url if url in by_url else title_to_url.get(title_key)
        if existing_url:
            existing = by_url[existing_url]
            if article["source"] == "GitHub Changelog":
                existing["source"] = "GitHub Changelog"
            existing["categories"] = sorted(
                set(existing["categories"]) | set(article["categories"])
            )
            if len(str(article["excerpt"])) > len(str(existing["excerpt"])):
                existing["excerpt"] = article["excerpt"]
            continue
        by_url[url] = article
        title_to_url[title_key] = url
    return sorted(
        by_url.values(),
        key=lambda item: (str(item["publishedAt"]), str(item["title"]).lower()),
        reverse=True,
    )


def canonical_bytes(payload: dict[str, object]) -> bytes:
    return json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def build_snapshot(
    now: datetime,
    fetcher: Callable[[str], bytes] = fetch_url,
    feeds: tuple[Feed, ...] = FEEDS,
) -> dict[str, object]:
    now = now.astimezone(timezone.utc)
    window_start = now - timedelta(days=14)
    source_results: list[dict[str, object]] = []
    candidates: list[dict[str, object]] = []

    for feed in feeds:
        try:
            parsed = parse_feed(fetcher(feed.url), feed)
            eligible = [
                article
                for article in parsed
                if window_start
                <= datetime.fromisoformat(
                    str(article["publishedAt"]).replace("Z", "+00:00")
                )
                <= now + timedelta(days=1)
            ]
            candidates.extend(eligible)
            source_results.append(
                {
                    "name": feed.name,
                    "url": feed.url,
                    "priority": feed.priority,
                    "status": "ok",
                    "entryCount": len(eligible),
                }
            )
        except (ET.ParseError, OSError, ValueError) as error:
            source_results.append(
                {
                    "name": feed.name,
                    "url": feed.url,
                    "priority": feed.priority,
                    "status": "error",
                    "entryCount": 0,
                    "error": clean_text(str(error), 300),
                }
            )

    articles = deduplicate(candidates)
    if not articles:
        raise ValueError("snapshot contains no eligible articles")
    if not any(
        source["priority"] and source["status"] == "ok"
        for source in source_results
    ):
        raise ValueError("all priority feeds failed")

    payload: dict[str, object] = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "window": {
            "from": window_start.isoformat().replace("+00:00", "Z"),
            "to": now.isoformat().replace("+00:00", "Z"),
            "days": 14,
        },
        "sources": source_results,
        "articles": articles,
    }
    digest = hashlib.sha256(canonical_bytes(payload)).hexdigest()
    payload["snapshotId"] = f"{now:%Y-%m-%d}-{digest[:12]}"
    payload["checksum"] = f"sha256:{digest}"
    return payload


def validate_snapshot(snapshot: dict[str, object], expected_id: str | None = None) -> None:
    if snapshot.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError(f"unsupported snapshot schema: {snapshot.get('schemaVersion')}")
    snapshot_id = snapshot.get("snapshotId")
    if expected_id and snapshot_id != expected_id:
        raise ValueError(f"expected snapshot {expected_id}, found {snapshot_id}")
    if not isinstance(snapshot.get("articles"), list) or not snapshot["articles"]:
        raise ValueError("snapshot must contain at least one article")
    unsigned = {
        key: value
        for key, value in snapshot.items()
        if key not in {"snapshotId", "checksum"}
    }
    digest = hashlib.sha256(canonical_bytes(unsigned)).hexdigest()
    if snapshot.get("checksum") != f"sha256:{digest}":
        raise ValueError("snapshot checksum does not match its content")
    generated_at = datetime.fromisoformat(
        str(snapshot["generatedAt"]).replace("Z", "+00:00")
    )
    if snapshot_id != f"{generated_at:%Y-%m-%d}-{digest[:12]}":
        raise ValueError("snapshot ID does not match its content")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--github-output", type=Path)
    parser.add_argument("--validate", type=Path)
    parser.add_argument("--expected-id")
    parser.add_argument("--now", help="ISO-8601 timestamp used for reproducible tests")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.validate:
            snapshot = json.loads(args.validate.read_text(encoding="utf-8"))
            validate_snapshot(snapshot, args.expected_id)
            print(
                f"Validated {snapshot['snapshotId']} "
                f"with {len(snapshot['articles'])} articles"
            )
            return 0

        if not args.output:
            raise ValueError("--output is required when collecting a snapshot")
        now = (
            datetime.fromisoformat(args.now.replace("Z", "+00:00"))
            if args.now
            else datetime.now(timezone.utc)
        )
        snapshot = build_snapshot(now)
        validate_snapshot(snapshot)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        if args.github_output:
            with args.github_output.open("a", encoding="utf-8") as output:
                output.write(f"snapshot_id={snapshot['snapshotId']}\n")
                output.write(f"article_count={len(snapshot['articles'])}\n")
        print(
            f"Created {snapshot['snapshotId']} "
            f"with {len(snapshot['articles'])} articles"
        )
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Snapshot error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
