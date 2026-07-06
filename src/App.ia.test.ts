import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
const seoHeadSource = fs.readFileSync(path.join(process.cwd(), "src/components/SeoHead.tsx"), "utf8");
const siteHeaderSource = fs.readFileSync(path.join(process.cwd(), "src/components/SiteHeader.tsx"), "utf8");
const boundaryPanelSource = fs.readFileSync(path.join(process.cwd(), "src/components/BoundaryPanel.tsx"), "utf8");
const termTipSource = fs.readFileSync(path.join(process.cwd(), "src/components/TermTip.tsx"), "utf8");
const geoGeneratorSource = fs.readFileSync(path.join(process.cwd(), "scripts/generate-geo-pages.mjs"), "utf8");
const geoSmokeSource = fs.readFileSync(path.join(process.cwd(), "scripts/geo-smoke.mjs"), "utf8");
const stylesSource = fs.readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");
const guideSource = fs.readFileSync(path.join(process.cwd(), "src/data/guide.ts"), "utf8");
const glossarySource = fs.readFileSync(path.join(process.cwd(), "src/data/glossary.ts"), "utf8");
const dataSourcesSource = fs.readFileSync(path.join(process.cwd(), "src/data/dataSources.ts"), "utf8");

describe("public ledger information architecture contract", () => {
  it("keeps notes as a transparency article archive instead of a production report entry", () => {
    expect(appSource).toContain("function NotesPage({ language }");
    expect(appSource).toContain("透明度文章");
    expect(appSource).toContain("静态文章归档");
    expect(appSource).toContain("阅读今日简报");
    expect(appSource).not.toContain("LiveProductionBriefs");
  });

  it("adds a reader-first daily brief entrypoint separate from production audit details", () => {
    expect(appSource).toContain("function TodayPage({ state, language }");
    expect(appSource).toContain("今日研究简报");
    expect(appSource).toContain("今天先读什么");
    expect(appSource).toContain("英文原文 / English original");
    expect(appSource).toContain("完整研究链路阅读器");
    expect(appSource).toContain("今天研究链路分析了什么");
    expect(appSource).toContain("提示词 / 运行框架摘要");
    expect(appSource).toContain("GOTRA 内部 Alaya 认知飞轮");
    expect(appSource).toContain("今日重点");
    expect(appSource).toContain("今日运行概览");
    expect(appSource).toContain("复盘到期项");
    expect(appSource).toContain("打开公开账本");
    expect(appSource).toContain("观察清单");
    expect(appSource).toContain("已知缺口与风险");
    expect(appSource).toContain("研究过程效果");
    expect(appSource).toContain("下一步观察");
    expect(appSource).toContain("生产日报审计");
    expect(appSource).toContain("Raw artifact / Open JSON / Open Markdown");
    expect(appSource).toContain("function WhyGotraPage");
    expect(appSource).toContain("function FullAnalystReaderPage");
    expect(appSource).toContain("独立 agent 调用");
    expect(appSource).toContain("Agent 状态");
    expect(appSource).toContain("Agent 耗时");
    expect(appSource).toContain("独立输出 hash");
  });

  it("adds a first-level bilingual guide with reading order, system flow, glossary, and report type labels", () => {
    expect(appSource).toContain("function GuidePage({ language }");
    expect(appSource).toContain("使用指南");
    expect(appSource).toContain("七步阅读顺序");
    expect(appSource).toContain("每日系统流");
    expect(appSource).toContain("报告类型怎么分");
    expect(appSource).toContain("关键术语");
    expect(appSource).toContain("不要把这些层级混起来");
    expect(guideSource).toContain("K Deep Research Dossier");
    expect(guideSource).toContain("Research Quality Gate + Knowledge Gate");
    expect(appSource).toContain("内部 Alaya 不是外部服务");
    expect(appSource).toContain("route.name === \"guide\"");
    expect(appSource).toContain("先看使用指南");
    expect(siteHeaderSource).toContain("id: \"guide\"");
    expect(siteHeaderSource).toContain("zh: \"使用指南\"");
    expect(siteHeaderSource).toContain("en: \"Guide\"");
  });

  it("keeps the guide source contract explicit for all required reading and glossary terms", () => {
    ["/today", "/why-gotra", "Full Analyst 研究阅读器", "/reports/full-analyst", "/reports", "/sources", "/methodology"].forEach((phrase) => {
      expect(guideSource).toContain(phrase);
    });
    expect(guideSource).not.toContain('route: "/ledger"');
    expect(guideSource).not.toContain('route: "/performance"');
    [
      "Daily Brief",
      "Full Analyst",
      "K dossier",
      "Perspective agents",
      "Red-team",
      "Knowledge Gate",
      "Risk factors",
      "Watch items",
      "Data gap",
      "Judge gate",
      "Public-safe",
      "Evidence layer",
      "Demo Ledger",
      "Performance proof",
      "Science/public proof",
      "Trading signal",
    ].forEach((term) => {
      expect(glossarySource).toContain(term);
    });
    expect(glossarySource).toContain("先行试跑 / 小范围观察");
    expect(glossarySource).toContain("系统记忆回读 / 内部知识状态回读");
    expect(guideSource).toContain("/reports/latest/");
    expect(guideSource).toContain("Coverage report reader");
    expect(glossarySource).toContain("GOTRA repo 内部 cognition flywheel");
    expect(guideSource).not.toContain("ALAYA" + "_BASE_URL");
    expect(guideSource).not.toContain("ALAYA" + "_WRITE_PATH");
  });

  it("labels the ledger and performance pages as demo or non-production surfaces", () => {
    expect(appSource).toContain("冻结 Demo 账本");
    expect(appSource).toContain("不是最新生产日报");
    expect(appSource).toContain("暂无生产表现跟踪");
    expect(appSource).toContain("演示夹具样本");
    expect(appSource).toContain("未来日期样本");
  });

  it("adds a live track-record route separate from the frozen demo ledger", () => {
    expect(appSource).toContain("function TrackRecordPage");
    expect(appSource).toContain("research_ledger.json");
    expect(appSource).toContain("PublicationDecision=publish");
    expect(appSource).toContain("不会回退到冻结 Demo 账本");
    expect(appSource).toContain("route.name === \"trackRecord\"");
    expect(appSource).toContain("route.name === \"trackRecordEntry\"");
    expect(siteHeaderSource).toContain("id: \"track-record\"");
    expect(siteHeaderSource).toContain("zh: \"公开账本\"");
  });

  it("adds a beta readiness route that is explicitly not started", () => {
    expect(appSource).toContain("function BetaReadinessPage");
    expect(appSource).toContain("30 天公开 beta 准备区");
    expect(appSource).toContain("BETA_READY_NOT_STARTED");
    expect(appSource).toContain("beta_clock_started=false");
    expect(appSource).toContain("Stage 15B 30 天公开 beta");
    expect(appSource).toContain("route.name === \"beta\"");
    expect(siteHeaderSource).toContain("id: \"beta\"");
    expect(siteHeaderSource).toContain("zh: \"Beta 准备\"");
  });

  it("adds monthly transparency report routes with errors, gaps, and improvements visible", () => {
    expect(appSource).toContain("function MonthlyReportsPage");
    expect(appSource).toContain("function MonthlyReportDetailPage");
    expect(appSource).toContain("monthly_transparency_reports.json");
    expect(appSource).toContain("错误案例");
    expect(appSource).toContain("数据缺口");
    expect(appSource).toContain("改进事项");
    expect(appSource).toContain("route.name === \"monthlyReports\"");
    expect(appSource).toContain("route.name === \"monthlyReportDetail\"");
    expect(siteHeaderSource).toContain("id: \"monthly-reports\"");
  });

  it("adds reader-first symbol profile pages without fabricating ledger history", () => {
    expect(appSource).toContain("function SymbolProfilePage");
    expect(appSource).toContain("route.name === \"symbolProfile\"");
    expect(appSource).toContain("symbolProfileRouteHref(item.symbol)");
    expect(appSource).toContain("历史判断与观点变化");
    expect(appSource).toContain("不会回退到冻结 Demo");
    expect(appSource).toContain("复盘引擎支持 1/7/30/90 天窗口");
    expect(appSource).toContain("ReviewResult");
    expect(appSource).toContain("reviewUnavailableSummary");
    expect(geoGeneratorSource).toContain("function symbolProfilePage");
    expect(geoGeneratorSource).toContain("symbolRoutePath");
    expect(geoGeneratorSource).toContain("不会回退到冻结 Demo 账本");
    expect(geoSmokeSource).toContain("symbolRoute");
    expect(geoSmokeSource).toContain("个股档案");
  });

  it("keeps methodology boundary copy bilingual instead of fixed Chinese", () => {
    expect(appSource).toContain("<BoundaryPanel metadata={dataset.metadata} language={language} />");
    expect(boundaryPanelSource).toContain("language: Language");
    expect(boundaryPanelSource).toContain("The limits are stated up front");
    expect(boundaryPanelSource).toContain("These are public-safe demo readings, not OOS validation.");
    expect(boundaryPanelSource).toContain("Full claim-boundary labels come from the current metadata:");
    expect(termTipSource).toContain("englishLabelMap");
    expect(termTipSource).toContain("Expected change %");
  });

  it("separates live production artifacts from static demo/archive artifacts on sources", () => {
    expect(appSource).toContain("生产公开产物");
    expect(appSource).toContain("静态演示 / 归档产物");
    expect(appSource).toContain("function DataSourcePolicyPanel");
    expect(appSource).toContain("免费数据源分层");
    expect(appSource).toContain("价格源 priority chain");
    expect(appSource).toContain("data/ledger.demo.json");
    expect(appSource).toContain("data/paper-portfolio.latest.json");
    expect(appSource).toContain("content/articles/index.json");
    expect(dataSourcesSource).toContain("yahoo_chart_api_via_gotra_price_cache");
    expect(dataSourcesSource).toContain("SEC EDGAR filings and CompanyFacts");
    expect(dataSourcesSource).toContain("FRED macroeconomic data");
    expect(dataSourcesSource).toContain("HKEXnews issuer announcements");
    expect(dataSourcesSource).toContain("not a licensed realtime market-data feed");
  });

  it("defines route-specific GEO metadata for primary production, archive, demo, and fixture routes", () => {
    expect(seoHeadSource).toContain("Production Daily Reports");
    expect(seoHeadSource).toContain("GOTRA Daily Research Brief");
    expect(seoHeadSource).toContain("GOTRA Guide");
    expect(seoHeadSource).toContain("agent analysis matrix");
    expect(seoHeadSource).toContain("internal Alaya readback");
    expect(seoHeadSource).toContain("Transparency Articles");
    expect(seoHeadSource).toContain("Frozen Demo Ledger");
    expect(seoHeadSource).toContain("Performance Notes");
    expect(seoHeadSource).toContain("Sources and Artifacts");
    expect(seoHeadSource).toContain("not performance proof");
    expect(seoHeadSource).toContain("not science/public proof");
  });

  it("keeps generated GEO pages discoverable without relying only on hash routes", () => {
    expect(geoGeneratorSource).toContain("function performancePage");
    expect(geoGeneratorSource).toContain("function todayPage");
    expect(geoGeneratorSource).toContain("function whyGotraPage");
    expect(geoGeneratorSource).toContain("function fullAnalystReportPage");
    expect(geoGeneratorSource).toContain("function evidencePacketAuditPage");
    expect(geoGeneratorSource).toContain("function guidePage");
    expect(geoGeneratorSource).toContain('"/today"');
    expect(geoGeneratorSource).toContain('"/why-gotra"');
    expect(geoGeneratorSource).toContain('"/reports/full-analyst/"');
    expect(geoGeneratorSource).toContain('"/audit/evidence/latest/"');
    expect(geoGeneratorSource).toContain('"/guide"');
    expect(geoGeneratorSource).toContain("daily_reader_brief.json");
    expect(geoGeneratorSource).toContain("七步阅读顺序");
    expect(geoGeneratorSource).toContain("guideGlossaryRows");
    expect(geoGeneratorSource).toContain("单票研究摘要");
    expect(geoGeneratorSource).toContain("agent 状态");
    expect(geoGeneratorSource).toContain("独立 hash");
    expect(geoGeneratorSource).toContain("Alaya 只指 GOTRA repo 内部 cognition flywheel");
    expect(geoGeneratorSource).toContain('"/performance"');
    expect(geoGeneratorSource).toContain("function llmsTxt");
    expect(geoGeneratorSource).toContain("产品化阅读入口");
    expect(geoGeneratorSource).toContain("原型期数据源用途与授权边界");
    expect(geoGeneratorSource).toContain("SEC EDGAR 必须使用合规 User-Agent");
    expect(geoGeneratorSource).toContain("Stage 4 schema 检查项");
    expect(geoGeneratorSource).toContain("future_data_check=false");
    expect(geoGeneratorSource).toContain("静态 demo / 归档产物");
    expect(appSource).toContain("结构化研究信号");
    expect(appSource).toContain("ResearchSignal hashes");
    expect(appSource).toContain("复盘窗口");
    expect(geoSmokeSource).toContain('readDist("llms.txt")');
    expect(geoSmokeSource).toContain("https://gotra.me/today");
    expect(geoSmokeSource).toContain("https://gotra.me/audit/evidence/latest/");
    expect(geoSmokeSource).toContain("https://gotra.me/guide");
    expect(geoSmokeSource).toContain("daily_reader_brief.json");
    expect(geoSmokeSource).toContain("https://gotra.me/performance");
  });

  it("does not uppercase mixed-case internal Alaya labels in the Full Analyst panel", () => {
    expect(stylesSource).toContain(".full-analyst-pilot-grid span");
    expect(stylesSource).toContain(".full-analyst-monitor-grid span");
    expect(stylesSource).toContain("text-transform: none");
  });

  it("keeps reader-facing Chinese terminology away from the literal canary translation", () => {
    expect(appSource).not.toContain("金丝雀");
    expect(geoGeneratorSource).not.toContain("金丝雀");
    expect(glossarySource).not.toContain("金丝雀");
  });
});
