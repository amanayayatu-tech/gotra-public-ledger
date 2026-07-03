# GOTRA Public Ledger

GOTRA public ledger frontend MVP. The Phase 4.2 product polish turns the frozen,
public-safe demo ledger into a human-readable page about a simple promise:
GOTRA publicly records predictions, checks them against reality when due, keeps
the mistakes visible, and uses the ledger as an auditable credibility record.

This project is **Research information only**. It is **Not investment advice**, uses a **Demo/public-safe dataset**, is **Not OOS**, is **Not science/public proof**, and is **Not a trading signal**.

Production public URL: https://gotra.me/

## What This Is

- A Vite + React + TypeScript frontend for inspecting a public-safe prediction ledger snapshot.
- A public explanation page for how the prediction -> record -> settlement ->
  error review -> cognition update loop works.
- A ticker-driven ledger proof workbench that shows historical predictions,
  observed outcomes, direction correctness, error, and cumulative changes over time.
- A rebuild of the demo dataset from `gotra 公开预测账本 (1).zip`.
- A maintainable source project, not a committed build artifact.

The included dataset is a Phase 5 public-safe expansion with
`snapshot_date=2026-06-20`. It preserves the original 54 frozen demo rows and
adds public-protocol-derived pending skeleton rows from `amanayayatu-tech/gotra`
`PREREGISTERED.md` at commit `d42492cd9d1016aaf87581765a2c8d119776c0e0`.
These skeleton rows are not resolved model predictions and do not invent
outcomes.

## Product Structure

The page is organized as a narrative plus evidence surface:

- S1 Hero: explains GOTRA as an AI stock research system that publicly admits mistakes.
- S2 How it works: five-step prediction, record, settlement, error review, update loop.
- S3 Trust strip: makes the public mistake record visible instead of hiding it.
- S4 Ledger proof: single-ticker cognition workbench with charts and record timeline.
- S5 Full ledger: searchable, sortable, filterable public ledger table and detail drawer.
- S6 Method & boundary: research-only / public-safe / direct_llm caveat.
- S7 Footer: repo links, data boundary, claim boundary, version and snapshot metadata.

Global and per-ticker metrics include total records, resolved records, demo direction
  hit rate, average absolute error, pending/frozen pending, and ticker coverage.

Chart metrics are derived only from `public/data/ledger.demo.json`. Direction
hit rate and average error use resolved demo rows only; `pending` and
`frozen_pending` rows remain visible but are not backfilled.

## Run Locally

```bash
npm install
npm run lint
npm run build
npm run geo:smoke
npm run preview
```

`npm run build` runs the Vite build and then `npm run geo:generate`, which writes
crawler-readable static HTML under `dist/` for the homepage fallback, ledger,
reports, latest report, system boundary, methodology, claim boundary, FAQ, sources, notes, and
prediction detail routes. The generated pages use only public-safe repository
data and preserve the research-only boundary.

For production runtime boundaries, static hosting notes, and Markdown/JSON/HTML
Content-Type guidance, see `docs/PRODUCTION_RUNTIME_RUNBOOK.md` and
`docs/GEO_STATIC_HOSTING.md`. Future manual GEO audit notes should use
`docs/GEO_AUDIT_TEMPLATE.md`.

## GitHub Pages Deployment

GitHub Pages deployment is handled by `.github/workflows/pages.yml`.
GitHub Pages is a manual fallback/debug static publishing target; the canonical
public production entry point for readers, SEO, and report status is
https://gotra.me/.

Deployment triggers:

- manual `workflow_dispatch`

The PR branch and `main` push do not automatically deploy to Pages. If a
maintainer intentionally uses the manual workflow, it builds the frontend with
`GITHUB_PAGES=true npm run build` so Vite uses the project Pages base path:

```text
/gotra-public-ledger/
```

Pages deployment is frontend deployability evidence only. It means the static
MVP can be built and served by GitHub Pages. It is not OOS evidence, not
formal acceptance, not science/public proof, not a trading signal, and not
investment advice.

## Data Replacement

Replace `public/data/ledger.demo.json` with a public-safe JSON file that matches the schema in `src/data/schema.ts`.

Replacement datasets may use non-demo `metadata.source.type` and
`record.provenance.source` values, but they must keep explicit public-safe
provenance. Resolved records must include numeric `actual_change_pct` and
`error`; pending records must leave both values as `null` or omit them so the
loader normalizes them to `null`.

Allowed data sources for the current app dataset:

- This demo zip, rebuilt into public-safe JSON.
- Public-safe JSON committed in this repository.
- Public GitHub PR, commit, or raw documentation data.
- Hand-curated public-safe datasets with explicit provenance.

This Phase 5 dataset expansion adopted only:

- Existing `gotra-public-ledger` public-safe JSON.
- `amanayayatu-tech/gotra` public GitHub raw docs at locked commit
  `d42492cd9d1016aaf87581765a2c8d119776c0e0`.

It did not find or import additional public prediction-row JSON/CSV with real
outcomes. The extra rows are pending skeleton records derived from the public
protocol universe and monthly 30-day window only.

For the Phase 4 public-source inventory, see `docs/PUBLIC_DATA_INVENTORY.md`.

Forbidden data sources:

- Local GOTRA experiment run directories.
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

Frontend charts, successful builds, screenshots, GitHub Pages deployment, demo
metrics, and Phase 4.2 narrative polish are frontend UX/product evidence only.
They are not research acceptance, not OOS, not science/public proof, not a
trading signal, and not investment advice.

## Validation

Local checks for this MVP:

```bash
npm run lint
npm run build
npm run geo:smoke
```

CI runs install, lint, and build. GitHub Pages deploy runs only from `main` push
or manual dispatch.

GEO smoke checks are local raw HTML/no-JS evidence only. They do not prove
production Content-Type headers, deployment acceptance, science/public claims,
performance, trading usefulness, or investment suitability.

## Rebuild Public Dataset

```bash
python3 scripts/build_public_dataset.py
```

The script is deterministic, locks public GOTRA source provenance by commit SHA,
and rewrites `public/data/ledger.demo.json` plus `public/data/evidence-index.json`.
