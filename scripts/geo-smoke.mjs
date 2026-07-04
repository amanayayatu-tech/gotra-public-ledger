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
    "/ledger",
    "/reports",
    "/reports/full-analyst/",
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
    "auditable AI stock-research public ledger",
    "v4 Ksana cognition flywheel",
    "K deep research dossier",
    "Knowledge Gate",
    "Audit Center",
    "research information only",
    "not investment advice",
    "not science/public proof",
  ];
  requiredPhrases.forEach((phrase) => assertIncludes(combinedCoreHtml, phrase, "core routes"));

  assertIncludes(pages.get("/"), "GOTRA Public Ledger 是一个可审计的 AI 股票研究公开账本", "/");
  assertIncludes(pages.get("/"), "v4 Ksana Cognition Flywheel", "/");
  assertIncludes(pages.get("/"), "K dossier first", "/");
  assertIncludes(pages.get("/"), "Research task", "/");
  assertIncludes(pages.get("/"), "Evidence packet", "/");
  assertIncludes(pages.get("/today"), "Daily Research Brief", "/today");
  assertIncludes(pages.get("/today"), "What to read first", "/today");
  assertIncludes(pages.get("/today"), "Symbol briefs", "/today");
  assertIncludes(pages.get("/today"), "v4 Ksana Cognition Flywheel", "/today");
  assertIncludes(pages.get("/today"), "Research task", "/today");
  assertIncludes(pages.get("/today"), "Evidence packet", "/today");
  assertIncludes(pages.get("/today"), "Knowledge Gate", "/today");
  assertIncludes(pages.get("/today"), "/reports/full-analyst/", "/today");
  assertIncludes(pages.get("/today"), "Raw artifact / Open JSON / Open Markdown", "/today");
  assertIncludes(pages.get("/why-gotra"), "Why GOTRA", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "GOTRA is not a signal machine", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "Why data_gap matters", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "Why needs_review matters", "/why-gotra");
  assertIncludes(pages.get("/why-gotra"), "Alaya means GOTRA-internal", "/why-gotra");
  assertIncludes(pages.get("/guide"), "How to Read GOTRA", "/guide");
  assertIncludes(pages.get("/guide"), "Seven-step reading order", "/guide");
  assertIncludes(pages.get("/guide"), "Daily system flow", "/guide");
  assertIncludes(pages.get("/guide"), "Trading signal", "/guide");
  assertIncludes(pages.get("/guide"), "Internal Alaya", "/guide");
  assertIncludes(pages.get("/guide"), "not performance proof", "/guide");
  assertIncludes(pages.get("/ledger"), "Frozen Demo Ledger", "/ledger");
  assertIncludes(pages.get("/ledger"), "not current production", "/ledger");
  assertIncludes(pages.get("/ledger"), "First 50 public ledger rows", "/ledger");
  assertIncludes(pages.get("/ledger"), "Raw artifact / Open JSON", "/ledger");
  assertIncludes(pages.get("/ledger"), "Open ledger.demo.json raw artifact", "/ledger");
  assertIncludes(pages.get("/ledger"), "Return to the productized ledger page", "/ledger");
  assertIncludes(pages.get("/reports"), "Audit Center", "/reports");
  assertIncludes(pages.get("/reports"), "Full Analyst v4", "/reports");
  assertIncludes(pages.get("/reports"), "Product reading surfaces", "/reports");
  assertIncludes(pages.get("/reports"), "v4 Ksana cognition flywheel and internal Alaya", "/reports");
  assertIncludes(pages.get("/reports"), "repo-internal cognition flywheel", "/reports");
  assertIncludes(pages.get("/reports"), "Raw artifact / Open JSON / Open Markdown", "/reports");
  if (manifest.source_report_status === "artifact_unavailable") {
    assertIncludes(pages.get("/reports"), "artifact_unavailable", "/reports");
  } else {
    assertNotIncludes(pages.get("/reports"), "artifact_unavailable", "/reports");
  }
  assertIncludes(pages.get("/reports/latest/"), "Coverage Report Reader", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "Readable highlights", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "v4 Ksana Cognition Flywheel", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), "Raw artifact / Open JSON / Open Markdown", "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), 'href="/reports/latest.md"', "/reports/latest/");
  assertIncludes(pages.get("/reports/latest/"), 'href="/reports/status.json"', "/reports/latest/");
  assertIncludes(pages.get("/reports/full-analyst/"), "Full Analyst Research Reader", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "Structured symbol research", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "Evidence packet", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "K deep research dossier", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "Knowledge Gate", "/reports/full-analyst/");
  assertIncludes(pages.get("/reports/full-analyst/"), "Raw artifact / Open JSON / Open Markdown", "/reports/full-analyst/");
  assertIncludes(pages.get("/performance"), "No production performance tracking yet", "/performance");
  assertIncludes(pages.get("/performance"), "demo fixture and future-dated sample", "/performance");
  assertIncludes(pages.get("/performance"), "not performance proof", "/performance");
  assertIncludes(pages.get("/methodology"), "K dossier before F/W/G", "/methodology");
  assertIncludes(pages.get("/methodology"), "Red Team is not Judge", "/methodology");
  assertIncludes(pages.get("/methodology"), "Knowledge Gate and Alaya", "/methodology");
  assertIncludes(pages.get("/claim-boundary"), "Not investment advice.", "/claim-boundary");
  assertIncludes(pages.get("/faq"), "FAQPage", "/faq");
  assertIncludes(pages.get("/sources"), "Manifest files", "/sources");
  assertIncludes(pages.get("/sources"), "Product reading surfaces", "/sources");
  assertIncludes(pages.get("/sources"), "Evidence packet source types", "/sources");
  assertIncludes(pages.get("/sources"), "Alaya means GOTRA internal", "/sources");
  assertIncludes(pages.get("/sources"), "Static demo/archive artifacts", "/sources");
  assertIncludes(pages.get("/sources"), "Raw artifact / Open JSON / Open Markdown", "/sources");
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
    "https://gotra.me/ledger",
    "https://gotra.me/reports",
    "https://gotra.me/reports/latest/",
    "https://gotra.me/reports/full-analyst/",
    "https://gotra.me/reports/latest.md",
    "https://gotra.me/reports/status.json",
    "https://gotra.me/reports/daily_reader_brief.json",
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
    "v4 Ksana cognition flywheel",
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
