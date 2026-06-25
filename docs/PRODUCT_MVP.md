# GOTRA Public Ledger Product MVP

Version: `public_alpha_v1`
Status: docs-contract candidate
Evidence layer: `local checks`

## Positioning

GOTRA Public Ledger is a public research-information product that records AI-generated stock research views, checks fixed-window outcomes against public-safe data, keeps mistakes visible, and tracks a hypothetical paper portfolio under fixed rules.

Chinese public positioning:

> GOTRA 公开记录 AI 对美股/港股的研究判断，到期后按规则核对现实走势，保留错误，并用固定规则展示模拟组合表现。

This repository is not the private GOTRA research kernel. It is the public product surface for public-safe ledger records, methodology, reports, and hypothetical paper tracking.

## Public Alpha v1 Scope

Public Alpha v1 must stay narrower than a full research platform or SaaS product. The first product surface is:

- Public prediction ledger with timestamps, ticker, market, view, confidence, horizon, provenance, outcome status, and error fields where resolved.
- Prediction detail pages that show decision metadata, evidence summary, expected check date, outcome status, result, error, and claim boundary.
- Performance page for fixed-rule hypothetical paper tracking, benchmark comparison, drawdown, exposure, turnover, and sample-size limitations.
- Methodology page for universe, horizon, outcome resolver, benchmark, paper portfolio, cost, slippage, source, and version rules.
- Sources page for source manifest, evidence index, data provenance, redaction status, and manifest/hash checks.
- Notes and reports for weekly ledger updates, error reviews, monthly transparency notes, and method notes.
- Subscribe entry that explains update frequency without promising returns.

## Required Pages

P0 pages:

- `/`
- `/ledger`
- `/ledger/:id`
- `/performance`
- `/methodology`

P1 pages:

- `/sources`
- `/notes`
- `/notes/:slug`
- `/reports`
- `/about`

P2 pages:

- `/ticker/:ticker`
- `/glossary`
- `/changelog`
- `/download`

## Required User Tasks

Public Alpha v1 should let a reader:

- Understand that this is a public AI research ledger.
- See recently published and settled predictions.
- Search by ticker and filter by market, direction, horizon, status, and confidence.
- Open one prediction and inspect the timestamp, horizon, provenance, expected move, outcome status, actual result, and error.
- Distinguish `pending`, `frozen_pending`, `resolved`, `blocked_*`, and `needs_review`.
- Read the paper portfolio policy before interpreting any performance chart.
- See visible reminders that performance is hypothetical paper tracking, not live trading and not investment advice.

## Out Of Scope For v1

Public Alpha v1 does not include:

- Login, account permissions, enterprise admin, API key management, or private deployment.
- Real-time quotes, live brokerage connection, real-money portfolio tracking, or order execution.
- Personalized recommendations, custom suitability, alerts for trading action, or payment/community operations.
- Full SaaS dashboard, governance console, scorer UI, or private GOTRA experiment browser.
- Automatic social distribution or paid subscription fulfillment.

## Forbidden Product Claims

Do not write or imply:

- Forbidden: `建议买入`
- Forbidden: `建议卖出`
- Forbidden: `荐股`
- Forbidden: `交易信号`
- Forbidden: `AI 选股`
- Forbidden: `稳定 alpha`
- Forbidden: `OOS passed`
- Forbidden: `科学证明`
- Forbidden: `公开证明`
- Forbidden: `跑赢市场`
- Forbidden: `稳定收益`
- Forbidden: `实盘收益`
- Forbidden: `年化收益`
- Forbidden: `保本`
- Forbidden: `稳赚`
- Forbidden: `预测能力被证明`
- Forbidden: `越来越准`
- Forbidden: `目标价`
- Forbidden: `仓位建议`
- Forbidden: `止损`
- Forbidden: `止盈`
- Forbidden: `跟单`

Allowed wording should stay within:

- Public research records.
- Public prediction ledger.
- Fixed-window outcome resolution.
- Error review.
- Resolved-only public-safe metrics.
- Hypothetical shadow/paper portfolio.
- Fixed-rule paper tracking.
- Research information only.
- Not investment advice.
- Not a trading signal.
- Small sample size.

## Evidence Boundary

Public Alpha v1 evidence must be reported in layers:

- `local checks`: lint, typecheck, scripts, build, schema checks, compliance scan, and secrets scan. This proves only local mechanics.
- `smoke evidence`: local preview, Pages HTTP, browser smoke, screenshots, data-file availability, and core route checks. This proves only a public path works.
- `long-run/formal acceptance`: CI green, manifest hash, redaction report, forbidden artifact scan, reviewer approval, Pages deploy evidence, human gate, and launch closeout.
- `science/public claim`: not allowed for v1. Do not claim OOS pass, scientific proof, durable alpha, trading value, or investment usefulness.

## v1 Product Decision Rule

The product may move forward when it honestly presents public research records and fixed-rule paper tracking. It must not wait for private GOTRA formal reliability to become a public science claim, and it must not use private GOTRA raw artifacts to fill public gaps.
