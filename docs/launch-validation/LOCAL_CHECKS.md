# Launch Validation Local Checks

Decision label: `LOCAL_CHECKS_PASS_WITH_FORMAL_GATES_PENDING`

Evidence layer: `local checks`

This report records local validation for the Public Alpha MVP candidate. It is not deploy evidence, CI evidence, formal acceptance, public proof, performance proof, a trading signal, or investment advice.

## Preflight

- Worktree state: detached `HEAD 1cacca7`.
- `codex-preflight --cwd <worktree>`: completed with git root and worktree confirmed. The preflight profile labels this repository under the broader GOTRA guardrail family; P6-specific evidence remains bounded to this public ledger worktree.
- `.codex-loop/**`: not written by this validation goal.

## Commands

- `npm ci`: pass; 240 packages installed/audited, `0 vulnerabilities`.
- `npm run validate:data`: pass; `records: 294`, `resolved: 48`, `pending: 246`, `manifest_files: 5`, `pending_excluded_from_resolved: true`, `outcome_records_separate: true`.
- `npm run resolve:outcomes`: pass; `processed_count: 9`, `resolved_count: 3`, `golden_check: true`, blocked states emitted as fixture outcomes.
- `npm run portfolio:build -- --check`: pass; `portfolio_policy_v1`, `sample_size: 1`, `small_sample_warning: true`, no write mode.
- `npm run dataset:diff`: pass; manifest includes `legacy_ledger`, `evidence_index`, `contract_fixture`, `portfolio`, and `content`.
- `npm run compliance:scan`: pass; forbidden term hits `0`.
- `npm run secrets:scan`: pass; potential secret/API key hits `0`.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run test`: pass; `6 passed`, `34 passed`.
- `GITHUB_PAGES=true npm run build`: pass; Vite build completed and emitted `/gotra-public-ledger/assets/` references.
- `npm run launch:smoke -- --base-url http://127.0.0.1:4179/gotra-public-ledger/ --out-dir docs/launch-validation`: pass; see `docs/launch-validation/launch-smoke-report.json`.

## Pages Base Check

- `dist/index.html` contains `/gotra-public-ledger/assets/`.
- `dist/index.html` does not contain root `/assets/` script/style references.
- The local Pages preview maps `dist` under `/gotra-public-ledger/` and verifies public data files at:
  - `/gotra-public-ledger/data/ledger.demo.json`
  - `/gotra-public-ledger/data/manifest.json`
  - `/gotra-public-ledger/data/paper-portfolio.latest.json`
  - `/gotra-public-ledger/content/articles/index.json`

## Boundary

Local validation passed. Formal acceptance remains pending until deploy/Pages evidence, CI evidence, independent review, and owner/human gate evidence or explicit waiver are available.
