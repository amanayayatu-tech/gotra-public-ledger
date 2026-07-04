/* global console, process */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "dist");
const publicRoot = path.join(repoRoot, "public");
const externalReportsRoot = process.env.GOTRA_REPORTS_DIR ? path.resolve(process.env.GOTRA_REPORTS_DIR) : null;
const baseUrl = "https://gotra.me";

const englishDefinition =
  "GOTRA Public Ledger is an auditable AI financial research publication ledger. It shows daily research observations, public evidence, data gaps, review items, and audit trails; internal v4 research-chain terms remain available in methodology and audit pages. It is not investment advice, not a trading signal, not performance proof, and not science/public proof.";
const chineseDefinition =
  "GOTRA Public Ledger 是可审计 AI 金融研究发布账本。它展示今日研究观察、公开证据、数据缺口、复核项和审计记录；内部 v4 研究链路术语保留在方法论和审计页面。它不是投资建议、不是交易信号、不是业绩证明，也不是科学/公开证明。";
const boundarySentence =
  "GOTRA Public Ledger provides public-safe research information only. It is not investment advice, not a trading signal, not live trading, not performance proof, and not a guarantee of future outcomes.";
const chineseBoundarySentence =
  "GOTRA Public Ledger 仅提供公开安全的研究信息。它不是投资建议、不是交易信号、不是实时交易、不是业绩证明，也不保证未来结果。";
const guideReadingOrder = [
  ["/today", "今日研究简报（Daily Research Brief）", "先看今日研究了什么、证据够不够、哪些需要复核、下一步观察什么。"],
  ["/why-gotra", "为什么是 GOTRA（Why GOTRA）", "理解 GOTRA 是研究纪律，不是 AI 荐股机或交易信号机。"],
  [
    "/reports/full-analyst/",
    "完整研究链路阅读器（Full Analyst Reader）",
    "阅读为什么今天研究、K 深度研究底稿、F/W/G 独立视角、主席综合、红队反证审计、闸门状态和未解决问题。",
  ],
  ["/reports", "审计中心（Audit Center）", "核对生产报告、状态 JSON、原始审计产物入口和证据边界。"],
  ["/sources", "证据与来源（Evidence and Sources）", "理解证据包的来源类型、新鲜度、缺失来源和数据缺口（data_gap）。"],
  ["/methodology", "方法论（Methodology）", "理解 v4 为什么先做 K 底稿，再让 F/W/G 并行，并由研究质量闸门、知识闸门和读者边界闸门收口。"],
];
const guideFlowRows = [
  ["研究任务书（Research Task Planner）", "说明为什么今天研究这只股票、今日任务、核心问题、必需来源，以及缺少哪些证据就不能下结论。"],
  ["证据包（Evidence Packet Builder）", "先构建公开安全的证据包，标明来源类型、新鲜度、缺失来源、陈旧来源、数据缺口和限制。"],
  ["K 深度研究底稿（K Deep Research Dossier）", "K 先运行并形成深度研究底稿；K 不是普通并行 agent 之一。"],
  ["F/W/G 独立视角（F/W/G Parallel Perspectives）", "F/W/G 在 K 底稿之后独立并行运行，基于研究任务、证据包、K 底稿和内部 Alaya 回读提出不同视角。"],
  ["主席综合（Chairman Synthesis）", "综合 K + F/W/G，指出一致点、冲突、证据强弱、未解决问题和观察条件。"],
  ["红队反证审计（Red Team Critique）", "攻击薄弱假设、反证缺口、无支撑结论和边界风险；红队不是 Judge。"],
  ["研究质量闸门（Research Quality Gate）", "标记 candidate、watch、avoid、需要复核（needs_review）、数据缺口（data_gap）或高不确定性，不隐藏研究内容。"],
  ["知识闸门（Knowledge Gate）", "决定哪些知识沉淀到内部记忆，哪些只是临时观察，哪些未解决问题进入下一轮。"],
  ["公开安全扫描（Public Safety Scan）", "完整内部提示词、provider/model 原始 I/O、secrets、数据库和私有日志不会公开。"],
  ["内部 Alaya（Internal Alaya）", "这里的 Alaya 只指 GOTRA repo 内部 cognition flywheel、knowledge memory、feedback state 和 hash-chain/readback state。"],
  ["读者边界闸门（Reader Boundary Gate）", "加上“研究信息，不是投资建议/交易信号”的边界，同时保持数据缺口、需要复核、红队质疑和 agent 分歧可见。"],
  ["公开产物（Public Artifacts）", "公开输出包括今日简报、v4 阅读器、审计中心、来源页、方法论页和 no-JS HTML。"],
  ["证据层级（Evidence Boundary）", "local checks、browser smoke、public artifact smoke、formal acceptance、science/public claim 是不同证据层，不互相升级。"],
];
const guideGlossaryRows = [
  ["今日简报（Daily Brief）", "生产报告、完整研究链路摘要、数据缺口、观察清单和边界说明的默认阅读入口。"],
  ["完整研究链路 v4（Full Analyst v4）", "从研究任务书、证据包、K 底稿、F/W/G、主席综合、红队、研究质量闸门、知识闸门到读者边界的研究链路。"],
  ["K 深度研究底稿（K Dossier）", "F/W/G 启动前先生成的深度研究底稿，后续视角必须基于它。"],
  ["独立视角（Perspective Agents）", "F/W/G 独立研究视角，用来保留分歧，而不是把不确定性压成一句确定答案。"],
  ["红队反证审计（Red Team）", "审计过度确定、隐藏假设、缺失证据和边界风险；它不是 Judge。"],
  ["知识闸门（Knowledge Gate）", "决定研究知识是否沉淀、带限制沉淀、只作为临时观察，或不应沉淀。"],
  ["风险因素（Risk Factors）", "可能推翻研究视角或要求读者谨慎的条件。"],
  ["观察条件（Watch Items）", "下一步需要复查的问题、数据点、事件或来源状态。"],
  ["数据缺口（Data Gap）", "公开来源覆盖、价格或状态文件缺失；不会用私有数据硬补。"],
  ["Judge 闸门（Judge Gate）", "发布前的结构、覆盖、公开安全和边界检查。"],
  ["公开安全（Public-safe）", "可面向读者和爬虫公开；不包含 raw I/O、secrets、私有日志、数据库或凭证。"],
  ["证据层级（Evidence Layer）", "区分 local checks、smoke evidence、formal acceptance 和 science/public claim。"],
  ["Demo Ledger", "仅归档的冻结公开安全 demo，不是 v4 主阅读器、最新生产报告或实时预测账本。"],
  ["业绩证明（Performance Proof）", "能证明生产收益或表现的证据；本站不提供。"],
  ["科学/公开证明（Science/Public Proof）", "足够支撑科学或公共有效性声明的验证；日报和 smoke 不等于这种证明。"],
  ["交易信号（Trading Signal）", "买/卖/持有、仓位或目标价指令；本站不提供。"],
];
const dataSourcePolicyRows = [
  [
    "Yahoo Finance chart API via GOTRA price_cache helper",
    "价格数据",
    "HKEX / NASDAQ / NYSE",
    "日线 adjusted close 的研究 / 原型证据。",
    "低频批处理、本地缓存、只使用已完成日线；不能声称为生产级实时行情授权。",
    "不能作为未来商业发布的唯一行情来源。",
  ],
  [
    "Stooq public daily prices",
    "备用价格数据",
    "NASDAQ / NYSE / selected global",
    "公开历史价格的低频备用研究来源。",
    "覆盖、代码映射和时效可能不完整；必须缓存并记录缺口。",
    "不是生产级实时行情授权。",
  ],
  [
    "Alpha Vantage free tier",
    "低频备用价格 / 指标",
    "NASDAQ / NYSE / selected global",
    "显式配置后作为低频备用来源。",
    "免费层按低频使用：不超过 5 requests/minute 和 500 requests/day。",
    "任何商业发布用途都需要单独授权复核。",
  ],
  [
    "SEC EDGAR filings and CompanyFacts",
    "监管披露 / 公司事实",
    "NASDAQ / NYSE / US issuers",
    "美国发行人 filings、CompanyFacts 和公告时间戳证据。",
    "SEC EDGAR 必须使用合规 User-Agent，最高 10 requests/second，并使用缓存与退避。",
    "可用于公开披露事实核对；不是价格行情源。",
  ],
  [
    "FRED macroeconomic data",
    "宏观数据",
    "US / global macro",
    "宏观背景和系列发布日期证据。",
    "宏观序列有发布日历和修订风险。",
    "只能作为宏观证据，不能独立支持个股价格结论。",
  ],
  [
    "HKEXnews issuer announcements",
    "港交所公告 / 披露事实",
    "HKEX",
    "港股发行人公告、披露事实和发布时间核对。",
    "低频查询和缓存；公告发布时间可能滞后交易时段。",
    "不是免费实时行情来源。",
  ],
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(relativePath, required = true) {
  const filePath = sourcePath(relativePath);
  if (!fs.existsSync(filePath)) {
    if (required) {
      fail(`Missing required public-safe source: ${relativePath}`);
    }
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(relativePath) {
  const filePath = sourcePath(relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function sourcePath(relativePath) {
  const normalized = relativePath.replace(/^\/+/, "");
  if (externalReportsRoot && normalized.startsWith("public/reports/")) {
    return path.join(externalReportsRoot, normalized.replace(/^public\/reports\//, ""));
  }
  return path.join(repoRoot, relativePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function localized(zh, en = zh) {
  const safeZh = String(zh ?? "").trim();
  const safeEn = String(en ?? zh ?? "").trim();
  return {
    zh: safeZh || safeEn,
    en: safeEn || safeZh,
  };
}

function isLocalized(value) {
  return value && typeof value === "object" && !Array.isArray(value) && typeof value.zh === "string" && typeof value.en === "string";
}

function textValue(value) {
  if (isLocalized(value)) {
    return value.zh === value.en ? value.zh : `${value.zh} / ${value.en}`;
  }
  return String(value ?? "");
}

function listText(value, fallback = "") {
  return Array.isArray(value) && value.length > 0 ? value.slice(0, 3).map(textValue).join(" | ") : fallback;
}

function readerListText(value, fallback = "") {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }
  const visible = value
    .map(textValue)
    .filter((text) => !/\b[a-z_]*hash\b\s*:|_hash\s*:|schema\s*:/i.test(text))
    .slice(0, 3);
  return visible.length > 0 ? visible.join(" | ") : fallback;
}

function combinedReaderListText(fallback, ...values) {
  const seen = new Set();
  const visible = values
    .flatMap((value) => (Array.isArray(value) ? value.map(textValue) : []))
    .filter((text) => text && !/\b[a-z_]*hash\b\s*:|_hash\s*:|schema\s*:/i.test(text))
    .filter((text) => {
      if (seen.has(text)) {
        return false;
      }
      seen.add(text);
      return true;
    })
    .slice(0, 3);
  return visible.length > 0 ? visible.join(" | ") : fallback;
}

function recordText(value, limit = 6, valueFormatter = (item) => item) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  return Object.entries(value)
    .slice(0, limit)
    .map(([key, item]) => `${key.replace(/_/g, " ")}: ${valueFormatter(String(item ?? ""))}`)
    .join(" | ");
}

function shortHash(value) {
  const text = String(value ?? "");
  return text.length > 18 ? `${text.slice(0, 12)}...${text.slice(-6)}` : text;
}

function englishValue(value) {
  if (isLocalized(value)) {
    return value.en || value.zh;
  }
  return String(value ?? "");
}

function isV40Brief(brief) {
  return (
    brief?.schema === "gotra.daily_reader_brief.v4" ||
    brief?.full_analyst?.execution_model === "deep_research_dossier_then_parallel_perspectives"
  );
}

function routeToFile(route) {
  if (route === "/") {
    return path.join(distRoot, "index.html");
  }
  return path.join(distRoot, route.replace(/^\//, ""), "index.html");
}

function canonicalUrl(route) {
  return `${baseUrl}${route === "/" ? "/" : route}`;
}

function isResolved(record) {
  return (
    typeof record.actual_change_pct === "number" &&
    typeof record.error === "number" &&
    typeof record.direction_correct === "boolean"
  );
}

function recordStatus(record) {
  if (isResolved(record)) {
    return "resolved";
  }
  return String(record.prediction_id).startsWith("PROTO-") ? "frozen_pending" : "pending";
}

function predictionDate(record) {
  return record.prediction_date ?? record.decision_date ?? "";
}

function predictionHorizon(record) {
  return record.horizon ?? record.prediction_window ?? "";
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function evidenceCount(record) {
  return Array.isArray(record.evidence) ? record.evidence.length : 0;
}

function firstSentence(value) {
  return String(value ?? "").split(/[。.!?]/)[0].trim();
}

function summarizeLedger(ledger) {
  const records = Array.isArray(ledger.records) ? ledger.records : [];
  const resolvedRecords = records.filter(isResolved);
  const pendingRecords = records.filter((record) => recordStatus(record) === "pending");
  const frozenPendingRecords = records.filter((record) => recordStatus(record) === "frozen_pending");
  const visibleErrorRecords = resolvedRecords.filter((record) => typeof record.error === "number");

  return {
    totalRecords: records.length,
    resolvedRecords: resolvedRecords.length,
    pendingRecords: pendingRecords.length,
    frozenPendingRecords: frozenPendingRecords.length,
    visibleErrorRecords: visibleErrorRecords.length,
    snapshotDate: ledger.metadata?.snapshot_date ?? "",
    datasetId: ledger.metadata?.dataset_id ?? "",
    datasetType: ledger.metadata?.dataset_type ?? "",
  };
}

function jsonLd(data) {
  const serialized = JSON.stringify(data, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  return `<script type="application/ld+json">${serialized}</script>`;
}

function baseJsonLd(route, description) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GOTRA Public Ledger",
      url: `${baseUrl}/`,
      description: "Auditable AI stock-research public ledger. Research information only; not investment advice.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "GOTRA Public Ledger",
      url: `${baseUrl}/`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "GOTRA Public Ledger",
      url: canonicalUrl(route),
      description,
    },
  ];
}

function pageShell({ route, title, description, body, extraJsonLd = [] }) {
  const canonical = canonicalUrl(route);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index,follow" />
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #111827;
        --muted: #4b5563;
        --line: #d1d5db;
        --paper: #ffffff;
        --soft: #f3f4f6;
        --accent: #0f766e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
        color: var(--ink);
        background: var(--paper);
      }
      header, main, footer {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
      }
      header {
        padding: 24px 0 16px;
        border-bottom: 1px solid var(--line);
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 12px;
      }
      a { color: #0f5f9a; }
      h1 { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.1; margin: 32px 0 16px; }
      h2 { margin-top: 36px; padding-top: 12px; border-top: 1px solid var(--line); }
      h3 { margin-top: 24px; }
      p.lede { font-size: 1.12rem; color: var(--muted); max-width: 76ch; }
      .boundary, .summary-grid, .notice {
        background: var(--soft);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 16px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .metric strong {
        display: block;
        font-size: 1.5rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0 24px;
        font-size: 0.92rem;
      }
      th, td {
        border: 1px solid var(--line);
        padding: 8px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      th { background: var(--soft); }
      code { background: var(--soft); padding: 0.1rem 0.25rem; border-radius: 4px; }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      footer {
        margin-top: 48px;
        padding: 24px 0 40px;
        border-top: 1px solid var(--line);
        color: var(--muted);
      }
    </style>
    ${[...baseJsonLd(route, description), ...extraJsonLd].map(jsonLd).join("\n    ")}
  </head>
  <body>
    <header>
      <strong>GOTRA Public Ledger</strong>
      <nav aria-label="Primary">
        <a href="/">首页</a>
        <a href="/today">今日研究简报</a>
        <a href="/why-gotra">为什么是 GOTRA</a>
        <a href="/guide">阅读指南</a>
        <a href="/reports/full-analyst/">完整研究链路</a>
        <a href="/sources">证据与来源</a>
        <a href="/methodology">方法论</a>
        <a href="/reports">审计中心</a>
        <a href="/reports/latest/">最新覆盖日报</a>
        <a href="/claim-boundary">声明边界</a>
        <a href="/faq">FAQ</a>
      </nav>
    </header>
    <main>
${body}
    </main>
    <footer>
      <p>${escapeHtml(chineseBoundarySentence)}</p>
      <p>${escapeHtml(boundarySentence)}</p>
    </footer>
  </body>
</html>
`;
}

function writeRoute(route, page) {
  const outputPath = routeToFile(route);
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, page);
  return { route, outputPath: path.relative(repoRoot, outputPath) };
}

function definitionBlock() {
  return `<section>
        <p class="lede">${escapeHtml(chineseDefinition)}</p>
        <p class="lede">${escapeHtml(englishDefinition)}</p>
        <div class="boundary">
          <p>${escapeHtml(chineseBoundarySentence)}</p>
          <p>${escapeHtml(boundarySentence)}</p>
        </div>
      </section>`;
}

function countText(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : "unavailable";
}

function statusLabel(value) {
  const raw = String(value ?? "unavailable");
  const labels = new Map([
    ["completed_with_review_items", "已完成但保留复核项（completed_with_review_items）"],
    ["pass_with_review_items", "通过但保留复核项（pass_with_review_items）"],
    ["needs_review", "需要复核（needs_review）"],
    ["data_gap", "数据缺口（data_gap）"],
    ["publish_with_boundary", "可带边界发布（publish_with_boundary）"],
    ["verified", "已验证（verified）"],
    ["ok", "正常（ok）"],
    ["unavailable", "暂不可用（unavailable）"],
    ["degraded", "降级（degraded）"],
    ["source_artifacts_found", "已找到公开来源产物（source_artifacts_found）"],
    ["deep_research_dossier_then_parallel_perspectives", "K 底稿先行、F/W/G 并行视角（deep_research_dossier_then_parallel_perspectives）"],
    ["research_task_evidence_independent_agent_calls", "研究任务书 + 证据包 + 独立 agent 调用（research_task_evidence_independent_agent_calls）"],
    ["independent_agent_calls", "独立 agent 调用（independent_agent_calls）"],
    ["not_reported", "未报告（not_reported）"],
    ["not_applicable", "不适用（not_applicable）"],
  ]);
  return labels.get(raw) ?? raw;
}

function statusExplanationHtml(rawStatus) {
  const raw = String(rawStatus ?? "unavailable");
  if (/PASS_WITH_REVIEW_ITEMS_2H_V40_KSANA_COGNITION_FLYWHEEL/i.test(raw)) {
    return `<div class="notice">
        <h3>通过但保留复核项</h3>
        <p>两小时 v4 压力测试完成，工程链路、公开产物、生产 smoke 和审计检查在该窗口内稳定；仍有研究复核项。</p>
        <p>不代表 10 小时正式验收，也不是投资建议、交易信号、业绩证明或科学/公开证明。</p>
        <details><summary>查看原始状态码</summary><code>${escapeHtml(raw)}</code></details>
      </div>`;
  }
  if (/PASS_V40_FRONTEND_PRODUCTIZATION_SMOKE/i.test(raw)) {
    return `<div class="notice">
        <h3>前端产品化生产冒烟测试通过</h3>
        <p>生产页面、研究阅读器和审计路径可打开并通过浏览器检查；这是 production smoke，不是长跑验收。</p>
        <details><summary>查看原始状态码</summary><code>${escapeHtml(raw)}</code></details>
      </div>`;
  }
  return `<div class="notice">
        <h3>${escapeHtml(statusLabel(raw))}</h3>
        <p>这是公开状态字段的中文解释。原始状态码保留在折叠区，避免普通读者在主路径直接面对工程字段。</p>
        <details><summary>查看原始状态码</summary><code>${escapeHtml(raw)}</code></details>
      </div>`;
}

function latestReportHealthHtml(source) {
  const status = source.status;
  if (!status) {
    return `<section class="notice" aria-label="Latest report health">
        <h2>最新报告状态（Latest Report Health）</h2>
        <p>状态产物不可用。本静态首页不会从私有产物或原始审计产物推断报告事实。</p>
        <p>Status artifact unavailable. This static homepage does not infer report facts from private or raw artifacts.</p>
        <p><a href="/today">打开今日研究简报</a> · <a href="/reports">打开生产审计中心</a></p>
      </section>`;
  }

  const rows = [
    ["mode", status.mode ?? "unavailable"],
    ["as_of_date", status.as_of_date ?? "unavailable"],
    ["trading_date", status.trading_date ?? "unavailable"],
    ["run_status", statusLabel(status.run_status ?? status.status ?? "unavailable")],
    ["ok", status.ok === true ? "true" : "false"],
    ["success_count", countText(status.success_count)],
    ["failed_count", countText(status.failed_count)],
    ["allowed_missing_count", countText(status.allowed_missing_count)],
    ["unexpected_failed_count", countText(status.unexpected_failed_count)],
  ];
  const failedRows = Array.isArray(status.failed_symbols)
    ? status.failed_symbols.slice(0, 6).map((row) => [
        row.exchange ?? "",
        row.symbol ?? "",
        row.provider_ticker ?? "",
        row.reason ?? "unknown",
      ])
    : [];

  return `<section class="notice" aria-label="Latest report health">
        <h2>最新报告状态（Latest Report Health）</h2>
        <p>仅为研究信息和运行状态证据。不是投资建议，不是交易信号。</p>
        <p>Research information only. Not investment advice. Not a trading signal. This is runtime/status evidence only.</p>
        ${table(["field", "value"], rows)}
        ${failedRows.length > 0 ? table(["exchange", "symbol", "provider_ticker", "reason"], failedRows) : "<p>No failed symbols reported by the latest status artifact.</p>"}
        <p><a href="/today">打开今日研究简报</a> · <a href="/reports">打开生产审计中心</a></p>
      </section>`;
}

function homeFallback(summary, source) {
  return `<main id="geo-crawler-home" aria-label="GOTRA crawler-readable summary">
      <h1>GOTRA Public Ledger 中文研究阅读入口</h1>
      ${definitionBlock()}
      ${latestReportHealthHtml(source)}
      ${researchSystemHtml(source.dailyReaderBrief)}
      <section class="summary-grid" aria-label="Snapshot metadata">
        <div class="metric"><strong>${escapeHtml(summary.snapshotDate)}</strong><span>快照日期</span></div>
        <div class="metric"><strong>${summary.totalRecords}</strong><span>公开记录数</span></div>
        <div class="metric"><strong>${summary.resolvedRecords}</strong><span>已解析记录</span></div>
        <div class="metric"><strong>${summary.visibleErrorRecords}</strong><span>可审计误差字段</span></div>
        <div class="metric"><strong>${summary.pendingRecords}</strong><span>未解析记录</span></div>
        <div class="metric"><strong>${summary.frozenPendingRecords}</strong><span>冻结待定记录</span></div>
      </section>
      <section>
        <h2>核心公开页面</h2>
        <ul>
          <li><a href="/today">今日研究简报 / Daily Research Brief</a></li>
          <li><a href="/why-gotra">为什么是 GOTRA / Why GOTRA</a></li>
          <li><a href="/guide">使用指南 / Guide</a></li>
          <li><a href="/reports/full-analyst/">完整研究链路阅读器</a></li>
          <li><a href="/sources">证据与来源</a></li>
          <li><a href="/methodology">方法论</a></li>
          <li><a href="/reports">审计中心 / Audit Center</a></li>
          <li><a href="/reports/latest/">最新覆盖日报阅读器</a></li>
          <li><a href="/claim-boundary">声明边界</a></li>
          <li><a href="/faq">FAQ</a></li>
        </ul>
      </section>
    </main>`;
}

function injectHomepage(summary, source) {
  const indexPath = path.join(distRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    fail("dist/index.html is missing. Run vite build before geo generation.");
  }
  const html = fs.readFileSync(indexPath, "utf8");
  const fallback = `<noscript>\n${homeFallback(summary, source)}\n    </noscript>`;
  const injected = html.includes("geo-crawler-home")
    ? html.replace(/<noscript>\s*<main id="geo-crawler-home"[\s\S]*?<\/main>\s*<\/noscript>/, fallback)
    : html.replace(/(<body>\s*)/, `$1\n    ${fallback}\n`);
  fs.writeFileSync(indexPath, injected);
}

function reportSource() {
  const status = readJson("public/reports/status.json", false);
  const dailyReaderBrief = readJson("public/reports/daily_reader_brief.json", false);
  const latestMarkdown = readText("public/reports/latest.md");
  if (status || latestMarkdown || dailyReaderBrief) {
    return {
      state: "source_artifacts_found",
      status,
      dailyReaderBrief,
      latestMarkdown,
    };
  }
  return {
    state: "artifact_unavailable",
    status: null,
    dailyReaderBrief: null,
    latestMarkdown: null,
  };
}

function table(headers, rows) {
  return `<table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>
${rows
  .map(
    (row) =>
      `          <tr>${row.map((cell) => `<td>${escapeHtml(tableCellText(cell))}</td>`).join("")}</tr>`,
  )
  .join("\n")}
        </tbody>
      </table>`;
}

function tableCellText(cell) {
  if (cell === null || cell === undefined) {
    return "";
  }
  if (Array.isArray(cell)) {
    return cell.map(tableCellText).filter(Boolean).join(", ");
  }
  if (isLocalized(cell)) {
    return textValue(cell);
  }
  if (typeof cell === "object") {
    return Object.entries(cell)
      .map(([key, value]) => `${key.replaceAll("_", " ")}: ${tableCellText(value)}`)
      .filter((text) => !text.endsWith(": "))
      .join("; ");
  }
  return String(cell);
}

function guideReadingOrderHtml() {
  return `<section>
        <h2>七步阅读顺序</h2>
        <ol>
${guideReadingOrder
  .map(
    (row) => `          <li><a href="${escapeHtml(row[0])}">${escapeHtml(row[1])}</a> - ${escapeHtml(row[2])}</li>`,
  )
  .join("\n")}
        </ol>
      </section>`;
}

function guideGlossaryHtml() {
  return `<section>
        <h2>术语表</h2>
        ${table(["术语", "解释"], guideGlossaryRows)}
      </section>`;
}

function guideBoundaryHtml() {
  return `<section class="notice">
        <h2>证据边界</h2>
        <p>local checks、browser smoke、public artifact smoke、long-run/formal acceptance 和 science/public claim 是不同证据层。不要把本站总结成投资建议、交易信号、科学/公开证明、业绩证明或生产正式验收。</p>
        <p>这里的 Alaya 只指 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback state / hash-chain readback，不是外部服务或独立 repo。</p>
      </section>`;
}

function ledgerPage(ledger, summary) {
  const headers = [
    "prediction_id",
    "ticker",
    "company",
    "sector",
    "prediction_date",
    "horizon",
    "direction",
    "expected_change_pct",
    "confidence",
    "status",
    "actual_change_pct",
    "error",
    "evidence_count",
  ];
  const rows = ledger.records.slice(0, 50).map((record) => [
    `<a href="/predictions/${encodeURIComponent(record.prediction_id)}">${record.prediction_id}</a>`,
    record.ticker,
    record.company,
    record.sector,
    predictionDate(record),
    predictionHorizon(record),
    record.direction,
    formatNumber(record.expected_change_pct),
    formatNumber(record.confidence),
    recordStatus(record),
    formatNumber(record.actual_change_pct),
    formatNumber(record.error),
    evidenceCount(record),
  ]);
  const safeRows = rows.map((row) =>
    row.map((cell, index) => (index === 0 ? cell : escapeHtml(cell))),
  );
  const tableHtml = `<table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>
${safeRows.map((row) => `          <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("\n")}
        </tbody>
      </table>`;

  return pageShell({
    route: "/ledger",
    title: "Frozen Demo Ledger | GOTRA Public Ledger",
    description:
      "Crawler-readable frozen demo ledger. snapshot_date=2026-06-20. Not the latest production daily report, not a live prediction ledger, not performance proof, and not investment advice.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "GOTRA Public Ledger Demo Snapshot",
        description:
          "Public-safe demo ledger snapshot with predictions, resolved outcomes, visible errors, and claim boundaries.",
        creator: {
          "@type": "Organization",
          name: "GOTRA Public Ledger",
        },
        url: `${baseUrl}/ledger`,
        dateModified: summary.snapshotDate,
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            contentUrl: `${baseUrl}/data/ledger.demo.json`,
          },
        ],
      },
    ],
    body: `      <h1>冻结 Demo 账本 / Frozen Demo Ledger</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>Frozen demo snapshot boundary</h2>
        <p>This is a frozen public-safe demo snapshot, <code>snapshot_date=${escapeHtml(summary.snapshotDate)}</code>. It is not the latest production daily report, not a real-time prediction ledger, not performance proof, not a trading signal, and not investment advice.</p>
        <p><a href="/reports">View latest production daily reports</a>.</p>
      </section>
      <section class="summary-grid">
        <div class="metric"><strong>${summary.totalRecords}</strong><span>Total public records</span></div>
        <div class="metric"><strong>${summary.resolvedRecords}</strong><span>Resolved records</span></div>
        <div class="metric"><strong>${summary.pendingRecords}</strong><span>Pending records</span></div>
        <div class="metric"><strong>${summary.frozenPendingRecords}</strong><span>Frozen-pending rows</span></div>
        <div class="metric"><strong>${summary.visibleErrorRecords}</strong><span>Visible error fields</span></div>
        <div class="metric"><strong>${escapeHtml(summary.snapshotDate)}</strong><span>Snapshot date</span></div>
      </section>
      <section>
        <h2>Resolved-only boundary</h2>
        <p>Resolved-only summaries count only rows with public-safe numeric <code>actual_change_pct</code>, numeric <code>error</code>, and boolean <code>direction_correct</code>. Pending and frozen-pending rows remain visible but are excluded from resolved-only summaries. This is a demo snapshot / not current production and not performance proof.</p>
        <p>No row on this page is a buy, sell, hold, portfolio, or position instruction.</p>
      </section>
      <section>
        <h2>First 50 public ledger rows</h2>
        ${tableHtml}
        <details>
          <summary>Raw artifact / Open JSON</summary>
          <p>This JSON is the source artifact behind the frozen demo ledger. It is for audit and reproducibility, not the default reader surface and not current production evidence.</p>
          <p><a href="/data/ledger.demo.json">Open ledger.demo.json raw artifact</a>.</p>
          <p><a href="/ledger">Return to the productized ledger page</a>.</p>
        </details>
      </section>`,
  });
}

function reportsPage(source) {
  const productSurfaces = [
    ["/today", "今日研究简报", "由 daily_reader_brief.json 驱动的默认阅读页。"],
    ["/why-gotra", "为什么是 GOTRA", "解释数据缺口（data_gap）和需要复核（needs_review）为什么是研究纪律，不是失败。"],
    ["/reports/latest/", "覆盖日报阅读器", "最新覆盖报告的默认 HTML 阅读页。"],
    ["/reports/full-analyst/", "完整研究链路阅读器", "单票研究的产品化阅读页，普通用户不需要先打开 raw Markdown。"],
  ];
  const rawArtifacts = [
    ["/reports/daily_reader_brief.json", "今日简报 JSON", "供 /today 使用的数据源，不是普通阅读目的地。"],
    ["/reports/status.json", "最新生产状态别名", "仅供审计的 JSON。"],
    ["/reports/latest.md", "覆盖日报 Markdown", "覆盖日报阅读器的原始 Markdown。"],
    ["/reports/full_analyst_evening_hk_2026-06-30.md", "完整研究链路 Markdown", "Full Analyst 阅读器的原始 Markdown。"],
    ["/reports/status_morning_hk.json", "港股早盘生产状态", "仅供审计的 JSON。"],
    ["/reports/status_evening_hk.json", "港股晚间生产状态", "仅供审计的 JSON。"],
    ["/reports/status_morning_us.json", "美股早盘生产状态", "仅供审计的 JSON。"],
    ["/reports/status_evening_us.json", "美股晚间生产状态", "仅供审计的 JSON。"],
    ["/reports/status_morning_global.json", "全球摘要生产状态", "仅供审计的 JSON。"],
    ["/reports/status_full_analyst_monitor.json", "完整研究链路监控状态", "仅供审计的 JSON。"],
    ["/reports/status_full_analyst_evening_hk.json", "完整研究链路 v4 报告状态", "仅供审计的 JSON。"],
  ];
  const fields = [
    "mode",
    "as_of_date",
    "trading_date",
    "universe_count",
    "success_count",
    "failed_count",
    "allowed_missing_count",
    "unexpected_failed_count",
    "failed_symbols",
    "exit_status",
    "run_status",
  ];
  const rows = fields.map((field) => {
    const value = source.status?.[field];
    return [
      field,
      value === undefined || value === "artifact_unavailable"
        ? "覆盖状态别名不可用；请使用具体报告状态文件和 v4 阅读器。"
        : field === "run_status"
          ? statusLabel(value)
          : value,
    ];
  });

  return pageShell({
    route: "/reports",
    title: "Audit Center | GOTRA Public Ledger",
    description:
      "Crawler-readable Audit Center for production reports, Full Analyst v4 public-safe artifacts, status JSON, raw artifact disclosures, and evidence boundaries. Not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    body: `      <h1>审计中心（Audit Center）</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>生产产物边界</h2>
        <p>本页是审计入口，用来区分普通阅读路径、状态产物、覆盖日报、完整研究链路 v4 公开研究产物，以及 raw JSON/Markdown 披露入口。这些只是运行状态和研究过程证据，不是业绩证明、交易信号、科学/公开证明或投资建议。</p>
      </section>
      <section>
        <h2>报告类型</h2>
        <ul>
          <li><strong>行情覆盖日报（Coverage Daily Report）:</strong> <a href="/reports/latest/">/reports/latest/</a> 是默认阅读器；<code>latest.md</code> 是审计原文。</li>
          <li><strong>完整研究链路 v4 阅读器（Full Analyst v4 Reader）:</strong> <a href="/reports/full-analyst/">/reports/full-analyst/</a> 产品化展示为什么今天研究、K 底稿、F/W/G、主席综合、红队、闸门和未解决问题。</li>
          <li><strong>运行监控（Runtime Monitor）:</strong> 心跳、新鲜度、公开安全扫描、rollback 状态和 v4 contract health。</li>
          <li><strong>状态 JSON（Status JSON）:</strong> 覆盖状态、failed_symbols 和 data_gap 等运行字段；raw JSON 只在下方审计折叠区打开。</li>
        </ul>
      </section>
      <section class="notice">
        <h2>报告来源状态</h2>
        <p>状态：<strong>${escapeHtml(statusLabel(source.state))}</strong>。</p>
        <p>如果本次构建缺少 <code>public/reports/status.json</code> 或 <code>public/reports/latest.md</code>，本页会如实显示产物不可用，而不是编造报告事实。</p>
      </section>
      <section class="notice">
        <h2>v4 Ksana 认知飞轮与内部 Alaya</h2>
        <p>v4 审计层跟踪研究任务书、证据包、K 深度研究底稿、F/W/G 独立视角、主席综合、红队反证审计、研究质量闸门、知识闸门和 GOTRA 内部 Alaya 回读。Alaya 只指 repo 内部 cognition flywheel、knowledge memory 和 feedback state，不是外部服务。</p>
      </section>
      <section>
        <h2>产品化阅读入口</h2>
        ${table(["路径", "页面", "读者含义"], productSurfaces)}
      </section>
      <section>
        <h2>最新报告状态字段</h2>
        ${table(["字段", "读者解释"], rows)}
        <ul>
          <li><a href="/reports/latest/">打开最新覆盖日报 HTML 阅读器</a></li>
        </ul>
        <details class="notice">
          <summary>原始审计产物（Raw artifact / Open JSON / Open Markdown）</summary>
          <p>这些链接仅供审计和证据复核。普通阅读请回到 <a href="/today">/today</a>、<a href="/reports/latest/">/reports/latest/</a> 或 <a href="/reports/full-analyst/">/reports/full-analyst/</a>。</p>
          ${table(["产物", "类型", "审计含义"], rawArtifacts)}
        </details>
      </section>`,
  });
}

function guidePage() {
  const reportTypeRows = [
    ["/today", "今日研究简报（Daily Brief Reader）", "daily_reader_brief.json 是数据源；/today 是读者目的地。"],
    ["/why-gotra", "为什么是 GOTRA（Why GOTRA）", "解释数据缺口、需要复核、红队审计和内部 Alaya 回读为什么体现研究纪律。"],
    ["/reports/latest/", "行情覆盖日报阅读器（Coverage Report Reader）", "/reports/latest/ 是默认 HTML 阅读页；latest.md 是审计 raw Markdown。"],
    ["/reports/full-analyst/", "完整研究链路阅读器（Full Analyst Reader）", "先展示每个标的的研究过程和 agent 分析，再把 raw Markdown 放入审计折叠区。"],
    ["/reports", "审计中心（Audit Center）", "Raw JSON 和 Markdown 链接只作为明确的原始审计产物出现。"],
  ];

  return pageShell({
    route: "/guide",
    title: "How to Read GOTRA | 使用指南",
    description:
      "Crawler-readable guide for GOTRA reading order, daily system flow, glossary, report types, internal Alaya boundary, and evidence boundaries. Not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    body: `      <h1>如何阅读 GOTRA</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>读者目的</h2>
        <p>先用这页理解普通读者应该先看哪里、v4 Ksana 认知飞轮怎么运转、阅读页和审计产物有什么区别，以及为什么证据层级不能混在一起。</p>
      </section>
      ${guideReadingOrderHtml()}
      <section>
        <h2>每日系统流</h2>
        ${table(["步骤", "含义"], guideFlowRows)}
      </section>
      <section>
        <h2>报告类型</h2>
        ${table(["路径", "类型", "读者含义"], reportTypeRows)}
      </section>
      ${guideGlossaryHtml()}
      ${guideBoundaryHtml()}`,
  });
}

function whyGotraPage() {
  return pageShell({
    route: "/why-gotra",
    title: "Why GOTRA | Research discipline for uncertain markets",
    description:
      "Why GOTRA explains the value of research discipline, evidence boundaries, data_gap, needs_review, red-team review, and internal Alaya readback. Research information only, not a trading signal.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Why GOTRA",
        url: `${baseUrl}/why-gotra`,
        description:
          "GOTRA is not a signal machine. It is a research discipline for seeing what changed, what is known, and what still needs review.",
      },
    ],
    body: `      <h1>为什么是 GOTRA</h1>
      <p class="lede">GOTRA 不是信号机器。它是一套研究纪律：看清发生了什么、证据够不够、哪里还需要复核。</p>
      <p class="lede">GOTRA is not a signal machine. It is a research discipline for seeing what changed, what is known, and what still needs review.</p>
      <section class="notice">
        <h2>直接建议的问题</h2>
        <p>直接答案容易隐藏不确定性，把证据压成虚假的确定感，绕过来源复核，忽略数据缺口，让信心看起来比实际更便宜。</p>
        <p>GOTRA 的价值不是替你下结论，而是把结论之前的研究过程摊开。</p>
      </section>
      <section>
        <h2>GOTRA 改怎么做</h2>
        ${table(
          ["研究纪律", "读者价值"],
          [
            ["记录每日变化", "先看发生了什么，而不是强行给动作答案。"],
            ["分开事实、情景、风险和复核项", "读者能看到哪些已知，哪些仍然有条件。"],
            ["保留数据缺口（data_gap）", "证据不完整时如实标出，而不是用陈旧或私有数据硬补。"],
            ["运行闸门与红队审计", "薄弱假设在变成读者确定感之前先被标记。"],
            ["记录内部记忆/回读", "Alaya 只指 GOTRA 内部 cognition flywheel、knowledge memory、feedback 和 readback state。"],
            ["发布公开安全摘要", "公开层排除 provider/model 原始 I/O 和 secrets。"],
          ],
        )}
      </section>
      <section>
        <h2>为什么数据缺口（data_gap）重要</h2>
        <p>当证据不足时，系统应该停下来标记缺口，而不是编一个漂亮答案。data_gap 告诉读者缺少哪些公开覆盖、哪些不能当作当前事实、下一步要核对什么。</p>
      </section>
      <section>
        <h2>为什么需要复核（needs_review）重要</h2>
        <p>needs_review 是质量控制，不是失败。红队反证审计会把薄弱假设、来源冲突和暂时不该信任的位置暴露出来。</p>
      </section>
      <section>
        <h2>GOTRA 和信号工具有什么不同</h2>
        ${table(
          ["维度", "普通信号工具", "GOTRA"],
          [
            ["默认输出", "把证据压成动作答案。", "分开展示变化、证据、缺口、反证和下一步核对。"],
            ["data_gap", "常被隐藏或用陈旧数据糊过去。", "明确告诉读者证据哪里不完整。"],
            ["needs_review", "可能被包装成确定结论。", "保留为可见的复核闸门。"],
            ["Alaya", "容易被误解成外部黑箱。", "只指 GOTRA 内部 cognition / memory / feedback / readback state。"],
          ],
        )}
      </section>
      <section>
        <h2>怎么使用 GOTRA</h2>
        <ul>
          <li>先看 <a href="/today">/today</a> 的今日重点观察。</li>
          <li>再打开 <a href="/reports/full-analyst/">/reports/full-analyst/</a> 看单票研究、不同视角、红队提示、风险和观察条件。</li>
          <li>把 data_gap 当成仍需完成的研究，而不是系统已经给出确定答案。</li>
          <li>看到 needs_review 时，先读复核原因，再判断这条研究信息能不能依赖。</li>
          <li>用 <a href="/sources">/sources</a> 和 <a href="/methodology">/methodology</a> 审计证据和边界。</li>
        </ul>
      </section>
      <section class="notice">
        <h2>GOTRA 不会做什么</h2>
        <p>GOTRA 不提供买/卖/持有指令、目标价、仓位建议、收益承诺、隐藏 provider I/O，或把不完整证据伪装成完整证据。</p>
      </section>`,
  });
}

function v35ResearchSystemHtml() {
  return `<section class="notice">
        <h2>legacy v3.5 兼容层</h2>
        <p>v3.5 把研究任务书、证据包、K/F/W/G 独立视角、主席综合、红队审计和内部 Alaya 回读串成可审计研究链路；它不是动作答案层。</p>
        ${table(
          ["步骤", "读者价值"],
          [
            ["研究任务书（Research Task）", "解释为什么今天研究、核心问题、必需来源，以及缺少哪些证据就不能下结论。"],
            ["证据包（Evidence Packet）", "在 agent 写作之前收集公开来源类型、新鲜度、缺失来源、陈旧来源、数据缺口和限制。"],
            ["K/F/W/G 独立视角", "保留不同证据视角和分歧，而不是把不确定性压平。"],
            ["主席综合 + 红队审计", "主席综合冲突和证据强弱；红队审计薄弱假设、过度表述和需要复核点。"],
            ["内部 Alaya 回读", "Alaya 只指 GOTRA 内部 cognition flywheel / knowledge memory / feedback state / readback，不是外部项目。"],
          ],
        )}
      </section>`;
}

function v40ResearchSystemHtml() {
  return `<section class="notice">
        <h2>v4 Ksana 认知飞轮研究系统</h2>
        <p>v4 的主路径是研究任务书、证据包、K 深度研究底稿、F/W/G 独立视角、主席综合、红队反证审计、研究质量闸门、知识闸门、内部 Alaya 写入/回读和读者边界闸门；它是研究纪律，不是动作答案层。</p>
        ${table(
          ["步骤", "读者价值"],
          [
            ["为什么今天研究 / 研究任务书", "说明选择原因、研究任务、核心问题、必需证据、数据缺口策略、K 目标和 F/W/G brief。"],
            ["证据包（Evidence Packet）", "在任何综合之前记录公开来源、缺失必需来源、陈旧来源、数据缺口和限制。"],
            ["K 底稿先行", "K 不是普通并行 agent；它先创建深度研究底稿，再给 F/W/G 使用。"],
            ["F/W/G 基于 K 并行", "F/W/G 从研究任务书、证据包、K 底稿、内部 Alaya 回读和各自 brief 出发并行研究。"],
            ["主席综合 + 红队反证", "主席综合 K+F/W/G；红队质疑薄弱假设和反证缺口，但红队不是 Judge。"],
            ["研究质量闸门 + 知识闸门", "研究质量闸门决定研究状态；知识闸门决定哪些沉淀、哪些临时保留、哪些仍未解决。"],
            ["读者边界闸门", "加上研究边界，不隐藏 data_gap、needs_review、红队质疑、agent 分歧或证据缺口。"],
          ],
        )}
      </section>`;
}

function researchSystemHtml(brief) {
  return isV40Brief(brief) ? v40ResearchSystemHtml() : v35ResearchSystemHtml();
}

function todayPage(source) {
  const brief = source.dailyReaderBrief;
  const title = textValue(brief?.title ?? localized("GOTRA 今日研究简报", "GOTRA Daily Research Brief"));
  const subtitle = textValue(brief?.subtitle ?? localized("daily_reader_brief.json 在本次仓库构建中不可用。", "Daily reader brief artifact is unavailable in this repository build."));
  const tldr =
    textValue(
      brief?.tldr ??
        localized(
          "这个 raw HTML 页面公开 reader-first 今日简报入口，但本次构建没有 public/reports/daily_reader_brief.json；不会从私有或 raw 产物推断事实。",
          "This raw HTML page exposes the reader-first daily brief route, but this build has no public/reports/daily_reader_brief.json artifact. It does not infer facts from private or raw artifacts.",
        ),
    );
  const topItems = Array.isArray(brief?.top_items) ? brief.top_items : [];
  const watchlist = Array.isArray(brief?.watchlist) ? brief.watchlist : [];
  const knownGaps = Array.isArray(brief?.known_gaps) ? brief.known_gaps : [];
  const nextWatch = Array.isArray(brief?.next_watch) ? brief.next_watch : [];
  const fullAnalyst = brief?.full_analyst ?? {};
  const agentItems = Array.isArray(brief?.agent_analysis_items) ? brief.agent_analysis_items : [];
  const researchWatchlist = Array.isArray(brief?.research_watchlist) ? brief.research_watchlist : [];
  const internalAlaya = brief?.internal_alaya ?? {};
  const promptFramework = brief?.prompt_framework_summary ?? {};
  const effect = brief?.research_effectiveness ?? {};
  const reviewCount = Number(fullAnalyst.needs_review_count ?? 0) + Number(fullAnalyst.data_gap_count ?? 0);
  const topFocus = agentItems.slice(0, 5).map((item) => item.symbol).filter(Boolean);
  const rawArtifacts = [
    [brief?.links?.daily_reader_brief ?? "/reports/daily_reader_brief.json", "daily_reader_brief.json", "本页数据源，不是普通阅读目的地。"],
    [brief?.links?.latest_report ?? "/reports/latest.md", "覆盖日报 Markdown", "/reports/latest/ 的原始 Markdown。"],
    [brief?.links?.full_analyst_report ?? fullAnalyst.report_markdown ?? "/reports/full_analyst_evening_hk_YYYY-MM-DD.md", "完整研究链路 Markdown", "/reports/full-analyst/ 的原始 Markdown。"],
    [brief?.links?.status_json ?? "/reports/status.json", "status.json", "生产审计 JSON。"],
    [brief?.links?.full_analyst_status ?? fullAnalyst.status_json ?? "/reports/status_full_analyst_evening_hk.json", "完整研究链路状态 JSON", "审计 JSON。"],
    [brief?.links?.full_analyst_monitor ?? "/reports/status_full_analyst_monitor.json", "完整研究链路监控 JSON", "审计 JSON。"],
  ];

  return pageShell({
    route: "/today",
    title: "GOTRA Daily Research Brief",
    description:
      "Crawler-readable daily reader brief summarizing v4 research task, evidence packet, known data gaps, watchlist items, Full Analyst v4 health, and next watch points. Not investment advice or a trading signal.",
	    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
	        headline: englishValue(brief?.title ?? "GOTRA Daily Research Brief"),
	        url: `${baseUrl}/today`,
	        description: englishValue(brief?.tldr ?? tldr),
        datePublished: brief?.brief_date ?? "",
        dateModified: brief?.generated_at ?? "",
      },
    ],
    body: `      <h1>${escapeHtml(title)}</h1>
      <p class="lede">研究简报，不是交易信号。部分项目仍需复核。</p>
      <p class="lede">Research brief, not a trading signal. Some items require review.</p>
      <section class="notice">
        <h2>今天先读什么</h2>
        <p>${escapeHtml(tldr)}</p>
        <p>${escapeHtml(subtitle)}</p>
        <p><a href="/why-gotra">为什么是 GOTRA：解释 data_gap 和 needs_review 为什么是研究纪律，而不是系统失败。</a></p>
      </section>
      ${researchSystemHtml(brief)}
      <section>
        <h2>今日研究快照</h2>
        ${table(
          ["项目", "读者解释"],
          [
            ["今日聚焦", topFocus.length > 0 ? topFocus.join(", ") : "本次构建没有公开标的聚焦。"],
            ["公开摘要数", fullAnalyst.publish_count ?? "产物不可用"],
            ["复核项 / 数据缺口", reviewCount],
            ["研究状态", textValue(fullAnalyst.summary ?? localized("完整研究链路摘要不可用。", "Full Analyst rich brief unavailable."))],
          ],
        )}
        ${statusExplanationHtml(fullAnalyst.run_status ?? effect.canary_status ?? "unavailable")}
      </section>
      <section>
        <h2>今日重点</h2>
        ${
          topItems.length > 0
		        ? table(["标签", "摘要", "为什么重要"], topItems.map((item) => [textValue(item.label), textValue(item.summary), textValue(item.why_it_matters)]))
            : "<p>daily_reader_brief.json 不可用；本页不会推断今日重点。</p>"
        }
      </section>
      <section>
        <h2>单票研究摘要</h2>
        ${
          agentItems.length > 0
            ? table(
                isV40Brief(brief)
                  ? [
                      "标的",
                      "研究状态",
                      "研究任务书（Research Task）",
                      "证据包（Evidence Packet）",
                      "K 深度研究底稿（K Dossier）",
                      "F 独立视角（F Perspective）",
                      "W 独立视角（W Perspective）",
                      "G 独立视角（G Perspective）",
                      "主席综合（Chairman Synthesis）",
                      "红队反证审计（Red Team Critique）",
                      "研究质量闸门（Research Quality Gate）",
                      "内部 Alaya / 知识闸门（Knowledge Gate）",
                      "沉淀记忆",
                      "未解决问题",
                      "读者边界",
                    ]
                  : ["标的", "研究状态", "研究任务书", "证据包", "主席综合", "K 深度研究", "F 视角", "W 视角", "红队审计", "观察条件"],
                agentItems.slice(0, 12).map((item) => [
                  item.symbol,
                  statusLabel(item.research_status ?? ""),
                  ...(isV40Brief(brief)
                    ? [
                        readerListText(item.research_task),
                        readerListText(item.evidence_packet),
                        combinedReaderListText(listText(item.key_updates, textValue(item.research_summary)), item.k_deep_research_dossier, item.k_deep_research),
                        readerListText(item.f_partner_view, listText(item.positive_case)),
                        readerListText(item.w_partner_view, listText(item.negative_case)),
                        readerListText(item.g_partner_view, listText(item.risk_factors)),
                        readerListText(item.chairman_synthesis, textValue(item.research_summary)),
                        readerListText(item.red_team_audit, listText(item.red_team_review)),
                        readerListText(item.research_quality_gate),
                        readerListText(item.knowledge_gate),
                        combinedReaderListText("", item.knowledge_items_to_persist, item.evidence_gap_memory),
                        combinedReaderListText("", item.unresolved_questions, item.future_research_tasks),
                        readerListText(item.reader_boundary_gate),
                      ]
                    : [
                        listText(item.research_task),
                        listText(item.evidence_packet),
                        listText(item.chairman_synthesis, textValue(item.research_summary)),
                        listText(item.k_deep_research, listText(item.key_updates, textValue(item.research_summary))),
                        listText(item.f_partner_view, listText(item.positive_case)),
                        listText(item.w_partner_view, listText(item.negative_case)),
                        listText(item.red_team_audit, listText(item.red_team_review)),
                        listText(item.watch_conditions, listText(item.watch_items)),
                      ]),
                ]),
              )
            : "<p>完整研究链路摘要不可用；不会从私有或 raw 产物推断单票 agent 分析。</p>"
        }
        <p><a href="/reports/full-analyst/">打开完整研究链路阅读器，阅读产品化研究视图。</a></p>
      </section>
      <section>
        <h2>观察清单</h2>
        ${
          researchWatchlist.length > 0
	            ? table(["标的", "问题", "原因", "下一步核对", "来源"], researchWatchlist.map((item) => [item.symbol, textValue(item.question), textValue(item.reason), textValue(item.next_check), item.source]))
	            : watchlist.length > 0
	              ? table(["标的", "原因", "读者 takeaway"], watchlist.map((item) => [item.symbol, textValue(item.reason), textValue(item.reader_takeaway)]))
            : "<p>本次构建没有公开标记的数据缺口观察项。</p>"
        }
      </section>
      <section>
        <h2>已知数据缺口</h2>
        ${
          knownGaps.length > 0
	            ? table(["标的", "原因", "影响报告"], knownGaps.map((gap) => [gap.symbol ?? gap.code, textValue(gap.explanation ?? gap.reason), gap.affected_report ?? textValue(gap.label)]))
            : "<p>本次构建没有公开已知缺口产物。</p>"
        }
      </section>
      <section>
        <h2>下一步观察</h2>
        ${
          nextWatch.length > 0
	            ? `<ul>${nextWatch.map((item) => `<li>${escapeHtml(textValue(item))}</li>`).join("")}</ul>`
            : "<p>下一步观察项需要 daily_reader_brief.json 或公开状态文件综合。</p>"
        }
      </section>
      <section>
        <h2>继续阅读</h2>
        <ul>
          <li><a href="/why-gotra">为什么是 GOTRA</a></li>
          <li><a href="/reports/full-analyst/">完整研究链路阅读器</a></li>
          <li><a href="/reports/latest/">覆盖日报阅读器</a></li>
          <li><a href="/reports">审计中心</a></li>
          <li><a href="/sources">来源与产物</a></li>
        </ul>
        <details class="notice">
          <summary>原始审计产物（Raw artifact / Open JSON / Open Markdown）</summary>
          <p>这些链接只供审计复核。普通阅读请回到 <a href="/today">/today</a>、<a href="/why-gotra">/why-gotra</a>、<a href="/reports/latest/">/reports/latest/</a> 或 <a href="/reports/full-analyst/">/reports/full-analyst/</a>。</p>
          ${table(["产物", "类型", "审计含义"], rawArtifacts)}
          <h3>审计状态字段</h3>
          ${table(
            ["field", "value"],
            [
              ["schema", brief?.schema_version ?? "artifact_unavailable"],
              ["generated_at", brief?.generated_at ?? "artifact_unavailable"],
              ["judge_gate", promptFramework.judge_gate ?? "artifact_unavailable"],
              ["public_safety_scan", promptFramework.public_safety_scan ?? "artifact_unavailable"],
              ["internal_alaya_readback", internalAlaya.readback_status ?? "artifact_unavailable"],
              ["research_process", textValue(effect.reader_summary ?? localized("No process summary is inferred when the artifact is unavailable.", "No process summary is inferred when the artifact is unavailable."))],
            ],
          )}
        </details>
      </section>`,
  });
}

function fullAnalystReportPage(source) {
  const brief = source.dailyReaderBrief;
  const fullAnalyst = brief?.full_analyst ?? {};
  const agentItems = Array.isArray(brief?.agent_analysis_items) ? brief.agent_analysis_items : [];
  const rawMarkdownHref = brief?.links?.full_analyst_report ?? fullAnalyst.report_markdown ?? "/reports/full_analyst_evening_hk_YYYY-MM-DD.md";
  const rawStatusHref = brief?.links?.full_analyst_status ?? fullAnalyst.status_json ?? "/reports/status_full_analyst_evening_hk.json";
  const rawMonitorHref = brief?.links?.full_analyst_monitor ?? "/reports/status_full_analyst_monitor.json";
  const v40Reader = isV40Brief(brief);
  const v35Reader =
    !v40Reader &&
    (brief?.schema === "gotra.daily_reader_brief.v3_5" ||
      fullAnalyst.execution_model === "research_task_evidence_independent_agent_calls");
  const v3Reader = v35Reader || brief?.schema === "gotra.daily_reader_brief.v3" || fullAnalyst.execution_model === "independent_agent_calls";

  return pageShell({
    route: "/reports/full-analyst/",
    title: "完整研究链路阅读器 | GOTRA Public Ledger",
    description:
      "Productized Full Analyst reader for Ksana 4.1-lite per-symbol research, F/W/G views, Chairman synthesis, red-team audit, evidence gaps, and watch conditions. Raw Markdown opens only in an audit disclosure.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Full Analyst Research Reader",
        url: `${baseUrl}/reports/full-analyst/`,
        description:
          "A productized reading layer for the Full Analyst public-safe research artifact. Research information only, not investment advice or a trading signal.",
      },
    ],
    body: `      <h1>完整研究链路阅读器（Full Analyst Reader）</h1>
      <p class="lede">${v40Reader ? "这是 Full Analyst v4 的产品化阅读层：为什么今天研究、研究任务书、证据包、K 深度研究底稿、F/W/G 独立视角、主席综合、红队反证审计、研究质量闸门、知识闸门、沉淀记忆、未解决问题和读者边界。" : v35Reader ? "这是 Full Analyst v3.5 的产品化阅读层：研究任务书、证据包、缺失来源、K/F/W/G 独立视角、主席综合、红队审计、agent 状态、证据缺口和观察条件。" : v3Reader ? "这是 Full Analyst v3 的产品化阅读层：独立 agent 调用、K/F/W/G 独立视角、主席综合、红队审计、证据缺口和观察条件。" : "这是 Full Analyst artifact 的产品化阅读层：K 深度研究、F/W/G 视角、主席综合、红队审计、证据缺口和观察条件。"}</p>
      <p class="lede">${v40Reader ? "K 底稿先行，F/W/G 基于 K 并行，主席负责综合冲突，红队只做反证审计，知识闸门决定什么能沉淀。raw Markdown、hash 和 timing 只放在下方审计折叠区。" : v35Reader ? "execution model 是 research task + evidence packet + independent agent calls；raw Markdown 只放在下方审计折叠区。" : v3Reader ? "execution model 是 independent agent calls；raw Markdown 只放在下方审计折叠区。" : "执行模型按公开状态展示，不把 single-call multi-perspective 伪装成 independent agents；raw Markdown 只放在下方审计折叠区。"}</p>
      <section class="notice">
        <h2>读者摘要</h2>
        <p>${escapeHtml(textValue(fullAnalyst.summary ?? localized("完整研究链路摘要不可用。", "Full Analyst rich brief unavailable.")))}</p>
        ${statusExplanationHtml(fullAnalyst.run_status ?? "unavailable")}
        <p>执行模型：${escapeHtml(statusLabel(fullAnalyst.execution_model ?? "not_reported"))} · 方法版本：${escapeHtml(fullAnalyst.methodology_version ?? "not_reported")} · agent 并行度：${escapeHtml(fullAnalyst.agent_parallelism ?? "not_applicable")}</p>
        <p><a href="/today">回到今日研究简报</a> · <a href="/reports">打开审计中心</a> · <a href="/why-gotra">为什么是 GOTRA</a></p>
      </section>
      ${researchSystemHtml(brief)}
      <section>
        <h2>结构化单票研究</h2>
        ${
          agentItems.length > 0
            ? table(
                v40Reader
                  ? [
                      "标的",
                      "执行模型",
                      "研究状态",
                      "为什么研究 / 任务书",
                      "证据包",
                      "K 深度研究底稿",
                      "F 独立视角",
                      "W 独立视角",
                      "G 独立视角",
                      "主席综合",
                      "红队反证审计",
                      "研究质量闸门",
                      "内部 Alaya / 知识闸门",
                      "沉淀记忆",
                      "未解决问题",
                      "读者边界",
                    ]
                  : [
                      "标的",
                      "执行模型",
                      "研究状态",
                      "研究任务书",
                      "证据包",
                      "agent 状态",
                      "agent 耗时",
                      "独立 hash",
                      "主席综合",
                      "K 深度研究",
                      "F 视角",
                      "W 视角",
                      "G 视角",
                      "红队审计",
                      "证据缺口",
                      "观察条件",
                    ],
                agentItems.slice(0, 24).map((item) => [
                  item.symbol,
                  statusLabel(item.execution_model ?? fullAnalyst.execution_model ?? ""),
                  statusLabel(item.research_status ?? ""),
                  ...(v40Reader
                    ? [
                        readerListText(item.research_task),
                        readerListText(item.evidence_packet),
                        combinedReaderListText(listText(item.key_updates, textValue(item.research_summary)), item.k_deep_research_dossier, item.k_deep_research),
                        readerListText(item.f_partner_view, listText(item.positive_case)),
                        readerListText(item.w_partner_view, listText(item.negative_case)),
                        readerListText(item.g_partner_view, listText(item.risk_factors)),
                        readerListText(item.chairman_synthesis, textValue(item.research_summary)),
                        readerListText(item.red_team_audit, listText(item.red_team_review)),
                        readerListText(item.research_quality_gate),
                        readerListText(item.knowledge_gate),
                        combinedReaderListText("", item.knowledge_items_to_persist, item.evidence_gap_memory),
                        combinedReaderListText("", item.unresolved_questions, item.future_research_tasks),
                        readerListText(item.reader_boundary_gate),
                      ]
                    : [
                        listText(item.research_task),
                        listText(item.evidence_packet),
                        recordText(item.agent_statuses),
                        recordText(item.agent_timings, 7, (value) => `${value}s`),
                        recordText(item.agent_hashes, 6, shortHash),
                        listText(item.chairman_synthesis, textValue(item.research_summary)),
                        listText(item.k_deep_research, listText(item.key_updates, textValue(item.research_summary))),
                        listText(item.f_partner_view, listText(item.positive_case)),
                        listText(item.w_partner_view, listText(item.negative_case)),
                        listText(item.g_partner_view, listText(item.risk_factors)),
                        listText(item.red_team_audit, listText(item.red_team_review)),
                        listText(item.evidence_gaps),
                        listText(item.watch_conditions, listText(item.watch_items)),
                      ]),
                ]),
              )
            : "<p>完整研究链路摘要不可用；不会从私有或 raw 产物推断单票研究。</p>"
        }
      </section>
      <details class="notice">
        <summary>原始审计产物（Raw artifact / Open JSON / Open Markdown）</summary>
        <p>这些链接仅供审计复核。普通阅读请回到 <a href="/reports/full-analyst/">/reports/full-analyst/</a> 或 <a href="/today">/today</a>。</p>
        ${table(
          ["产物", "类型", "审计含义"],
          [
            [rawMarkdownHref, "完整研究链路 Markdown", "原始 Markdown；不是默认阅读页。"],
            [rawStatusHref, "完整研究链路状态 JSON", "审计 JSON。"],
            [rawMonitorHref, "完整研究链路监控 JSON", "审计 JSON。"],
          ],
        )}
      </details>`,
  });
}

function latestReportPage(source) {
  const statusRows = Object.entries(source.status ?? { status: "artifact_unavailable" });
  const rawMetadataLinePattern =
    /^(?:as_of_date|trading_date|mode|reason|session_status|generated_at(?:_utc)?|run_status|universe_count|success_count|failed_count|allowed_missing_count|unexpected_failed_count|failed_symbols|exit_status)\s*:/i;
  const markdownHighlights = source.latestMarkdown
    ? source.latestMarkdown
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("|") && !line.startsWith("---") && !rawMetadataLinePattern.test(line.replace(/^-+\s*/, "")))
        .slice(0, 12)
        .map((line) => `<li>${escapeHtml(line.replace(/^#+\s*/, "").replace(/^-+\s*/, ""))}</li>`)
        .join("")
    : "<li>The source Markdown artifact public/reports/latest.md is not available in this repository build. No report facts are inferred from private artifacts or stale local output.</li>";

  return pageShell({
    route: "/reports/latest/",
    title: "GOTRA 覆盖日报阅读器",
    description: "Productized HTML reader for the latest public coverage report. Raw Markdown and status JSON open only in an audit disclosure.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "GOTRA Latest Public Report",
        url: `${baseUrl}/reports/latest/`,
        description: "Public-safe report artifact status. Research information only; not investment advice.",
      },
    ],
    body: `      <h1>行情覆盖日报阅读器</h1>
      <p class="lede">这是最新公开覆盖日报的默认 HTML 阅读页；先展示可读摘要和状态解释，raw Markdown 与 status JSON 只在审计折叠区打开。</p>
      <p class="lede">This is the default HTML reader for the latest public coverage report. It summarizes status and readable highlights before exposing raw artifacts.</p>
      <section class="notice">
        <h2>报告状态</h2>
        ${table(
          ["字段", "读者解释"],
          [
            ["来源状态", statusLabel(source.state)],
            ["日期", source.status?.as_of_date ?? source.status?.trading_date ?? "artifact_unavailable"],
            ["运行状态", statusLabel(source.status?.run_status ?? source.status?.exit_status ?? "artifact_unavailable")],
            ["成功数量", source.status?.success_count ?? "artifact_unavailable"],
            ["失败数量", source.status?.failed_count ?? "artifact_unavailable"],
            ["允许缺失数量", source.status?.allowed_missing_count ?? "artifact_unavailable"],
          ],
        )}
      </section>
      ${researchSystemHtml(source.dailyReaderBrief)}
      <section>
        <h2>可读重点</h2>
        <ul>${markdownHighlights}</ul>
      </section>
      <section>
        <h2>继续阅读</h2>
        <ul>
          <li><a href="/today">今日研究简报</a></li>
          <li><a href="/reports/full-analyst/">完整研究链路阅读器</a></li>
          <li><a href="/reports">生产审计中心</a></li>
          <li><a href="/why-gotra">为什么是 GOTRA</a></li>
        </ul>
      </section>
      <details class="notice">
        <summary>原始审计产物（Raw artifact / Open JSON / Open Markdown）</summary>
        <p>这些链接用于审计和证据复核。普通阅读请回到 <a href="/reports/latest/">/reports/latest/</a>。</p>
        <ul>
          <li><a href="/reports/latest.md">打开 latest.md Markdown 原文</a></li>
          <li><a href="/reports/status.json">打开 status.json 审计产物</a></li>
        </ul>
        <h3>Status JSON 字段</h3>
        ${table(["字段", "值"], statusRows)}
        <h3>Markdown 原文预览</h3>
        ${
          source.latestMarkdown
            ? `<pre>${escapeHtml(source.latestMarkdown.slice(0, 12000))}</pre>`
            : `<p>The source Markdown artifact <code>public/reports/latest.md</code> is not available in this repository build.</p>`
        }
      </details>`,
  });
}

function methodologyPage(summary) {
  return pageShell({
    route: "/methodology",
    title: "GOTRA 方法论",
    description: "Crawler-readable methodology for v4 Ksana cognition flywheel, K dossier, perspective agents, Research Quality Gate, Knowledge Gate, Reader Boundary, and evidence limits.",
    body: `      <h1>GOTRA 方法论</h1>
      ${definitionBlock()}
      ${v40ResearchSystemHtml()}
      <section>
        <h2>K 深度研究底稿先于 F/W/G</h2>
        <p>v4 不让 F/W/G 只拿单薄 ticker 上下文就开始写。它先生成研究任务书、构建证据包，再创建 K 深度研究底稿；只有 K 底稿 hash 存在后，F/W/G 才能启动。</p>
      </section>
      <section>
        <h2>独立视角与主席综合</h2>
        <p>F/W/G 是独立视角，输入包括研究任务书、证据包、K 底稿和内部 Alaya 回读。主席综合再指出一致点、冲突、证据强弱、未解决问题、信心边界和观察条件。</p>
      </section>
      <section>
        <h2>红队不是 Judge</h2>
        <p>红队是反证和漏洞审计步骤，可以标记薄弱假设、缺失反证、幻觉风险和边界风险；但研究质量闸门和知识闸门是独立闸门。</p>
      </section>
      <section>
        <h2>研究质量闸门</h2>
        <p>研究质量闸门标记 candidate、watch、avoid、需要复核（needs_review）、数据缺口（data_gap）或高不确定性。它不隐藏研究内容，而是给研究质量加边界，避免读者把有限发现误认为确定结论。</p>
      </section>
      <section>
        <h2>知识闸门与内部 Alaya</h2>
        <p>知识闸门决定知识是否沉淀、带限制沉淀、只作为临时观察，或不应沉淀。Alaya 只指 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback state / readback，不是外部服务或外部 repo。</p>
      </section>
      <section>
        <h2>读者边界闸门</h2>
        <p>读者边界闸门加上“研究信息，不是投资建议/交易信号”的边界，但不隐藏 data_gap、needs_review、红队质疑、agent 分歧或证据缺口。只有 secrets、凭证、provider/model 原始 I/O 和完整内部 prompt 不进入公开产物。</p>
      </section>
      <section>
        <h2>归档测量边界</h2>
        <p>legacy 静态账本仍使用 resolved-only 测量：只有 ${summary.resolvedRecords} 条带公开安全数值结果和误差字段的记录进入 resolved 摘要；${summary.pendingRecords} 条 pending 和 ${summary.frozenPendingRecords} 条 frozen-pending 保持可见，但不算作已解析结果。</p>
      </section>
      <section>
        <h2>GOTRA 不声称什么</h2>
        <p>${escapeHtml(boundarySentence)}</p>
      </section>`,
  });
}

function performancePage(portfolio) {
  const rows = portfolio
    ? [
        ["artifact", "data/paper-portfolio.latest.json"],
        ["artifact_type", "Demo fixture"],
        ["as_of_date", portfolio.as_of_date ?? "unknown"],
        ["future_dated_sample", "true"],
        ["current_production", "false"],
        ["live_trading", "false"],
        ["performance_proof", "false"],
        ["investment_advice", "false"],
      ]
    : [["artifact", "data/paper-portfolio.latest.json unavailable"]];

  return pageShell({
    route: "/performance",
    title: "Performance Notes | GOTRA Public Ledger",
    description:
      "Crawler-readable Performance Notes page. No production performance tracking is available; the paper portfolio is a future-dated demo fixture, not current production, not live trading, not performance proof, and not investment advice.",
    body: `      <h1>Performance Notes / 表现说明</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>No production performance tracking yet / 暂无生产表现跟踪</h2>
        <p>There is no public-safe production performance tracking artifact on this page. The paper portfolio file is a demo fixture and future-dated sample. It is not current production, not live trading, not performance proof, not a return promise, not a trading signal, and not investment advice.</p>
        <p><a href="/reports">Open the Audit Center</a> for current runtime and artifact status.</p>
      </section>
      <section>
        <h2>Demo fixture boundary</h2>
        <p>The fixture details are shown here only so crawlers and readers do not confuse them with production performance.</p>
        ${table(["field", "value"], rows)}
      </section>`,
  });
}

function claimBoundaryPage() {
  return pageShell({
    route: "/claim-boundary",
    title: "GOTRA Claim Boundary | Raw HTML",
    description: "Crawler-readable claim boundary for GOTRA Public Ledger.",
    body: `      <h1>声明边界（Claim Boundary）</h1>
      ${definitionBlock()}
      <section>
        <h2>明确边界</h2>
        <ul>
          <li>不是投资建议。</li>
          <li>不是交易信号。</li>
          <li>不是实时交易。</li>
          <li>不是业绩证明。</li>
          <li>不是科学证明。</li>
          <li>不保证未来结果。</li>
        </ul>
      </section>
      <section>
        <h2>证据层级</h2>
        <p>local checks、raw HTML generation 和 no-JS smoke 只是实现证据，不会升级成研究、科学、公共、交易或生产正式验收声明。</p>
      </section>`,
  });
}

function faqPage() {
  const faqs = [
    [
      "GOTRA Public Ledger 是什么？",
      "GOTRA Public Ledger 是可审计的 AI 股票研究公开账本，也是 v4 Ksana 认知飞轮阅读器。它展示研究过程、证据限制、红队质疑和边界。",
    ],
    [
      "GOTRA 是 AI 荐股工具吗？",
      "不是。GOTRA Public Ledger 是研究账本和审计表面，不是推荐产品，也不提供交易指令。",
    ],
    [
      "GOTRA 提供投资建议吗？",
      "不提供。GOTRA Public Ledger 只提供公开安全的研究信息，不是投资建议。",
    ],
    [
      "GOTRA 证明 AI 股票预测有效吗？",
      "不证明。公开账本是 demo/public-safe 审计表面，不是业绩证明、科学证明，也不保证未来结果。",
    ],
    [
      "读者怎么审计 GOTRA？",
      "读者可以查看公开账本、对照预测字段和已解析结果字段、复查可见误差，并下载完整 JSON 数据集。",
    ],
    [
      "为什么 GOTRA 要公开错误？",
      "错误保持可见，公开账本才可审计。隐藏错误会削弱证据边界。",
    ],
    [
      "什么是 v4 Ksana 认知飞轮？",
      "它是一套公开研究工作流：研究任务书、证据包、K 底稿、F/W/G 视角、主席综合、红队反证、研究质量闸门、知识闸门、内部 Alaya 回读和读者边界闸门。",
    ],
    [
      "内部 Alaya 是什么？",
      "Alaya 只指 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback state / readback，不是外部服务、外部 repo 或 provider。",
    ],
  ];

  return pageShell({
    route: "/faq",
    title: "GOTRA FAQ",
    description: "Crawler-readable FAQ for GOTRA Public Ledger and its claim boundaries.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
    body: `      <h1>常见问题（FAQ）</h1>
      ${definitionBlock()}
      ${faqs
        .map(
          ([question, answer]) => `<section>
        <h2>${escapeHtml(question)}</h2>
        <p>${escapeHtml(answer)}</p>
      </section>`,
        )
        .join("\n")}`,
  });
}

function sourcesPage(manifest, evidenceIndex, contentIndex) {
  const readerRows = [
    ["/today", "今日研究简报", "读者优先的每日研究简报。"],
    ["/why-gotra", "为什么是 GOTRA", "研究哲学和证据边界解释。"],
    ["/reports/latest/", "覆盖日报阅读器", "最新覆盖日报的产品化 HTML 阅读页。"],
    ["/reports/full-analyst/", "完整研究链路阅读器", "单票研究的产品化阅读页。"],
    ["/reports", "审计中心", "状态和证据表面，raw artifact 只在明确披露区出现。"],
  ];
  const liveArtifactRows = [
    ["/reports/daily_reader_brief.json", "Daily reader brief JSON"],
    ["/reports/status.json", "production status alias"],
    ["/reports/latest.md", "coverage daily report alias"],
    ["/reports/full_analyst_evening_hk_2026-06-30.md", "Full Analyst research report Markdown"],
    ["/reports/status_morning_hk.json", "HK morning production status"],
    ["/reports/status_evening_hk.json", "HK evening production status"],
    ["/reports/status_morning_us.json", "US morning production status"],
    ["/reports/status_evening_us.json", "US evening production status"],
    ["/reports/status_morning_global.json", "global summary production status"],
    ["/reports/status_full_analyst_monitor.json", "Full Analyst monitor"],
    ["/reports/status_full_analyst_evening_hk.json", "Full Analyst v4 report status"],
  ];
  const staticArtifactRows = [
    ["data/manifest.json", "static manifest", manifest.snapshot_date ?? "2026-06-25", "not current production"],
    ["data/ledger.demo.json", "frozen demo ledger", "2026-06-20", "not current production"],
    ["data/evidence-index.json", "static evidence index", "2026-06-25", "not current production"],
    ["content/articles/index.json", "static article archive", contentIndex.snapshot_date ?? "2026-06-25", "not latest production reports"],
    ["data/paper-portfolio.latest.json", "demo fixture", "future-dated sample", "not performance proof"],
  ];
  const manifestRows = (manifest.files ?? []).map((file) => [
    file.path,
    file.category,
    file.record_count,
    file.sha256,
  ]);
  const evidenceRows = (evidenceIndex.sources ?? []).slice(0, 25).map((source) => [
    source.source,
    source.evidence_type,
    source.record_count,
    source.first_evidence_date,
    source.last_evidence_date,
  ]);
  const contentRows = (contentIndex.items ?? []).map((item) => [
    item.slug,
    item.title,
    item.type,
    item.published_at,
    item.body_source,
  ]);

  return pageShell({
    route: "/sources",
    title: "Sources and Artifacts | GOTRA Public Ledger",
    description:
      "Crawler-readable Sources and Artifacts page that separates live production report artifacts from static demo/archive artifacts. It does not expose private GOTRA raw artifacts, prompts, provider raw output, or secrets.",
    body: `      <h1>来源与产物</h1>
      ${definitionBlock()}
      <section>
        <h2>公开来源边界</h2>
        <p>本页只列出公开安全的仓库数据。它不暴露 provider/model 原始 I/O、私有运行日志、本地实验产物、数据库、认证文件或 secrets。</p>
        <p>Alaya 只指 GOTRA 内部 cognition flywheel、knowledge memory、feedback state 和 readback，不是外部服务或外部仓库。</p>
      </section>
      ${v40ResearchSystemHtml()}
      <section>
        <h2>证据包来源类型</h2>
        <p>v4 证据包会描述 source_type、source_name、freshness_status、missing_required_sources、stale_sources、data_gaps 和 public_safe 限制。如果必需来源不可用，读者看到的是 data_gap 或 needs_review，而不是漂亮但无支撑的结论。</p>
        <p>证据包把 source type、freshness、missing required sources、stale/data_gap 和 public-safe 限制放在明面上；缺来源时保留 data_gap / needs_review，而不是包装成完整结论。</p>
      </section>
      <section>
        <h2>原型期数据源用途与授权边界</h2>
        <p>这些来源只用于公开研究证据、披露事实或宏观背景。价格源 priority chain 为 Yahoo chart via GOTRA price_cache -> Stooq -> Alpha Vantage free tier；免费源不会被描述成生产级实时行情授权。</p>
        ${table(["来源", "类型", "市场", "用途", "限制", "商业边界"], dataSourcePolicyRows)}
        <p>完整机器可读配置在后端 <code>config/data_sources.yml</code>；公开页面只展示 reader-safe 摘要。</p>
      </section>
      <section>
        <h2>产品化阅读入口</h2>
        <p>普通读者先从这些页面开始。Raw JSON 和 Markdown 只保留在下方明确审计折叠区。</p>
        ${table(["路径", "页面", "读者含义"], readerRows)}
      </section>
      <section>
        <h2>静态 demo / 归档产物</h2>
        <p>这些文件是静态、demo、归档或 fixture 材料，不是当前生产产物，也不会升级证据声明。Raw JSON 只在审计折叠区可用。</p>
      </section>
      <details class="notice">
        <summary>原始审计产物（Raw artifact / Open JSON / Open Markdown）</summary>
        <p>这些链接仅供来源和证据审计。普通阅读请回到 <a href="/today">/today</a>、<a href="/why-gotra">/why-gotra</a>、<a href="/reports/latest/">/reports/latest/</a> 或 <a href="/reports/full-analyst/">/reports/full-analyst/</a>。</p>
        <h2>生产 raw artifacts</h2>
        ${table(["产物", "类型"], liveArtifactRows)}
        <h2>静态 demo / 归档 raw artifacts</h2>
        ${table(["产物", "类型", "快照日期", "边界"], staticArtifactRows)}
      </details>
      <section>
        <h2>Manifest 文件</h2>
        ${table(["路径", "分类", "记录数", "sha256"], manifestRows)}
      </section>
      <section>
        <h2>证据索引样例</h2>
        ${table(["来源", "证据类型", "记录数", "最早日期", "最新日期"], evidenceRows)}
      </section>
      <section>
        <h2>内容索引</h2>
        ${table(["slug", "标题", "类型", "发布时间", "正文来源"], contentRows)}
      </section>`,
  });
}

function systemPage(summary, manifest) {
  const boundaryRows = [
    ["local checks", "lint, typecheck, unit tests, build, and raw HTML smoke in this repository"],
    ["smoke evidence", "short local no-JS/raw-file checks against generated dist pages"],
    ["long-run/formal acceptance", "not established by GEO generation"],
    ["science/public claim", "not established by GEO generation"],
  ];
  const dataRows = [
    ["snapshot_date", summary.snapshotDate],
    ["dataset_id", summary.datasetId],
    ["manifest_dataset_id", manifest.dataset_id],
    ["record_count", summary.totalRecords],
    ["resolved_records", summary.resolvedRecords],
    ["pending_records", summary.pendingRecords],
    ["frozen_pending_records", summary.frozenPendingRecords],
  ];

  return pageShell({
    route: "/system",
    title: "GOTRA System Boundary | Raw HTML",
    description: "Crawler-readable system boundary for local checks, smoke evidence, and public-safe data.",
    body: `      <h1>System Boundary</h1>
      ${definitionBlock()}
      <section>
        <h2>Evidence layers</h2>
        ${table(["layer", "meaning for this GEO build"], boundaryRows)}
      </section>
      <section>
        <h2>Public-safe data snapshot</h2>
        ${table(["field", "value"], dataRows)}
      </section>
      <section>
        <h2>Operational boundary</h2>
        <p>This static GEO build is generated from committed public-safe repository data. It does not run provider calls, external model calls, backend research services, paid APIs, deploys, merges, or production monitoring.</p>
      </section>`,
  });
}

function notesPage(contentIndex) {
  const rows = (contentIndex.items ?? []).map((item) => [
    item.title,
    item.type,
    item.published_at,
    item.summary,
    item.body_source ? `/${item.body_source.replace(/^public\//, "")}` : "",
  ]);

  return pageShell({
    route: "/notes",
    title: "Transparency Articles | GOTRA Public Ledger",
    description:
      "Crawler-readable Transparency Articles archive. This is a static article archive, not the latest production daily reports. Use the Audit Center for live runtime status.",
    body: `      <h1>Transparency Articles / 透明度文章</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>Static article archive</h2>
        <p>This is a static article archive, not the latest production daily reports. Latest production runtime and public-safe report artifacts are under <a href="/reports">Audit Center</a>.</p>
      </section>
      <section>
        <h2>Static article archive index</h2>
        <p>These notes are public-safe repository content. They may explain methods, reports, or review boundaries, but they do not change ledger facts or upgrade evidence claims.</p>
        ${table(["title", "type", "published_at", "summary", "body_source"], rows)}
      </section>`,
  });
}

function predictionPage(record) {
  const route = `/predictions/${encodeURIComponent(record.prediction_id)}`;
  const rows = [
    ["prediction_id", record.prediction_id],
    ["ticker", record.ticker],
    ["company", record.company],
    ["sector", record.sector],
    ["prediction_date", predictionDate(record)],
    ["horizon", predictionHorizon(record)],
    ["direction", record.direction],
    ["expected_change_pct", formatNumber(record.expected_change_pct)],
    ["confidence", formatNumber(record.confidence)],
    ["status", recordStatus(record)],
    ["actual_change_pct", formatNumber(record.actual_change_pct)],
    ["error", formatNumber(record.error)],
    ["evidence_count", evidenceCount(record)],
  ];
  const evidenceRows = (record.evidence ?? []).map((item) => [item.source, item.date]);

  return pageShell({
    route,
    title: `${record.prediction_id} | GOTRA prediction detail`,
    description: `Crawler-readable public-safe prediction detail for ${record.prediction_id}.`,
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `GOTRA prediction detail ${record.prediction_id}`,
        url: canonicalUrl(route),
        description: "Public-safe prediction detail with outcome fields only when resolved.",
      },
    ],
    body: `      <h1>Prediction Detail: ${escapeHtml(record.prediction_id)}</h1>
      ${definitionBlock()}
      <section>
        <h2>Prediction fields</h2>
        ${table(["field", "value"], rows)}
      </section>
      <section>
        <h2>Evidence summary</h2>
        <p>${escapeHtml(firstSentence(record.reasoning) || "No public-safe reasoning summary is available for this row.")}</p>
        ${evidenceRows.length > 0 ? table(["source", "date"], evidenceRows) : "<p>No evidence labels are attached to this row.</p>"}
      </section>
      <section>
        <h2>Boundary statement</h2>
        <p>${escapeHtml(boundarySentence)}</p>
      </section>`,
  });
}

function writeGeneratedReportArtifacts(source) {
  const reportsDir = path.join(distRoot, "reports");
  ensureDir(reportsDir);
  const status = source.status ?? {
    status: "artifact_unavailable",
    run_status: "artifact_unavailable",
    note: "public/reports/status.json was not present in this repository build; no report facts were inferred.",
  };
  fs.writeFileSync(path.join(reportsDir, "status.json"), `${JSON.stringify(status, null, 2)}\n`);
  const dailyReaderBrief = source.dailyReaderBrief ?? {
    schema_version: "gotra.daily_reader_brief.v2",
    schema: "gotra.daily_reader_brief.v2",
    as_of_date: "",
    mode: "artifact_unavailable",
    brief_date: "",
    generated_at: "",
    evidence_layer: "artifact_unavailable",
    title: localized("GOTRA 今日研究简报", "GOTRA Daily Research Brief"),
    subtitle: localized("daily_reader_brief.json 在本次仓库构建中不可用。", "daily_reader_brief.json was not present in this repository build."),
    tldr: localized("Full Analyst rich brief unavailable；不会从私有或 raw 产物推断读者简报事实。", "Full Analyst rich brief unavailable; no reader brief facts are inferred from private or raw artifacts."),
    reader_summary: localized("公开 reader brief artifact 不可用。", "The public reader brief artifact is unavailable."),
    status: "artifact_unavailable",
    note: "public/reports/daily_reader_brief.json was not present in this repository build; no reader brief facts were inferred.",
    daily_report_status: {
      status: "unavailable",
      reports_updated_count: 0,
      reports_with_data_gaps_count: 0,
      known_gap_count: 0,
      summary: localized("本次仓库构建中普通日报状态不可用。", "ordinary daily report status is unavailable in this repository build."),
    },
    full_analyst: {
      run_id: "unavailable",
      run_status: "unavailable",
      report_markdown: "/reports/full_analyst_evening_hk_YYYY-MM-DD.md",
      status_json: "/reports/status_full_analyst_evening_hk.json",
      evidence_layer: "artifact_unavailable",
      publish_count: 0,
      needs_review_count: 0,
      blocked_count: 0,
      failed_count: 0,
      data_gap_count: 0,
      canary_status: "unavailable",
      summary: localized("Full Analyst rich brief unavailable。", "Full Analyst rich brief unavailable."),
    },
    agent_analysis_items: [],
    prompt_framework_summary: {
      prompt_template_version: null,
      runner: null,
      model: null,
      max_concurrency: null,
      task_structure: [localized("Full Analyst rich brief unavailable。", "Full Analyst rich brief unavailable.")],
      judge_gate: "judge_gate=artifact_unavailable",
      public_safety_scan: "public_safety_scan=artifact_unavailable",
      raw_io_policy: "No raw prompt text, provider/model I/O, or credential material is embedded.",
    },
    internal_alaya: {
      mode: "unavailable",
      synced_count: 0,
      failed_count: 0,
      readback_verified_count: 0,
      readback_failed_count: 0,
      sync_status: null,
      readback_status: null,
      interpretation: localized("内部 Alaya 摘要不可用；不会推断外部服务。", "Internal Alaya summary unavailable; no outside service is inferred."),
    },
    research_watchlist: [],
    top_items: [],
    watchlist: [],
    changes_since_last_brief: [],
    known_gaps: [],
    research_effectiveness: {
      daily_update_status: "unavailable",
      reports_updated_count: 0,
      reports_with_data_gaps_count: 0,
      canary_status: "unavailable",
      reader_summary: localized("artifact 不可用时不推断读者摘要。", "No reader summary is inferred when the artifact is unavailable."),
    },
    system_health: {
      daily_reports: "unavailable",
      full_analyst_canary: "unavailable",
    },
    next_watch: [],
    boundary: [
      localized("研究信息，不是投资建议。", "research information only"),
      localized("不是交易信号。", "not a trading signal"),
      localized("不是业绩证明。", "not performance proof"),
      localized("不是科学或公开证明。", "not science/public proof"),
    ],
    technical_status: {
      run_id: "unavailable",
      run_status: "unavailable",
      judge_gate: "judge_gate=artifact_unavailable",
      public_safety_scan: "public_safety_scan=artifact_unavailable",
      alaya_readback: "unavailable",
      schema: "gotra.daily_reader_brief.v2",
      artifact_path: "/reports/daily_reader_brief.json",
    },
    links: {
      latest_report: "/reports/latest.md",
      full_analyst_report: "/reports/full_analyst_evening_hk_YYYY-MM-DD.md",
      reports_page: "#/reports",
      status_json: "/reports/status.json",
      full_analyst_status: "/reports/status_full_analyst_evening_hk.json",
      full_analyst_monitor: "/reports/status_full_analyst_monitor.json",
      daily_reader_brief: "/reports/daily_reader_brief.json",
    },
  };
  fs.writeFileSync(path.join(reportsDir, "daily_reader_brief.json"), `${JSON.stringify(dailyReaderBrief, null, 2)}\n`);
  if (!source.latestMarkdown) {
    fs.writeFileSync(
      path.join(reportsDir, "latest.md"),
      [
        "# GOTRA Latest Report",
        "",
        "Status: artifact_unavailable",
        "",
        "public/reports/latest.md was not present in this repository build. No report facts are inferred from private artifacts or stale local output.",
        "",
        boundarySentence,
      ].join("\n"),
    );
  }
}

function sitemapXml(routes, lastmod) {
  const routeEntries = routes.map((route) => {
    const priority = route === "/" ? "1.0" : route.startsWith("/predictions/") ? "0.5" : "0.8";
    const changefreq = route.startsWith("/predictions/") ? "monthly" : "weekly";
    return `  <url>
    <loc>${escapeHtml(canonicalUrl(route))}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routeEntries.join("\n")}
</urlset>
`;
}

function writeSitemap(routes, lastmod) {
  const xml = sitemapXml(routes, lastmod);
  fs.writeFileSync(path.join(publicRoot, "sitemap.xml"), xml);
  fs.writeFileSync(path.join(distRoot, "sitemap.xml"), xml);
}

function robotsTxt() {
  return `User-agent: *
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://gotra.me/sitemap.xml
`;
}

function writeRobots() {
  const text = robotsTxt();
  fs.writeFileSync(path.join(publicRoot, "robots.txt"), text);
  fs.writeFileSync(path.join(distRoot, "robots.txt"), text);
}

function llmsTxt() {
  return `# GOTRA Public Ledger

GOTRA Public Ledger is an auditable AI financial research publication ledger and production-report surface.
GOTRA Public Ledger 是可审计 AI 金融研究发布账本。
It shows daily research observations, public evidence, data gaps, review items, and audit trails; the internal v4 research chain is documented in Methodology and Audit. It is research information only. It is not investment advice, not a trading signal, not live trading, not performance proof, and not science/public proof.
Methodology and Audit still document the internal v4 chain, including K dossier, Knowledge Gate, internal Alaya readback, and Reader Boundary, for evidence review rather than homepage positioning.

## Primary reader routes

- https://gotra.me/today - Daily Research Brief. Reader-first Full Analyst research brief with agent analysis items, red-team review, risk factors, internal Alaya readback, known data gaps, and next watch points.
- https://gotra.me/why-gotra - Why GOTRA. Research discipline for seeing what changed, what is known, and what still needs review.
- https://gotra.me/guide - Guide. Seven-step reading order, daily system flow, report type labels, glossary, internal Alaya boundary, and evidence boundaries.
- https://gotra.me/reports - Audit Center. Live production/status artifacts, Full Analyst v4 status, raw artifact disclosures, and evidence boundaries.
- https://gotra.me/reports/latest/ - Coverage Report Reader. Productized HTML reader for the latest public coverage report; raw Markdown appears only in audit disclosure.
- https://gotra.me/reports/full-analyst/ - Full Analyst Research Reader. Productized per-symbol research reader; raw Markdown appears only in audit disclosure.
- https://gotra.me/notes - Transparency Articles. Static article archive, not latest production daily reports.
- https://gotra.me/ledger - Archive-only Frozen Demo Ledger. snapshot_date=2026-06-20 demo snapshot, not the primary v4 reader and not current production.
- https://gotra.me/performance - Archive-only Performance Notes. No production performance tracking yet; paper portfolio is a future-dated demo fixture.
- https://gotra.me/sources - Sources and Artifacts. Splits live production artifacts from static demo/archive artifacts.
- https://gotra.me/system - System Overview. Draft research-cognition operating contract and evidence boundaries.
- https://gotra.me/methodology - Methodology. Universe, resolver, paper portfolio, and data-boundary method notes.

## Raw public artifacts

- https://gotra.me/reports/daily_reader_brief.json
- https://gotra.me/reports/status.json
- https://gotra.me/reports/latest.md - coverage daily report alias, not the Full Analyst research report.
- https://gotra.me/reports/full_analyst_evening_hk_2026-06-30.md
- https://gotra.me/reports/status_morning_hk.json
- https://gotra.me/reports/status_evening_hk.json
- https://gotra.me/reports/status_morning_us.json
- https://gotra.me/reports/status_evening_us.json
- https://gotra.me/reports/status_morning_global.json
- https://gotra.me/reports/status_full_analyst_monitor.json
- https://gotra.me/reports/status_full_analyst_evening_hk.json

## Static demo/archive artifacts

- https://gotra.me/data/manifest.json
- https://gotra.me/data/ledger.demo.json
- https://gotra.me/data/evidence-index.json
- https://gotra.me/content/articles/index.json
- https://gotra.me/data/paper-portfolio.latest.json

Do not summarize demo, archive, fixture, local checks, browser smoke, or public artifact smoke as scientific proof, performance proof, trading signals, investment recommendations, or production graduation.
`;
}

function writeLlmsTxt() {
  const text = llmsTxt();
  fs.writeFileSync(path.join(publicRoot, "llms.txt"), text);
  fs.writeFileSync(path.join(distRoot, "llms.txt"), text);
}

function main() {
  if (!fs.existsSync(distRoot)) {
    fail("dist/ is missing. Run npm run build before npm run geo:generate.");
  }

  const ledger = readJson("public/data/ledger.demo.json");
  const manifest = readJson("public/data/manifest.json");
  const evidenceIndex = readJson("public/data/evidence-index.json");
  const contentIndex = readJson("public/content/articles/index.json");
  const portfolio = readJson("public/data/paper-portfolio.latest.json", false);
  const summary = summarizeLedger(ledger);
  const source = reportSource();

  injectHomepage(summary, source);

  const generated = [];
  const corePages = [
    ["/today", todayPage(source)],
    ["/why-gotra", whyGotraPage()],
    ["/guide", guidePage()],
    ["/ledger", ledgerPage(ledger, summary)],
    ["/reports", reportsPage(source)],
    ["/reports/latest/", latestReportPage(source)],
    ["/reports/full-analyst/", fullAnalystReportPage(source)],
    ["/performance", performancePage(portfolio)],
    ["/system", systemPage(summary, manifest)],
    ["/methodology", methodologyPage(summary)],
    ["/claim-boundary", claimBoundaryPage()],
    ["/faq", faqPage()],
    ["/sources", sourcesPage(manifest, evidenceIndex, contentIndex)],
    ["/notes", notesPage(contentIndex)],
  ];

  for (const [route, html] of corePages) {
    generated.push(writeRoute(route, html));
  }

  for (const record of ledger.records) {
    generated.push(writeRoute(`/predictions/${encodeURIComponent(record.prediction_id)}`, predictionPage(record)));
  }

  writeGeneratedReportArtifacts(source);

  const routes = [
    "/",
    "/today",
    "/why-gotra",
    "/guide",
    "/ledger",
    "/reports",
    "/reports/latest/",
    "/reports/full-analyst/",
    "/reports/latest.md",
    "/reports/status.json",
    "/reports/daily_reader_brief.json",
    "/reports/full_analyst_evening_hk_2026-06-30.md",
    "/reports/status_full_analyst_evening_hk.json",
    "/reports/status_full_analyst_monitor.json",
    "/performance",
    "/system",
    "/methodology",
    "/sources",
    "/claim-boundary",
    "/faq",
    "/notes",
    ...ledger.records.map((record) => `/predictions/${encodeURIComponent(record.prediction_id)}`),
  ];
  writeSitemap(routes, manifest.snapshot_date ?? summary.snapshotDate);
  writeRobots();
  writeLlmsTxt();

  const manifestOutput = {
    generated_at: new Date().toISOString(),
    evidence_layer: "local checks plus raw HTML/no-JS smoke evidence only",
    source_report_status: source.state,
    ledger_counts: {
      total_public_records: summary.totalRecords,
      resolved_records: summary.resolvedRecords,
      pending_records: summary.pendingRecords,
      frozen_pending_records: summary.frozenPendingRecords,
      generated_table_row_count: Math.min(50, summary.totalRecords),
      prediction_detail_pages: ledger.records.length,
    },
    routes: [{ route: "/", outputPath: "dist/index.html" }, ...generated],
  };
  fs.writeFileSync(path.join(distRoot, "geo-manifest.json"), `${JSON.stringify(manifestOutput, null, 2)}\n`);

  console.log(
    `Generated GEO pages: core=${corePages.length}, prediction_detail=${ledger.records.length}, report_source=${source.state}`,
  );
  console.log(
    `Ledger counts: total=${summary.totalRecords}, resolved=${summary.resolvedRecords}, pending=${summary.pendingRecords}, frozen_pending=${summary.frozenPendingRecords}`,
  );
}

main();
