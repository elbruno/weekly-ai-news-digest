---
name: Agentic Workflow - Single-File Example
description: Read-only educational example of this repository's agentic workflow architecture
on:
  workflow_dispatch:

permissions:
  contents: read
  copilot-requests: write

strict: true
timeout-minutes: 15

tools:
  bash: [find, cat, grep]

safe-outputs:
  report-failure-as-issue: false
  noop:
    report-as-issue: false
  jobs:
    record-completion:
      description: Record successful completion in workflow logs without modifying GitHub resources
      runs-on: ubuntu-slim
      output: Educational summary completed without repository changes.
      permissions:
        contents: read
      steps:
        - name: Record completion
          run: echo "Educational workflow completed without repository changes."
---

# Single-file GitHub Agentic Workflow example

This workflow is a self-contained, read-only teaching example. It deliberately
uses no `imports` and has no repository-mutating outputs. The log-only
`record_completion` safe job prevents the compiler's default issue output while
keeping the run side-effect free. It must not generate a digest, modify
repository files, create a branch, open a pull request, or call another
workflow.

## What an agentic workflow file contains

A GitHub Agentic Workflow source is a Markdown file under
`.github/workflows/`. Its YAML frontmatter configures the GitHub Actions trigger,
permissions, model or engine, tools, runtime limits, imports, and guarded output
channels. The Markdown body is the natural-language prompt executed by the
agent.

The `engine` field is intentionally omitted here, so this example uses the
repository or GitHub Agentic Workflows default engine and model. Production
workers that require a specific comparison model pin it explicitly.

The source Markdown file is compiled by `gh aw compile` into a generated
`.lock.yml` GitHub Actions workflow. Humans should edit the Markdown source, run
the compiler, review the generated lock file, and commit both files.

## How this repository uses agentic workflows

This repository combines deterministic GitHub Actions with two AI workers:

1. `.github/workflows/digest-experiment.yml` collects, normalizes,
   deduplicates, and checksums the approved RSS feeds once. It uploads one
   immutable snapshot and dispatches both compiled workers with the same
   snapshot ID and prompt version.
2. `.github/workflows/daily-digest-control.md` is a thin worker definition. It
   pins the control model, downloads and validates the snapshot, configures its
   allowed output path, and imports the shared digest contract.
3. `.github/workflows/daily-digest-economy.md` is the equivalent thin worker for
   the economy model and its separate output path.
4. `.github/workflows/shared/digest-generation.md` contains the common prompt:
   curation rules, bilingual page requirements, safety constraints, validation,
   and pull-request instructions. During compilation, this shared contract is
   incorporated into each worker's generated `.lock.yml` workflow.
5. Each worker reads the same immutable snapshot but runs with its own pinned
   model. Each may create only its tightly scoped pull request through the
   configured `create-pull-request` safe output.
6. `.github/workflows/auto-merge-digest.yml` is deterministic GitHub Actions,
   not an AI worker. It validates compatible results, serializes merges,
   reconciles AI Credit data, finalizes the published pages, and deploys the
   reconciled commit to GitHub Pages.

Separate source files are required for the model comparison because the
`engine.model` value is compile-time workflow configuration. The shared import
keeps every other instruction identical, making the comparison controlled and
avoiding prompt drift.

## Task when manually run

Read the current versions of the files listed above and produce a concise
educational run summary. The summary must contain:

- the difference between a `.md` source workflow and its generated
  `.lock.yml` workflow;
- the role of YAML frontmatter versus the Markdown prompt body;
- why the two model workers are separate files;
- how the shared import is combined with each worker during compilation;
- how the immutable snapshot keeps both model runs comparable;
- how `safe-outputs` isolates AI-generated pull requests from the read-only
  agent job;
- how the deterministic publisher validates and merges results;
- why this example itself has no imports or write outputs.

Do not change anything. Do not generate a digest. Do not create any GitHub
resource. Finish the run summary with a short Mermaid flowchart that represents
the current architecture, then call `record_completion` to record successful
completion in the workflow logs only.
