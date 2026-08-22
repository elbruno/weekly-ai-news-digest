---
name: Daily Digest - Economy
run-name: "economy:${{ github.event.inputs.snapshot_id }}:${{ github.event.inputs.prompt_version }}:${{ github.event.inputs.origin_event }}"

on:
  workflow_dispatch:
    inputs:
      snapshot_run_id:
        description: Coordinator run containing the immutable snapshot artifact
        required: true
        type: string
      snapshot_id:
        description: Expected snapshot identifier
        required: true
        type: string
      prompt_version:
        description: Shared prompt contract version
        required: true
        default: v1
        type: string
      origin_event:
        description: Event that started the coordinator
        required: true
        type: string

permissions:
  actions: read
  contents: read
  copilot-requests: write
  pull-requests: read

engine:
  id: copilot
  model: gpt-5-mini

strict: true
timeout-minutes: 45

concurrency:
  group: digest-economy
  cancel-in-progress: false

steps:
  - name: Download immutable news snapshot
    env:
      GH_TOKEN: ${{ github.token }}
      SNAPSHOT_RUN_ID: ${{ github.event.inputs.snapshot_run_id }}
      EXPECTED_SNAPSHOT_ID: ${{ github.event.inputs.snapshot_id }}
    run: |
      mkdir -p /tmp/gh-aw/agent
      gh run download "$SNAPSHOT_RUN_ID" \
        --repo "$GITHUB_REPOSITORY" \
        --name news-snapshot \
        --dir /tmp/gh-aw/agent
      python scripts/collect-news-snapshot.py \
        --validate /tmp/gh-aw/agent/news-snapshot.json \
        --expected-id "$EXPECTED_SNAPSHOT_ID"

safe-outputs:
  create-pull-request:
    title-prefix: "[digest-economy] "
    draft: false
    labels:
      - digest
      - digest-economy
    allowed-files:
      - docs/economy/index.html

imports:
  - uses: shared/digest-generation.md
    with:
      variant: economy
      variant_label: Economy
      model: gpt-5-mini
      output_path: docs/economy/index.html
      usage_path: ../ai-credits.html
      comparison_path: ../model-comparison.html
---

Follow the imported shared digest-generation contract exactly.
