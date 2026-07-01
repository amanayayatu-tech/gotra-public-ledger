import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
const seoHeadSource = fs.readFileSync(path.join(process.cwd(), "src/components/SeoHead.tsx"), "utf8");
const siteHeaderSource = fs.readFileSync(path.join(process.cwd(), "src/components/SiteHeader.tsx"), "utf8");
const geoGeneratorSource = fs.readFileSync(path.join(process.cwd(), "scripts/generate-geo-pages.mjs"), "utf8");
const geoSmokeSource = fs.readFileSync(path.join(process.cwd(), "scripts/geo-smoke.mjs"), "utf8");
const stylesSource = fs.readFileSync(path.join(process.cwd(), "src/styles.css"), "utf8");

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
    expect(appSource).toContain("一句话摘要");
    expect(appSource).toContain("英文原文 / English original");
    expect(appSource).toContain("Full Analyst 研究报告");
    expect(appSource).toContain("Agent 分析矩阵");
    expect(appSource).toContain("提示词 / 运行框架摘要");
    expect(appSource).toContain("GOTRA 内部 Alaya 认知飞轮");
    expect(appSource).toContain("今日重点");
    expect(appSource).toContain("观察清单");
    expect(appSource).toContain("已知缺口与风险");
    expect(appSource).toContain("研究过程效果");
    expect(appSource).toContain("下一步观察");
    expect(appSource).toContain("生产日报审计");
  });

  it("adds a first-level bilingual guide with reading order, system flow, glossary, and report type labels", () => {
    expect(appSource).toContain("function GuidePage({ language }");
    expect(appSource).toContain("使用指南");
    expect(appSource).toContain("七步阅读顺序");
    expect(appSource).toContain("每日系统流");
    expect(appSource).toContain("报告类型怎么分");
    expect(appSource).toContain("关键术语");
    expect(appSource).toContain("不要把这些层级混起来");
    expect(appSource).toContain("Full Analyst 是 candidate/canary");
    expect(appSource).toContain("内部 Alaya 不是外部服务");
    expect(appSource).toContain("route.name === \"guide\"");
    expect(appSource).toContain("先看使用指南");
    expect(siteHeaderSource).toContain("id: \"guide\"");
    expect(siteHeaderSource).toContain("zh: \"使用指南\"");
    expect(siteHeaderSource).toContain("en: \"Guide\"");
  });

  it("keeps the guide source contract explicit for all required reading and glossary terms", () => {
    const guideSource = fs.readFileSync(path.join(process.cwd(), "src/data/guide.ts"), "utf8");
    ["/today", "Full Analyst 研究报告", "/reports", "/sources", "/ledger", "/performance", "/methodology"].forEach((phrase) => {
      expect(guideSource).toContain(phrase);
    });
    [
      "Daily Brief",
      "Full Analyst",
      "Canary",
      "Agent matrix",
      "Red-team",
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
      expect(guideSource).toContain(term);
    });
    expect(guideSource).toContain("latest.md");
    expect(guideSource).toContain("Coverage daily alias");
    expect(guideSource).toContain("GOTRA repo internal cognition flywheel");
    expect(guideSource).not.toContain("ALAYA_BASE_URL");
    expect(guideSource).not.toContain("ALAYA_WRITE_PATH");
  });

  it("labels the ledger and performance pages as demo or non-production surfaces", () => {
    expect(appSource).toContain("冻结 Demo 账本");
    expect(appSource).toContain("不是最新生产日报");
    expect(appSource).toContain("暂无生产表现跟踪");
    expect(appSource).toContain("演示夹具样本");
    expect(appSource).toContain("未来日期样本");
  });

  it("separates live production artifacts from static demo/archive artifacts on sources", () => {
    expect(appSource).toContain("生产公开产物");
    expect(appSource).toContain("静态演示 / 归档产物");
    expect(appSource).toContain("data/ledger.demo.json");
    expect(appSource).toContain("data/paper-portfolio.latest.json");
    expect(appSource).toContain("content/articles/index.json");
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
    expect(geoGeneratorSource).toContain("function guidePage");
    expect(geoGeneratorSource).toContain('"/today"');
    expect(geoGeneratorSource).toContain('"/guide"');
    expect(geoGeneratorSource).toContain("daily_reader_brief.json");
    expect(geoGeneratorSource).toContain("Seven-step reading order");
    expect(geoGeneratorSource).toContain("guideGlossaryRows");
    expect(geoGeneratorSource).toContain("Agent analysis matrix");
    expect(geoGeneratorSource).toContain("GOTRA internal Alaya cognition flywheel");
    expect(geoGeneratorSource).toContain('"/performance"');
    expect(geoGeneratorSource).toContain("function llmsTxt");
    expect(geoGeneratorSource).toContain("Live production artifacts");
    expect(geoGeneratorSource).toContain("Static demo/archive artifacts");
    expect(geoSmokeSource).toContain('readDist("llms.txt")');
    expect(geoSmokeSource).toContain("https://gotra.me/today");
    expect(geoSmokeSource).toContain("https://gotra.me/guide");
    expect(geoSmokeSource).toContain("daily_reader_brief.json");
    expect(geoSmokeSource).toContain("https://gotra.me/performance");
  });

  it("does not uppercase mixed-case internal Alaya labels in the Full Analyst panel", () => {
    expect(stylesSource).toContain(".full-analyst-pilot-grid span");
    expect(stylesSource).toContain(".full-analyst-monitor-grid span");
    expect(stylesSource).toContain("text-transform: none");
  });
});
