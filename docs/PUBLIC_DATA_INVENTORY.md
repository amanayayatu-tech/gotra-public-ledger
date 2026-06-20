# Public Data Inventory

This inventory records the public sources checked for the Phase 4 cognition
evolution redesign. It is a data-boundary document, not proof of research
performance.

## Evidence Boundary

- Evidence layer: local checks + frontend UX/smoke evidence only.
- Research information only.
- Not investment advice.
- Demo/public-safe dataset.
- Not OOS.
- Not science/public proof.
- Not trading signal.

## Sources Checked

### `amanayayatu-tech/gotra-public-ledger`

- Public repo: `https://github.com/amanayayatu-tech/gotra-public-ledger`
- Current PR dataset used by the app: `public/data/ledger.demo.json`
- Current evidence index used by the app: `public/data/evidence-index.json`

Adopted for Phase 4:

- `public/data/ledger.demo.json`
- Derived UI-only metrics from the same records:
  - per-ticker sorted prediction series
  - cumulative direction hit rate over resolved rows
  - cumulative average absolute error over resolved rows
  - largest resolved error per ticker
  - evidence/source timeline counts

These derived metrics are frontend display metrics only. They do not create OOS
evidence, science/public proof, trading evidence, or investment advice.

### `amanayayatu-tech/gotra`

- Public repo: `https://github.com/amanayayatu-tech/gotra`
- Public/default branch checked: `main`
- Public files observed as candidates:
  - `README.md`
  - `SPEC.md`
  - `contracts/investment_event.schema.json`
  - `data/backtest/PREREGISTERED.md`
  - `docs/AUTONOMY_RUNBOOK.md`
  - `docs/ROADMAP.md`
  - `gotra/backtest/ledger.py`
  - `methodologies/autonomy_v1.md`

Phase 4 did not adopt rows from this repo because this pass found public
architecture, schema, and methodology material, but not a directly reusable
public-safe prediction-row JSON file with the frontend fields required by
`src/data/schema.ts`.

## Sources Not Used

No local GOTRA experiment data was read or adopted. In particular, this phase
does not use:

- `/Users/peachy/Documents/gotra/data/backtest/runs/*`
- provider raw responses
- local databases
- paper trading artifacts
- Stage8/Stage9 local artifacts
- `.env*`, API keys, auth files, or secrets

## Current Dataset Decision

The Phase 4 frontend uses the existing frozen public-safe demo records only.
Ticker descriptions in `src/data/companyProfiles.ts` are hand-curated display
metadata for readability; they do not replace record provenance and do not add
new outcome evidence.
