import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
const seoHeadSource = fs.readFileSync(path.join(process.cwd(), "src/components/SeoHead.tsx"), "utf8");
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
    expect(appSource).toContain("今日重点");
    expect(appSource).toContain("观察清单");
    expect(appSource).toContain("已知缺口与风险");
    expect(appSource).toContain("研究过程效果");
    expect(appSource).toContain("下一步观察");
    expect(appSource).toContain("生产日报审计");
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
    expect(seoHeadSource).toContain("known data gaps");
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
    expect(geoGeneratorSource).toContain('"/today"');
    expect(geoGeneratorSource).toContain("daily_reader_brief.json");
    expect(geoGeneratorSource).toContain('"/performance"');
    expect(geoGeneratorSource).toContain("function llmsTxt");
    expect(geoGeneratorSource).toContain("Live production artifacts");
    expect(geoGeneratorSource).toContain("Static demo/archive artifacts");
    expect(geoSmokeSource).toContain('readDist("llms.txt")');
    expect(geoSmokeSource).toContain("https://gotra.me/today");
    expect(geoSmokeSource).toContain("daily_reader_brief.json");
    expect(geoSmokeSource).toContain("https://gotra.me/performance");
  });

  it("does not uppercase mixed-case internal Alaya labels in the Full Analyst panel", () => {
    expect(stylesSource).toContain(".full-analyst-pilot-grid span");
    expect(stylesSource).toContain(".full-analyst-monitor-grid span");
    expect(stylesSource).toContain("text-transform: none");
  });
});
