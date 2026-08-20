import importlib.util
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path


SCRIPT = Path(__file__).with_name("collect-news-snapshot.py")
SPEC = importlib.util.spec_from_file_location("collect_news_snapshot", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


RSS = b"""<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>GitHub launches a useful feature</title>
      <link>https://github.blog/changelog/2026-01-09-feature/?utm_source=rss#top</link>
      <pubDate>Fri, 09 Jan 2026 12:00:00 GMT</pubDate>
      <category>GitHub Copilot</category>
      <description><![CDATA[<p>A <strong>developer</strong> update.</p><script>ignore()</script>]]></description>
    </item>
    <item>
      <title>Old story</title>
      <link>https://example.com/old</link>
      <pubDate>Mon, 01 Dec 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>"""

ATOM = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>GitHub launches a useful feature</title>
    <link href="https://github.blog/changelog/2026-01-09-feature/" />
    <updated>2026-01-09T12:00:00Z</updated>
    <category term="GitHub" />
    <summary>A longer developer update with more detail.</summary>
  </entry>
  <entry>
    <title>Independent AI release</title>
    <link href="https://example.com/ai-release?ref=rss" />
    <published>2026-01-08T10:30:00Z</published>
    <summary>Release details.</summary>
  </entry>
</feed>"""


class SnapshotTests(unittest.TestCase):
    def test_normalizes_urls_and_plain_text(self):
        feed = MODULE.Feed("GitHub Changelog", "https://feed.example", True)
        article = MODULE.parse_feed(RSS, feed)[0]

        self.assertEqual(
            article["url"],
            "https://github.blog/changelog/2026-01-09-feature",
        )
        self.assertEqual(article["excerpt"], "A developer update.")
        self.assertEqual(article["source"], "GitHub Changelog")

    def test_builds_valid_deduplicated_snapshot(self):
        feeds = (
            MODULE.Feed("GitHub Changelog", "https://one.example", True),
            MODULE.Feed("Microsoft Developer", "https://two.example", True),
        )
        documents = {
            "https://one.example": RSS,
            "https://two.example": ATOM,
        }

        snapshot = MODULE.build_snapshot(
            datetime(2026, 1, 10, tzinfo=timezone.utc),
            documents.__getitem__,
            feeds,
        )

        MODULE.validate_snapshot(snapshot, snapshot["snapshotId"])
        self.assertEqual(len(snapshot["articles"]), 2)
        duplicate = next(
            article
            for article in snapshot["articles"]
            if article["title"] == "GitHub launches a useful feature"
        )
        self.assertEqual(duplicate["source"], "GitHub Changelog")
        self.assertEqual(
            duplicate["excerpt"],
            "A longer developer update with more detail.",
        )

    def test_checksum_detects_mutation(self):
        feed = MODULE.Feed("GitHub Changelog", "https://one.example", True)
        snapshot = MODULE.build_snapshot(
            datetime(2026, 1, 10, tzinfo=timezone.utc),
            lambda _: RSS,
            (feed,),
        )
        snapshot["articles"][0]["title"] = "Tampered"

        with self.assertRaisesRegex(ValueError, "checksum"):
            MODULE.validate_snapshot(snapshot)

    def test_requires_a_priority_feed(self):
        feed = MODULE.Feed("Other", "https://broken.example")

        with self.assertRaisesRegex(ValueError, "no eligible articles"):
            MODULE.build_snapshot(
                datetime(2026, 1, 10, tzinfo=timezone.utc),
                lambda _: (_ for _ in ()).throw(OSError("offline")),
                (feed,),
            )


if __name__ == "__main__":
    unittest.main()
