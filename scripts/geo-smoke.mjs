/* global console, process */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const distRoot = path.join(repoRoot, "dist");

function fail(message, details = undefined) {
  console.error(message);
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function readDist(relativePath) {
  const filePath = path.join(distRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`Missing dist artifact: ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(text, phrase, label) {
  if (!text.includes(phrase)) {
    fail(`Missing GEO smoke phrase in ${label}: ${phrase}`);
  }
}

function assertNotIncludes(text, phrase, label) {
  if (text.includes(phrase)) {
    fail(`Forbidden GEO smoke phrase in ${label}: ${phrase}`);
  }
}

function countTableRows(html) {
  return (html.match(/<tr>/g) ?? []).length - 1;
}

function routeFile(route) {
  if (route === "/") {
    return "index.html";
  }
  return `${route.replace(/^\//, "")}/index.html`;
}

function loadManifest() {
  const manifestPath = path.join(distRoot, "geo-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fail("Missing dist/geo-manifest.json. Run npm run geo:generate first.");
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function main() {
  if (!fs.existsSync(distRoot)) {
    fail("dist/ is missing. Run npm run build, then npm run geo:generate.");
  }

  const manifest = loadManifest();
  const requiredRoutes = [
    "/",
    "/today",
    "/why-gotra",
    "/guide",
    "/track-record",
    "/ledger",
    "/reports",
    "/reports/full-analyst/",
    "/audit/evidence/latest/",
    "/performance",
    "/methodology",
    "/claim-boundary",
    "/faq",
    "/sources",
    "/system",
    "/notes",
    "/reports/latest/",
  ];

  const pages = new Map();
  for (const route of requiredRoutes) {
    pages.set(route, readDist(routeFile(route)));
  }

  const combinedCoreHtml = [...pages.values()].join("\n");
  const requiredPhrases = [
    "auditable AI financial research publication ledger",
    "可审计 AI 金融研究发布账本",
    "K 深度研究底稿",
    "知识闸门",
    "Audit Center",
    "research information only",
    "not investment advice",
    "not science/public proof",
  ];
  requiredPhrases.forEach((phrase) => assertIncludes(combinedCoreHtml, phrase, "core routes"));

  assertIncludes(pages.get("/"), "GOTRA Public Ledger 是可审计 AI 金融研究发布账本", "/");
  assertIncludes(pages.get("/"), "内部 v4 研究链路术语保留在方法论和审计页面", "/");
  assertIncludes(pages.get("/today"), "Daily Research Brief", "/today");
  assertIncludes(pages.get("/today"), "今天先读什么", "/today");
  assertIncludes(pages.get("/today"), "单票研究摘要", "/today");
  assertIncludes(pages.get("/today"), "研究任务书（Research Task）", "/today");
  assertIncludes(pages.get("/today"), "研究任务书", "/today");
  assertIncludes(pages.get("/today"), "证据包", "/today");
  assertIncludes(pages.get("/today"), "内部 Alaya 回读", "/today");
  assertIncludes(pages.get("/today"), "/reports/full-analyst/", "/today");
  assertIncludes(pages.get("/today"), "原始审计产物", "/today");
  assertIncludes(pages.get("/why-gotra"), "为什么是 GOTRA", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "GOTRA 不是信号机器", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "为什么数据缺口", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "为什么需要复核", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "Alaya 只指 GOTRA 内部", "/why-gotra");
  assertIncludes(pages.get("/guide"), "如何阅读 GOTRA", "/guide");
  assertIncludes(pages.get("/guide"), "七步阅读顺序", "/guide");
  assertIncludes(pages.get("/guide"), "每日系统流", "/guide");
  assertIncludes(pages.get("/guide"), "交易信号", "/guide");
  assertIncludes(pages.get("/guide"), "内部 Alaya", "/guide");
  assertIncludes(pages.get("/guide"), "not performance proof", "/guide");
  assertIncludes(pages.get("/track-record"), "Public Track Record", "/track-record");
  assertIncludes(pages.get("/track-record"), "research_ledger.json", "/track-record");
  assertIncludes(pages.get("/track-record"), "PublicationDecision=publish", "/track-record");
  assertIncludes(pages.get("/track-record"), "不是投资建议", "/track-record");
  assertIncludes(pages.get("/ledger"), "Frozen Demo Ledger", "/ledger");
  assertIncludes(pages.get("/ledger"), "not current production", "/ledger");
  assertIncludes(pages.get("/ledger"), "First 50 public ledger rows", "/ledger");
  assertIncludes(pages.get("/ledger"), "Raw artifact / Open JSON", "/ledger");
  assertIncludes(pages.get("/ledger"), "Open ledger.demo.json raw artifact", "/ledger");
  assertIncludes(pages.get("/ledger"), "Return to the productized ledger page", "/ledger");
  assertIncludes(pages.get("/reports"), "审计中心", "/reports");
  assertIncludes(pages.get("/reports"), "Full Analyst v4", "/reports");
  assertIncludes(pages.get("/reports"), "产品化阅读入口", "/reports");
  assertIncludes(pages.get("/reports"), "v4 Ksana 认知飞轮与内部 Alaya", "/reports");
  assertIncludes(pages.get("/reports"), "repo 内部 cognition flywheel", "/reports");
  assertIncludes(pages.get("/reports"), "原始审计产物", "/reports");
  if (manifest.source_report_status === "artifact_unavailable") {
    assertIncludes(pages.get("/reports"), "artifact_unavailable", "/reports");
  } else {
    assertNotIncludes(pages.get("/reports"), "artifact_unavailable", "/reports");
  }
  assertIncludes(pages.get("/reports/latest/"), "行情覆盖日报阅读器", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "可读重点", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "研究任务书", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "原始审计产物", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), 'href="/reports/latest.md"', "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), 'href="/reports/status.json"', "/reports/latest/");
  assertIncludes(pages.get("/reports/full-analyst/"), "完整研究链路阅读器", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "结构化单票研究", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "证据包", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "K 深度研究", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "内部 Alaya 回读", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "原始审计产物", "/reports/full-analyst/");
  assertIncludes(pages.get("/audit/evidence/latest/"), "证据包审计摘要", "/audit/evidence/latest/");
  assertIncludes(pages.get("/audit/evidence/latest/"), "Stage 4 schema 检查项", "/audit/evidence/latest/");
  assertIncludes(pages.get("/audit/evidence/latest/"), "future_data_check=false", "/audit/evidence/latest/");
  assertIncludes(pages.get("/audit/evidence/latest/"), "retrieved_at", "/audit/evidence/latest/");
  assertIncludes(pages.get("/performance"), "No production performance tracking yet", "/performance");
  assertIncludes(pages.get("/performance"), "demo fixture and future-dated sample", "/performance");
  assertIncludes(pages.get("/performance"), "not performance proof", "/performance");
  assertIncludes(pages.get("/methodology"), "K 深度研究底稿先于 F/W/G", "/methodology");
  assertIncludes(pages.get("/methodology"), "红队不是 Judge", "/methodology");
  assertIncludes(pages.get("/methodology"), "知识闸门与内部 Alaya", "/methodology");
  assertIncludes(pages.get("/claim-boundary"), "不是投资建议。", "/claim-boundary");
  assertIncludes(pages.get("/faq"), "FAQPage", "/faq");
  assertIncludes(pages.get("/sources"), "Manifest 文件", "/sources");
  assertIncludes(pages.get("/sources"), "产品化阅读入口", "/sources");
  assertIncludes(pages.get("/sources"), "证据包来源类型", "/sources");
  assertIncludes(pages.get("/sources"), "原型期数据源用途与授权边界", "/sources");
  assertIncludes(pages.get("/sources"), "SEC EDGAR 必须使用合规 User-Agent", "/sources");
  assertIncludes(pages.get("/sources"), "Yahoo chart via GOTRA price_cache", "/sources");
  assertIncludes(pages.get("/sources"), "Alaya 只指 GOTRA 内部", "/sources");
  assertIncludes(pages.get("/sources"), "静态 demo / 归档产物", "/sources");
  assertIncludes(pages.get("/sources"), "原始审计产物", "/sources");
  assertIncludes(pages.get("/system"), "Evidence layers", "/system");
  assertIncludes(pages.get("/notes"), "Transparency Articles", "/notes");
  assertIncludes(pages.get("/notes"), "Static article archive", "/notes");

  const ledgerRows = countTableRows(pages.get("/ledger"));
  if (ledgerRows < 50) {
    fail("Ledger raw HTML table has fewer than 50 rows", { ledgerRows });
  }

  const counts = manifest.ledger_counts;
  if (
    counts.total_public_records !== 294 ||
    counts.resolved_records !== 48 ||
    counts.pending_records !== 6 ||
    counts.frozen_pending_records !== 240 ||
    counts.generated_table_row_count !== 50
  ) {
    fail("Unexpected GEO ledger counts", counts);
  }

  const sitemap = readDist("sitemap.xml");
  [
    "https://gotra.me/",
    "https://gotra.me/today",
    "https://gotra.me/why-gotra",
    "https://gotra.me/guide",
    "https://gotra.me/track-record",
    "https://gotra.me/ledger",
    "https://gotra.me/reports",
    "https://gotra.me/reports/latest/",
    "https://gotra.me/reports/full-analyst/",
    "https://gotra.me/audit/evidence/latest/",
    "https://gotra.me/reports/latest.md",
    "https://gotra.me/reports/status.json",
    "https://gotra.me/reports/daily_reader_brief.json",
    "https://gotra.me/reports/research_ledger.json",
    "https://gotra.me/performance",
    "https://gotra.me/methodology",
    "https://gotra.me/sources",
    "https://gotra.me/claim-boundary",
    "https://gotra.me/faq",
    "https://gotra.me/notes",
  ].forEach((url) => assertIncludes(sitemap, url, "sitemap.xml"));
  assertNotIncludes(sitemap, "#/", "sitemap.xml");
  assertNotIncludes(sitemap, "localhost", "sitemap.xml");
  assertNotIncludes(sitemap, "127.0.0.1", "sitemap.xml");
  assertNotIncludes(sitemap, ".codex-loop", "sitemap.xml");

  const robots = readDist("robots.txt");
  [
    "User-agent: OAI-SearchBot",
    "User-agent: GPTBot",
    "User-agent: ChatGPT-User",
    "User-agent: PerplexityBot",
    "User-agent: ClaudeBot",
    "User-agent: Claude-SearchBot",
    "User-agent: Claude-User",
    "User-agent: Googlebot",
    "User-agent: Google-Extended",
    "User-agent: CCBot",
    "Sitemap: https://gotra.me/sitemap.xml",
  ].forEach((phrase) => assertIncludes(robots, phrase, "robots.txt"));

  const llms = readDist("llms.txt");
  [
    "Audit Center",
    "Daily Research Brief",
    "Why GOTRA",
    "Full Analyst Research Reader",
    "Guide",
    "Transparency Articles",
    "Frozen Demo Ledger",
    "Performance Notes",
    "Sources and Artifacts",
    "可审计 AI 金融研究发布账本",
    "Knowledge Gate",
    "not investment advice",
    "not a trading signal",
    "not performance proof",
  ].forEach((phrase) => assertIncludes(llms, phrase, "llms.txt"));

  const reportStatus = JSON.parse(readDist("reports/status.json"));
  if (manifest.source_report_status === "artifact_unavailable" && reportStatus.status !== "artifact_unavailable") {
    fail("Report placeholder status must remain explicit when source artifacts are missing", reportStatus);
  }

  const forbiddenInstructionPhrases = [
    "suggests buying",
    "suggests selling",
    "buy this stock",
    "sell this stock",
    "hold this stock",
    "position size",
  ];
  forbiddenInstructionPhrases.forEach((phrase) => assertNotIncludes(combinedCoreHtml.toLowerCase(), phrase, "core routes"));

  console.log(
    `GEO smoke passed: routes=${requiredRoutes.length}, ledger_rows=${ledgerRows}, prediction_detail_pages=${counts.prediction_detail_pages}, report_source=${manifest.source_report_status}`,
  );
}

main();
