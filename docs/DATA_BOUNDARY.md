# Data Boundary

## Dataset In This MVP

`public/data/ledger.demo.json` is a Phase 5 public-safe expanded dataset. It
combines the original rebuilt public-safe dataset from the demo zip:

`gotra 公开预测账本 (1).zip`

with pending skeleton records derived only from the public GOTRA preregistration
protocol:

`amanayayatu-tech/gotra@d42492cd9d1016aaf87581765a2c8d119776c0e0:data/backtest/PREREGISTERED.md`

The zip is a build artifact, not source code. It was used only to recover demo records, field names, and visual interaction references. The production source in this repository is Vite + React + TypeScript.

Dataset metadata:

- `snapshot_date=2026-06-20`
- `dataset_type=frozen_demo_plus_public_protocol_pending_skeleton/public_safe_demo`
- `source=zip_demo_rebuilt_plus_public_preregistered_protocol`
- `record_count=294`
- `resolved_count=48`
- `pending/frozen_pending without public outcomes=246`

As of the boundary review date `2026-06-20`, records without public-safe outcomes
remain `pending` or `frozen_pending`. The frontend does not invent
`actual_change_pct`, `error`, or direction correctness for them.

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

The Phase 5 expansion collected additional pending skeleton rows only from:

- `amanayayatu-tech/gotra` public GitHub raw docs.
- The locked public commit `d42492cd9d1016aaf87581765a2c8d119776c0e0`.
- `data/backtest/PREREGISTERED.md` as the source of the 10-stock universe and
  monthly 30-day protocol.

No additional public prediction-row JSON/CSV with real outcomes was found in the
allowed source scan. Therefore the expansion does not add resolved outcomes.

Replacement datasets may use non-demo `metadata.source.type` and
`record.provenance.source` values. They must not falsify zip provenance. Resolved
records must include numeric `actual_change_pct` and `error`; pending records
must keep those outcome fields empty (`null` or omitted).

## Public Alpha v1 Data Boundary

Public Alpha v1 may add new public-safe data families only through an allowlist
export or hand-curated public-source process:

- prediction summaries
- outcome summaries
- hypothetical paper portfolio derived summaries
- public source manifests
- public evidence indexes
- validation summaries
- redaction reports
- manifest/hash metadata

The public repo must keep the data layers separate:

- `ledger` records immutable prediction facts.
- `outcome` records fixed-rule resolution facts.
- `portfolio` records derived hypothetical paper tracking.
- `content` may cite ledger records but must not rewrite them.

Pending or blocked records must not be counted as resolved. Missing prices,
symbol changes, corporate-action conflicts, and public-source gaps must become
`blocked_*`, `needs_review`, or remain pending; they must not be filled with
fabricated outcomes.

Every public export should include manifest hashes, record counts, source ids,
and redaction evidence sufficient for review.

## Forbidden Sources

- Private local GOTRA backtest run directories.
- Local GOTRA experiment repository data.
- `.env*`
- API keys.
- Raw provider responses.
- SQLite or other database files.
- Bundles, `*.bundle`, `*.tar.gz`, paper trading artifacts, Stage8/Stage9 local artifacts.
- Auth files, secrets, private run logs, or private research artifacts.

## Evidence Index

`public/data/evidence-index.json` is derived from `ledger.demo.json`. It contains
source labels and dates from the frozen demo data plus public protocol citations
for pending skeleton rows. It is not live source retrieval, not raw provider
evidence, and not a private research artifact.

## Public Source Inventory

`docs/PUBLIC_DATA_INVENTORY.md` records the public GitHub source check used for
the Phase 5 dataset expansion, including adopted and rejected sources.
