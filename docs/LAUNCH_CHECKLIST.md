# Public Alpha Launch Checklist

Version: `public_alpha_v1`
Status: docs-contract candidate
Evidence layer: `local checks`

## Evidence Layers

Use these labels exactly:

- `local checks`: package install, lint, typecheck, test, schema scripts, compliance scan, secrets scan, and build.
- `smoke evidence`: local preview, Pages HTTP, core route checks, browser screenshots, data file availability, and console checks.
- `long-run/formal acceptance`: CI green, manifest hash, redaction report, forbidden artifact scan, reviewer approval, Pages deploy evidence, human gate, and launch closeout.
- `science/public claim`: not allowed for v1.

Do not promote local checks or smoke evidence into formal acceptance.

## Local Checks

Required commands for implementation goals that touch product code, docs, scripts, or public data:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run compliance:scan
npm run secrets:scan
GITHUB_PAGES=true npm run build
```

If future scripts exist, add:

```bash
npm run validate:data
npm run claim:scan
npm run dataset:diff
```

Local checks prove only local mechanics. They do not prove user understanding, OOS validity, alpha, trading value, or investment usefulness.

## Smoke Evidence

Required before launch readiness:

- local preview HTTP 200
- GitHub Pages HTTP 200
- homepage is not blank
- public data files do not 404
- Ledger search works
- Ledger filters work
- prediction detail opens
- Performance chart or policy panel is non-empty
- Methodology is readable
- mobile viewport has no obvious overlap
- console has no blocking errors
- screenshots are saved as review artifacts

Smoke evidence proves a path is accessible. It is not formal acceptance.

## Formal Acceptance

Public Alpha formal acceptance requires:

- PR CI green
- data manifest hash validation
- redaction report pass
- forbidden artifact scan pass
- `npm run compliance:scan` pass
- `npm run secrets:scan` pass
- independent Reviewer/Judge approval
- Pages deploy URL verification
- human gate pass
- launch closeout report

If the human gate lacks real-user evidence, use `PASS_WITH_WAIVER`, not `PASS`.

## Human Gate

10-second understanding test:

- 5 non-builders see the homepage for 10-15 seconds.
- At least 4/5 correctly explain what the product is.
- At least 4/5 correctly say it is not investment advice.
- At least 4/5 correctly say paper performance is not live trading.
- No more than 1/5 misunderstands the site as stock picking, a trade prompt, or a return promise.

Task test:

- find a ticker
- open a prediction
- find expected move
- find actual outcome or pending status
- find error when resolved
- find evidence/provenance
- explain pending meaning
- explain paper/live boundary

## Block Conditions

Block launch on:

- secret scan hit
- raw provider output in public repo
- private GOTRA run artifact in public repo
- fabricated outcome
- pending record included in resolved metrics
- paper performance presented as live performance
- claim boundary breach
- Pages 404 or blank page
- mobile core content unusable
- human test shows investment-advice misunderstanding

## Decision Template

```text
Decision: PASS | PASS_WITH_WAIVER | BLOCKED
Evidence layer:
Local checks:
Smoke evidence:
Formal acceptance:
Human gate:
Waived by:
Reason:
Residual risk:
Follow-up owner:
Due date:
```

`PASS` requires local checks, smoke evidence, data boundary, claim boundary, security/artifact scan, independent review, and human gate all green.

`PASS_WITH_WAIVER` is allowed only when the owner explicitly waives a named non-security/non-data-boundary gap and the residual risk is recorded.

`BLOCKED` is required for claim-boundary breach, data-boundary breach, secret exposure, fabricated outcome, deploy failure, or unresolved formal acceptance blocker.

## Artifact Hygiene

Before launch closeout:

```bash
git status --short
find . -name ".env*" -o -name "*.db" -o -name "*.sqlite" -o -name "*.tar.gz" -o -name "*.bundle"
npm run secrets:scan
npm run compliance:scan
```

Do not commit provider logs, raw model outputs, SQLite/DB files, auth files, browser sessions, private run logs, local private paths, tar/bundle files, or unpublished private reports.
