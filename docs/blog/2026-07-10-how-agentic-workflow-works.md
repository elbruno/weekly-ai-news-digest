# I built a weekly AI news digest with GitHub Agentic Workflows. Here is how it works.

_This blog post was created with the help of AI tools. I used them to organize ideas and write a first draft, but the workflow, the code, the testing, and the 🤖 enthusiasm are mine._

Hi!

I like reading AI news. I do not like opening seven tabs, comparing five versions of the same announcement, and wondering whether the most important developer update was hidden under an article about a robot making coffee.

So I built a small project: [Weekly AI News Digest](https://github.com/elbruno/weekly-ai-news-digest).

It is a static site that collects relevant AI and technology stories, turns them into a readable digest, and publishes the result with GitHub Pages. The interesting part is not the HTML page. The interesting part is that the workflow is driven by [GitHub Agentic Workflows](https://github.github.com/gh-aw/).

In other words: an agent researches, curates, writes the page, and proposes the change. GitHub still keeps the dangerous part of the process behind a controlled pull request.

That balance is the whole point.

## I did not want another news scraper

A normal news scraper is easy to imagine:

1. Fetch RSS feeds.
2. Print links.
3. Add a sad `README.md`.
4. Promise to improve it later.

The problem is that a list of links is not a digest.

For a weekly briefing, I want context:

* What happened?
* Why should a developer care?
* Which stories are actually important?
* Which ones are related to GitHub, Copilot, developer tools, security, or AI platforms?

That last question matters to me. I wanted a GitHub-first lens. Not because GitHub is the only place where AI happens, but because it is where a lot of us build, review, ship, automate, and occasionally ask a coding agent to refactor half the repository before coffee.

The result is a small, focused site instead of an infinite stream.

## The workflow is a Markdown file

The core of the project lives in [`.github/workflows/weekly-news-digest.md`](https://github.com/elbruno/weekly-ai-news-digest/blob/main/.github/workflows/weekly-news-digest.md).

Yes, a Markdown file.

GitHub Agentic Workflows use a Markdown-based definition: frontmatter describes the workflow permissions, schedule, network access, and safe outputs; the body tells the agent what to do.

For this digest, the instructions are intentionally specific:

* read seven approved RSS feeds;
* look back over the most recent 14 days;
* select 15 useful stories;
* include at least seven GitHub Changelog stories when available;
* cap the number of stories from every other source;
* write a TL;DR and a “Why it matters” explanation for every selected story;
* produce a separate five-item GitHub-only highlights section;
* render a complete static page at `docs/index.html`.

This is an important detail about agentic workflows: the prompt is not decoration.

The prompt is the product specification.

If I only write “find interesting AI news,” I get a very creative interpretation of interesting. If I write the sources, time window, allocation rules, output shape, and quality bar, I get something I can review.

Not magic. Just better constraints.

## From seven feeds to one readable page

The workflow begins with a small set of sources:

* GitHub Changelog
* TechCrunch AI
* MIT Technology Review
* Hacker News
* Ars Technica
* The Verge
* VentureBeat AI

The agent extracts the title, URL, source, publication date, and plain-text excerpt for each recent entry. Then it curates the list.

The curation rules deliberately make GitHub the default lens. At least seven of the 15 selected stories come from GitHub Changelog when that many are available. Other sources cannot dominate the page.

That does not mean “ignore the rest of the industry.” It means that, when I open this page, I should quickly see the developer-platform changes that may affect my daily work.

The generated page also includes a five-bullet **TL;DR — GitHub highlights** block at the top. Those bullets are only allowed to use GitHub sources. This is a small rule, but it prevents a common AI-summary problem: mixing unrelated sources into a summary that sounds coherent but loses provenance.

## The UI has opinions too

The generated site is a self-contained HTML page. No framework, no CDN, no build pipeline that needs a different build pipeline to explain the first build pipeline.

It uses a GitHub-inspired dark theme, with system, light, and dark modes. It also has:

* source filter chips;
* tag filters;
* full-text search across titles, sources, summaries, impact notes, and tags;
* a live “Showing X of 15 stories” counter;
* responsive cards for reading on a desktop or a phone.

The source filter starts with GitHub-related sources selected.

Again, that is intentional. A visitor can expand the view, but the default answer to “what changed this week?” starts close to the tools many developers already use.

Small UX decisions like this are useful because they turn a generated page into something that feels curated. The agent can produce information. The product still needs an opinion about how people should consume it.

## The agent does not get to write directly to `main`

This is the part I care about most.

The workflow does not hand an agent unrestricted repository write access and hope everybody has a quiet afternoon.

The agent runs with read-only repository permissions in a sandboxed environment. It can research the approved network locations and prepare output, but the actual repository write is handled by a separate `safe-outputs` pull-request step.

The path looks like this:

```text
Agent (read-only, sandboxed)
  -> agent output artifact
  -> threat detection
  -> safe-outputs pull request
  -> review / auto-merge rule
  -> GitHub Pages deployment
```

The workflow creates a pull request with the `digest` and `automated` labels. A separate automation can merge that trusted digest PR. GitHub Pages then serves the `docs/` folder from `main`.

This is a much better model than “an AI wrote directly to production.”

The agent is useful where it has an advantage: reading, comparing, summarizing, and drafting. The platform keeps the repository mutation in a narrow, auditable path.

That is how I want agentic automation to work: capable by default, but not casually omnipotent.

## Why use an agent instead of a normal script?

Traditional scripts are still great.

If the task is “parse this XML,” “rename these files,” or “run these tests,” I want deterministic code. A script is faster, cheaper, easier to test, and far less likely to develop a sudden interest in the history of computer science.

But curation is different.

Choosing the 15 stories that matter from a large group of feeds is not only filtering by date or keyword. It involves relevance, duplication, developer impact, and context. Writing a concise explanation of why a release matters also benefits from language and reasoning.

That is a reasonable place to use an agent.

The pattern I am using is simple:

* use code for deterministic work;
* use an agent for judgment and language;
* put the agent behind clear boundaries;
* make the output easy to inspect;
* keep the final delivery path controlled by the platform.

You do not need an agent for every cron job. You need one when the workflow has a real reasoning step and you can state the expected output clearly.

## Things I learned while building it

### Constraints improve the results

The most useful instructions were not the poetic ones. They were the measurable ones:

* 14-day lookback;
* 15 stories;
* at least seven GitHub items;
* at most four items from any other source;
* exactly five GitHub-only top highlights;
* specific fields for each card.

An agent with a vague task will fill the ambiguity. An agent with a clear task will spend more time doing useful work.

### Generated HTML can still be a product

The page is generated, but it is not a random document dump. The template has visual rules, responsive behavior, accessibility-friendly labels, theme persistence, and filters.

Static HTML is still one of the most reliable deployment targets on the internet.

### A pull request is a great integration boundary

The pull request gives me a diff, history, labels, checks, and a place to stop the automation if something looks wrong.

It is also familiar. You do not need a new dashboard to understand what changed. You can use the collaboration system that is already part of your development workflow.

## What I want to add next

The digest is intentionally small, but there are many directions to explore:

* better duplicate detection across syndications;
* recurring-topic summaries;
* a history page for comparing weeks;
* optional user-selected source profiles;
* richer visual explanations of the workflow;
* screenshots that document the actual filtering and theme experience.

For now, the goal is simpler: open one page, catch up on useful news, and understand why it matters.

The project is open source on GitHub: [elbruno/weekly-ai-news-digest](https://github.com/elbruno/weekly-ai-news-digest).

If you build your own agentic workflow, my recommendation is not “give the agent all the permissions.”

Start with a narrow problem. Describe the output. Keep the boundary visible. Let the agent do the part where it is good.

And let your pull request do the part where you are good.

