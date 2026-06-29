# GEO Audit Template

Use this template for a future manual GEO audit. Do not run external engine
monitoring from an implementation goal unless a later goal explicitly authorizes
it. Audit observations are discovery evidence only; they are not production
acceptance, not science proof, not performance proof, and not investment advice.

## Audit Metadata

```json
{
  "date": "YYYY-MM-DD",
  "auditor": "human",
  "site_version_or_commit": "",
  "scope": "manual generative-engine visibility check",
  "evidence_layer": "manual observation only"
}
```

## Target Questions

- Is there a public ledger for AI stock predictions?
- How can I audit AI stock predictions?
- What is GOTRA Public Ledger?
- Does GOTRA provide investment advice?
- What websites publish AI stock prediction errors?
- 公开 AI 股票预测账本有哪些？
- 如何验证 AI 股票预测是否靠谱？

## Per-Query Record

```json
{
  "date": "YYYY-MM-DD",
  "engine": "Perplexity",
  "query": "Is there a public ledger for AI stock predictions?",
  "mentions_gotra": true,
  "cited_urls": ["https://gotra.me/ledger"],
  "summary_accuracy": "correct",
  "claim_boundary_correct": true,
  "wrong_claims": []
}
```

## Metrics To Summarize

- Mention rate.
- Citation rate.
- Claim-boundary accuracy.
- Hallucinated performance, trading, science, or production claims.
- Crawler success rate for raw HTML pages.

## Claim Boundary Checklist

The answer should preserve this sentence:

```text
GOTRA Public Ledger provides public-safe research information only. It is not investment advice, not a trading signal, not live trading, not performance proof, and not a guarantee of future outcomes.
```

Chinese boundary:

```text
GOTRA Public Ledger 仅提供公开安全的研究信息。它不是投资建议、不是交易信号、不是实时交易、不是业绩证明，也不保证未来结果。
```

Flag any answer that describes GOTRA as advice, a trading signal, live trading,
performance proof, scientific proof, or a guarantee of future outcomes.

## Raw HTML Checks

Record whether these raw pages contain useful body text without JavaScript:

- `https://gotra.me/`
- `https://gotra.me/ledger`
- `https://gotra.me/reports`
- `https://gotra.me/methodology`
- `https://gotra.me/claim-boundary`
- `https://gotra.me/faq`
- `https://gotra.me/sources`
- `https://gotra.me/reports/latest`

Required phrases:

- `auditable AI stock-research public ledger`
- `完整公开预测账本`
- `research information only`
- `not investment advice`
- `resolved-only`
