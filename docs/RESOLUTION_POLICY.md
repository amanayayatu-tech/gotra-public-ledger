# Outcome Resolution Policy

Version: `outcome_resolver_v1`
Status: docs-contract candidate
Evidence layer: `local checks`

## Purpose

The outcome resolver converts matured public predictions into outcome records under fixed, auditable rules. It must preserve unresolved or blocked records instead of fabricating results.

## Inputs

The resolver may read:

- Public-safe prediction records.
- Existing public-safe outcome records.
- Price source configuration approved for public use.
- `as_of_date`.
- Source manifest entries for price data and corporate-action checks.

The v1 local CLI contract is:

- `predictions.latest.json`: public-safe prediction inputs with `prediction_id`, asset identity, `decision_date`, `outcome_availability_date`, `direction`, and optional `expected_change_pct`.
- `outcomes.latest.json`: the current separate outcome surface; only `pending` and `frozen_pending` records are resolver candidates.
- `price-source.fixture.json` or an equivalent approved source config: source id, policy version, fixed `neutral_threshold`, adjusted-close policy, market/currency identity, prices, and source-conflict classifications.
- `as_of_date`: the deterministic cutoff date for eligibility and blocked/review classifications.

The resolver must not read or copy private GOTRA raw run artifacts, raw provider output, prompts, completions, scorer transcripts, local DBs, `.env*`, or private run logs.

## Eligible Records

A prediction is eligible for resolution only when:

- `outcome_availability_date <= as_of_date`, or the equivalent horizon maturity rule is met.
- `resolution_status` is `pending` or `frozen_pending`.
- The record has a valid `decision_date`, `horizon`, `direction`, and ticker/asset identity.
- A public-safe price source can provide the required start and end prices.

Pending records that are not yet eligible must remain pending and must not enter resolved-only metrics.

## Price And Source Rules

Default rules:

- Use public-safe market data sources recorded in `source-manifest`.
- Use adjusted close when reliable adjusted close exists for the market.
- If adjusted close is unavailable or conflicted, use the documented fallback and mark the source rule in the outcome.
- Start price is the close of the next tradable session after `decision_date`, unless a policy version explicitly fixes another public rule before publication.
- End price is the close on the horizon end date.
- If the horizon end date is not a trading day, use the next tradable close unless the policy version specifies a different public rule.
- US and HK assets keep market identity and currency handling explicit.
- Splits, delistings, suspensions, ticker changes, and source conflicts must go to `needs_review` or a `blocked_*` state.

No manual adjustment may be made to improve appearance.

## Direction Rule

The v1 direction rule is:

```text
direction = up      -> actual_change_pct > neutral_threshold
direction = down    -> actual_change_pct < -neutral_threshold
direction = neutral -> abs(actual_change_pct) <= neutral_threshold
```

Default `neutral_threshold` is `0.5%`.

The threshold is part of the resolver policy version. It must not be changed post hoc for already-published records.

## Error Rule

For records with numeric expected change:

```text
actual_change_pct = (end_price / start_price - 1) * 100
error_pp = actual_change_pct - expected_change_pct
abs_error_pp = abs(error_pp)
```

For records without numeric expected change, direction correctness may be resolved only if direction fields and prices are valid; numeric error fields must stay `null` or omitted.

## Resolution Statuses

Allowed v1 statuses:

- `pending`
- `frozen_pending`
- `resolved`
- `blocked_missing_price`
- `blocked_market_holiday_conflict`
- `blocked_symbol_change`
- `blocked_corporate_action_conflict`
- `needs_review`
- `superseded`

Blocked status is not a pass and not a failure. It is an honest data-boundary state.

## No-Fabricated-Outcome Rule

The resolver must not invent:

- `start_price`
- `end_price`
- `actual_change_pct`
- `direction_correct`
- `error_pp`
- `abs_error_pp`
- missing corporate-action adjustments
- private source evidence

If public-safe evidence is insufficient, the record must stay pending, become `needs_review`, or move to the matching `blocked_*` state.

## Audit Output

Each resolver run should produce a report with:

- policy version
- `as_of_date`
- input file hashes
- output file hashes
- processed count
- resolved count
- blocked count by reason
- skipped count by reason
- price source ids
- warnings and review items

The report is local/mechanical evidence only unless it is included in a reviewed formal launch bundle.

The public-safe fixture report for v1 is stored as `public/data/fixtures/outcome-resolver/expected-report.json`. It is a deterministic local-check artifact, not smoke evidence, formal acceptance, market-data validation, performance proof, or investment advice.
