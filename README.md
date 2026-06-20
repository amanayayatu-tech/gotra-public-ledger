# GOTRA Public Ledger

Public frontend MVP for a frozen, public-safe GOTRA demo ledger.

This project is **Research information only**. It is **Not investment advice**, uses a **Demo/public-safe dataset**, is **Not OOS**, is **Not science/public proof**, and is **Not a trading signal**.

## What This Is

- A Vite + React + TypeScript frontend for inspecting a public-safe prediction ledger demo.
- A rebuild of the demo dataset from `gotra 公开预测账本 (1).zip`.
- A maintainable source project, not a committed build artifact.

The included dataset is a frozen demo snapshot with `snapshot_date=2026-02-10`. As of the boundary review date `2026-06-20`, the six records marked `pending` in the source bundle have outcome dates in the past. The UI preserves them as `frozen_pending` and does not invent outcomes.

## Run Locally

```bash
npm install
npm run lint
npm run build
npm run preview
```

## Data Replacement

Replace `public/data/ledger.demo.json` with a public-safe JSON file that matches the schema in `src/data/schema.ts`.

Allowed data sources:

- This demo zip, rebuilt into public-safe JSON.
- Public-safe JSON committed in this repository.
- Public GitHub PR, commit, or raw documentation data.
- Hand-curated public-safe datasets with explicit provenance.

Forbidden data sources:

- Local `data/backtest/runs/*`.
- `.env*`, API keys, provider raw responses, databases, bundles, paper trading data, Stage8/Stage9 local artifacts, auth files, or secrets.
- Private GOTRA experiment repositories or local experiment data.

## Claim Boundary

Do not claim:

- GOTRA has proven superiority.
- OOS validation has passed.
- Scientific or public proof exists.
- The demo is a trading signal.
- The page provides investment advice.

If `direct_llm` is mentioned, write it as `direct_llm_parametric_memory_control`. Modern LLM parameter memory cannot be truncated by `decision_date` and may contain hindsight market narratives. It is a diagnostic control, not a clean no-future baseline.

Preferred comparison wording is `ksana_real_research vs full_gotra`. Clean baselines should be added separately: deterministic price-only baseline, simple statistical baseline, and forward-live/future-only validation.

## Validation

Local checks for this MVP:

```bash
npm run lint
npm run build
```

CI runs install, lint, and build only. GitHub Pages deployment is intentionally not included.
