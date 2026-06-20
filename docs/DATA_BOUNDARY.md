# Data Boundary

## Dataset In This MVP

`public/data/ledger.demo.json` is a rebuilt public-safe dataset from the demo zip:

`gotra 公开预测账本 (1).zip`

The zip is a build artifact, not source code. It was used only to recover demo records, field names, and visual interaction references. The production source in this repository is Vite + React + TypeScript.

Dataset metadata:

- `snapshot_date=2026-02-10`
- `dataset_type=frozen_demo_snapshot/public_safe_demo`
- `source=zip_demo_rebuilt_public_safe_dataset`

As of the boundary review date `2026-06-20`, all six source records marked `pending` have `outcome_availability_date` in the past. They remain `frozen_pending` in this MVP because the frozen source bundle does not contain actual outcomes for them.

## Derived Frontend Metrics

The cognition evolution UI derives display metrics from `ledger.demo.json` only:

- per-ticker prediction and outcome series
- cumulative direction hit rate over resolved rows
- cumulative average absolute error over resolved rows
- evidence/source counts from each record
- largest resolved error per ticker

These derived fields are for frontend explanation and inspection. They are not
new source evidence, not OOS, not science/public proof, not a trading signal,
and not investment advice.

## Allowed Sources

- Demo zip records rebuilt into public-safe JSON.
- Public-safe JSON committed in this repository.
- GitHub public PRs, commits, and raw documentation.
- Hand-curated public-safe datasets with explicit provenance.

For a future Phase 5 dataset expansion, additional records may be collected only
from public sources:

- `amanayayatu-tech/gotra` public GitHub raw docs.
- `amanayayatu-tech/gotra` public PRs.
- `amanayayatu-tech/gotra` public commits.
- Public JSON/CSV files with explicit provenance.

That work must be separate from the Phase 4.2 frontend polish. It needs a clear
ingestion script or documented manual inventory, per-row provenance, and an
audit showing no local/private run artifacts entered the public dataset.

Replacement datasets may use non-demo `metadata.source.type` and
`record.provenance.source` values. They must not falsify zip provenance. Resolved
records must include numeric `actual_change_pct` and `error`; pending records
must keep those outcome fields empty (`null` or omitted).

## Forbidden Sources

- `/Users/peachy/Documents/gotra/data/backtest/runs/*`
- Local GOTRA experiment repository data.
- `.env*`
- API keys.
- Raw provider responses.
- SQLite or other database files.
- Bundles, `*.bundle`, `*.tar.gz`, paper trading artifacts, Stage8/Stage9 local artifacts.
- Auth files, secrets, private run logs, or private research artifacts.

## Evidence Index

`public/data/evidence-index.json` is derived from `ledger.demo.json`. It contains source labels and dates from the frozen demo data only. It is not live source retrieval, not raw provider evidence, and not a private research artifact.

## Public Source Inventory

`docs/PUBLIC_DATA_INVENTORY.md` records the public GitHub source check used for
the Phase 4 redesign. The current frontend did not adopt additional public
prediction rows beyond the existing frozen demo dataset.
