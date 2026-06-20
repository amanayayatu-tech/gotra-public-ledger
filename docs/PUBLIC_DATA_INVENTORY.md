# Public Data Inventory

This inventory records the public sources checked for the Phase 5 public-safe
dataset expansion. It is a data-boundary document, not proof of research
performance.

## Evidence Boundary

- Evidence layer: public-source inventory + local checks + frontend smoke only.
- Research information only.
- Not investment advice.
- Demo/public-safe dataset.
- Not OOS.
- Not science/public proof.
- Not trading signal.

## Phase 5 Result

- Previous dataset: 54 rows, 48 resolved, 6 source-pending demo rows.
- Expanded dataset: 294 rows, 48 resolved, 246 pending/frozen_pending rows.
- Added rows: 240 public-protocol-derived pending skeleton rows.
- Added outcomes: 0.
- Reason: no allowed public source contained additional prediction-row JSON/CSV
  with real `actual_change_pct` and `error`.

## Sources Checked

### `amanayayatu-tech/gotra-public-ledger`

- Public repo: `https://github.com/amanayayatu-tech/gotra-public-ledger`
- Dataset used by the app: `public/data/ledger.demo.json`
- Evidence index used by the app: `public/data/evidence-index.json`

Adopted for Phase 5:

- Existing 54 public-safe frozen demo rows.
- Existing resolved outcomes from the frozen demo dataset.
- Rebuilt evidence index from the expanded `ledger.demo.json`.

These rows retain their original `zip_demo_rebuilt_public_safe_dataset`
provenance. The Phase 5 script does not rewrite them as new research evidence.

### `amanayayatu-tech/gotra`

- Public repo: `https://github.com/amanayayatu-tech/gotra`
- Public/default branch checked: `main`
- Locked commit used for generated rows:
  `d42492cd9d1016aaf87581765a2c8d119776c0e0`
- Main commit date observed: `2026-06-15T15:17:48Z`
- Public tree scan found no prediction-row JSON/CSV files.
- Public files observed as candidates:
  - `SPEC.md`
  - `contracts/investment_event.schema.json`
  - `data/backtest/PREREGISTERED.md`
  - `docs/ROADMAP.md`
  - `gotra/backtest/ledger.py`
  - `methodologies/autonomy_v1.md`
  - `tests/test_backtest_ledger.py`

Adopted for Phase 5:

- `data/backtest/PREREGISTERED.md`
- Blob SHA observed through GitHub contents API:
  `f4faaf0932d301afd2f2c4db05458bda3d77deb9`
- Raw source:
  `https://raw.githubusercontent.com/amanayayatu-tech/gotra/d42492cd9d1016aaf87581765a2c8d119776c0e0/data/backtest/PREREGISTERED.md`

Use in the dataset:

- Universe: 10 symbols.
- Window: monthly 30-day protocol.
- Range generated: 2024-01-01 through 2025-12-01 month starts.
- Provenance: every generated row points to
  `https://github.com/amanayayatu-tech/gotra/blob/d42492cd9d1016aaf87581765a2c8d119776c0e0/data/backtest/PREREGISTERED.md`.
- Outcome policy: `actual_change_pct=null`, `error=null`,
  `direction_correct="pending"`.

The scan did not find a directly reusable public-safe prediction-row JSON/CSV
with the frontend fields required by `src/data/schema.ts`, so no new resolved
rows were added.

## Sources Not Used

No local GOTRA experiment data was read or adopted. In particular, this phase
does not use:

- `/Users/peachy/Documents/gotra/data/backtest/runs/*`
- provider raw responses
- local databases
- paper trading artifacts
- Stage8/Stage9 local artifacts
- `.env*`, API keys, auth files, or secrets
- private run logs or private research artifacts
- zip/tar/bundle artifacts

## Current Dataset Decision

The Phase 5 frontend dataset uses the existing frozen public-safe demo records
plus public-protocol-derived pending skeleton rows. Ticker descriptions in
`src/data/companyProfiles.ts` are hand-curated display metadata for readability;
they do not replace record provenance and do not add new outcome evidence.

## Rebuild Command

```bash
python3 scripts/build_public_dataset.py
```

The script fetches the locked public raw `PREREGISTERED.md`, preserves the
original demo records, generates deterministic pending skeleton rows, and
rewrites `public/data/ledger.demo.json` plus `public/data/evidence-index.json`.
