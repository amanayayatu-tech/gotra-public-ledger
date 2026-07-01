/* global console, process */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "dist");
const publicRoot = path.join(repoRoot, "public");
const externalReportsRoot = process.env.GOTRA_REPORTS_DIR ? path.resolve(process.env.GOTRA_REPORTS_DIR) : null;
const baseUrl = "https://gotra.me";

const englishDefinition =
  "GOTRA Public Ledger is an auditable AI stock-research public ledger. It records public-safe demo predictions, resolved outcomes, visible errors, and research boundaries. It is research information only, not investment advice, not a trading signal, and not performance proof.";
const chineseDefinition =
  "GOTRA Public Ledger 是一个可审计的 AI 股票研究公开预测账本，展示 public-safe demo 预测记录、已结算结果、公开错误和研究边界。它不是投资建议、不是交易信号、不是业绩证明。";
const boundarySentence =
  "GOTRA Public Ledger provides public-safe research information only. It is not investment advice, not a trading signal, not live trading, not performance proof, and not a guarantee of future outcomes.";
const chineseBoundarySentence =
  "GOTRA Public Ledger 仅提供公开安全的研究信息。它不是投资建议、不是交易信号、不是实时交易、不是业绩证明，也不保证未来结果。";
const guideReadingOrder = [
  ["/today", "今日简报 / Daily Research Brief", "Start with the reader summary, Full Analyst summary, data gaps, watchlist, and next watch."],
  [
    "/reports/full_analyst_evening_hk_2026-06-30.md",
    "Full Analyst 研究报告 / Full Analyst report",
    "Open the Full Analyst Markdown original for per-symbol agent analysis, red-team review, risk factors, and public-safe status.",
  ],
  ["/reports", "生产日报审计 / Production Daily Reports Audit", "Audit the five daily reports, coverage, exceptions, Full Analyst Canary, status JSON, and public artifact links."],
  ["/sources", "来源与产物 / Sources and Artifacts", "Separate live production artifacts from static demo/archive/fixture materials."],
  ["/ledger", "Demo 账本 / Demo Ledger", "Treat this only as a frozen public-safe demo snapshot, not a latest production report or trading instruction."],
  ["/performance", "表现说明 / Performance Notes", "Confirm there is no production performance proof; the paper portfolio is a future-dated demo fixture."],
  ["/methodology", "方法论 / Methodology", "Read the universe, resolver, data-boundary, and resolved-only rules."],
];
const guideFlowRows = [
  ["Universe", "Daily flow first fixes the public universe and exchange identity."],
  ["Production daily timers", "Five timers publish coverage daily reports, status JSON, exceptions, and latest.md aliases."],
  ["Full Analyst candidate/canary", "Adds per-symbol agent analysis, red-team review, risk factors, and watch items without upgrading conclusions."],
  ["Judge gate", "Structure, coverage, data gaps, and boundaries are checked before publication."],
  ["Public safety scan", "Raw prompts, provider/model I/O, secrets, databases, and private logs are not published."],
  ["Internal Alaya", "Alaya here means GOTRA repo internal cognition flywheel, knowledge memory, feedback state, and hash-chain/readback state only."],
  ["Public artifacts", "Public outputs include Today's Brief, daily Markdown, status JSON, Full Analyst report, sources, and no-JS raw HTML."],
  ["Evidence boundary", "Local checks, browser smoke, public artifact smoke, formal acceptance, and science/public claims are separate layers."],
];
const guideGlossaryRows = [
  ["Daily Brief", "Daily reader entrypoint for production reports, Full Analyst highlights, data gaps, watchlist, and boundaries."],
  ["Full Analyst", "Candidate/canary research chain with per-symbol agent analysis; not a formal conclusion upgrade."],
  ["Canary", "Controlled trial chain for health, public scan, and rollback status; not production graduation."],
  ["Agent matrix", "Public-safe per-symbol matrix of summary, positive/negative cases, red-team review, risks, watch items, and source notes."],
  ["Red-team", "Review step for overclaims, hidden assumptions, missing counterevidence, and boundary breaks."],
  ["Risk factors", "Conditions that could invalidate the research view or require reader caution."],
  ["Watch items", "Questions, data points, events, or source states to check next."],
  ["Data gap", "Missing public-source coverage, price, or status-file gap; private data is not used to fill it."],
  ["Judge gate", "Pre-publication structure, coverage, public-safety, and boundary gate."],
  ["Public-safe", "Safe for readers and crawlers; no raw I/O, secrets, private logs, databases, or credentials."],
  ["Evidence layer", "Separation between local checks, smoke evidence, formal acceptance, and science/public claim layers."],
  ["Demo Ledger", "Frozen public-safe demo snapshot; not latest production or a live prediction ledger."],
  ["Performance proof", "Evidence proving production returns or performance; this site does not provide it."],
  ["Science/public proof", "Validation strong enough for scientific/public-validity claims; daily reports or smoke checks are not that."],
  ["Trading signal", "Buy, sell, hold, position, or target-price instruction; this site does not provide it."],
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

function englishValue(value) {
  if (isLocalized(value)) {
    return value.en || value.zh;
  }
  return String(value ?? "");
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
<html lang="en">
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
      }
      th { background: var(--soft); }
      code { background: var(--soft); padding: 0.1rem 0.25rem; border-radius: 4px; }
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
        <a href="/">Home</a>
        <a href="/today">Daily Research Brief</a>
        <a href="/guide">Guide</a>
        <a href="/reports">Production Daily Reports</a>
        <a href="/notes">Transparency Articles</a>
        <a href="/ledger">Frozen Demo Ledger</a>
        <a href="/performance">Performance Notes</a>
        <a href="/reports/latest">Latest report</a>
        <a href="/methodology">Methodology</a>
        <a href="/claim-boundary">Claim boundary</a>
        <a href="/faq">FAQ</a>
        <a href="/sources">Sources</a>
      </nav>
    </header>
    <main>
${body}
    </main>
    <footer>
      <p>${escapeHtml(boundarySentence)}</p>
      <p>${escapeHtml(chineseBoundarySentence)}</p>
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
        <p class="lede">${escapeHtml(englishDefinition)}</p>
        <p class="lede">${escapeHtml(chineseDefinition)}</p>
        <div class="boundary">
          <p>${escapeHtml(boundarySentence)}</p>
          <p>${escapeHtml(chineseBoundarySentence)}</p>
        </div>
      </section>`;
}

function homeFallback(summary) {
  return `<main id="geo-crawler-home" aria-label="GOTRA crawler-readable summary">
      <h1>GOTRA Public Ledger</h1>
      ${definitionBlock()}
      <section class="summary-grid" aria-label="Snapshot metadata">
        <div class="metric"><strong>${escapeHtml(summary.snapshotDate)}</strong><span>Snapshot date</span></div>
        <div class="metric"><strong>${summary.totalRecords}</strong><span>Public prediction records</span></div>
        <div class="metric"><strong>${summary.resolvedRecords}</strong><span>Resolved records counted in resolved-only summaries</span></div>
        <div class="metric"><strong>${summary.visibleErrorRecords}</strong><span>Visible error values published for audit</span></div>
        <div class="metric"><strong>${summary.pendingRecords}</strong><span>Pending records excluded from resolved-only summaries</span></div>
        <div class="metric"><strong>${summary.frozenPendingRecords}</strong><span>Frozen-pending protocol skeleton rows excluded from resolved-only summaries</span></div>
      </section>
      <section>
        <h2>Core public pages</h2>
        <ul>
          <li><a href="/today">今日研究简报 / Daily Research Brief</a></li>
          <li><a href="/guide">使用指南 / Guide</a></li>
          <li><a href="/reports">生产日报 / Production Daily Reports</a></li>
          <li><a href="/notes">透明度文章 / Transparency Articles</a></li>
          <li><a href="/ledger">冻结 Demo 账本 / Frozen Demo Ledger</a></li>
          <li><a href="/performance">表现说明 / Performance Notes</a></li>
          <li><a href="/methodology">Methodology</a></li>
          <li><a href="/claim-boundary">Claim boundary</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/sources">Sources</a></li>
        </ul>
      </section>
    </main>`;
}

function injectHomepage(summary) {
  const indexPath = path.join(distRoot, "index.html");
  if (!fs.existsSync(indexPath)) {
    fail("dist/index.html is missing. Run vite build before geo generation.");
  }
  const html = fs.readFileSync(indexPath, "utf8");
  const fallback = `<noscript>\n${homeFallback(summary)}\n    </noscript>`;
  const injected = html.includes("geo-crawler-home")
    ? html
    : html.replace(/<div id="root"><\/div>/, `${fallback}\n    <div id="root"></div>`);
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
      `          <tr>${row.map((cell) => `<td>${cell === null || cell === undefined ? "" : escapeHtml(cell)}</td>`).join("")}</tr>`,
  )
  .join("\n")}
        </tbody>
      </table>`;
}

function guideReadingOrderHtml() {
  return `<section>
        <h2>七步阅读顺序 / Seven-step reading order</h2>
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
        <h2>术语表 / Glossary</h2>
        ${table(["term", "definition"], guideGlossaryRows)}
      </section>`;
}

function guideBoundaryHtml() {
  return `<section class="notice">
        <h2>证据边界 / Evidence boundary</h2>
        <p>Local checks, browser smoke, public artifact smoke, long-run/formal acceptance, and science/public claim are separate evidence layers. Do not summarize this site as investment advice, a trading signal, science/public proof, performance proof, or production graduation.</p>
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
        <p><a href="/data/ledger.demo.json">Download the full JSON dataset</a>.</p>
      </section>
      <section>
        <h2>First 50 public ledger rows</h2>
        ${tableHtml}
      </section>`,
  });
}

function reportsPage(source) {
  const liveArtifacts = [
    ["/reports/daily_reader_brief.json", "Daily reader brief JSON"],
    ["/reports/status.json", "Latest production status alias"],
    ["/reports/latest.md", "Coverage daily report alias, not the Full Analyst research report"],
    ["/reports/full_analyst_evening_hk_2026-06-30.md", "Full Analyst research report Markdown"],
    ["/reports/status_morning_hk.json", "HK morning production daily report status"],
    ["/reports/status_evening_hk.json", "HK evening production daily report status"],
    ["/reports/status_morning_us.json", "US morning production daily report status"],
    ["/reports/status_evening_us.json", "US evening production daily report status"],
    ["/reports/status_morning_global.json", "Global summary production daily report status"],
    ["/reports/status_full_analyst_monitor.json", "Full Analyst Canary monitor status"],
    ["/reports/status_full_analyst_evening_hk.json", "Full Analyst Canary report status"],
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
    return [field, value === undefined ? "artifact_unavailable" : Array.isArray(value) ? value.join(", ") : String(value)];
  });

  return pageShell({
    route: "/reports",
    title: "Production Daily Reports | GOTRA Public Ledger",
    description:
      "Crawler-readable Production Daily Reports page for HK morning, HK evening, US morning, US evening, global summary, and Full Analyst Canary public-safe artifacts. Not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    body: `      <h1>Production Daily Reports / 生产日报</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>Live production artifact boundary</h2>
        <p>This page is the production daily report entrypoint. It answers what the public-safe production timers published, including HK morning, HK evening, US morning, US evening, global summary, and the Full Analyst Canary. These are runtime/status artifacts only, not performance proof, not a trading signal, not science/public proof, and not investment advice.</p>
      </section>
      <section>
        <h2>Report type labels / 报告类型</h2>
        <ul>
          <li><strong>行情覆盖日报 / Coverage daily report:</strong> <a href="/reports/latest.md">latest.md</a> is the coverage daily alias, not the Full Analyst research report.</li>
          <li><strong>Full Analyst 研究报告 / Full Analyst report:</strong> candidate/canary per-symbol research output.</li>
          <li><strong>先行试跑监控 / Canary Monitor:</strong> heartbeat, freshness, public scan, and rollback status.</li>
          <li><strong>状态 JSON / Status JSON:</strong> public runtime fields for coverage, failed_symbols, and data_gap.</li>
        </ul>
      </section>
      <section class="notice">
        <h2>Report source status</h2>
        <p>Status: <strong>${escapeHtml(source.state)}</strong>.</p>
        <p>If <code>public/reports/status.json</code> or <code>public/reports/latest.md</code> is missing in this build, this page reports artifact-unavailable instead of inventing report facts.</p>
      </section>
      <section>
        <h2>Live production artifacts</h2>
        ${table(["artifact", "type"], liveArtifacts)}
      </section>
      <section>
        <h2>Latest report status fields</h2>
        ${table(["field", "value"], rows)}
        <ul>
          <li><a href="/reports/latest">Latest report HTML</a></li>
          <li><a href="/reports/latest.md">Coverage daily report latest.md</a></li>
          <li><a href="/reports/status.json">Report status JSON</a></li>
        </ul>
      </section>`,
  });
}

function guidePage() {
  const reportTypeRows = [
    ["/reports/daily_reader_brief.json", "今日简报 JSON / Daily Reader Brief JSON", "Public-safe reader summary powering /today."],
    ["/reports/latest.md", "行情覆盖日报 latest.md / Coverage daily alias", "latest.md is the coverage daily alias, not the Full Analyst research report."],
    ["/reports/full_analyst_evening_hk_2026-06-30.md", "Full Analyst 研究报告 / Full Analyst report", "Canary candidate research report with per-symbol agent analysis; source text may be English original."],
    ["/reports/status_full_analyst_monitor.json", "先行试跑监控 / Canary Monitor", "Full Analyst heartbeat, freshness, public scan, and rollback status."],
    ["/reports/status.json", "状态 JSON / Status JSON", "Production audit fields for run_status, coverage, failed_symbols, and data_gap."],
  ];

  return pageShell({
    route: "/guide",
    title: "How to Read GOTRA | 使用指南",
    description:
      "Crawler-readable guide for GOTRA reading order, daily system flow, glossary, report types, internal Alaya boundary, and evidence boundaries. Not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    body: `      <h1>如何阅读 GOTRA / How to Read GOTRA</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>Reader purpose / 读者目的</h2>
        <p>Use this page to understand what to read first, what the Full Analyst Canary means, how production reports differ from demo/archive material, and why evidence layers must remain separate.</p>
      </section>
      ${guideReadingOrderHtml()}
      <section>
        <h2>Daily system flow / 每日系统流</h2>
        ${table(["step", "meaning"], guideFlowRows)}
      </section>
      <section>
        <h2>Report types / 报告类型</h2>
        ${table(["artifact", "type", "reader meaning"], reportTypeRows)}
      </section>
      ${guideGlossaryHtml()}
      ${guideBoundaryHtml()}`,
  });
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

  return pageShell({
    route: "/today",
    title: "GOTRA Daily Research Brief | Raw HTML",
    description:
      "Crawler-readable daily reader brief summarizing production reports, known data gaps, watchlist items, Full Analyst Canary health, and next watch points. Not investment advice or a trading signal.",
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
      ${definitionBlock()}
      <section class="notice">
        <h2>TLDR / 一句话摘要</h2>
        <p>${escapeHtml(tldr)}</p>
        <p>${escapeHtml(subtitle)}</p>
      </section>
      ${guideReadingOrderHtml()}
      <section>
        <h2>Full Analyst research summary / Full Analyst 今日研究摘要</h2>
        ${table(
          ["field", "value"],
          [
            ["run_id", fullAnalyst.run_id ?? "artifact_unavailable"],
            ["run_status", fullAnalyst.run_status ?? "artifact_unavailable"],
            ["report_markdown", fullAnalyst.report_markdown ?? "artifact_unavailable"],
            ["publish_count", fullAnalyst.publish_count ?? "artifact_unavailable"],
            ["needs_review_count", fullAnalyst.needs_review_count ?? "artifact_unavailable"],
            ["blocked_count", fullAnalyst.blocked_count ?? "artifact_unavailable"],
            ["failed_count", fullAnalyst.failed_count ?? "artifact_unavailable"],
            ["data_gap_count", fullAnalyst.data_gap_count ?? "artifact_unavailable"],
	            ["summary", textValue(fullAnalyst.summary ?? localized("Full Analyst rich brief unavailable.", "Full Analyst rich brief unavailable."))],
          ],
        )}
      </section>
      <section>
        <h2>Agent analysis matrix / Agent 分析矩阵</h2>
        ${
          agentItems.length > 0
            ? table(
                ["symbol", "research_summary", "red_team_review", "risk_factors", "watch_items"],
                agentItems.slice(0, 12).map((item) => [
                  item.symbol,
	                  textValue(item.research_summary),
	                  Array.isArray(item.red_team_review) ? item.red_team_review.slice(0, 2).map(textValue).join(" | ") : "",
	                  Array.isArray(item.risk_factors) ? item.risk_factors.slice(0, 2).map(textValue).join(" | ") : "",
	                  Array.isArray(item.watch_items) ? item.watch_items.slice(0, 2).map(textValue).join(" | ") : "",
                ]),
              )
            : "<p>Full Analyst rich brief unavailable; no per-symbol agent analysis is inferred.</p>"
        }
      </section>
      <section>
        <h2>Top items / 今日重点</h2>
        ${
          topItems.length > 0
	            ? table(["label", "summary", "why_it_matters"], topItems.map((item) => [textValue(item.label), textValue(item.summary), textValue(item.why_it_matters)]))
            : "<p>daily_reader_brief.json is unavailable; no top items are inferred.</p>"
        }
      </section>
      <section>
        <h2>Watchlist / 观察清单</h2>
        ${
          researchWatchlist.length > 0
	            ? table(["symbol", "question", "reason", "next_check", "source"], researchWatchlist.map((item) => [item.symbol, textValue(item.question), textValue(item.reason), textValue(item.next_check), item.source]))
	            : watchlist.length > 0
	              ? table(["symbol", "reason", "reader_takeaway"], watchlist.map((item) => [item.symbol, textValue(item.reason), textValue(item.reader_takeaway)]))
            : "<p>No public data-gap watch item is marked in this build.</p>"
        }
      </section>
      <section>
        <h2>Prompt/run framework / 提示词与运行框架摘要</h2>
        <ul>
	          ${(Array.isArray(promptFramework.task_structure) ? promptFramework.task_structure : ["Full Analyst rich brief unavailable."]).map((item) => `<li>${escapeHtml(textValue(item))}</li>`).join("")}
          <li>${escapeHtml(promptFramework.judge_gate ?? "judge_gate=artifact_unavailable")}</li>
          <li>${escapeHtml(promptFramework.public_safety_scan ?? "public_safety_scan=artifact_unavailable")}</li>
          <li>${escapeHtml(promptFramework.raw_io_policy ?? "No raw prompt/model I/O is embedded in this raw page.")}</li>
        </ul>
      </section>
      <section>
        <h2>GOTRA internal Alaya cognition flywheel / 内部 Alaya 认知飞轮</h2>
        ${table(
          ["field", "value"],
          [
            ["mode", internalAlaya.mode ?? "artifact_unavailable"],
            ["synced_count", internalAlaya.synced_count ?? "artifact_unavailable"],
            ["failed_count", internalAlaya.failed_count ?? "artifact_unavailable"],
            ["readback_verified_count", internalAlaya.readback_verified_count ?? "artifact_unavailable"],
            ["readback_failed_count", internalAlaya.readback_failed_count ?? "artifact_unavailable"],
	            ["interpretation", textValue(internalAlaya.interpretation ?? localized("Internal Alaya summary unavailable; no outside service is inferred.", "Internal Alaya summary unavailable; no outside service is inferred."))],
          ],
        )}
      </section>
      <section>
        <h2>Known gaps / 已知缺口</h2>
        ${
          knownGaps.length > 0
	            ? table(["symbol", "reason", "affected_report"], knownGaps.map((gap) => [gap.symbol ?? gap.code, textValue(gap.explanation ?? gap.reason), gap.affected_report ?? textValue(gap.label)]))
            : "<p>No public known gap artifact is available in this build.</p>"
        }
      </section>
      <section>
        <h2>Research process effectiveness / 研究过程效果</h2>
        ${table(
          ["field", "value"],
          [
            ["daily_update_status", effect.daily_update_status ?? "artifact_unavailable"],
            ["reports_updated_count", effect.reports_updated_count ?? "artifact_unavailable"],
            ["reports_with_data_gaps_count", effect.reports_with_data_gaps_count ?? "artifact_unavailable"],
            ["canary_status", effect.canary_status ?? "artifact_unavailable"],
	            ["reader_summary", textValue(effect.reader_summary ?? localized("No reader summary is inferred when the artifact is unavailable.", "No reader summary is inferred when the artifact is unavailable."))],
          ],
        )}
        <p>These fields describe process visibility only. They are not performance proof, not a trading signal, and not investment advice.</p>
      </section>
      <section>
        <h2>Next watch / 下一步观察</h2>
        ${
          nextWatch.length > 0
	            ? `<ul>${nextWatch.map((item) => `<li>${escapeHtml(textValue(item))}</li>`).join("")}</ul>`
            : "<p>Next-watch items require daily_reader_brief.json or runtime synthesis from public status files.</p>"
        }
      </section>
      ${guideGlossaryHtml()}
      ${guideBoundaryHtml()}
      <section>
        <h2>Public artifacts</h2>
        <ul>
          <li><a href="/reports/daily_reader_brief.json">Daily reader brief JSON</a></li>
          <li><a href="/reports/status.json">Latest production status JSON</a></li>
          <li><a href="${escapeHtml(fullAnalyst.report_markdown ?? "/reports/full_analyst_evening_hk_YYYY-MM-DD.md")}">Full Analyst research report Markdown</a></li>
          <li><a href="${escapeHtml(fullAnalyst.status_json ?? "/reports/status_full_analyst_evening_hk.json")}">Full Analyst status JSON</a></li>
          <li><a href="/reports/latest.md">Coverage daily latest.md</a></li>
          <li><a href="/reports/status_full_analyst_monitor.json">Full Analyst Canary monitor JSON</a></li>
          <li><a href="/reports">Production Daily Reports Audit</a></li>
        </ul>
      </section>`,
  });
}

function latestReportPage(source) {
  const statusRows = Object.entries(source.status ?? { status: "artifact_unavailable" }).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
  ]);
  const latestText = source.latestMarkdown
    ? `<pre>${escapeHtml(source.latestMarkdown.slice(0, 12000))}</pre>`
    : `<p>The source Markdown artifact <code>public/reports/latest.md</code> is not available in this repository build. No report facts are inferred from private artifacts or stale local output.</p>`;

  return pageShell({
    route: "/reports/latest",
    title: "GOTRA Latest Report | Raw HTML",
    description: "Crawler-readable latest report placeholder or public-safe report artifact when available.",
    extraJsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "GOTRA Latest Public Report",
        url: `${baseUrl}/reports/latest`,
        description: "Public-safe report artifact status. Research information only; not investment advice.",
      },
    ],
    body: `      <h1>Latest Public Report</h1>
      ${definitionBlock()}
      <section>
        <h2>Run metadata</h2>
        ${table(["field", "value"], statusRows)}
      </section>
      <section>
        <h2>Exchange coverage table</h2>
        ${table(["status", "detail"], [["artifact_unavailable", "No public exchange coverage artifact was found in public/reports for this build."]])}
      </section>
      <section>
        <h2>Failed symbols table</h2>
        ${table(["status", "symbols"], [["artifact_unavailable", source.status?.failed_symbols?.join(", ") ?? "No public failed-symbol artifact was found."]])}
      </section>
      <section>
        <h2>Close data table</h2>
        ${table(["status", "detail"], [["artifact_unavailable", "No public close-data artifact was found in public/reports for this build."]])}
      </section>
      <section>
        <h2>Report body</h2>
        ${latestText}
      </section>
      <section>
        <h2>Source artifacts</h2>
        <ul>
          <li><a href="/reports/latest.md">Latest report Markdown artifact</a></li>
          <li><a href="/reports/status.json">Latest report status JSON artifact</a></li>
        </ul>
      </section>
      <section>
        <h2>Interpretation boundary</h2>
        <p>${escapeHtml(boundarySentence)}</p>
      </section>`,
  });
}

function methodologyPage(summary) {
  return pageShell({
    route: "/methodology",
    title: "GOTRA Methodology | Raw HTML",
    description: "Crawler-readable methodology for public-safe demo data, resolved-only measurement, and visible errors.",
    body: `      <h1>GOTRA Methodology</h1>
      ${definitionBlock()}
      <section>
        <h2>How GOTRA records research objects</h2>
        <p>Each public record keeps a prediction identifier, ticker, company, sector, prediction date, horizon, direction, confidence, public-safe evidence labels, and outcome fields only when public-safe resolution data exists.</p>
      </section>
      <section>
        <h2>What public-safe demo data means</h2>
        <p>Public-safe demo data means this repository uses committed public JSON and public documentation sources only. It excludes raw provider/model I/O, prompts, completions, scorer transcripts, private run logs, databases, secrets, and local GOTRA experiment artifacts.</p>
      </section>
      <section>
        <h2>Resolved-only measurement</h2>
        <p>Resolved-only means only the ${summary.resolvedRecords} rows with public-safe numeric outcome and error fields are counted in resolved summaries. The ${summary.pendingRecords} pending rows and ${summary.frozenPendingRecords} frozen-pending rows stay visible but are not counted as resolved outcomes.</p>
      </section>
      <section>
        <h2>Why pending rows are excluded</h2>
        <p>Pending rows do not have public-safe outcome fields in this repository build. Excluding them prevents fabricated backfills and keeps the audit boundary readable.</p>
      </section>
      <section>
        <h2>Why errors remain visible</h2>
        <p>Visible errors make the ledger auditable. A public ledger that hides misses would be weaker for review, attribution, and boundary checking.</p>
      </section>
      <section>
        <h2>What GOTRA does not claim</h2>
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
        <p><a href="/reports">Open Production Daily Reports</a> for current runtime and artifact status.</p>
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
    body: `      <h1>Claim Boundary</h1>
      ${definitionBlock()}
      <section>
        <h2>Explicit boundaries</h2>
        <ul>
          <li>Not investment advice.</li>
          <li>Not a trading signal.</li>
          <li>Not live trading.</li>
          <li>Not performance proof.</li>
          <li>Not scientific proof.</li>
          <li>Not a guarantee of future outcomes.</li>
        </ul>
      </section>
      <section>
        <h2>Evidence ladder</h2>
        <p>Local checks, raw HTML generation, and no-JS smoke evidence are implementation evidence only. They do not upgrade research, science, public, trading, or production acceptance claims.</p>
      </section>`,
  });
}

function faqPage(summary) {
  const faqs = [
    [
      "What is GOTRA Public Ledger?",
      "GOTRA Public Ledger is an auditable AI stock-research public ledger that records public-safe demo predictions, resolved outcomes, visible errors, and research boundaries.",
    ],
    [
      "Is GOTRA an AI stock-picking tool?",
      "No. GOTRA Public Ledger is a research ledger and audit surface. It is not a recommendation product and does not provide trading instructions.",
    ],
    [
      "Does GOTRA provide investment advice?",
      "No. GOTRA Public Ledger provides public-safe research information only and is not investment advice.",
    ],
    [
      "Does GOTRA prove AI stock prediction works?",
      "No. The public ledger is a demo/public-safe audit surface. It is not performance proof, not scientific proof, and not a guarantee of future outcomes.",
    ],
    [
      "How can readers audit GOTRA's predictions?",
      "Readers can inspect the public ledger table, compare prediction fields with resolved outcome fields, review visible error values, and download the full JSON dataset.",
    ],
    [
      "Why does GOTRA publish errors?",
      "Errors remain visible so the public ledger can be audited. Hiding errors would weaken the evidence boundary.",
    ],
    [
      "What is public-safe demo data?",
      "Public-safe demo data is committed public JSON and documentation that excludes raw provider/model I/O, prompts, completions, private logs, databases, credentials, and local experiment artifacts.",
    ],
    [
      "What is resolved-only measurement?",
      `Resolved-only measurement uses only the ${summary.resolvedRecords} rows that have public-safe outcome and error fields. Pending and frozen-pending rows are visible but excluded.`,
    ],
  ];

  return pageShell({
    route: "/faq",
    title: "GOTRA FAQ | Raw HTML",
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
    body: `      <h1>FAQ</h1>
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
    ["/reports/status_full_analyst_monitor.json", "Full Analyst Canary monitor"],
    ["/reports/status_full_analyst_evening_hk.json", "Full Analyst Canary report status"],
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
    body: `      <h1>Sources and Artifacts / 来源与产物</h1>
      ${definitionBlock()}
      <section>
        <h2>Public source boundary</h2>
        <p>This page lists public-safe repository data only. It does not expose raw provider/model I/O, private run logs, local experiment artifacts, databases, auth files, or secrets.</p>
      </section>
      <section>
        <h2>Live production artifacts</h2>
        <p>These report artifacts are the current public production/status surface. They are runtime evidence only, not performance proof and not a trading signal.</p>
        ${table(["artifact", "type"], liveArtifactRows)}
      </section>
      <section>
        <h2>Static demo/archive artifacts</h2>
        <p>These files are static, demo, archive, or fixture materials. They are not current production and do not upgrade evidence claims.</p>
        ${table(["artifact", "type", "snapshot_date", "boundary"], staticArtifactRows)}
      </section>
      <section>
        <h2>Manifest files</h2>
        ${table(["path", "category", "record_count", "sha256"], manifestRows)}
      </section>
      <section>
        <h2>Evidence index sample</h2>
        ${table(["source", "evidence_type", "record_count", "first_evidence_date", "last_evidence_date"], evidenceRows)}
      </section>
      <section>
        <h2>Content index</h2>
        ${table(["slug", "title", "type", "published_at", "body_source"], contentRows)}
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
      "Crawler-readable Transparency Articles archive. This is a static article archive, not the latest production daily reports. Use Production Daily Reports for live runtime status.",
    body: `      <h1>Transparency Articles / 透明度文章</h1>
      ${definitionBlock()}
      <section class="notice">
        <h2>Static article archive</h2>
        <p>This is a static article archive, not the latest production daily reports. Latest production runtime and public-safe report artifacts are under <a href="/reports">Production Daily Reports</a>.</p>
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

GOTRA Public Ledger is a public-safe research ledger and production-report surface.
It is research information only. It is not investment advice, not a trading signal, not live trading, not performance proof, and not science/public proof.

## Primary reader routes

- https://gotra.me/today - Daily Research Brief. Reader-first Full Analyst research brief with agent analysis items, red-team review, risk factors, internal Alaya readback, known data gaps, and next watch points.
- https://gotra.me/guide - Guide. Seven-step reading order, daily system flow, report type labels, glossary, internal Alaya boundary, and evidence boundaries.
- https://gotra.me/reports - Production Daily Reports. Live production/status artifacts for HK morning, HK evening, US morning, US evening, global summary, and Full Analyst Canary.
- https://gotra.me/notes - Transparency Articles. Static article archive, not latest production daily reports.
- https://gotra.me/ledger - Frozen Demo Ledger. snapshot_date=2026-06-20 demo snapshot, not current production.
- https://gotra.me/performance - Performance Notes. No production performance tracking yet; paper portfolio is a future-dated demo fixture.
- https://gotra.me/sources - Sources and Artifacts. Splits live production artifacts from static demo/archive artifacts.
- https://gotra.me/system - System Overview. Draft research-cognition operating contract and evidence boundaries.
- https://gotra.me/methodology - Methodology. Universe, resolver, paper portfolio, and data-boundary method notes.

## Public artifacts

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

  injectHomepage(summary);

  const generated = [];
  const corePages = [
    ["/today", todayPage(source)],
    ["/guide", guidePage()],
    ["/ledger", ledgerPage(ledger, summary)],
    ["/reports", reportsPage(source)],
    ["/reports/latest", latestReportPage(source)],
    ["/performance", performancePage(portfolio)],
    ["/system", systemPage(summary, manifest)],
    ["/methodology", methodologyPage(summary)],
    ["/claim-boundary", claimBoundaryPage()],
    ["/faq", faqPage(summary)],
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
    "/guide",
    "/ledger",
    "/reports",
    "/reports/latest",
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
