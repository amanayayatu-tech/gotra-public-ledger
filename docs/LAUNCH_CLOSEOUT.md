# Public Alpha Launch Closeout Candidate

Decision label: `PR_CI_PASS_PENDING_REVIEW_AND_PRODUCTION_DEPLOY`

Evidence layer: `local checks + local smoke evidence + PR CI evidence`

This is a launch closeout candidate for the accumulated P0-P7 Public Alpha MVP work. It is not final production acceptance, not science/public proof, not performance proof, not a trading signal, and not investment advice.

## Local Checks

Local validation passed:

- `npm ci`
- `npm run validate:data`
- `npm run resolve:outcomes`
- `npm run portfolio:build -- --check`
- `npm run dataset:diff`
- `npm run compliance:scan`
- `npm run secrets:scan`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `GITHUB_PAGES=true npm run build`
- `npm run launch:smoke -- --base-url http://127.0.0.1:4179/gotra-public-ledger/ --out-dir docs/launch-validation`

Detailed command evidence is in `docs/launch-validation/LOCAL_CHECKS.md` and `docs/launch-validation/launch-smoke-report.json`.

## Accessibility Evidence

Local Lighthouse accessibility passed:

- Command: `npx lighthouse http://127.0.0.1:4179/gotra-public-ledger/ --only-categories=accessibility --chrome-flags="--headless=new" --output=json --output-path=docs/launch-validation/lighthouse-accessibility.json --quiet`
- Score: `1`
- Failed audits: `0`
- Report: `docs/launch-validation/lighthouse-accessibility.json`

## CI Evidence

PR CI passed for the PR head at validation time:

- PR: `https://github.com/amanayayatu-tech/gotra-public-ledger/pull/4`
- Workflow: `CI`
- Job: `frontend`
- Result: `success`

## Smoke Evidence

Local smoke passed for:

- `#/`
- `#/ledger`
- `#/ledger/PRED-20260203-TSM-0054`
- `#/performance`
- `#/methodology`
- `#/sources`
- `#/notes`
- `#/notes/method-note-public-ledger-v1`

Screenshots:

- `docs/launch-validation/screenshots/desktop-home.png`
- `docs/launch-validation/screenshots/mobile-notes.png`

## Formal Acceptance Status

Status: `PENDING_REVIEW_BEFORE_DEPLOY`

Missing formal evidence:

- GitHub Pages deploy evidence.
- Production Pages URL smoke evidence.
- Independent reviewer closeout.
- Merge/deploy approval after independent review.

## Deploy/Pages Status

Status: `PENDING_REVIEW_BEFORE_DEPLOY`

No merge, release, or production Pages deploy was performed before independent Reviewer/Judge. Local Pages-base behavior was checked against `dist` served by project-local preview.

## Human Gate Status

Status: `WAIVED_BY_OWNER_FOR_REAL_USER_10_SECOND_TEST_ONLY`

The owner authorized one-time human-gate waiver for the missing real-user 10-second comprehension test in the P7 Controller message. This waiver does not waive data boundary, claim boundary, security, CI, accessibility, reviewer, or production Pages smoke requirements.

## Waived By

Owner/user via Controller message: `继续 gotra-public-ledger-mvp-v1-2026-06-25 Controller。用户决策：选 1，继续推进公开上线验收。`

Waived item: missing real-user 10-second comprehension test.

Reason: owner explicitly authorized proceeding with `PASS_WITH_WAIVER` if no real-user 10-second comprehension test exists.

Residual risk: a real user may still misunderstand the Public Alpha page or confuse research-information boundaries with product recommendations.

Follow-up owner: product owner.

Due date: before upgrading Public Alpha to a stronger non-waived launch status.

## Residual Risks

- Local smoke does not replace production Pages smoke evidence.
- The paper portfolio sample size remains below 30 and must retain the small-sample boundary.
- Public Alpha wording must continue to stay inside research-information and public-ledger boundaries.
- Independent Reviewer/Judge must review the PR before merge/production deploy.

## Next Owner Action

Route independent Reviewer/Judge for PR #4. After review passes, merge/deploy according to repository policy, then run production Pages smoke against the deployed URL and record the final `PASS_WITH_WAIVER` or `BLOCKED` decision.
