# Paper Portfolio Policy

Version: `portfolio_policy_v1`
Status: docs-contract candidate
Evidence layer: `local checks`

## Purpose

The paper portfolio answers one narrow question:

> If GOTRA public predictions are mapped mechanically into a hypothetical paper portfolio under fixed rules, what would the tracked performance look like?

It is not real money, live trading, investment advice, a personalized recommendation, or a promise of future performance.

## v1 Policy

```text
policy_id: gotra_shadow_long_only_equal_weight_v1
universe: fixed 10-20 US/HK tickers
horizons: 7D and 30D
mapping:
  bullish/up -> paper long
  neutral -> no position
  bearish/down -> no position
shorting: disabled
weighting: equal weight
max single ticker weight: 10%
max gross exposure: 100%
entry: next tradable close after decision_date
exit: horizon end close
benchmark_ids: SPY, QQQ, HSTECH
```

v1 is long-only or long/cash. No short exposure is allowed in v1.

## Universe And Horizons

The initial universe is a fixed 10-20 ticker US/HK research universe. Universe changes require:

- a new policy version
- a changelog entry
- a public reason
- no retroactive rewrite of older policy results

Initial horizons are `7D` and `30D`. Other horizons are out of scope until a new policy version is reviewed.

## Benchmarks

Default benchmarks:

- `SPY` for broad US market comparison.
- `QQQ` for US technology-heavy comparison.
- `HSTECH` for HK technology-heavy comparison.

Benchmark choice must be fixed before performance display. Do not change benchmarks post hoc to improve appearance.

## Cost And Slippage Assumptions

Default assumptions:

```text
commission_bps: 0
slippage_bps: 5
fx_cost_bps: 10
```

Every paper portfolio snapshot must include the cost assumptions that were used. If assumptions change, the result must move to a new `policy_version`.

## Position Construction

Rules:

- Open a paper long only when the prediction maps to `bullish/up`.
- Keep `neutral` and `bearish/down` as no-position/cash in v1.
- Equal weight all active v1-eligible long positions subject to limits.
- Cap any single ticker at `10%`.
- Cap gross exposure at `100%`.
- Use the next tradable close after `decision_date` as entry.
- Use horizon-end close under `outcome_resolver_v1` trading-day rules as exit.
- Link every paper position and trade to `prediction_id`.

## Metrics

Performance reporting should include:

- cumulative return
- benchmark return
- excess return
- max drawdown
- volatility
- win rate
- average win/loss
- turnover
- average exposure
- concentration
- sample size
- transaction-cost-adjusted return

Each metric must expose its sample size and calculation window.

## Small Sample Warning

If settled trades are fewer than 30, display:

> Sample size is small. This hypothetical paper performance is early-stage tracking and should not be interpreted as statistically reliable or investment advice.

Chinese:

> 样本量仍小。这里展示的是早期 hypothetical paper tracking，不应被理解为统计上可靠的投资能力证明或投资建议。

## No Post-Hoc Rule Change

Already-published results must not be recomputed under a changed rule without:

- new `policy_version`
- old and new result separation
- changelog entry
- explanation of why the policy changed
- reviewer approval before public acceptance claims

Changing rules after seeing outcomes is a product-integrity failure.
