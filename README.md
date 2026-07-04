# GOTRA Public Ledger

GOTRA Public Ledger 是 GOTRA 的公开读者前端。它把后端 v4 研究认知链路转成普通读者能读懂的页面：今日简报、研究阅读器、证据与来源、方法论、使用指南和审计入口。

生产地址：[https://gotra.me/](https://gotra.me/)

本项目是 **research information only**。它不是投资建议，不是交易信号，不给目标价，不给仓位建议，不承诺收益，不是 performance proof，也不是 science/public proof。

## 当前状态

最新已落档状态：

| 项目 | 当前值 |
| --- | --- |
| 前端仓库 | `/opt/gotra-public-ledger` |
| v4 前端部署基线 | `main@35ba6fa`，clean；README refresh 提交可能在此之上 |
| GitHub PR | `#56` 已 merge |
| 前端结果 | `PASS_V40_FRONTEND_PRODUCTIZATION_SMOKE` |
| 证据层级 | local checks + browser smoke + production smoke |
| 生产 artifact | `daily_reader_brief.json` |
| daily reader schema | `gotra.daily_reader_brief.v4` |
| symbol schema | `gotra.full_analyst.symbol.v4` |
| execution model | `deep_research_dossier_then_parallel_perspectives` |
| methodology | `ksana_cognition_flywheel_v4` |
| public safety | `ok` |
| Alaya readback | `verified` |
| 后端 v4 结果 | `PASS_WITH_REVIEW_ITEMS_2H_V40_KSANA_COGNITION_FLYWHEEL`，`7232s`，`13` loops |

这说明当前 UI 已完成 v4 产品化收口和 production smoke。它不是 v4 2h pressure 的重新验收，也不是 `10h/formal acceptance`。

已知 review item：`npm ci` / dependency audit 曾报告 `17` 个 moderate dependency vulnerabilities。处理依赖安全时必须先分类生产可触达性和修复风险，不要直接运行 `npm audit fix --force`。

## 产品定位

GOTRA Public Ledger 现在不是旧的 demo prediction ledger 首页，也不是绩效展示页。它的主路径是 v4 研究阅读体验：

- 首页解释 GOTRA v4 的研究链路；
- `/today` 和 `/#/today` 是今日研究简报入口；
- `/#/guide` 解释如何阅读 GOTRA；
- `/#/why-gotra` 解释 GOTRA 与 AI 荐股 agent / trading signal tool 的区别；
- `/#/reports` 汇总报告和审计入口；
- `/#/sources` 解释公开证据、source freshness、missing sources 和 data gaps；
- `/#/methodology` 解释 v4 方法、schema、execution model、fallback 和边界；
- `/reports/full-analyst/` 是 Full Analyst v4 reader；
- `/reports/latest/` 是 latest coverage report reader；
- raw JSON / raw Markdown 只能作为 Audit / Evidence Center 中明确标注的 raw artifact 链接，不得成为主阅读路径。

旧的 `/ledger` 和 `/performance` 只能作为 demo/archive/notes surface，不应被当成当前生产主路径。

## 用户应该如何读

中文用户的推荐阅读顺序：

1. 打开 `/today` 或 `/#/today`，先看今日重点。
2. 看每个 symbol 的研究状态：`needs_review`、`data_gap`、`watch` 等都代表研究边界，不是交易指令。
3. 进入 `/reports/full-analyst/`，按顺序读研究任务书、证据包、K 底稿、F/W/G 视角、主席综合和红队反证。
4. 在 `Research Quality Gate` 看系统为什么保留限制。
5. 在 `Knowledge Gate` 看哪些内容沉淀到内部 Alaya memory，哪些 unresolved questions 留给下一轮。
6. 在 `Evidence & Sources` 复核来源、freshness、missing required sources 和 public-safe 边界。
7. 在 Audit / Evidence Center 里按需打开 raw JSON/Markdown。普通阅读不应该从 raw artifact 开始。

页面可以保留英文技术词，但必须优先给中文解释。例如：

- Research Task：研究任务书；
- Evidence Packet：证据包；
- K Deep Research Dossier：K 深度研究底稿；
- F/W/G Independent Perspectives：F/W/G 独立视角；
- Chairman Synthesis：主席综合；
- Red Team Critique：红队反证审计；
- Research Quality Gate：研究质量闸门；
- Knowledge Gate：知识闸门；
- Internal Alaya Readback：内部 Alaya 回读；
- Reader Boundary Gate：读者边界闸门。

## v4 数据契约

主数据源：

```text
public/reports/daily_reader_brief.json
```

生产 URL：

```text
https://gotra.me/reports/daily_reader_brief.json
```

关键字段：

```text
schema=gotra.daily_reader_brief.v4
symbol_schema=gotra.full_analyst.symbol.v4
methodology_version=ksana_cognition_flywheel_v4
execution_model=deep_research_dossier_then_parallel_perspectives
agent_analysis_items[].research_task
agent_analysis_items[].evidence_packet
agent_analysis_items[].k_deep_research_dossier
agent_analysis_items[].f_partner_view
agent_analysis_items[].w_partner_view
agent_analysis_items[].g_partner_view
agent_analysis_items[].chairman_synthesis
agent_analysis_items[].red_team_audit
agent_analysis_items[].research_quality_gate
agent_analysis_items[].knowledge_gate
agent_analysis_items[].reader_boundary_gate
```

Full Analyst 状态源：

```text
https://gotra.me/reports/status_full_analyst_evening_hk.json
```

注意：`/reports/status.json` 属于传统 public stock-pool report 状态，不等同于 Full Analyst v4 状态。不要用它直接判断 v4 cognition flywheel 是否失败。

## 页面结构

| 页面 | 作用 |
| --- | --- |
| `/` | v4 首页，解释 GOTRA 不是信号机，而是研究认知系统。 |
| `/today/` | no-JS/GEO 今日简报。 |
| `/#/today` | SPA 今日简报。 |
| `/#/guide` | 使用指南，解释阅读顺序、术语、边界和报告类型。 |
| `/#/why-gotra` | 解释为什么 GOTRA 不直接给买卖结论，以及和 AI stock-picking agent 的区别。 |
| `/#/reports` | 报告索引、production status、audit entry。 |
| `/#/sources` | 证据与来源说明。 |
| `/#/methodology` | v4 方法论、fallback、execution model、claim boundary。 |
| `/reports/latest/` | latest coverage report reader。 |
| `/reports/full-analyst/` | Full Analyst v4 reader。 |
| `/reports/daily_reader_brief.json` | 机器可读数据源，不是用户阅读目的地。 |

## 本地开发

安装依赖：

```bash
npm ci
```

开发：

```bash
npm run dev
```

完整本地验证：

```bash
npm run typecheck
npm run lint
npm run compliance:scan
npm run secrets:scan
npm test -- --run
npm run build
npm run geo:smoke
```

本地预览：

```bash
npm run preview
```

生成 daily reader brief：

```bash
npm run reader-brief:generate
```

## 依赖安全处理

如果 `npm ci` 或 `npm audit` 报 vulnerabilities，先分类再修复：

```bash
npm audit --omit=dev --json > /tmp/gotra-public-ledger-npm-audit-prod.json || true
npm audit --json > /tmp/gotra-public-ledger-npm-audit-all.json || true
npm audit > /tmp/gotra-public-ledger-npm-audit-human.txt || true
```

分类维度：

- production-exposed 还是 dev-only；
- direct dependency 还是 transitive dependency；
- patch/minor 是否可安全修；
- 是否需要 major upgrade；
- 是否只是 scanner metadata；
- 是否需要临时接受并记录理由。

禁止默认执行：

```bash
npm audit fix --force
```

依赖修复后必须至少重跑：

```bash
npm ci
npm run typecheck
npm run lint
npm run compliance:scan
npm run secrets:scan
npm test -- --run
npm run build
npm run geo:smoke
```

## GEO / no-JS

`npm run build` 会运行 `npm run geo:generate`，生成 crawler-readable static HTML。no-JS/GEO 页面必须同步 v4 术语和读者路径，不能残留 v3.5 文案或旧 demo-ledger 主叙事。

检查：

```bash
npm run geo:smoke
```

GEO smoke 是 no-JS/static HTML 证据，不等于 production smoke、长期稳定性或正式验收。

## 部署

Canonical production 是：

```text
https://gotra.me/
```

GitHub Pages 只是 fallback/debug static publishing target，不是 canonical 生产入口。

生产部署前应：

- 确认 `/opt/gotra-public-ledger` 在 `main` 且 clean；
- 运行完整本地验证；
- 备份当前 `/var/www/gotra-public-ledger`；
- 构建并同步 `dist/`；
- 检查 nginx；
- 跑 production smoke 和 browser QA。

部署失败时必须 rollback，不要让 gotra.me 长时间停在坏状态。

运行时细节见：

- [`docs/PRODUCTION_RUNTIME_RUNBOOK.md`](docs/PRODUCTION_RUNTIME_RUNBOOK.md)
- [`docs/GEO_STATIC_HOSTING.md`](docs/GEO_STATIC_HOSTING.md)
- [`docs/GEO_AUDIT_TEMPLATE.md`](docs/GEO_AUDIT_TEMPLATE.md)

## Browser QA 标准

生产 smoke 至少覆盖：

```text
https://gotra.me/
https://gotra.me/today/
https://gotra.me/#/today
https://gotra.me/#/guide
https://gotra.me/#/why-gotra
https://gotra.me/#/reports
https://gotra.me/#/sources
https://gotra.me/#/methodology
https://gotra.me/reports/latest/
https://gotra.me/reports/full-analyst/
https://gotra.me/reports/daily_reader_brief.json
```

必须检查：

- HTTP 200；
- desktop/mobile screenshot；
- console fatal errors = 0；
- raw accidental landing = 0；
- `[object Object]` = 0；
- Python dict = 0；
- unrendered JSON/Markdown in reader path = 0；
- v4 research flow visible；
- Alaya internal explanation visible；
- not investment advice / not trading signal 边界存在但不形成免责声明墙。

## Claim Boundary

页面、README、release notes 和报告都不得声称：

- GOTRA 提供投资建议；
- GOTRA 是交易信号；
- GOTRA 给目标价；
- GOTRA 给仓位建议；
- GOTRA 承诺收益；
- GOTRA 已证明 outperformance；
- GOTRA 已完成 science/public proof；
- 2h pressure 或 frontend smoke 等于 10h/formal acceptance。

允许的准确说法：

```text
GOTRA v4 exposes a research process: task, evidence, K dossier, independent perspectives, synthesis, red-team critique, quality gate, knowledge gate, internal readback, and reader boundary.
```

中文：

```text
GOTRA v4 展示的是研究过程：研究任务、证据、K 底稿、独立视角、综合、红队反证、质量闸门、知识闸门、内部回读和读者边界。
```

## Alaya 边界

本项目中 Alaya 只表示 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback / readback state。

禁止：

- 接入外部 Alaya repo；
- 使用 `ALAYA_BASE_URL`；
- 使用 `ALAYA_WRITE_PATH`；
- 把 Alaya 描述成外部项目或第三方服务。

## Raw Artifact 边界

用户主路径不能落到 raw JSON、raw Markdown、Python dict、`[object Object]` 或未渲染 artifact。

Raw artifact 只允许出现在：

- Audit / Evidence Center；
- `<details>` 折叠区；
- 明确标注 `Raw artifact / Open JSON / Open Markdown`；
- 有产品化说明和返回产品页入口。

## 数据与旧 demo

`public/data/ledger.demo.json`、paper portfolio、performance notes 和历史 prediction-ledger 页面仍可作为 demo/archive 资料存在，但它们不是当前 v4 主叙事。

当前生产主叙事必须来自：

- `daily_reader_brief.v4`；
- Full Analyst v4 reader；
- v4 research task / evidence packet / K dossier / F-W-G / Chairman / Red Team / gates / Alaya readback。

## License

[MIT](LICENSE)
