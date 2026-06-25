# Public Export Contract

Version: `public_export_v1`
Status: docs-contract candidate
Evidence layer: `local checks`

## Principle

Export from private `gotra` to `gotra-public-ledger` must be allowlist export, not directory copy. The public repo receives only public-safe summaries, public-source references, manifest/hash metadata, and redaction evidence.

## Allowed Public Outputs

Allowed output classes:

- public-safe prediction summary
- public-safe outcome summary
- hypothetical paper portfolio derived summary
- public source manifest
- public evidence index
- validation summary
- redaction report
- manifest with file hashes and record counts
- dataset diff summary

Allowed prediction fields include:

- `prediction_id`
- `schema_version`
- `ticker`
- `asset_id`
- `market`
- `company`
- `decision_at`
- `decision_date`
- `view`
- `direction`
- `confidence`
- `horizon`
- `horizon_days`
- `expected_change_pct`
- `scenario_summary`
- `risk_factors`
- `evidence_refs`
- `model_or_method`
- public-safe `provenance`
- `claim_boundary`

Allowed outcome fields include:

- `prediction_id`
- `schema_version`
- `resolution_status`
- `resolution_date`
- `window_start`
- `window_end`
- `start_price`
- `end_price`
- `price_source_id`
- `actual_change_pct`
- `direction_correct`
- `error_pp`
- `abs_error_pp`
- `resolver_version`
- `resolution_notes`

## Forbidden Fields And Artifacts

Do not export:

- raw provider response
- raw prompt
- raw completion
- scorer transcript
- scorer rationale full text
- API keys
- `.env*`
- SQLite/DB files
- local absolute paths
- private run logs
- local `data/backtest/runs/*`
- Stage8/Stage9 private artifacts
- `.tar.gz` or `.bundle`
- auth files
- browser session files
- secrets
- unpublished private reports
- private GOTRA raw artifacts copied directly into this repo

## Redaction Report

Every export must include a redaction report with:

```json
{
  "export_id": "public_export_YYYYMMDD_HHMMSS",
  "source_repo": "gotra",
  "source_commit": "TBD",
  "exporter_version": "public_export_v1",
  "generated_at": "YYYY-MM-DDTHH:mm:ss+08:00",
  "input_artifacts": [
    {
      "name": "internal_summary.json",
      "sha256": "TBD"
    }
  ],
  "dropped_fields": [
    "raw_prompt",
    "raw_completion",
    "provider_response",
    "scorer_rationale"
  ],
  "forbidden_pattern_hits": [],
  "secret_scan_status": "pass",
  "claim_boundary_scan_status": "pass",
  "output_files": []
}
```

The redaction report must not include raw private content. It records hashes, dropped field names, and scan status.

## Manifest And Hash Requirements

`public/data/manifest.json` or the equivalent public manifest must include:

- `schema_version`
- `dataset_id`
- `snapshot_date`
- `generated_at`
- `exporter_version`
- source commit or public source identifier
- record counts
- file list
- SHA-256 for every exported file
- claim boundary labels
- data boundary labels

Any public data PR must make changed file hashes reproducible from the committed files.

## Public PR Gate

A public data or product PR must not be accepted until these checks are recorded:

- schema validation
- manifest hash validation
- record count invariant
- no future leakage check
- pending/outcome consistency check
- forbidden source scan
- `npm run secrets:scan`
- `npm run compliance:scan`
- dataset diff summary
- reviewer sign-off

If any private artifact or forbidden field is detected, the PR is blocked until the artifact is removed and a new redaction report is produced.
