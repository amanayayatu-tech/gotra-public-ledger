# Launch Validation Smoke Report

Decision label: `LOCAL_SMOKE_PASS_WITH_FORMAL_GATES_PENDING`

Evidence layer: `local smoke evidence`

Smoke validation used the final `GITHUB_PAGES=true npm run build` output. A project-local Pages preview served `dist` under `/gotra-public-ledger/` to mirror GitHub Pages subpath behavior. This report is local smoke evidence only.

## Preview

- Start command: `npm run pages:preview -- --port 4179 --base /gotra-public-ledger/`
- Smoke command: `npm run launch:smoke -- --base-url http://127.0.0.1:4179/gotra-public-ledger/ --out-dir docs/launch-validation`
- Shutdown: preview server stopped after smoke with `SIGINT`.

## Coverage

- Home route: `#/`
- Ledger route: `#/ledger`
- Prediction detail route: `#/ledger/PRED-20260203-TSM-0054`
- Performance route: `#/performance`
- Methodology route: `#/methodology`
- Sources route: `#/sources`
- Notes route: `#/notes`
- Note detail route: `#/notes/method-note-public-ledger-v1`
- Ledger interaction: search `TSM`, status filter `resolved`, direction filter `up`.
- Data files: ledger, manifest, paper portfolio snapshot, and content index loaded from `/gotra-public-ledger/` subpaths.

## Results

- `launch-smoke-report.json`: `status: pass`.
- `console_errors`: `[]`.
- Desktop viewport: `1440x900`, screenshot `docs/launch-validation/screenshots/desktop-home.png`.
- Mobile viewport: `390x844`, screenshot `docs/launch-validation/screenshots/mobile-notes.png`.
- Horizontal overflow checks for covered routes: `0`.
- Performance page content: non-empty paper portfolio boundary and `portfolio_policy_v1` displayed.
- Notes page and note detail route: content index and article metadata displayed.

## Local Preview Note

The standard `vite preview` command was started and stopped during validation. For this Pages-base smoke, the project-local static preview was used because it explicitly maps `dist` to `/gotra-public-ledger/` for assets and public data files.

## Boundary

This smoke report does not prove launch readiness, deploy health, CI health, science/public proof, performance proof, trading-signal claims, or investment suitability.
