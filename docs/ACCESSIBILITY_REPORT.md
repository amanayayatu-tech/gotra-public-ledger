# Accessibility Report

Decision label: `ACCESSIBILITY_LOCAL_PASS`

Evidence layer: `local checks`

Automated Lighthouse accessibility was run locally during P7 formal closeout using system Chrome and the project-scoped devDependency `lighthouse`.

## Tool Check

- `lighthouse`: installed as a devDependency for formal local accessibility evidence.
- System Chrome: available and used for Lighthouse and local browser smoke via CDP.
- Production accessibility remains pending until the deployed Pages URL is checked.

## Command

```bash
npx lighthouse http://127.0.0.1:4179/gotra-public-ledger/ --only-categories=accessibility --chrome-flags="--headless=new" --output=json --output-path=docs/launch-validation/lighthouse-accessibility.json --quiet
```

## Result

- Accessibility score: `1`.
- Failed accessibility audits: `0`.
- Report artifact: `docs/launch-validation/lighthouse-accessibility.json`.

## Local Smoke Coverage

The browser smoke covered desktop `1440x900` and mobile `390x844` routes with no horizontal overflow and no blocking console errors. This is not a substitute for a formal accessibility audit.

## Next Action

Run the same accessibility check against the deployed Pages URL before final production closeout. Do not mark real-user comprehension as passed from this report.
