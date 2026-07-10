# Agentic Workflow Blog Visuals

## Hero image

| Property | Value |
| --- | --- |
| Purpose | Lead the blog post without presenting a generated image as product evidence. |
| Full-size filename | `agentic-workflow-hero.png` |
| Full-size dimensions | 1360 x 768 |
| Half-size filename | `agentic-workflow-hero-half.png` |
| Half-size dimensions | 680 x 384 |
| Alt text | Generated illustration of a safe, automated AI-news workflow moving from a code repository through review to a web digest. |
| Caption | Generated illustration. It represents the workflow concept and is not a screenshot of the product. |
| Prompt | A cinematic editorial hero illustration for a technical developer blog: an automated news pipeline represented by glowing cards flowing from a GitHub-style octocat-inspired code repository through a safe review checkpoint into a clean dark web dashboard, deep charcoal background, electric blue accents, subtle cyan highlights, modern flat-isometric style, high contrast, polished professional technology editorial art, ample dark negative space for title overlay, no text, no letters, no logos, no watermark, 16:9. |

## Generation status

Generation was attempted on 2026-07-10 with `t2i`:

* `foundry-mai2` could not resolve its configured Azure endpoint.
* `foundry-mai25` and `foundry-mai25-flash` rejected the CLI's `png` output format even though the service advertises `image/png`.
* A retry using only the default `t2i` parameters selected `foundry-mai25` and returned the same output-format rejection.

The post intentionally does not embed the hero image until the configured provider succeeds. When it does, generate the full asset at 1360 x 768, then resize it to 680 x 384 without changing the aspect ratio.
