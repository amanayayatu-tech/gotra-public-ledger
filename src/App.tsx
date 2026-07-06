import { Suspense, lazy, type Ref, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  Database,
  FileText,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AnalyticsProvider, trackEvent } from "./analytics";
import { Hero } from "./components/Hero";
import { LedgerTable, type SortKey, type SortState } from "./components/LedgerTable";
import { DailyDeskSnapshot, type DailyDeskSnapshotState } from "./components/reports/DailyDeskSnapshot";
import {
  REPORT_SCHEDULES,
  buildReportDeskArtifacts,
  normalizeFullAnalystMonitorStatus,
  normalizeFullAnalystPilotStatus,
  normalizeReportStatus,
  type FullAnalystMonitorStatus,
  type FullAnalystPilotStatus,
  type NormalizedReportStatus,
  type ReportDeskArtifacts,
  type ReportRawStatus,
  type ReportStatusFileResult,
} from "./components/reports/ReportStatusModel";
import { SeoHead } from "./components/SeoHead";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { Subscribe } from "./components/Subscribe";
import { StatusExplanationCard } from "./components/StatusExplanation";
import { buildTickerList } from "./data/cognition";
import { contentIndex, contentItems, findContentItem } from "./data/content";
import { dataSourcePolicies, dataSourceText } from "./data/dataSources";
import type { DailyReaderBrief, DailyReaderBriefAgentAnalysisItem } from "./data/dailyReaderBrief";
import {
  guideGlossary,
  guideReadingOrder,
  guideReportTypes,
  guideSystemFlow,
  type BilingualText,
} from "./data/guide";
import {
  fixtureIsFutureDated,
  loadLiveReportsSnapshot,
  type LiveReportEntry,
  type LiveReportsSnapshot,
} from "./data/liveReports";
import {
  loadResearchLedgerManifest,
  researchLedgerReviewResult,
  researchLedgerReviewStatus,
  researchLedgerReviewUnavailable,
  researchLedgerStatuses,
  researchLedgerSymbols,
  researchLedgerWindows,
  type ResearchLedgerEntry,
  type ResearchLedgerLoadState,
  type ResearchReviewResult,
  type ResearchReviewUnavailableReason,
} from "./data/researchLedger";
import {
  loadMonthlyTransparencyReport,
  loadMonthlyTransparencyReportIndex,
  monthlyReportFileForMonth,
  type MonthlyReportDetailLoadState,
  type MonthlyReportsLoadState,
  type MonthlyTransparencyReport,
  type MonthlyTransparencyReportSummary,
} from "./data/monthlyReports";
import {
  computeSummary,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  toRecordView,
  type LedgerStatus,
  type RecordView,
} from "./data/metrics";
import { latestPaperPortfolioSnapshot } from "./data/portfolio";
import type { ContentItem, PaperPortfolioSnapshot } from "./data/publicContract";
import { loadLedgerDataset, type LedgerDataset } from "./data/schema";
import { executionModelExplanation, researchStatusLabel, termLabel, termTitle } from "./data/terminology";
import {
  boundarySentence,
  artifactStatusText,
  contentTypeText,
  copy,
  layerText,
  pickLocalized,
  readStoredLanguage,
  runtimeStatusText,
  statusText,
  writeStoredLanguage,
  type LocalizedText,
  type Language,
} from "./i18n/language";
import { evidencePacketRouteHref, monthlyReportRouteHref, noteRouteHref, parseBrowserRoute, parseHashRoute, predictionRouteHref, routeHref, symbolProfileRouteHref, trackRecordEntryRouteHref, type AppRoute } from "./routes/hashRouter";

const CognitionDashboard = lazy(() =>
  import("./components/CognitionDashboard").then((module) => ({ default: module.CognitionDashboard })),
);
const AnalystDesk = lazy(() => import("./components/reports/AnalystDesk").then((module) => ({ default: module.AnalystDesk })));
const BoundaryPanel = lazy(() => import("./components/BoundaryPanel").then((module) => ({ default: module.BoundaryPanel })));
const CredibilityDashboard = lazy(() =>
  import("./components/CredibilityDashboard").then((module) => ({ default: module.CredibilityDashboard })),
);
const HowItWorks = lazy(() => import("./components/HowItWorks").then((module) => ({ default: module.HowItWorks })));
const TrustStrip = lazy(() => import("./components/TrustStrip").then((module) => ({ default: module.TrustStrip })));

type StatusFilter = "all" | LedgerStatus;
type DirectionFilter = "all" | RecordView["direction"];

type ReportDeskLoadState =
  | { kind: "loading" }
  | ({
      kind: "ready";
      lastFetchedAt: string;
      marketStatuses: ReportStatusFileResult[];
      fullAnalystMonitor: FullAnalystMonitorStatus | null;
      fullAnalystMonitorError: string | null;
      fullAnalystPilot: FullAnalystPilotStatus | null;
      fullAnalystPilotError: string | null;
    } & ReportDeskArtifacts);

type LiveReportsLoadState =
  | { kind: "loading" }
  | { kind: "ready"; snapshot: LiveReportsSnapshot }
  | { kind: "error"; message: string };

type DailyReaderBriefLoadState =
  | { kind: "loading" }
  | { kind: "ready"; brief: DailyReaderBrief; source: "artifact" | "fallback"; fallbackReason: string | null }
  | { kind: "error"; message: string };

function compareRecord(a: RecordView, b: RecordView, key: SortKey): number {
  const left = a[key];
  const right = b[key];

  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return -1;
  }
  if (right === null) {
    return 1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "en");
}

function LedgerLoadingSkeleton() {
  return (
    <main className="loading-screen" aria-busy="true" aria-label="Loading ledger demo data">
      <div className="loading-shell">
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
        <div className="skeleton-grid" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <span>Loading ledger.demo.json</span>
    </main>
  );
}

function HomeLoadingHero({ language }: { language: Language }) {
  return (
    <>
      <section className="hero-section home-loading-hero" aria-labelledby="home-loading-title" aria-busy="true">
        <div className="hero-copy">
          <div className="hero-boundary-note">
            <ShieldCheck aria-hidden="true" size={16} />
            {copy(language, "研究信息 · 非投资建议 · 非交易信号", "Research information · not advice · not a trading signal")}
          </div>
          <p className="hero-brand-motif">
            {copy(language, "可审计 AI 金融研究发布账本 · 研究信息", "Auditable AI financial research ledger · research only")}
          </p>
          <h1 id="home-loading-title" className="hero-title">
            {language === "zh" ? (
              <>
                可审计 AI 金融研究发布账本
              </>
            ) : (
              "Auditable AI financial research publication ledger"
            )}
          </h1>
          <p>
            {copy(
              language,
              "正在读取今日研究简报、公开证据、数据缺口、复核项和审计记录。内部研究链路会保留在方法论和审计页，不作为首页首屏门槛。",
              "Loading today's research brief, public evidence, data gaps, review items, and audit records. Internal research-chain terms stay in Methodology and Audit instead of becoming the homepage entry barrier.",
            )}
          </p>
        </div>
        <div className="hero-side home-loading-side" aria-hidden="true">
          <div className="loading-shell">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ChartLoadingSkeleton({ containerRef }: { containerRef?: Ref<HTMLElement> }) {
  return (
    <section
      className="ticker-workbench chart-skeleton"
      id="ledger-proof"
      aria-label="Loading cognition dashboard"
      ref={containerRef}
    >
      <div className="skeleton-line wide" />
      <div className="skeleton-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function routeActivePath(route: AppRoute): string {
  if (route.name === "prediction") {
    return "/ledger";
  }
  if (route.name === "trackRecordEntry") {
    return "/track-record";
  }
  if (route.name === "monthlyReportDetail") {
    return "/monthly-reports";
  }
  if (route.name === "note") {
    return "/notes";
  }
  if (route.name === "today") {
    return "/today";
  }
  if (route.name === "whyGotra") {
    return "/why-gotra";
  }
  if (route.name === "guide") {
    return "/guide";
  }
  if (route.name === "fullAnalystReport") {
    return "/reports/full-analyst";
  }
  if (route.name === "evidencePacketAudit") {
    return "/reports";
  }
  return route.path;
}

function routeRequiresLedgerDataset(route: AppRoute): boolean {
  return (
    route.name === "home" ||
    route.name === "ledger" ||
    route.name === "prediction" ||
    route.name === "performance" ||
    route.name === "methodology"
  );
}

function routeShouldLoadLedgerDataset(route: AppRoute): boolean {
  return routeRequiresLedgerDataset(route) || route.name === "sources" || route.name === "whyGotra" || route.name === "fullAnalystReport";
}

function PageIntro({
  eyebrow,
  title,
  body,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <section className="route-intro" aria-labelledby={`${eyebrow.replace(/\W+/g, "-")}-title`}>
      <div>
        <span className="section-index">{eyebrow}</span>
        <h1 id={`${eyebrow.replace(/\W+/g, "-")}-title`}>{title}</h1>
        <p>{body}</p>
      </div>
      <Icon aria-hidden="true" size={26} />
    </section>
  );
}

const dailyBriefVisual = "/images/productization/daily-brief-editorial-intelligence.webp";
const whyGotraVisual = "/images/productization/why-gotra-research-discipline.webp";

function readerTldr(value: string): string {
  return value
    .replace(/本简报不是投资建议或交易信号。?/g, "")
    .replace(/This brief is not investment advice or a trading signal\.?/gi, "")
    .replace(/\s+\/\s+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstLocalized(items: LocalizedText[], language: Language, fallback: string): string {
  const value = items.find((item) => pickLocalized(language, item).trim());
  return value ? pickLocalized(language, value) : fallback;
}

function ContextStatusExplainer({
  language,
  type,
}: {
  language: Language;
  type: "data_gap" | "needs_review" | "research_only";
}) {
  const content = {
    data_gap: {
      title: copy(language, "什么是数据缺口（data_gap）？", "What does data_gap mean?"),
      body: copy(
        language,
        "数据未覆盖完整时，GOTRA 不会硬编结论，也不会把 stale data 当作 current evidence。缺口会留下来，方便下一轮补证据。",
        "When coverage is incomplete, GOTRA does not invent a conclusion or treat stale data as current evidence. The gap stays visible so the next review knows what to verify.",
      ),
    },
    needs_review: {
      title: copy(language, "什么是需要复核（needs_review）？", "What does needs_review mean?"),
      body: copy(
        language,
        "needs_review 是质量控制：系统主动停下来，让薄弱假设、冲突来源或不充分证据进入复核，而不是包装成确定答案。",
        "needs_review is quality control: weak assumptions, source conflicts, or insufficient evidence are held for review instead of being packaged as a certain answer.",
      ),
    },
    research_only: {
      title: copy(language, "如何阅读研究内容（research-only）？", "How should research-only be read?"),
      body: copy(
        language,
        "把简报当作研究桌面：看变化、证据、正反两面和下一步观察。它帮助你形成自己的判断，不替你按交易按钮。",
        "Treat the brief as a research desk: read changes, evidence, both sides, and next watch items. It supports your own judgment; it does not press a trading button for you.",
      ),
    },
  }[type];

  return (
    <details className="context-explainer">
      <summary>{content.title}</summary>
      <p>{content.body}</p>
    </details>
  );
}

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReaderDateForLanguage(value: string, language: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: language === "zh" ? "2-digit" : "short",
    day: "2-digit",
  }).format(date);
}

function guideCopy(value: BilingualText, language: Language): string {
  return pickLocalized(language, value);
}

function hasMostlyEnglishText(value: string): boolean {
  const asciiLetters = (value.match(/[A-Za-z]/g) ?? []).length;
  const cjkLetters = (value.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return asciiLetters > 20 && asciiLetters > cjkLetters * 2;
}

function OriginalText({
  value,
  language,
  className = "",
}: {
  value: string | LocalizedText;
  language: Language;
  className?: string;
}) {
  const selected = pickLocalized(language, value);
  const isLocalized = typeof value !== "string";
  const showEnglishOriginal = (isLocalized && language === "zh" && !value.zh.trim() && Boolean(value.en.trim())) || (language === "zh" && hasMostlyEnglishText(selected));
  const showChineseOriginal = isLocalized && language === "en" && !value.en.trim() && Boolean(value.zh.trim());
  const label = showEnglishOriginal ? "英文原文 / English original" : showChineseOriginal ? "Chinese original / 中文原文" : null;
  return (
    <div className={className ? `original-text ${className}` : "original-text"}>
      {label ? <span className="original-label">{label}</span> : null}
      <p>{selected}</p>
    </div>
  );
}

function reportAssetPath(fileName: string): string {
  if (/^https?:\/\//i.test(fileName)) {
    return fileName;
  }
  const normalized = fileName.replace(/^\/+/, "").replace(/^reports\//, "");
  return `${import.meta.env.BASE_URL}reports/${normalized}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

function marketStatusFallbacks(error: string | null): ReportStatusFileResult[] {
  return REPORT_SCHEDULES.map((schedule) => ({
    mode: schedule.key,
    statusFile: schedule.statusFile,
    latestFile: schedule.latestFile,
    status: null,
    error,
  }));
}

async function fetchMarketReportStatuses(): Promise<ReportStatusFileResult[]> {
  const results = await Promise.allSettled(
    REPORT_SCHEDULES.map(async (schedule): Promise<ReportStatusFileResult> => {
      const raw = await fetchJson<ReportRawStatus>(reportAssetPath(schedule.statusFile));
      const status: NormalizedReportStatus = normalizeReportStatus(raw);
      return {
        mode: schedule.key,
        statusFile: schedule.statusFile,
        latestFile: schedule.latestFile,
        status,
        error: null,
      };
    }),
  );

  return results.map((result, index) => {
    const schedule = REPORT_SCHEDULES[index];
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      mode: schedule.key,
      statusFile: schedule.statusFile,
      latestFile: schedule.latestFile,
      status: null,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

function liveReportLabel(entry: LiveReportEntry, language: Language): string {
  return copy(language, entry.labelZh, entry.labelEn);
}

function formatLiveTimestamp(value: string | null, language: Language): string {
  if (!value) {
    return copy(language, "暂无时间", "No timestamp");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function LiveProductionStrip({ state, language }: { state: LiveReportsLoadState; language: Language }) {
  if (state.kind !== "ready") {
    return (
      <section className="live-production-strip" aria-label="Latest production reports">
        <strong>{copy(language, "最新生产报告状态", "Latest production report status")}</strong>
        <span>{state.kind === "loading" ? copy(language, "读取中", "Loading") : state.message}</span>
      </section>
    );
  }
  const entries = state.snapshot.fullAnalyst
    ? [...state.snapshot.daily, state.snapshot.fullAnalyst]
    : state.snapshot.daily;
  return (
    <section className="live-production-strip" aria-label="Latest production reports">
      <div>
        <strong>{copy(language, "最新生产报告状态", "Latest production report status")}</strong>
        <span>{copy(language, "账本/表现页下方数据是演示或夹具样本；生产运行状态看这里。", "Ledger/performance data below is demo; production runtime is shown here.")}</span>
      </div>
      <div className="live-strip-items">
        {entries.map((entry) => (
          <a href={entry.kind === "full-analyst" ? routeHref("/reports/full-analyst") : "/reports/latest/"} key={entry.id}>
            <span>{liveReportLabel(entry, language)}</span>
            <strong>{entry.asOfDate ?? "unknown"}</strong>
            <small>{runtimeStatusText(language, entry.runStatus)}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function LiveArtifactSources({ state, language }: { state: LiveReportsLoadState; language: Language }) {
  if (state.kind !== "ready") {
    return (
      <section className="route-panel live-sources-shell" aria-labelledby="live-sources-title">
        <h2 id="live-sources-title">{copy(language, "生产公开产物", "Live production artifacts")}</h2>
        <div className="edge-state-note" role="status">
          {state.kind === "loading" ? copy(language, "正在读取生产产物。", "Loading production artifacts.") : state.message}
        </div>
      </section>
    );
  }
  return (
    <section className="route-panel live-sources-shell" aria-labelledby="live-sources-title">
      <div className="section-heading compact">
        <span>{copy(language, "生产来源", "Live sources")}</span>
        <h2 id="live-sources-title">{copy(language, "生产公开产物", "Live production artifacts")}</h2>
        <p>
          {copy(
            language,
            "以下链接是生产公开产物；manifest 与 evidence index 仍保留为静态 demo/source manifest，不代表最新生产状态。",
            "These links are production public artifacts; manifest and evidence index remain static demo/source manifests and are not the latest production state.",
          )}
        </p>
      </div>
      <div className="related-prediction-list today-links">
        <a href={routeHref("/today")}>{copy(language, "今日简报 reader", "Daily brief reader")}</a>
        <a href={routeHref("/why-gotra")}>{copy(language, "为什么是 GOTRA", "Why GOTRA")}</a>
        <a href="/reports/latest/">{copy(language, "覆盖日报 reader", "Coverage report reader")}</a>
        <a href={routeHref("/reports/full-analyst")}>{copy(language, "Full Analyst reader", "Full Analyst reader")}</a>
      </div>
      <details className="audit-details raw-artifact-disclosure">
        <summary>{copy(language, "Raw artifact / Open JSON / Open Markdown", "Raw artifact / Open JSON / Open Markdown")}</summary>
        <p className="muted">
          {copy(
            language,
            "以下链接只用于 Evidence Center 审计；默认阅读请使用上方 reader。",
            "The links below are only for Evidence Center audit; use the readers above for default reading.",
          )}
        </p>
        <div className="live-artifact-table-wrap">
          <table className="live-artifact-table">
            <thead>
              <tr>
                <th>{copy(language, "产物", "Artifact")}</th>
                <th>{copy(language, "状态", "Status")}</th>
                <th>{copy(language, "统计日期", "As-of date")}</th>
                <th>{copy(language, "交易日", "Trading date")}</th>
                <th>{copy(language, "生成时间", "Generated time")}</th>
              </tr>
            </thead>
            <tbody>
              {state.snapshot.artifacts.map((artifact) => (
                <tr key={`${artifact.href}-${artifact.label}`}>
                  <td>
                    <a href={artifact.href}>{artifact.label}</a>
                  </td>
                  <td>{artifactStatusText(language, artifact.status)}</td>
                  <td>{artifact.asOfDate ?? "unknown"}</td>
                  <td>{artifact.tradingDate ?? "unknown"}</td>
                  <td>{formatLiveTimestamp(artifact.generatedAtUtc, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="live-artifact-mobile-cards" aria-label={copy(language, "移动端生产公开产物", "Mobile live production artifacts")}>
          {state.snapshot.artifacts.map((artifact) => (
            <article key={`${artifact.href}-${artifact.label}-mobile`}>
              <div>
                <span>{copy(language, "产物", "Artifact")}</span>
                <strong>{artifact.label}</strong>
              </div>
              <p>{artifactStatusText(language, artifact.status)}</p>
              <dl>
                <div>
                  <dt>{copy(language, "统计日期", "As-of")}</dt>
                  <dd>{artifact.asOfDate ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>{copy(language, "生成时间", "Generated")}</dt>
                  <dd>{formatLiveTimestamp(artifact.generatedAtUtc, language)}</dd>
                </div>
              </dl>
              <div className="artifact-card-actions">
                <a className="primary-action" href={artifact.href}>{copy(language, "打开 raw 产物", "Open raw artifact")}</a>
                <a className="secondary-action" href={routeHref("/sources")}>{copy(language, "返回来源页", "Back to sources")}</a>
              </div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

function publicAssetHref(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

function StaticDemoArtifacts({ dataset, language }: { dataset: LedgerDataset; language: Language }) {
  const staticArtifacts = [
    {
      label: "data/manifest.json",
      href: publicAssetHref("data/manifest.json"),
      date: "2026-06-25",
      type: copy(language, "静态清单", "Static manifest"),
      note: copy(language, "公开安全演示/来源清单，不是最新生产状态。", "public-safe demo/source manifest, not current production."),
    },
    {
      label: "data/ledger.demo.json",
      href: publicAssetHref("data/ledger.demo.json"),
      date: dataset.metadata.snapshot_date,
      type: copy(language, "冻结 Demo 账本", "Frozen demo ledger"),
      note: copy(language, "冻结公开安全演示快照，不是实时预测账本。", "Frozen public-safe demo snapshot, not a live prediction ledger."),
    },
    {
      label: "data/evidence-index.json",
      href: publicAssetHref("data/evidence-index.json"),
      date: "2026-06-25",
      type: copy(language, "静态证据索引", "Static evidence index"),
      note: copy(language, "归档证据索引，不代表最新生产日报。", "Archive evidence index, not the latest production daily report."),
    },
    {
      label: "content/articles/index.json",
      href: publicAssetHref("content/articles/index.json"),
      date: contentIndex.snapshot_date,
      type: copy(language, "静态文章归档", "Static article archive"),
      note: copy(language, `${contentItems.length} 篇透明度文章，不是最新生产日报。`, `${contentItems.length} transparency articles, not latest production reports.`),
    },
    {
      label: "data/paper-portfolio.latest.json",
      href: publicAssetHref("data/paper-portfolio.latest.json"),
      date: latestPaperPortfolioSnapshot.as_of_date,
      type: copy(language, "演示夹具样本", "Demo fixture"),
      note: copy(language, "未来日期样本；不是当前生产表现、业绩证明或实盘交易。", "Future-dated sample; not current production, performance proof, or live trading."),
    },
  ];

  return (
    <section className="route-panel live-sources-shell" aria-labelledby="static-artifacts-title">
      <div className="section-heading compact">
        <span>{copy(language, "静态材料", "Static materials")}</span>
        <h2 id="static-artifacts-title">{copy(language, "静态演示 / 归档产物", "Static demo/archive artifacts")}</h2>
        <p>
          {copy(
            language,
            "这些文件用于演示、归档或来源审计。它们可以检查，但不是最新生产日报、不是当前表现跟踪，也不是交易信号。",
            "These files are for demo, archive, or provenance audit. They are inspectable, but they are not latest production reports, current performance tracking, or trading signals.",
          )}
        </p>
      </div>
      <div className="related-prediction-list today-links">
        <a href={routeHref("/ledger")}>{copy(language, "查看 Demo 账本页面", "Open Demo Ledger page")}</a>
        <a href={routeHref("/performance")}>{copy(language, "查看表现说明", "Open Performance Notes")}</a>
        <a href={routeHref("/methodology")}>{copy(language, "查看方法论", "Open Methodology")}</a>
      </div>
      <details className="audit-details raw-artifact-disclosure">
        <summary>{copy(language, "Raw artifact / Open JSON", "Raw artifact / Open JSON")}</summary>
        <p className="muted">
          {copy(
            language,
            "以下 JSON 用于来源/演示审计，不是默认阅读目的地。",
            "The JSON below is for source/demo audit, not the default reading destination.",
          )}
        </p>
        <div className="live-artifact-table-wrap">
          <table className="live-artifact-table">
            <thead>
              <tr>
                <th>{copy(language, "产物", "Artifact")}</th>
                <th>{copy(language, "类型", "Type")}</th>
                <th>{copy(language, "快照日期", "Snapshot date")}</th>
                <th>{copy(language, "边界", "Boundary")}</th>
              </tr>
            </thead>
            <tbody>
              {staticArtifacts.map((artifact) => (
                <tr key={artifact.label}>
                  <td>
                    <a href={artifact.href}>{artifact.label}</a>
                  </td>
                  <td>{artifact.type}</td>
                  <td>{artifact.date}</td>
                  <td>{artifact.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="live-artifact-mobile-cards" aria-label={copy(language, "移动端静态产物", "Mobile static artifacts")}>
          {staticArtifacts.map((artifact) => (
            <article key={`${artifact.label}-mobile`}>
              <div>
                <span>{copy(language, "产物", "Artifact")}</span>
                <strong>{artifact.label}</strong>
              </div>
              <p>{artifact.note}</p>
              <dl>
                <div>
                  <dt>{copy(language, "类型", "Type")}</dt>
                  <dd>{artifact.type}</dd>
                </div>
                <div>
                  <dt>{copy(language, "快照日期", "Snapshot")}</dt>
                  <dd>{artifact.date}</dd>
                </div>
              </dl>
              <div className="artifact-card-actions">
                <a className="primary-action" href={artifact.href}>{copy(language, "打开 raw 产物", "Open raw artifact")}</a>
                <a className="secondary-action" href={routeHref("/sources")}>{copy(language, "返回来源页", "Back to sources")}</a>
              </div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

function reportStatusLabel(status: string, language: Language): string {
  return statusText(language, status);
}

function conclusionChangeLabel(status: string, language: Language): string {
  return statusText(language, status);
}

function evidenceLayerLabel(layer: string, language: Language): string {
  return layerText(language, layer);
}

function scopeLayerLabel(layer: string, language: Language): string {
  return layerText(language, layer);
}

function ledgerStatusReaderLabel(status: string, language: Language): string {
  return statusText(language, status);
}

function dailyBriefHealthLabel(value: string, language: Language): string {
  switch (value) {
    case "ok":
      return copy(language, "正常", "OK");
    case "ok_with_data_gaps":
      return copy(language, "正常但有数据缺口", "OK with data gaps");
    case "needs_review":
      return copy(language, "需要复核", "Needs review");
    case "healthy":
      return copy(language, "健康", "Healthy");
    case "degraded":
      return copy(language, "需关注", "Degraded");
    case "reports_updated":
      return copy(language, "日报已更新", "Reports updated");
    case "reports_updated_with_gaps":
      return copy(language, "日报已更新，有缺口", "Reports updated with gaps");
    case "unavailable":
      return copy(language, "暂不可用", "Unavailable");
    default:
      return value;
  }
}

function itemTitle(item: ContentItem, language: Language): string {
  if (item.slug === "weekly-ledger-update-2026-06-25") {
    return copy(language, "晨间简报：公开试运行观察队列", "Morning Brief: Public Alpha Watch Queue");
  }
  if (item.slug === "error-review-first-public-snapshot") {
    return copy(language, "晚间复盘：首个公开快照限制", "Evening Review: First Public Snapshot Limits");
  }
  if (item.slug === "method-note-public-ledger-v1") {
    return copy(language, "方法说明：公开账本 v1 边界", "Method Note: Public Ledger v1 Boundaries");
  }
  if (item.slug === "alpha-transparency-note-2026-06") {
    return copy(language, "透明度说明：公开试运行样本风险", "Transparency Note: Public Alpha Sample Risk");
  }
  return item.title;
}

function itemSummary(item: ContentItem, language: Language): string {
  if (item.slug === "weekly-ledger-update-2026-06-25") {
    return copy(
      language,
      "今天观察 TSM 作为已结算参照，NVDA 与 3690.HK 作为待判定观察行；无新增公开证据，结论不升级。",
      "Today watches TSM as a resolved reference row and NVDA / 3690.HK as pending observation rows; no new public evidence, so the conclusion is not upgraded.",
    );
  }
  if (item.slug === "error-review-first-public-snapshot") {
    return copy(
      language,
      "本日晚间复盘以账本状态变化为主语：本日账本无状态变更，待判定 / 冻结待判定不回填。",
      "This evening review is ledger-change centered: no status changed today, and pending / frozen_pending rows are not backfilled.",
    );
  }
  if (item.slug === "method-note-public-ledger-v1") {
    return copy(
      language,
      "解释预测、结果、假设组合与声明边界如何先分离、再解释。",
      "Explains how predictions, outcomes, paper portfolio snapshots, and claim boundaries stay separate before interpretation.",
    );
  }
  if (item.slug === "alpha-transparency-note-2026-06") {
    return copy(
      language,
      "说明公开试运行的小样本、待判定 / 阻塞记录和透明度风险。",
      "Explains Public Alpha small-sample risk, pending/blocked records, and transparency limits.",
    );
  }
  return item.summary;
}

function DataBar({
  label,
  value,
  max,
  tone = "default",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "default" | "blue" | "amber" | "red";
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className={`data-bar-row ${tone}`}>
      <div className="data-bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="data-bar-track" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LedgerStatusChart({ metrics, language }: { metrics: ReturnType<typeof computeSummary>; language: Language }) {
  const rows = [
    { label: statusText(language, "resolved"), value: metrics.resolved, tone: "default" as const },
    { label: statusText(language, "pending"), value: metrics.pending, tone: "blue" as const },
    { label: statusText(language, "frozen_pending"), value: metrics.frozenPending, tone: "amber" as const },
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="reader-chart" aria-labelledby="ledger-status-chart-title">
      <div>
        <span className="section-index">{copy(language, "真实仓库数据", "Actual repo data")}</span>
        <h2 id="ledger-status-chart-title">{copy(language, "账本状态分布", "Ledger status distribution")}</h2>
        <p>{copy(language, "计数来自当前公开账本快照。待判定与冻结待判定行不进入“仅已结算”指标。", "Counts come from the current public ledger snapshot. Pending and frozen rows remain outside resolved-only metrics.")}</p>
      </div>
      <div className="data-bar-list">
        {rows.map((row) => (
          <DataBar key={row.label} {...row} max={max} />
        ))}
      </div>
    </section>
  );
}

function ContentTypeChart({ language }: { language: Language }) {
  const counts = contentItems.reduce<Record<string, number>>((acc, item) => {
    const label = contentTypeLabel(item.type, language);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(counts);
  const max = Math.max(...rows.map(([, value]) => value), 1);

  return (
    <section className="reader-chart compact" aria-labelledby="content-chart-title">
      <div>
        <span className="section-index">{copy(language, "内容索引", "Content index")}</span>
        <h2 id="content-chart-title">{copy(language, "已发布简报类型", "Published note types")}</h2>
        <p>{copy(language, "从公开内容索引渲染；文件级技术来源默认折叠在下方。", "Rendered from the public content index; file-level provenance is collapsed below.")}</p>
      </div>
      <div className="data-bar-list">
        {rows.map(([label, value]) => (
          <DataBar key={label} label={label} value={value} max={max} tone="blue" />
        ))}
      </div>
    </section>
  );
}

function PortfolioComparisonBars({ snapshot, language }: { snapshot: PaperPortfolioSnapshot; language: Language }) {
  const values = [
    { label: copy(language, "假设组合累计", "Paper cumulative"), value: snapshot.metrics.cumulative_return_pct },
    { label: copy(language, "基准", "Benchmark"), value: snapshot.metrics.benchmark_return_pct },
    { label: copy(language, "超额", "Excess"), value: snapshot.metrics.excess_return_pct },
  ];
  const max = Math.max(...values.map((row) => Math.abs(row.value)), 1);

  return (
    <section className="reader-chart compact" aria-labelledby="portfolio-bars-title">
      <div>
        <span className="section-index">{copy(language, "策略约束快照", "Policy-bound snapshot")}</span>
        <h2 id="portfolio-bars-title">{copy(language, "收益对比", "Return comparison")}</h2>
        <p>{copy(language, "这些条形图使用确定性的假设组合快照，不是实时市场数据，也不是业绩证明。", "These bars use the deterministic paper portfolio snapshot, not live market data.")}</p>
      </div>
      <div className="signed-bar-list">
        {values.map((row) => {
          const width = Math.max(4, (Math.abs(row.value) / max) * 100);
          return (
            <div className="signed-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="signed-bar-track" aria-hidden="true">
                <i className={row.value < 0 ? "negative" : "positive"} style={{ width: `${width}%` }} />
              </div>
              <strong>{formatSignedPercent(row.value)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceLoopDiagram({ language }: { language: Language }) {
  const steps = [
    copy(language, "晨间简报", "Morning brief"),
    copy(language, "证据检查", "Evidence check"),
    copy(language, "边界评审", "Gate/Judge"),
    copy(language, "账本更新", "Ledger update"),
    copy(language, "晚间复盘", "Evening review"),
  ];
  return (
    <section className="process-strip" aria-labelledby="evidence-loop-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "每日研究循环", "Daily research loop")}</span>
        <h2 id="evidence-loop-title">{copy(language, "从晨间简报到晚间复盘", "Morning brief to evening review")}</h2>
        <p>{copy(language, "这是操作流程图，只降低阅读成本，不新增证据或业绩声明。", "Visual operating pattern only: it lowers reading cost and does not add evidence or performance claims.")}</p>
      </div>
      <ol>
        {steps.map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SystemFlowDiagram({ language }: { language: Language }) {
  const groups = [
    { title: copy(language, "1. 输入", "1. Intake"), body: copy(language, "股票代码 / 标的身份、边界检查、研究任务创建。", "Ticker identity, boundary checks, and research job creation.") },
    { title: copy(language, "2. 研究", "2. Research"), body: copy(language, "`ksana` 规划器、公开研究包、正方 / 反方 / 中性视角分离。", "`ksana` plan, public research packet, and separated positive/negative/neutral views.") },
    { title: copy(language, "3. 批判", "3. Critique"), body: copy(language, "综合、反方审查报告，并在公开输出前经过证据门和边界门。", "Synthesis, red-team report, and evidence/boundary gate before public output.") },
    { title: copy(language, "4. 认知", "4. Cognition"), body: copy(language, "`alaya` 认知对象、周度运行、Gate-Judge 评审分层。", "`alaya` object, weekly operation, and Gate-Judge cognition layering.") },
  ];
  return (
    <section className="system-flow-diagram" aria-labelledby="system-diagram-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "研究认知工厂", "Research cognition factory")}</span>
        <h2 id="system-diagram-title">{copy(language, "从股票代码到认知层", "From ticker to cognition layer")}</h2>
        <p>{copy(language, "这张图没有买/卖路径；每个输出都先经过证据门和边界门。", "No buy/sell path exists in this diagram; every output passes through evidence and boundary gates.")}</p>
      </div>
      <ol>
        {groups.map((group) => (
          <li key={group.title}>
            <strong>{group.title}</strong>
            <p>{group.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MethodologyProcessGraphic({ language }: { language: Language }) {
  const steps = [
    [copy(language, "公开账本", "Public ledger"), copy(language, "预测记录与结果记录保持分离。", "Predictions stay separate from outcomes.")],
    [copy(language, "结算器", "Resolver"), copy(language, "只有公开安全价格证据齐备时，过期可结算行才会结算。", "Expired eligible rows can resolve only with public-safe price evidence.")],
    [copy(language, "假设组合", "Paper portfolio"), copy(language, "固定策略下的只做多假设映射。", "Long-only hypothetical mapping under fixed policy.")],
    [copy(language, "简报", "Reports"), copy(language, "简报解释不确定性、变化、下一步观察和边界。", "Notes explain uncertainty, changes, next watch queue, and boundaries.")],
  ] as const;
  return (
    <section className="process-strip methodology-process" aria-labelledby="method-process-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "方法界面", "Method surface")}</span>
        <h2 id="method-process-title">{copy(language, "解释顺序", "Interpretation order")}</h2>
        <p>{copy(language, "产品按从左到右阅读：先记录，再结果，再策略约束的假设视图，最后是简报解释。", "The product reads left to right: record first, outcome second, policy-bound paper view third, report last.")}</p>
      </div>
      <ol>
        {steps.map(([title, body], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <small>{body}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

const systemFlowSteps = [
  "Input ticker",
  "Identity and boundary checks",
  "`ksana` research planning",
  "Research prompt generation",
  "LLM API public research",
  "Public research packet normalization",
  "Positive-case agent",
  "Negative-case agent",
  "Neutral-structure agent",
  "Synthesis",
  "Red-team report",
  "Boundary and evidence gate",
  "`alaya` cognition object",
  "Weekly `alaya` operation",
  "Gate-Judge cognition layering",
];

const agentResponsibilities = [
  ["`ksana`", "Turn a ticker into a structured research plan, evidence needs, horizon, and red-team focus.", "Decide the final conclusion."],
  ["LLM Research Worker", "Gather and structure public information into a draft research packet.", "Claim verified truth or hide uncertainty."],
  ["Positive Agent", "Build the strongest positive case from public evidence.", "Hide weaknesses or ignore risks."],
  ["Negative Agent", "Build the strongest negative case and identify failure modes.", "Exaggerate unsupported fear."],
  ["Neutral Agent", "Separate knowns, unknowns, decision variables, and possible prediction shape.", "Fake certainty."],
  ["Red-Team Agent", "Find errors, overclaims, boundary issues, and promotion blockers.", "Approve weak work casually."],
  ["Boundary Gate", "Check data, security, claim, and evidence boundaries before public output.", "Waive violations silently."],
  ["`alaya`", "Store and operate public-safe cognition objects with traceable updates.", "Rewrite history without trace."],
  ["Gate-Judge Agent", "Assign one cognition layer from evidence and unresolved risk.", "Act as a trading recommender."],
] as const;

const systemLabelGroups = [
  {
    title: "Research status labels",
    labels: [
      "INTAKE_PENDING",
      "IDENTITY_PASS",
      "KSANA_PLAN_READY",
      "LLM_RESEARCH_READY",
      "AGENT_ANALYSIS_READY",
      "RED_TEAM_PASS",
      "RED_TEAM_NEEDS_REPAIR",
      "BOUNDARY_PASS",
      "BOUNDARY_BLOCKED",
      "ALAYA_OBJECT_CREATED",
      "GATE_JUDGED",
    ],
  },
  {
    title: "Cognition layers",
    labels: [
      "L0_REJECTED",
      "L1_SIGNAL",
      "L2_HYPOTHESIS",
      "L3_TRACEABLE_PREDICTION",
      "L4_HUMAN_REVIEW",
      "L5_FROZEN_WAITING",
      "L6_POST_OUTCOME_REVIEW",
    ],
  },
  {
    title: "Evidence labels",
    labels: [
      "LOCAL_RESEARCH_ONLY",
      "PUBLIC_SOURCE_SUMMARY",
      "LOCAL_CHECKS",
      "LOCAL_SMOKE",
      "CI_EVIDENCE",
      "PRODUCTION_SMOKE",
      "FORMAL_ACCEPTANCE",
    ],
  },
];

function CommercialComparisonMatrix({ language }: { language: Language }) {
  const columns = [
    copy(language, "普通股票观点文", "Stock-pick article"),
    copy(language, "黑箱 AI", "Black-box AI"),
    copy(language, "传统投研报告", "Traditional research report"),
    "GOTRA Public Ledger",
  ];
  const rows = [
    [copy(language, "是否前置留痕", "Prior record"), copy(language, "通常不固定", "Usually not fixed"), copy(language, "少量展示", "Rarely shown"), copy(language, "多在报告内", "Inside report"), copy(language, "公开记录 prediction_id 与时间", "Public prediction_id and timestamp")],
    [copy(language, "是否公开错误", "Public errors"), copy(language, "少见", "Rare"), copy(language, "通常隐藏", "Usually hidden"), copy(language, "常在后续报告中弱化", "Often softened later"), copy(language, "错误与最大误差继续可见", "Errors and largest miss remain visible")],
    [copy(language, "证据和结论是否分离", "Evidence/conclusion separated"), copy(language, "容易混在一起", "Often mixed"), copy(language, "不可审计", "Not auditable"), copy(language, "依赖报告结构", "Depends on report"), copy(language, "公开证据、结论、边界分开显示", "Evidence, conclusion, and boundary are separated")],
    [copy(language, "是否展示待判定", "Pending shown"), copy(language, "通常不展示", "Usually no"), copy(language, "通常不展示", "Usually no"), copy(language, "不一定", "Varies"), copy(language, "待判定 / 冻结待判定保留，不补数", "Pending / frozen pending stay visible")],
    [copy(language, "是否有反方审查", "Opposing review"), copy(language, "依作者自觉", "Author-dependent"), copy(language, "不可见", "Invisible"), copy(language, "可能有", "Possible"), copy(language, "反方审查与红队风险明确列出", "Opposing review and red-team risk are explicit")],
    [copy(language, "是否允许追溯", "Traceability"), copy(language, "弱", "Weak"), copy(language, "弱", "Weak"), copy(language, "中等", "Medium"), copy(language, "记录、结果、归因、下一步可追溯", "Record, outcome, attribution, and next step are traceable")],
    [copy(language, "是否直接给交易指令", "Direct trading instruction"), copy(language, "常见", "Common"), copy(language, "可能出现", "Possible"), copy(language, "可能隐含", "May imply"), copy(language, "明确不提供", "Explicitly no")],
    [copy(language, "是否承诺收益", "Return promise"), copy(language, "可能暗示", "May imply"), copy(language, "可能暗示", "May imply"), copy(language, "通常不应承诺", "Should not"), copy(language, "明确不承诺收益或未来表现", "No return or future-performance promise")],
  ];

  return (
    <section className="commercial-matrix" aria-labelledby="commercial-matrix-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "商业差异", "Commercial differentiation")}</span>
        <h2 id="commercial-matrix-title">{copy(language, "它和常见股票内容不同在哪里", "How this differs from common stock content")}</h2>
        <p>
          {copy(language, "差异来自机制：前置记录、事后对照、公开错误、反方审查、证据链和边界管理；不是收益承诺、买卖建议或准确率证明。", "The difference is mechanism-based: prior record, after-the-fact comparison, public errors, opposing review, evidence chain, and boundary management; not return promise, buy/sell advice, or accuracy proof.")}
        </p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{copy(language, "维度", "Dimension")}</th>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td className={index === 4 ? "gotra-column" : undefined} key={`${row[0]}-${index}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemRulesPage({ language }: { language: Language }) {
  const systemAsset = `${import.meta.env.BASE_URL}images/p9-commercial-ux/cognition-pipeline.svg`;
  const localizedReasons = [
    copy(language, "先解析股票代码 / 标的识别符，避免研究错资产、ADR/主上市混淆或代码歧义。", "Ticker identity is resolved first so the system does not research the wrong asset or confuse an ADR, primary listing, or ambiguous symbol."),
    copy(language, "大模型输出只能标为草稿 / 未验证，因为公开研究摘要仍可能缺上下文、弱来源或无支撑推断。", "LLM output is labeled draft/unverified because public research summaries can still contain missing context, weak sourcing, or unsupported inference."),
    copy(language, "正面、负面、中性智能体在综合前分离，让分歧可见，而不是平均成虚假的确定性。", "Positive, negative, and neutral agents are separated before synthesis so disagreement remains visible instead of being averaged into fake certainty."),
    copy(language, "反方审查是必经步骤，主动寻找过度声明、隐藏假设、缺失反证和边界破坏。", "Red-team review is mandatory because the system must actively search for overclaims, hidden assumptions, missing counterevidence, and boundary breaks."),
    copy(language, "公开输出或 `alaya` 集成前先跑边界门，防止私有产物、原始模型供应商输出和建议式表述泄漏。", "Boundary gates run before public output or `alaya` integration so private artifacts, raw provider output, and advice-like wording cannot slip through."),
    copy(language, "认知层替代置信度表演：弱证据可以保持弱、降级、冻结、拒绝或转人工复核。", "Cognition layers replace confidence theater: weak evidence can stay weak, be downgraded, frozen, rejected, or sent to human review."),
    copy(language, "系统不能悄悄把研究变成投资建议；每个公开对象都要保留可追踪下一步和明确不确定性。", "The system must not silently turn research into investment advice; every public object keeps a traceable next step and explicit uncertainty."),
  ];
  const localizedFailures = [
    copy(language, "输出买入、卖出、持有、仓位、入场或退出建议。", "Outputs buy, sell, hold, position-size, entry, or exit advice."),
    copy(language, "把 local research、local checks 或 smoke evidence 说成证明。", "Claims proof from local research, local checks, or smoke evidence."),
    copy(language, "隐藏反方审查发现、未解决异议、阻塞状态或不确定性。", "Hides red-team findings, unresolved objections, blocked states, or uncertainty."),
    copy(language, "在公开输出中使用私有数据、私有 GOTRA 产物、原始提示词、模型补全文本、原始供应商输出、评分记录、数据库、密钥、认证会话文件或本机私有路径。", "Uses private data, private GOTRA artifacts, raw prompts, completions, provider raw output, scorer transcripts, DBs, secrets, auth/session files, or local private paths in public output."),
    copy(language, "在只允许公开安全摘要的位置存储原始供应商输出。", "Stores raw provider output where only public-safe summaries are allowed."),
    copy(language, "把弱证据升级为强认知层。", "Upgrades weak evidence into a strong cognition layer."),
    copy(language, "无法解释一个认知对象为什么被升级、降级、冻结、拒绝或送人工复核。", "Cannot explain why a cognition object was promoted, downgraded, frozen, rejected, or sent to human review."),
  ];
  const localizedAgentResponsibilities = agentResponsibilities.map(([agent, responsibility, mustNot]) => {
    if (language === "en") {
      return [agent, responsibility, mustNot] as const;
    }
    const zh: Record<string, readonly [string, string, string]> = {
      "`ksana`": ["`ksana`", "把标的变成结构化研究计划、证据需求、时间窗口和反方审查重点。", "不得直接决定最终结论。"],
      "LLM Research Worker": ["LLM 研究工人", "把公开信息整理成草稿研究包。", "不得声称已验证事实或隐藏不确定性。"],
      "Positive Agent": ["正方智能体", "从公开证据构建最强正方观点。", "不得隐藏弱点或忽略风险。"],
      "Negative Agent": ["反方智能体", "构建最强反方观点并识别失败模式。", "不得夸大无支撑恐惧。"],
      "Neutral Agent": ["中性结构智能体", "分离已知、未知、关键变量和可能预测形态。", "不得伪造确定性。"],
      "Red-Team Agent": ["红队 / 反方审查智能体", "寻找错误、过度声明、边界问题和升级阻塞项。", "不得随意批准弱工作。"],
      "Boundary Gate": ["边界门", "在公开输出前检查数据、安全、声明和证据边界。", "不得静默豁免违规。"],
      "`alaya`": ["`alaya`", "存储并运行可追溯的公开安全认知对象。", "不得无痕改写历史。"],
      "Gate-Judge Agent": ["Gate-Judge 评审智能体", "基于证据和未解决风险分配认知层。", "不得充当交易推荐器。"],
    };
    return zh[agent] ?? [agent, responsibility, mustNot];
  });
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "系统", "System")}
        title={copy(language, "周度研究认知系统（Weekly Research Cognition System）", "Weekly Research Cognition System")}
        body={copy(language, "设计草案（DRAFT_PRD）操作契约：一个周度研究认知工厂的设计目标，用于可追溯研究对象、不确定性标签、反方审查和认知层决策；它不是交易机器。", "DRAFT_PRD operating contract for a weekly research cognition factory. It describes a proposed workflow for traceable research objects, uncertainty labels, red-team critique, and cognition-layer decisions; it is not a trading machine.")}
        icon={ShieldCheck}
      />
      <section className="route-panel system-shell" aria-labelledby="system-boundary-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <div className="boundary-banner warning">
          <AlertCircle aria-hidden="true" size={18} />
          {copy(language, "状态：设计草案（DRAFT_PRD）。本页是设计目标和操作契约，不是完整周度系统已经实现、稳定、盈利、科学验证或上线就绪的证据。", "Status: DRAFT_PRD. This page is a design target and operating contract, not evidence that the full weekly system is already implemented, stable, profitable, scientifically validated, or launch-ready.")}
        </div>
        <figure className="system-asset-frame">
          <img src={systemAsset} alt={copy(language, "研究认知流程的抽象视觉图", "Abstract visual of the research cognition workflow")} />
        </figure>

        <section aria-labelledby="system-summary-title" className="system-summary-grid">
          <div>
            <h2 id="system-summary-title">{copy(language, "白话总结", "Plain-language summary")}</h2>
            <p>
              {copy(language, "股票代码进入系统后，不会立即给出买卖。它先创建研究任务，检查身份和边界，让 `ksana` 规划器设计研究，收集公开信息，分别运行正方、反方和中性视角，执行反方审查，再次检查边界，存储 `alaya` 认知对象，并分配认知层。", "A ticker enters the system, but the system does not immediately say buy or sell. It creates a research job, checks identity and boundaries, asks `ksana` to plan the research, gathers public information, runs positive, negative, and neutral views, red-teams the result, checks boundaries again, stores an `alaya` cognition object, and assigns a cognition layer.")}
            </p>
            <p>
              {copy(language, "目标是可追溯、不确定性标注和更难被欺骗的研究。公开输出应说明研究了什么、考虑了哪些证据、哪里仍不确定、分配了什么认知层，以及下一步必须发生什么。", "The goal is traceability, uncertainty labeling, and harder-to-fool research. Public output should explain what was studied, what evidence was considered, what remains uncertain, what cognition layer was assigned, and what must happen next.")}
            </p>
          </div>
          <div className="system-rule-card">
            <span>{copy(language, "研究工厂规则", "Research factory rule")}</span>
            <strong>{copy(language, "没有即时交易动作", "No immediate trading action")}</strong>
            <p>
              {copy(language, "股票代码只是公开安全研究对象的起点。它不是直接指令、信号、配置、入场、退出或保证。", "A ticker is a starting point for a public-safe research object. It is not a direct instruction, signal, allocation, entry, exit, or guarantee.")}
            </p>
          </div>
        </section>

        <SystemFlowDiagram language={language} />
        <EvidenceLoopDiagram language={language} />
        <CommercialComparisonMatrix language={language} />

        <details className="audit-details system-steps-detail">
          <summary>{copy(language, "完整操作步骤 / 技术流程", "Full operating steps / technical flow")}</summary>
          <ol className="system-flow-list">
            {systemFlowSteps.map((step, index) => (
              <li key={step}>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </details>

        <section aria-labelledby="system-why-title">
          <h2 id="system-why-title">{copy(language, "为什么需要这个系统", "Why this exists")}</h2>
          <div className="system-reason-grid">
            {localizedReasons.map((reason) => (
              <article key={reason}>
                <p>{reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="system-agents-title">
          <h2 id="system-agents-title">{copy(language, "智能体责任表", "Agent responsibility table")}</h2>
          <div className="table-scroll">
            <table className="portfolio-table system-table">
              <thead>
                <tr>
                  <th>{copy(language, "智能体", "Agent")}</th>
                  <th>{copy(language, "责任", "Responsibility")}</th>
                  <th>{copy(language, "不得做", "Must not do")}</th>
                </tr>
              </thead>
              <tbody>
                {localizedAgentResponsibilities.map(([agent, responsibility, mustNot]) => (
                  <tr key={agent}>
                    <td className="mono">{agent}</td>
                    <td>{responsibility}</td>
                    <td>{mustNot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="system-labels-title">
          <h2 id="system-labels-title">{copy(language, "状态、层级和证据标签", "Status, layer, and evidence labels")}</h2>
          <p>
            {copy(language, "这些标签族不能混用。研究状态描述工作流进度，认知层描述对象强度和下一步，证据标签描述当前证据层级。", "These label families must not be mixed. Research status describes workflow progress, cognition layer describes object strength and next action, and evidence label describes what proof layer currently exists.")}
          </p>
          <details className="audit-details">
            <summary>{copy(language, "查看原始技术标签", "View raw technical labels")}</summary>
            <div className="system-label-grid">
              {systemLabelGroups.map((group) => (
              <article key={group.title}>
                <h3>{group.title}</h3>
                <div className="tag-row">
                  {group.labels.map((label) => (
                    <span className="mono" key={label}>
                      {label}
                    </span>
                  ))}
                </div>
              </article>
              ))}
            </div>
          </details>
        </section>

        <section aria-labelledby="system-output-title">
          <h2 id="system-output-title">{copy(language, "公开输出规则", "Public output rule")}</h2>
          <div className="system-output-grid">
            <article>
              <h3>{copy(language, "公开输出可以展示", "Public output may show")}</h3>
              <ul>
                <li>{copy(language, "研究了什么", "what was studied")}</li>
                <li>{copy(language, "考虑了哪些公开证据", "public evidence considered")}</li>
                <li>{copy(language, "不确定性和未解决问题", "uncertainty and unresolved questions")}</li>
                <li>{copy(language, "认知层", "cognition layer")}</li>
                <li>{copy(language, "下一步必须发生什么", "what must happen next")}</li>
              </ul>
            </article>
            <article>
              <h3>{copy(language, "公开输出不得展示", "Public output must not show")}</h3>
              <ul>
                <li>{copy(language, "私有提示词链", "private prompt chains")}</li>
                <li>{copy(language, "原始供应商输出", "provider raw output")}</li>
                <li>{copy(language, "密钥或秘密数据", "secret data")}</li>
                <li>{copy(language, "未脱敏内部评分", "unredacted internal scoring")}</li>
                <li>{copy(language, "交易指令", "trading instructions")}</li>
              </ul>
            </article>
          </div>
        </section>

        <section aria-labelledby="system-failures-title">
          <h2 id="system-failures-title">{copy(language, "失败条件", "Failure conditions")}</h2>
          <ul className="system-failure-list">
            {localizedFailures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </section>
      </section>
    </>
  );
}

function isV40Brief(brief: DailyReaderBrief): boolean {
  return (
    brief.schema === "gotra.daily_reader_brief.v4" ||
    brief.full_analyst.execution_model === "deep_research_dossier_then_parallel_perspectives"
  );
}

function isV40AgentItem(item: DailyReaderBriefAgentAnalysisItem): boolean {
  return item.execution_model === "deep_research_dossier_then_parallel_perspectives" || item.k_deep_research_dossier.length > 0 || item.knowledge_gate.length > 0;
}

function readerMainList(list: LocalizedText[] | undefined): LocalizedText[] {
  return (list ?? []).filter((item) => {
    const text = `${item.zh} ${item.en}`;
    return !/\b[a-z_]*hash\b\s*:|_hash\s*:|schema\s*:/i.test(text);
  });
}

function combineReaderLists(...lists: Array<LocalizedText[] | undefined>): LocalizedText[] {
  const seen = new Set<string>();
  return lists
    .flatMap((list) => readerMainList(list))
    .filter((item) => {
      const key = `${item.zh}::${item.en}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function bilingualText(zh: string, en: string): LocalizedText {
  return { zh, en };
}

function researchSignalReaderRows(item: DailyReaderBriefAgentAnalysisItem): LocalizedText[] {
  const signal = item.research_signal;
  if (!signal) {
    return [];
  }
  return [
    bilingualText(`方向性研究假设：${signal.hypothesis.zh}`, `Research hypothesis: ${signal.hypothesis.en}`),
    bilingualText(`证据 ID：${signal.evidence_ids.slice(0, 4).join(", ")}`, `Evidence IDs: ${signal.evidence_ids.slice(0, 4).join(", ")}`),
    ...signal.counter_evidence.slice(0, 2).map((value) => bilingualText(`反证：${value.zh}`, `Counter-evidence: ${value.en}`)),
    ...signal.uncertainty.slice(0, 2).map((value) => bilingualText(`不确定性：${value.zh}`, `Uncertainty: ${value.en}`)),
    bilingualText(
      `复盘窗口：${signal.window_days ?? "未报告"} 天，复盘日期：${signal.review_due_at ?? "未报告"}`,
      `Review window: ${signal.window_days ?? "not reported"} day(s), review due: ${signal.review_due_at ?? "not reported"}`,
    ),
  ];
}

function publicationDecisionLabel(decision: string | undefined, language: Language): string {
  if (decision === "publish") {
    return copy(language, "可发布", "Publish");
  }
  if (decision === "blocked") {
    return copy(language, "已阻断", "Blocked");
  }
  return copy(language, "需要复核", "Needs review");
}

function publicationBlockerLabel(blocker: string | undefined, language: Language): string {
  const labels: Record<string, [string, string]> = {
    secret_or_raw_io: ["凭证或原始 I/O 风险", "Secret or raw I/O risk"],
    forbidden_wording: ["合规禁词", "Restricted wording"],
    public_safety: ["公开安全扫描", "Public safety scan"],
    future_data: ["未来数据风险", "Future-data risk"],
    evidence_packet_contract: ["证据包合同", "EvidencePacket contract"],
    research_signal_contract: ["研究信号合同", "ResearchSignal contract"],
    judge_gate: ["本地判断闸门", "Local judge gate"],
  };
  const value = blocker ? labels[blocker] : undefined;
  return value ? copy(language, value[0], value[1]) : copy(language, "未报告", "Not reported");
}

function publicationDecisionReaderRows(item: DailyReaderBriefAgentAnalysisItem): LocalizedText[] {
  const decision = item.publication_decision;
  if (!decision) {
    return [];
  }
  const reviewGates = Object.entries(decision.gates)
    .filter(([, gate]) => gate.status !== "pass")
    .slice(0, 4);
  return [
    bilingualText(
      `发布决定：${publicationDecisionLabel(decision.decision, "zh")}`,
      `Publication decision: ${publicationDecisionLabel(decision.decision, "en")}`,
    ),
    ...decision.reader_safe_reasons.slice(0, 4).map((value) => bilingualText(`原因：${value.zh}`, `Reason: ${value.en}`)),
    ...(decision.decision === "blocked"
      ? [
          bilingualText(
            `阻断类型：${publicationBlockerLabel(decision.blocker_type, "zh")}`,
            `Blocker type: ${publicationBlockerLabel(decision.blocker_type, "en")}`,
          ),
        ]
      : []),
    ...reviewGates.map(([, gate]) =>
      bilingualText(
        `需要关注的闸门：${gate.reader_safe_reason.zh}`,
        `Gate to review: ${gate.reader_safe_reason.en}`,
      ),
    ),
    ...(decision.evidence_layer
      ? [bilingualText(`证据层级：${decision.evidence_layer}`, `Evidence layer: ${decision.evidence_layer}`)]
      : []),
  ].filter((row) => row.zh || row.en);
}

function analystSectionRows(item: DailyReaderBriefAgentAnalysisItem, language: Language): Array<[string, LocalizedText[]]> {
  const chairman = item.chairman_synthesis.length > 0 ? item.chairman_synthesis : [item.research_summary];
  const redTeam = item.red_team_audit.length > 0 ? item.red_team_audit : item.red_team_review;
  const watch = item.watch_conditions.length > 0 ? item.watch_conditions : item.watch_items;
  if (isV40AgentItem(item)) {
    const persisted = combineReaderLists(item.knowledge_items_to_persist, item.evidence_gap_memory);
    const unresolved = combineReaderLists(item.unresolved_questions, item.future_research_tasks);
    const boundary = combineReaderLists(item.reader_boundary_gate, item.confidence_boundary ? [item.confidence_boundary] : undefined);
    const rows: Array<[string, LocalizedText[]]> = [
      [copy(language, "发布闸门", "Publication decision"), publicationDecisionReaderRows(item)],
      [copy(language, "结构化研究信号", "Structured ResearchSignal"), researchSignalReaderRows(item)],
      [copy(language, `为什么今天研究它 / ${termTitle("research_task", language)}`, "Why this stock today / Research task"), readerMainList(item.research_task)],
      [termLabel("evidence_packet", language), readerMainList(item.evidence_packet)],
      [termLabel("k_dossier", language), combineReaderLists(item.k_deep_research_dossier, item.k_deep_research)],
      [copy(language, "F 独立视角", "F independent perspective"), readerMainList(item.f_partner_view.length > 0 ? item.f_partner_view : item.positive_case)],
      [copy(language, "W 独立视角", "W independent perspective"), readerMainList(item.w_partner_view.length > 0 ? item.w_partner_view : item.negative_case)],
      [copy(language, "G 独立视角", "G independent perspective"), readerMainList(item.g_partner_view.length > 0 ? item.g_partner_view : item.risk_factors)],
      [termLabel("chairman_synthesis", language), readerMainList(chairman)],
      [termLabel("red_team_critique", language), readerMainList(redTeam)],
      [termLabel("research_quality_gate", language), readerMainList(item.research_quality_gate)],
      [copy(language, `内部 Alaya / ${termTitle("knowledge_gate", language)}`, "Alaya / Knowledge Gate"), readerMainList(item.knowledge_gate)],
      [copy(language, "持久化到记忆", "What persisted to memory"), persisted],
      [copy(language, "仍未解决", "What remains unresolved"), unresolved],
      [termLabel("reader_boundary_gate", language), boundary],
      [termLabel("watch_conditions", language), readerMainList(watch)],
    ];
    return rows.filter(([, list]) => list.length > 0);
  }
  const rows: Array<[string, LocalizedText[]]> = [
    [termLabel("research_task", language), item.research_task ?? []],
    [termLabel("evidence_packet", language), item.evidence_packet ?? []],
    [termLabel("chairman_synthesis", language), chairman],
    [copy(language, "K 深度研究", "K deep research"), item.k_deep_research],
    [copy(language, "F 伙伴视角", "F partner view"), item.f_partner_view.length > 0 ? item.f_partner_view : item.positive_case],
    [copy(language, "W 伙伴视角", "W partner view"), item.w_partner_view.length > 0 ? item.w_partner_view : item.negative_case],
    [copy(language, "G 伙伴视角", "G partner view"), item.g_partner_view.length > 0 ? item.g_partner_view : item.risk_factors],
    [termLabel("red_team_critique", language), redTeam],
    [copy(language, "证据缺口", "Evidence gaps"), item.evidence_gaps],
    [termLabel("watch_conditions", language), watch],
  ];
  return rows.filter(([, list]) => list.length > 0);
}

function metadataEntries(record: Record<string, string | number | boolean> | undefined, limit = 6): Array<[string, string]> {
  if (!record) {
    return [];
  }
  return Object.entries(record)
    .map(([key, value]) => [key.replace(/_/g, " "), String(value)] as [string, string])
    .filter(([key, value]) => key.trim() && value.trim())
    .slice(0, limit);
}

function gateHashRecord(item: DailyReaderBriefAgentAnalysisItem): Record<string, string> | undefined {
  const entries: Array<[string, string]> = Object.entries({
    k_dossier_hash: item.k_dossier_hash,
    research_quality_gate_hash: item.research_quality_gate_hash,
    knowledge_gate_hash: item.knowledge_gate_hash,
    reader_boundary_gate_hash: item.reader_boundary_gate_hash,
    research_signal_hash: item.research_signal_hash ?? item.research_signal?.signal_hash,
    publication_decision_hash: item.publication_decision_hash ?? item.publication_decision?.decision_hash,
    public_payload_hash: item.public_payload_hash,
  })
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function shortHash(value: string): string {
  return value.length > 18 ? `${value.slice(0, 12)}...${value.slice(-6)}` : value;
}

function fullAnalystExecutionText(brief: DailyReaderBrief, language: Language): string {
  const executionModel = brief.full_analyst.execution_model;
  if (executionModel === "deep_research_dossier_then_parallel_perspectives" || brief.schema === "gotra.daily_reader_brief.v4") {
    return executionModelExplanation("deep_research_dossier_then_parallel_perspectives", language);
  }
  if (executionModel === "independent_agent_calls" || brief.schema === "gotra.daily_reader_brief.v3") {
    return copy(
      language,
      "执行模型：独立 agent 调用；K/F/W/G 独立运行，Chairman 在四个输出后综合，Red Team 在 Chairman 后独立审计。",
      "execution model: independent agent calls; K/F/W/G run independently, Chairman synthesizes after those outputs, and Red Team audits after Chairman.",
    );
  }
  if (executionModel === "multi_perspective_single_call") {
    return copy(
      language,
      "执行模型：一次调用内多视角输出；不是独立 agent。",
      "execution model: single-call multi-perspective; not independent agents.",
    );
  }
  return executionModelExplanation(executionModel, language);
}

function trackRecordStatusLabel(status: string, language: Language): string {
  if (status === "publish") {
    return copy(language, "已发布", "Published");
  }
  if (status === "blocked") {
    return copy(language, "已阻断", "Blocked");
  }
  if (status === "needs_review") {
    return copy(language, "需要复核", "Needs review");
  }
  return status || copy(language, "未报告", "Not reported");
}

function reviewStatusLabel(status: "reviewed" | "review_unavailable" | "not_due", language: Language): string {
  if (status === "reviewed") {
    return copy(language, "已复盘", "Reviewed");
  }
  if (status === "review_unavailable") {
    return copy(language, "不可复盘", "Review unavailable");
  }
  return copy(language, "未到期", "Not due");
}

function attributionLabel(classification: string | undefined, language: Language): string {
  if (classification === "above_benchmark") {
    return copy(language, "高于基准", "Above benchmark");
  }
  if (classification === "below_benchmark") {
    return copy(language, "低于基准", "Below benchmark");
  }
  if (classification === "near_benchmark") {
    return copy(language, "接近基准", "Near benchmark");
  }
  return classification || copy(language, "未分类", "Unclassified");
}

function reviewResultSummary(result: ResearchReviewResult, language: Language): string {
  const relative = typeof result.attribution.relative_return_pp === "number" ? `${result.attribution.relative_return_pp.toFixed(2)}pp` : "n/a";
  return copy(
    language,
    `raw return ${result.raw_return.toFixed(2)}%，benchmark return ${result.benchmark_return.toFixed(2)}%，相对差 ${relative}。这是历史算术复盘，不是业绩证明。`,
    `raw return ${result.raw_return.toFixed(2)}%, benchmark return ${result.benchmark_return.toFixed(2)}%, relative ${relative}. Historical arithmetic review only, not performance proof.`,
  );
}

function reviewUnavailableSummary(reason: ResearchReviewUnavailableReason, language: Language): string {
  const missing = reason.missing_fields?.length ? reason.missing_fields.join(", ") : reason.review_unavailable_reason;
  return copy(
    language,
    `到期但不可复盘：缺少 ${missing}。系统不会静默跳过，也不会用私有或过期数据补齐。`,
    `Due but unavailable: missing ${missing}. The system does not silently skip it or fill with private/stale data.`,
  );
}

function monthlyReportCoverageSummary(report: MonthlyTransparencyReport | MonthlyTransparencyReportSummary, language: Language): string {
  const coverage = report.review_coverage;
  return copy(
    language,
    `复盘覆盖 ${coverage.reviewed_count}/${coverage.due_count}，不可复盘 ${coverage.unavailable_count}，未到期 ${coverage.not_due_count}。这是透明度核对，不是业绩证明。`,
    `Review coverage ${coverage.reviewed_count}/${coverage.due_count}, ${coverage.unavailable_count} unavailable, ${coverage.not_due_count} not due. Transparency audit only, not performance proof.`,
  );
}

function monthlyReportCounters(report: MonthlyTransparencyReport | MonthlyTransparencyReportSummary, language: Language): string {
  return copy(
    language,
    `发布 ${report.published_count}，待复核 ${report.needs_review_count}，阻断 ${report.blocked_count}。`,
    `${report.published_count} published, ${report.needs_review_count} needs review, ${report.blocked_count} blocked.`,
  );
}

function normalizeSymbolToken(value: string): string {
  return value.replace(/\.HK$/i, "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

function symbolMatchesValue(candidate: string, target: string): boolean {
  const candidateToken = normalizeSymbolToken(candidate);
  const targetToken = normalizeSymbolToken(target);
  if (!candidateToken || !targetToken) {
    return false;
  }
  return candidateToken === targetToken || candidateToken.endsWith(targetToken) || targetToken.endsWith(candidateToken);
}

function symbolMatchesAgentItem(item: DailyReaderBriefAgentAnalysisItem, symbol: string): boolean {
  return symbolMatchesValue(item.symbol, symbol);
}

function symbolMatchesLedgerEntry(entry: ResearchLedgerEntry, symbol: string): boolean {
  return symbolMatchesValue(`${entry.exchange}:${entry.symbol}`, symbol) || symbolMatchesValue(entry.symbol, symbol);
}

function symbolStatusSummary(item: DailyReaderBriefAgentAnalysisItem | undefined, entries: ResearchLedgerEntry[], language: Language): string {
  if (entries.length > 0) {
    return copy(
      language,
      `公开账本已有 ${entries.length} 条历史判断；版本变化和复盘到期项可在本页核对。`,
      `${entries.length} public ledger entr${entries.length === 1 ? "y" : "ies"} are available for this symbol; version changes and review due dates are visible here.`,
    );
  }
  if (item) {
    return copy(
      language,
      "当前有单票研究摘要，但 live research_ledger.json 尚未提供该标的的 PublicationDecision=publish 历史判断；页面不会伪造过往记录。",
      "A per-symbol research brief is available, but live research_ledger.json does not yet provide PublicationDecision=publish history for this symbol; this page does not fabricate historical records.",
    );
  }
  return copy(language, "当前公开产物中没有找到该标的。", "This symbol was not found in current public artifacts.");
}

function SymbolProfilePage({
  state,
  language,
  symbol,
}: {
  state: DailyReaderBriefLoadState;
  language: Language;
  symbol: string;
}) {
  const [ledgerState, setLedgerState] = useState<ResearchLedgerLoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setLedgerState({ kind: "loading" });
    loadResearchLedgerManifest()
      .then((manifest) => {
        if (!cancelled) {
          setLedgerState({ kind: "ready", manifest });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setLedgerState(message === "research_ledger_unavailable" ? { kind: "unavailable", message } : { kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取个股档案。", "Loading symbol profile.")}
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "个股档案暂不可用：", "Symbol profile is unavailable:")} {state.message}
      </section>
    );
  }

  const { brief } = state;
  const item = brief.agent_analysis_items.find((candidate) => symbolMatchesAgentItem(candidate, symbol));
  const ledgerEntries =
    ledgerState.kind === "ready"
      ? ledgerState.manifest.entries.filter((entry) => symbolMatchesLedgerEntry(entry, symbol)).sort((left, right) => {
          const dateCompare = right.as_of_date.localeCompare(left.as_of_date);
          return dateCompare || right.version - left.version;
        })
      : [];
  const latestEntry = ledgerEntries[0];
  const reviewDue = item?.research_signal?.review_due_at ?? latestEntry?.review_due_at ?? copy(language, "未报告", "Not reported");
  const currentStatus = item?.research_status ?? item?.research_signal?.research_status ?? latestEntry?.research_status ?? latestEntry?.status ?? "unavailable";
  const publicationDecision = item?.publication_decision?.decision ?? latestEntry?.publication_decision?.decision ?? latestEntry?.status;
  const displaySymbol = item?.symbol ?? (latestEntry ? `${latestEntry.exchange}:${latestEntry.symbol}` : symbol);
  const gapsAndReview = combineReaderLists(
    item?.missing_required_sources,
    item?.evidence_gaps,
    item?.research_quality_gate,
    item?.unresolved_questions,
    item?.future_research_tasks,
  );
  const symbolKnownGaps = brief.known_gaps.filter((gap) => symbolMatchesValue(gap.symbol ?? gap.code, symbol));
  const relatedWatch = brief.research_watchlist.filter((watch) => symbolMatchesValue(watch.symbol, symbol));
  const viewChangeRows = ledgerEntries.slice(0, 8);
  const latestReviewStatus =
    latestEntry && ledgerState.kind === "ready" ? researchLedgerReviewStatus(ledgerState.manifest, latestEntry.entry_id) : null;

  return (
    <>
      <section className="route-intro full-analyst-reader-hero" aria-labelledby="symbol-profile-title">
        <div>
          <span className="section-index">{copy(language, "个股档案", "Symbol profile")}</span>
          <h1 id="symbol-profile-title">{displaySymbol}</h1>
          <p>{symbolStatusSummary(item, ledgerEntries, language)}</p>
          <div className="hero-actions">
            <a className="primary-action" href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today")}</a>
            <a className="secondary-action" href={routeHref("/track-record")}>{copy(language, "打开公开研究账本", "Open track record")}</a>
          </div>
        </div>
        <Search aria-hidden="true" size={26} />
      </section>

      <section className="today-section" aria-labelledby="symbol-profile-snapshot-title">
        <div className="section-heading compact">
          <span>{copy(language, "当前状态", "Current state")}</span>
          <h2 id="symbol-profile-snapshot-title">{copy(language, "先看状态，再看证据和变化", "Read status first, then evidence and changes")}</h2>
          <p>
            {copy(
              language,
              "本页只使用公开 daily_reader_brief.v4 和 live research_ledger.json。没有 live 账本时会明确标注等待，不回退到冻结 Demo，也不伪造历史判断。",
              "This page only uses public daily_reader_brief.v4 and live research_ledger.json. When the live ledger is absent, it says so clearly instead of falling back to the frozen demo or fabricating history.",
            )}
          </p>
        </div>
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "研究质量状态", "Research status")}</span>
            <strong>{researchStatusLabel(currentStatus, language)}</strong>
            <p>{copy(language, "candidate / watch / needs_review / data_gap 等是研究边界，不是交易动作。", "candidate / watch / needs_review / data_gap are research boundaries, not trading actions.")}</p>
          </article>
          <article>
            <span>{copy(language, "发布决定", "Publication decision")}</span>
            <strong>{publicationDecisionLabel(publicationDecision, language)}</strong>
            <p>{copy(language, "只有 PublicationDecision=publish 才会进入 append-only 公开账本。", "Only PublicationDecision=publish enters the append-only public ledger.")}</p>
          </article>
          <article>
            <span>{copy(language, "复盘到期", "Review due")}</span>
            <strong>{reviewDue}</strong>
            <p>{copy(language, "复盘日期用于后续核对 raw return、benchmark return 和错误归因。", "The review due date is for later raw-return, benchmark-return, and error-attribution checks.")}</p>
          </article>
        </div>
      </section>

      {item ? (
        <section className="today-section" aria-labelledby="symbol-profile-current-title">
          <div className="section-heading compact">
            <span>{copy(language, "当前研究", "Current research")}</span>
            <h2 id="symbol-profile-current-title">{copy(language, "研究任务、证据、底稿和反证", "Task, evidence, dossier, and critique")}</h2>
            <p>{pickLocalized(language, item.research_summary)}</p>
          </div>
          <div className="status-explanation-grid">
            <StatusExplanationCard rawStatus={currentStatus} language={language} compact />
            {item.red_team_verdict ? <StatusExplanationCard rawStatus={item.red_team_verdict} language={language} compact /> : null}
          </div>
          <div className="today-agent-grid full-analyst-reader-grid">
            {analystSectionRows(item, language).slice(0, 10).map(([title, list]) => (
              <article className="today-agent-card" key={String(title)}>
                <h3>{String(title)}</h3>
                <ul>
                  {list.slice(0, 4).map((value) => (
                    <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {item.confidence_boundary ? (
            <p className="symbol-confidence-boundary">{pickLocalized(language, item.confidence_boundary)}</p>
          ) : null}
        </section>
      ) : (
        <section className="today-section edge-state-note" role="status">
          {copy(language, "当前 daily_reader_brief.v4 没有该标的的单票研究摘要。", "Current daily_reader_brief.v4 has no per-symbol research brief for this symbol.")}
        </section>
      )}

      <section className="today-section" aria-labelledby="symbol-profile-history-title">
        <div className="section-heading compact">
          <span>{copy(language, "历史判断与观点变化", "History and view changes")}</span>
          <h2 id="symbol-profile-history-title">{copy(language, "只读 live 公开账本", "Live public ledger only")}</h2>
          <p>
            {ledgerState.kind === "ready"
              ? copy(language, "这里按 live research_ledger.json 过滤该标的；更新会追加版本，不覆盖旧记录。", "This filters live research_ledger.json for this symbol; updates append versions instead of overwriting old rows.")
              : ledgerState.kind === "unavailable"
                ? copy(language, "当前生产 reports 目录没有 live research_ledger.json；历史判断等待后端 publish entries。", "The current production reports directory has no live research_ledger.json; history waits for backend publish entries.")
                : ledgerState.kind === "error"
                  ? `${copy(language, "公开账本读取失败：", "Public ledger failed to load:")} ${ledgerState.message}`
                  : copy(language, "正在读取 live research_ledger.json。", "Loading live research_ledger.json.")}
          </p>
        </div>
        {viewChangeRows.length > 0 ? (
          <div className="table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>{copy(language, "日期", "Date")}</th>
                  <th>{copy(language, "版本", "Version")}</th>
                  <th>{copy(language, "状态", "Status")}</th>
                  <th>{copy(language, "窗口", "Window")}</th>
                  <th>{copy(language, "复盘到期", "Review due")}</th>
                  <th>{copy(language, "复盘状态", "Review status")}</th>
                  <th>{copy(language, "研究假设", "Hypothesis")}</th>
                </tr>
              </thead>
              <tbody>
                {viewChangeRows.map((entry) => (
                  <tr key={entry.entry_id}>
                    <td>{entry.as_of_date}</td>
                    <td><a href={trackRecordEntryRouteHref(entry.entry_id)}>v{entry.version}</a></td>
                    <td>{trackRecordStatusLabel(entry.status, language)}</td>
                    <td>{entry.window_days}d</td>
                    <td>{entry.review_due_at}</td>
                    <td>
                      {ledgerState.kind === "ready"
                        ? reviewStatusLabel(researchLedgerReviewStatus(ledgerState.manifest, entry.entry_id), language)
                        : copy(language, "未报告", "Not reported")}
                    </td>
                    <td>{entry.research_signal?.hypothesis ?? copy(language, "未报告", "Not reported")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="edge-state-note">
            {copy(language, "暂无 live 公开历史判断。这里不会用 Demo 账本或 raw Markdown 补历史。", "No live public historical judgment is available. This page does not use the Demo ledger or raw Markdown to fill history.")}
          </div>
        )}
      </section>

      <section className="today-section" aria-labelledby="symbol-profile-review-title">
        <div className="section-heading compact">
          <span>{copy(language, "复盘、数据缺口与下一步", "Review, data gaps, and next steps")}</span>
          <h2 id="symbol-profile-review-title">{copy(language, "哪里还不能过度确定", "Where certainty is not justified")}</h2>
        </div>
        <div className="today-agent-grid">
          <article className="today-agent-card">
            <h3>{copy(language, "复盘安排", "Review plan")}</h3>
            <ul>
              <li>{copy(language, `复盘到期：${reviewDue}`, `Review due: ${reviewDue}`)}</li>
              <li>
                {copy(
                  language,
                  `复盘状态：${latestReviewStatus ? reviewStatusLabel(latestReviewStatus, language) : "等待 live 账本"}`,
                  `Review status: ${latestReviewStatus ? reviewStatusLabel(latestReviewStatus, language) : "waiting for live ledger"}`,
                )}
              </li>
              <li>{copy(language, "复盘引擎支持 1/7/30/90 天窗口；到期项必须有 ReviewResult 或不可复盘原因。", "The review engine supports 1/7/30/90 day windows; due items must have a ReviewResult or a review-unavailable reason.")}</li>
            </ul>
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "数据缺口 / 需要复核", "Data gaps / needs review")}</h3>
            {gapsAndReview.length > 0 || symbolKnownGaps.length > 0 ? (
              <ul>
                {gapsAndReview.slice(0, 5).map((value) => (
                  <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                ))}
                {symbolKnownGaps.slice(0, 3).map((gap) => (
                  <li key={`${gap.code}-${gap.symbol ?? ""}`}>{pickLocalized(language, gap.explanation)}</li>
                ))}
              </ul>
            ) : (
              <p>{copy(language, "当前公开摘要没有额外数据缺口；仍以读者边界和证据包为准。", "The current public summary has no additional data gap; reader boundary and EvidencePacket still apply.")}</p>
            )}
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "下一步观察", "Watch next")}</h3>
            {relatedWatch.length > 0 || item?.watch_conditions.length ? (
              <ul>
                {relatedWatch.slice(0, 3).map((watch) => (
                  <li key={`${watch.symbol}-${watch.source}`}>{pickLocalized(language, watch.question)} · {pickLocalized(language, watch.next_check)}</li>
                ))}
                {(item?.watch_conditions ?? []).slice(0, 3).map((watch) => (
                  <li key={`${watch.zh}-${watch.en}`}>{pickLocalized(language, watch)}</li>
                ))}
              </ul>
            ) : (
              <p>{copy(language, "当前没有单独观察项；请回到今日简报查看全局 watchlist。", "No symbol-specific watch item is available; use today's brief for the global watchlist.")}</p>
            )}
          </article>
        </div>
        <details className="audit-details raw-artifact-disclosure">
          <summary>{copy(language, "查看审计入口", "Show audit links")}</summary>
          <p className="muted">
            {copy(language, "这些入口用于核对公开产物，不是普通阅读主路径；不展示 raw provider I/O、完整内部 prompt、secret 或私有路径。", "These links audit public artifacts, not the ordinary reading path; they do not expose raw provider I/O, full internal prompts, secrets, or private paths.")}
          </p>
          <div className="related-prediction-list">
            {item ? <a href={evidencePacketRouteHref(item.symbol)}>{copy(language, "证据包审计摘要", "EvidencePacket audit summary")}</a> : null}
            <a href={routeHref("/reports/full-analyst")}>{copy(language, "完整研究链路 reader", "Full Analyst reader")}</a>
            <a href={routeHref("/track-record")}>{copy(language, "公开研究账本", "Public track record")}</a>
            <a href={brief.links.daily_reader_brief}>{copy(language, "daily_reader_brief.json", "daily_reader_brief.json")}</a>
          </div>
        </details>
      </section>
    </>
  );
}

function TrackRecordPage({ entryId, language }: { entryId?: string; language: Language }) {
  const [state, setState] = useState<ResearchLedgerLoadState>({ kind: "loading" });
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [windowFilter, setWindowFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadResearchLedgerManifest()
      .then((manifest) => {
        if (!cancelled) {
          setState({ kind: "ready", manifest });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setState(message === "research_ledger_unavailable" ? { kind: "unavailable", message } : { kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取公开研究账本。", "Loading public research ledger.")}
      </section>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <>
        <PageIntro
          eyebrow={copy(language, "公开账本", "Track record")}
          title={copy(language, "公开研究账本尚未生成", "Public research ledger is not generated yet")}
          body={copy(
            language,
            "Stage 7 已为 PublicationDecision=publish 的 ResearchSignal 定义 append-only LedgerEntry；当前生产 reports 目录还没有 research_ledger.json。页面不会回退到冻结 Demo 账本，也不会伪造历史判断。",
            "Stage 7 defines append-only LedgerEntry rows for ResearchSignals with PublicationDecision=publish; the current production reports directory does not yet contain research_ledger.json. This page does not fall back to the frozen demo ledger or fabricate history.",
          )}
          icon={Database}
        />
        <section className="today-section">
          <div className="edge-state-note">
            {copy(
              language,
              "请先看今日简报或研究阅读器；公开账本会在后端 v4 发布运行写出 PublicationDecision=publish entries 后自动出现，并展示复盘覆盖率。",
              "Use today's brief or the research reader first; the public ledger appears after a backend v4 publication run writes PublicationDecision=publish entries and review coverage.",
            )}
          </div>
          <div className="related-prediction-list today-links">
            <a href={routeHref("/today")}>{copy(language, "今日简报", "Today's brief")}</a>
            <a href={routeHref("/reports/full-analyst")}>{copy(language, "研究阅读器", "Research reader")}</a>
            <a href={routeHref("/monthly-reports")}>{copy(language, "月度透明报告", "Monthly reports")}</a>
            <a href={routeHref("/ledger")}>{copy(language, "冻结 Demo 账本", "Frozen demo ledger")}</a>
          </div>
        </section>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "公开研究账本读取失败：", "Public research ledger failed to load:")} {state.message}
      </section>
    );
  }

  const { manifest } = state;
  const entries = manifest.entries;
  const reviewCoverage = manifest.review_coverage;
  const symbols = researchLedgerSymbols(entries);
  const statuses = researchLedgerStatuses(entries);
  const windows = researchLedgerWindows(entries);
  const filteredEntries = entries.filter((entry) => {
    const symbolKey = `${entry.exchange}:${entry.symbol}`;
    return (
      (symbolFilter === "all" || symbolFilter === symbolKey) &&
      (statusFilter === "all" || statusFilter === entry.status) &&
      (windowFilter === "all" || Number(windowFilter) === entry.window_days)
    );
  });
  const selectedEntry = entryId ? entries.find((entry) => entry.entry_id === entryId) ?? null : null;
  const versionChain = selectedEntry
    ? entries.filter((entry) => entry.base_entry_id === selectedEntry.base_entry_id).sort((a, b) => a.version - b.version)
    : [];
  const selectedReviewStatus = selectedEntry ? researchLedgerReviewStatus(manifest, selectedEntry.entry_id) : null;
  const selectedReviewResult = selectedEntry ? researchLedgerReviewResult(manifest, selectedEntry.entry_id) : null;
  const selectedReviewUnavailable = selectedEntry ? researchLedgerReviewUnavailable(manifest, selectedEntry.entry_id) : null;

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "公开研究账本", "Public track record")}
        title={copy(language, "每条公开判断都有 hash chain", "Every public judgment has a hash chain")}
        body={copy(
          language,
          "这里读取 live research_ledger.json，只展示后端 PublicationDecision=publish 的 ResearchSignal。更新会追加新 version，不覆盖旧记录；hash chain 失败时 API 返回 integrity error。",
          "This page reads live research_ledger.json and shows only ResearchSignals whose PublicationDecision is publish. Updates append a new version instead of overwriting history; API returns an integrity error if the hash chain fails.",
        )}
        icon={Database}
      />
      <section className="today-section" aria-labelledby="track-record-status-title">
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "账本条目", "Ledger entries")}</span>
            <strong>{entries.length}</strong>
            <p>{copy(language, "来自 live research_ledger.json，不是冻结 Demo。", "From live research_ledger.json, not the frozen demo.")}</p>
          </article>
          <article>
            <span>{copy(language, "完整性", "Integrity")}</span>
            <strong>{manifest.integrity.ok ? copy(language, "通过", "OK") : copy(language, "失败", "Failed")}</strong>
            <p>{manifest.integrity.latest_hash ? `${copy(language, "最新 hash", "Latest hash")}: ${shortHash(manifest.integrity.latest_hash)}` : copy(language, "还没有 entry hash。", "No entry hash yet.")}</p>
          </article>
          <article>
            <span>{copy(language, "生成时间", "Generated at")}</span>
            <strong>{manifest.generated_at || copy(language, "未报告", "Not reported")}</strong>
            <p>{copy(language, "证据层级：local checks + smoke evidence。不是 10h/formal acceptance。", "Evidence layer: local checks + smoke evidence. Not 10h/formal acceptance.")}</p>
          </article>
          <article>
            <span>{copy(language, "复盘覆盖率", "Review coverage")}</span>
            <strong>{reviewCoverage.reviewed_count} / {reviewCoverage.due_count}</strong>
            <p>
              {copy(
                language,
                `不可复盘 ${reviewCoverage.unavailable_count}，未到期 ${reviewCoverage.not_due_count}。复盘是历史算术核对，不是业绩证明。`,
                `${reviewCoverage.unavailable_count} unavailable, ${reviewCoverage.not_due_count} not due. Review is historical arithmetic, not performance proof.`,
              )}
            </p>
          </article>
        </div>
        <div className="related-prediction-list today-links">
          <a href={routeHref("/monthly-reports")}>{copy(language, "查看月度透明报告", "Open monthly transparency reports")}</a>
          <a href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today")}</a>
        </div>
      </section>

      {selectedEntry ? (
        <section className="today-section" aria-labelledby="track-record-detail-title">
          <div className="section-heading compact">
            <span>{copy(language, "Entry detail", "Entry detail")}</span>
            <h2 id="track-record-detail-title">{selectedEntry.exchange}:{selectedEntry.symbol} · v{selectedEntry.version}</h2>
            <p>{selectedEntry.research_signal?.hypothesis ?? copy(language, "没有公开研究假设摘要。", "No public research hypothesis summary.")}</p>
          </div>
          <div className="today-agent-grid full-analyst-reader-grid">
            <article className="today-agent-card">
              <h3>{copy(language, "发布决定", "Publication decision")}</h3>
              <p>{trackRecordStatusLabel(selectedEntry.status, language)}</p>
              <ul>
                {(selectedEntry.publication_decision?.reader_safe_reasons ?? []).slice(0, 5).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {selectedEntry.evidence_packet_link ? (
                <a className="inline-audit-link" href={selectedEntry.evidence_packet_link}>
                  {copy(language, "打开证据包链接", "Open evidence packet link")}
                </a>
              ) : null}
            </article>
            <article className="today-agent-card">
              <h3>{copy(language, "反证与不确定性", "Counter-evidence and uncertainty")}</h3>
              <ul>
                {(selectedEntry.research_signal?.counter_evidence ?? []).slice(0, 4).map((item) => (
                  <li key={`counter-${item}`}>{item}</li>
                ))}
                {(selectedEntry.research_signal?.uncertainty ?? []).slice(0, 4).map((item) => (
                  <li key={`uncertainty-${item}`}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="today-agent-card">
              <h3>{copy(language, "版本链", "Version chain")}</h3>
              <ul>
                {versionChain.map((entry) => (
                  <li key={entry.entry_id}>
                    <a href={trackRecordEntryRouteHref(entry.entry_id)}>v{entry.version}</a> · {shortHash(entry.hash)}
                  </li>
                ))}
              </ul>
            </article>
            <article className="today-agent-card">
              <h3>{copy(language, "复盘结果", "Review result")}</h3>
              <p>{selectedReviewStatus ? reviewStatusLabel(selectedReviewStatus, language) : copy(language, "未报告", "Not reported")}</p>
              {selectedReviewResult ? (
                <>
                  <p>{reviewResultSummary(selectedReviewResult, language)}</p>
                  <p>{attributionLabel(selectedReviewResult.attribution.classification, language)}</p>
                </>
              ) : selectedReviewUnavailable ? (
                <p>{reviewUnavailableSummary(selectedReviewUnavailable, language)}</p>
              ) : (
                <p>{copy(language, "复盘窗口尚未到期；不会提前包装结果。", "Review window is not due yet; no result is packaged early.")}</p>
              )}
            </article>
          </div>
          <details className="audit-details">
            <summary>{copy(language, "查看审计元数据", "Show audit metadata")}</summary>
            <ul>
              <li>entry_id: {selectedEntry.entry_id}</li>
              <li>signal_id: {selectedEntry.signal_id}</li>
              <li>previous_hash: {shortHash(selectedEntry.previous_hash)}</li>
              <li>hash: {shortHash(selectedEntry.hash)}</li>
              <li>research_signal_hash: {shortHash(selectedEntry.research_signal_hash)}</li>
              <li>publication_decision_hash: {shortHash(selectedEntry.publication_decision_hash)}</li>
              <li>evidence_packet_hash: {shortHash(selectedEntry.evidence_packet_hash)}</li>
            </ul>
          </details>
        </section>
      ) : entryId ? (
        <section className="today-section edge-state-note" role="status">
          {copy(language, "未找到该公开账本条目。", "This public ledger entry was not found.")}
        </section>
      ) : null}

      <section className="ledger-section" id="track-record-ledger" aria-labelledby="track-record-list-title">
        <div className="ledger-panel">
          <div className="ledger-toolbar">
            <div>
              <span className="section-index">{copy(language, "Stage 7 · live ledger", "Stage 7 · live ledger")}</span>
              <h2 id="track-record-list-title">{copy(language, "公开判断列表", "Public judgments")}</h2>
              <p>
                {copy(language, "支持按 symbol、status、window 筛选。raw JSON 只在审计中心打开，主路径显示 reader-safe 摘要。", "Filter by symbol, status, and window. Raw JSON opens only in the Audit Center; the main path shows reader-safe summaries.")}
              </p>
            </div>
            <div className="filters">
              <label>
                <span>{copy(language, "标的", "Symbol")}</span>
                <select value={symbolFilter} onChange={(event) => setSymbolFilter(event.target.value)}>
                  <option value="all">{copy(language, "全部标的", "All symbols")}</option>
                  {symbols.map((symbol) => (
                    <option value={symbol} key={symbol}>{symbol}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy(language, "状态", "Status")}</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">{copy(language, "全部状态", "All statuses")}</option>
                  {statuses.map((status) => (
                    <option value={status} key={status}>{trackRecordStatusLabel(status, language)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{copy(language, "窗口", "Window")}</span>
                <select value={windowFilter} onChange={(event) => setWindowFilter(event.target.value)}>
                  <option value="all">{copy(language, "全部窗口", "All windows")}</option>
                  {windows.map((windowDays) => (
                    <option value={String(windowDays)} key={windowDays}>{windowDays}d</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="ledger-count-line">
            {copy(language, `当前显示 ${filteredEntries.length} / ${entries.length} 条公开判断。`, `Showing ${filteredEntries.length} / ${entries.length} public judgments.`)}
          </div>
          {filteredEntries.length > 0 ? (
            <div className="table-scroll">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>{copy(language, "条目", "Entry")}</th>
                    <th>{copy(language, "标的", "Symbol")}</th>
                    <th>{copy(language, "状态", "Status")}</th>
                    <th>{copy(language, "窗口", "Window")}</th>
                    <th>{copy(language, "复盘到期", "Review due")}</th>
                    <th>{copy(language, "复盘状态", "Review status")}</th>
                    <th>{copy(language, "证据", "Evidence")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.entry_id}>
                      <td><a href={trackRecordEntryRouteHref(entry.entry_id)}>v{entry.version} · {shortHash(entry.hash)}</a></td>
                      <td><a href={symbolProfileRouteHref(`${entry.exchange}:${entry.symbol}`)}>{entry.exchange}:{entry.symbol}</a></td>
                      <td>{trackRecordStatusLabel(entry.status, language)}</td>
                      <td>{entry.window_days}d</td>
                      <td>{entry.review_due_at}</td>
                      <td>{reviewStatusLabel(researchLedgerReviewStatus(manifest, entry.entry_id), language)}</td>
                      <td>{entry.evidence_packet_link ? <a href={entry.evidence_packet_link}>{copy(language, "证据包", "Evidence packet")}</a> : copy(language, "未报告", "Not reported")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="edge-state-note">{copy(language, "没有匹配筛选条件的公开判断。", "No public judgment matches these filters.")}</div>
          )}
          <details className="audit-details">
            <summary>{copy(language, "Raw artifact / Open JSON", "Raw artifact / Open JSON")}</summary>
            <p className="muted">
              {copy(language, "这是原始审计产物，不是普通阅读页面。普通用户请回到公开账本或今日简报。", "This is a raw audit artifact, not the ordinary reading page. Default readers should return to the track record or today's brief.")}
            </p>
            <a href="/reports/research_ledger.json">/reports/research_ledger.json</a>
          </details>
        </div>
      </section>
    </>
  );
}

const betaUniverse = [
  "HKEX:0700",
  "HKEX:1810",
  "HKEX:9688",
  "HKEX:9988",
  "HKEX:3690",
  "HKEX:1211",
  "NASDAQ:MSFT",
  "NASDAQ:NVDA",
  "NASDAQ:AAPL",
  "NASDAQ:GOOGL",
  "NASDAQ:META",
  "NYSE:TSM",
];

function BetaReadinessPage({ language }: { language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "Stage 15A · Beta readiness", "Stage 15A · Beta readiness")}
        title={copy(language, "30 天公开 beta 准备区", "30-day public beta prep")}
        body={copy(
          language,
          "这里说明 beta 启动前的工程、监控、周报和团队复核准备。beta 尚未启动，30 天时钟没有开始；这不是正式上线、付费准备完成、投资建议、交易信号或业绩证明。",
          "This page explains engineering, monitoring, weekly-report, and team-review readiness before beta starts. The beta has not started and the 30-day clock has not begun; this is not launch readiness, paid readiness, investment advice, a trading signal, or performance proof.",
        )}
        icon={BookOpenCheck}
      />
      <section className="today-section" aria-labelledby="beta-state-title">
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "当前状态", "Current state")}</span>
            <strong>{copy(language, "准备完成，未启动", "Ready, not started")}</strong>
            <p>{copy(language, "团队复核通过后，才允许显式启动 Stage 15B 30 天公开 beta。", "Stage 15B 30-day public beta can start only after explicit team review approval.")}</p>
          </article>
          <article>
            <span>{copy(language, "Beta 时钟", "Beta clock")}</span>
            <strong>{copy(language, "0 / 30 天", "0 / 30 days")}</strong>
            <p>{copy(language, "未满真实 30 天前，不能进入正式上线闸。", "The full launch gate is blocked until a real 30 days completes.")}</p>
          </article>
          <article>
            <span>{copy(language, "股票池", "Universe")}</span>
            <strong>{betaUniverse.length}</strong>
            <p>{copy(language, "覆盖港股和美股核心观察池；每个标的使用 1/7/30/90 天复盘窗口。", "Covers a core HK/US watch universe with 1/7/30/90-day review windows for each symbol.")}</p>
          </article>
          <article>
            <span>{copy(language, "付费状态", "Paid state")}</span>
            <strong>{copy(language, "关闭", "Off")}</strong>
            <p>{copy(language, "没有付费订阅，不承诺回报，也没有业绩证明。", "No paid subscription, no return promise, and no performance proof.")}</p>
          </article>
        </div>
      </section>
      <section className="today-section" aria-labelledby="beta-readiness-title">
        <div className="section-heading compact">
          <span>{copy(language, "启动前检查", "Pre-start checklist")}</span>
          <h2 id="beta-readiness-title">{copy(language, "团队复核前需要确认什么", "What team review must confirm")}</h2>
        </div>
        <div className="today-agent-grid full-analyst-reader-grid">
          <article className="today-agent-card">
            <h3>{copy(language, "工程与监控", "Engineering and monitoring")}</h3>
            <ul>
              <li>{copy(language, "10h readiness 已完成，但不等于 30d beta。", "10h readiness completed, but it is not 30d beta.")}</li>
              <li>{copy(language, "需要 durable beta heartbeat、daily beta events、weekly report 和 rollback notes。", "Requires durable beta heartbeat, daily beta events, weekly report, and rollback notes.")}</li>
              <li>{copy(language, "每日输出失败、raw artifact 暴露或安全扫描失败时必须停止并复核。", "Daily-output failures, raw artifact exposure, or security-scan failures must stop and trigger review.")}</li>
            </ul>
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "公开读者边界", "Reader boundary")}</h3>
            <ul>
              <li>{copy(language, "公开内容是研究信息，不是荐股、交易信号或投顾。", "Public content is research information, not stock picking, trading signals, or advisory service.")}</li>
              <li>{copy(language, "needs_review、data_gap、红队质疑和错误案例必须保留。", "needs_review, data_gap, red-team critique, and error cases must stay visible.")}</li>
              <li>{copy(language, "Alaya 仅指 GOTRA repo 内部认知飞轮 / memory / readback。", "Alaya only means GOTRA repo internal cognition flywheel / memory / readback.")}</li>
            </ul>
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "Beta 股票池", "Beta universe")}</h3>
            <div className="related-prediction-list">
              {betaUniverse.map((symbol) => (
                <a href={symbolProfileRouteHref(symbol)} key={symbol}>{symbol}</a>
              ))}
            </div>
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "下一步", "Next action")}</h3>
            <p>
              {copy(
                language,
                "当前只适合团队 review。人类明确批准后，才启动 Stage 15B，并从 0 开始计 30 天。",
                "This is ready for team review only. Start Stage 15B only after explicit human approval, with the 30-day clock beginning from zero.",
              )}
            </p>
            <div className="related-prediction-list">
              <a href={routeHref("/track-record")}>{copy(language, "公开研究账本", "Public track record")}</a>
              <a href={routeHref("/monthly-reports")}>{copy(language, "月度透明报告", "Monthly transparency reports")}</a>
              <a href={routeHref("/methodology")}>{copy(language, "方法论", "Methodology")}</a>
              <a href={routeHref("/reports")}>{copy(language, "审计中心", "Audit Center")}</a>
            </div>
          </article>
        </div>
      </section>
      <section className="today-section" aria-labelledby="beta-boundary-title">
        <div className="boundary-banner warning">
          <ShieldCheck aria-hidden="true" size={18} />
          <span>{copy(language, "Beta 未启动；不构成正式上线、付费准备、投资建议、交易信号或业绩证明。", "Beta not started; not launch readiness, paid readiness, investment advice, a trading signal, or performance proof.")}</span>
        </div>
        <details className="audit-details">
          <summary id="beta-boundary-title">{copy(language, "查看 Stage 15A 原始状态", "Show Stage 15A raw status")}</summary>
          <ul>
            <li>BETA_READY_NOT_STARTED</li>
            <li>beta_clock_started=false</li>
            <li>thirty_day_beta_complete=false</li>
            <li>paid_subscription_enabled=false</li>
            <li>launch_ready=false</li>
          </ul>
        </details>
      </section>
    </>
  );
}

function MonthlyReportsPage({ language }: { language: Language }) {
  const [state, setState] = useState<MonthlyReportsLoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadMonthlyTransparencyReportIndex()
      .then((index) => {
        if (!cancelled) {
          setState({ kind: "ready", index });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setState(message === "monthly_reports_unavailable" ? { kind: "unavailable", message } : { kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取月度透明报告。", "Loading monthly transparency reports.")}
      </section>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <>
        <PageIntro
          eyebrow={copy(language, "月度透明报告", "Monthly transparency reports")}
          title={copy(language, "月报尚未生成", "Monthly report is not generated yet")}
          body={copy(
            language,
            "Stage 11 会从 live research_ledger.json 聚合月度发布数量、复盘覆盖率、错误案例、数据缺口和改进事项。当前 reports 目录还没有 monthly_transparency_reports.json；页面不会伪造月报。",
            "Stage 11 aggregates monthly publish counts, review coverage, error cases, data gaps, and improvement items from live research_ledger.json. The reports directory does not yet contain monthly_transparency_reports.json; this page does not fabricate a report.",
          )}
          icon={FileText}
        />
        <section className="today-section">
          <div className="related-prediction-list today-links">
            <a href={routeHref("/today")}>{copy(language, "今日简报", "Today's brief")}</a>
            <a href={routeHref("/track-record")}>{copy(language, "公开研究账本", "Public research ledger")}</a>
          </div>
        </section>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "月度透明报告读取失败：", "Monthly transparency reports failed to load:")} {state.message}
      </section>
    );
  }

  const reports = [...state.index.reports].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "月度透明报告", "Monthly transparency reports")}
        title={copy(language, "每月公开错误、缺口和改进项", "Monthly errors, gaps, and improvements")}
        body={copy(
          language,
          "月报不是表现营销页，也不是投资建议、交易信号或业绩证明。它按自然月展示公开判断数量、待复核、阻断、复盘覆盖率、错误案例、数据缺口和下一步改进。",
          "This is not a performance marketing page, investment advice, trading signal, or performance proof. It shows monthly public judgment counts, needs_review, blocked, review coverage, error cases, data gaps, and improvement items.",
        )}
        icon={FileText}
      />
      <section className="today-section">
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "报告数量", "Report count")}</span>
            <strong>{state.index.report_count}</strong>
            <p>{copy(language, "至少一份完整月报是付费准备前置条件。", "At least one complete monthly report is required before paid readiness.")}</p>
          </article>
          <article>
            <span>{copy(language, "最新月份", "Latest month")}</span>
            <strong>{state.index.latest_month || copy(language, "未报告", "Not reported")}</strong>
            <p>{copy(language, "证据层级：smoke evidence，不是 10h/formal acceptance。", "Evidence layer: smoke evidence, not 10h/formal acceptance.")}</p>
          </article>
          <article>
            <span>{copy(language, "生成时间", "Generated at")}</span>
            <strong>{state.index.generated_at || copy(language, "未报告", "Not reported")}</strong>
            <p>{copy(language, "来自公开 reports JSON，不读取私有 provider I/O。", "From public reports JSON, not private provider I/O.")}</p>
          </article>
        </div>
      </section>
      <section className="ledger-section" aria-labelledby="monthly-reports-list-title">
        <div className="ledger-panel">
          <div className="section-heading compact">
            <span>{copy(language, "Stage 11 · smoke evidence", "Stage 11 · smoke evidence")}</span>
            <h2 id="monthly-reports-list-title">{copy(language, "月报列表", "Monthly report list")}</h2>
            <p>{copy(language, "每份月报必须保留错误案例、数据缺口和改进事项区域；不会只展示正向案例。", "Every report must keep error-case, data-gap, and improvement sections; it cannot show only positive cases.")}</p>
          </div>
          {reports.length > 0 ? (
            <div className="ledger-table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>{copy(language, "月份", "Month")}</th>
                    <th>{copy(language, "发布 / 复核 / 阻断", "Published / review / blocked")}</th>
                    <th>{copy(language, "复盘覆盖", "Review coverage")}</th>
                    <th>{copy(language, "错误 / 缺口 / 改进", "Errors / gaps / improvements")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.month}>
                      <td><a href={monthlyReportRouteHref(report.month)}>{report.month}</a></td>
                      <td>{monthlyReportCounters(report, language)}</td>
                      <td>{monthlyReportCoverageSummary(report, language)}</td>
                      <td>{report.error_case_count} / {report.data_gap_count} / {report.improvement_item_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="edge-state-note">{copy(language, "索引存在，但还没有月报条目。", "The index exists, but has no monthly reports yet.")}</div>
          )}
          <details className="audit-details">
            <summary>{copy(language, "Raw artifact / Open JSON", "Raw artifact / Open JSON")}</summary>
            <p className="muted">
              {copy(language, "这是原始审计产物，不是普通阅读页面。普通用户请回到月报列表或今日简报。", "This is a raw audit artifact, not the ordinary reading page. Default readers should return to the monthly report list or today's brief.")}
            </p>
            <a href="/reports/monthly_transparency_reports.json">/reports/monthly_transparency_reports.json</a>
          </details>
        </div>
      </section>
    </>
  );
}

function MonthlyReportDetailPage({ month, language }: { month: string; language: Language }) {
  const [state, setState] = useState<MonthlyReportDetailLoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadMonthlyTransparencyReport(monthlyReportFileForMonth(month))
      .then((report) => {
        if (!cancelled) {
          setState({ kind: "ready", report });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setState(message === "monthly_report_unavailable" ? { kind: "unavailable", message } : { kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取月报详情。", "Loading monthly report detail.")}
      </section>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, `没有找到 ${month} 的月度透明报告。`, `No monthly transparency report was found for ${month}.`)}
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "月报详情读取失败：", "Monthly report detail failed to load:")} {state.message}
      </section>
    );
  }

  const { report } = state;

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "月度透明报告", "Monthly transparency report")}
        title={copy(language, `${report.month} 公开研究透明报告`, `${report.month} public research transparency report`)}
        body={copy(
          language,
          "这份报告公开当月判断数量、复盘覆盖率、错误案例、数据缺口和改进事项。它不是收益证明、不是投资建议，也不是交易信号。",
          "This report exposes monthly judgment counts, review coverage, error cases, data gaps, and improvement items. It is not performance proof, investment advice, or a trading signal.",
        )}
        icon={FileText}
      />
      <section className="today-section">
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "发布 / 待复核 / 阻断", "Published / review / blocked")}</span>
            <strong>{report.published_count} / {report.needs_review_count} / {report.blocked_count}</strong>
            <p>{monthlyReportCounters(report, language)}</p>
          </article>
          <article>
            <span>{copy(language, "复盘覆盖率", "Review coverage")}</span>
            <strong>{report.review_coverage.reviewed_count} / {report.review_coverage.due_count}</strong>
            <p>{monthlyReportCoverageSummary(report, language)}</p>
          </article>
          <article>
            <span>{copy(language, "错误案例", "Error cases")}</span>
            <strong>{report.error_cases.length}</strong>
            <p>{report.error_case_note || copy(language, "错误区域即使为空也会保留。", "The error section remains visible even when empty.")}</p>
          </article>
          <article>
            <span>{copy(language, "数据缺口", "Data gaps")}</span>
            <strong>{report.data_gaps.length}</strong>
            <p>{report.data_gap_note || copy(language, "数据缺口不会被隐藏。", "Data gaps are not hidden.")}</p>
          </article>
        </div>
      </section>
      <section className="today-section">
        <div className="today-agent-grid full-analyst-reader-grid">
          <article className="today-agent-card">
            <h3>{copy(language, "错误案例", "Error cases")}</h3>
            {report.error_cases.length > 0 ? (
              <ul>
                {report.error_cases.slice(0, 8).map((item) => (
                  <li key={item.entry_id}>{item.exchange}:{item.symbol} · {item.window_days}d · {item.attribution || copy(language, "未分类", "unclassified")}</li>
                ))}
              </ul>
            ) : (
              <p>{copy(language, "本月没有 below-benchmark 复盘案例；仍保留错误区域，避免只呈现正向信息。", "No below-benchmark review case this month; the error section remains visible to avoid positive-only reporting.")}</p>
            )}
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "数据缺口", "Data gaps")}</h3>
            {report.data_gaps.length > 0 ? (
              <ul>
                {report.data_gaps.slice(0, 8).map((item) => (
                  <li key={item.entry_id}>{item.exchange}:{item.symbol} · {item.reason || copy(language, "缺少公开复盘数据", "missing public review data")}</li>
                ))}
              </ul>
            ) : (
              <p>{copy(language, "本月未报告到期不可复盘项；后续如果缺少公开价格或基准数据，会在这里显示。", "No due review-unavailable item is reported this month; missing public price or benchmark evidence will appear here.")}</p>
            )}
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "改进事项", "Improvement items")}</h3>
            <ul>
              {report.improvement_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="today-agent-card">
            <h3>{copy(language, "边界", "Boundary")}</h3>
            <p>{report.boundary || copy(language, "透明报告只说明公开研究流程和复盘覆盖，不构成投资建议或交易信号。", "Transparency report only covers public research process and review coverage, not investment advice or trading signals.")}</p>
          </article>
        </div>
        <div className="related-prediction-list today-links">
          <a href={routeHref("/monthly-reports")}>{copy(language, "返回月报列表", "Back to monthly reports")}</a>
          <a href={routeHref("/track-record")}>{copy(language, "打开公开研究账本", "Open public research ledger")}</a>
          <a href={routeHref("/today")}>{copy(language, "今日简报", "Today's brief")}</a>
        </div>
        <details className="audit-details">
          <summary>{copy(language, "查看审计元数据", "Show audit metadata")}</summary>
          <ul>
            <li>schema: {report.schema}</li>
            <li>generated_at: {report.generated_at}</li>
            <li>source_ledger_schema: {report.source_ledger_schema || "not_reported"}</li>
            <li>source_ledger_generated_at: {report.source_ledger_generated_at || "not_reported"}</li>
            <li>report_hash: {report.report_hash || "not_reported"}</li>
          </ul>
          <a href={`/reports/${monthlyReportFileForMonth(report.month)}`}>{`/reports/${monthlyReportFileForMonth(report.month)}`}</a>
        </details>
      </section>
    </>
  );
}

function V40ResearchSystemPanel({ language, compact = false }: { language: Language; compact?: boolean }) {
  const cards = [
    [
      copy(language, "先说为什么研究 + 证据够不够", "Why this research + evidence sufficiency"),
      copy(
        language,
        "先说明为什么今天研究、核心问题、必需证据、数据缺口处理方式，以及哪些结论暂时不能说。",
        "Defines why the stock is studied today, the core questions, required evidence, data_gap handling, and K/F/W/G briefs.",
      ),
    ],
    [
      copy(language, "先打研究底稿", "Research dossier first"),
      copy(
        language,
        "先把公开证据整理成底稿，再让不同视角复核，避免只凭股票代码和价格上下文写结论。",
        "K is not an ordinary parallel agent; it creates the deep research dossier first, then F/W/G run in parallel from K, the task, and the evidence packet.",
      ),
    ],
    [
      copy(language, "综合判断 + 反证审计", "Synthesis + critique"),
      copy(
        language,
        "综合环节说明共识、冲突和证据强弱；反证环节专门找薄弱假设和过度确定风险。",
        "Chairman synthesizes K+F/W/G consensus, conflicts, and evidence strength; Red Team audits and checks counter-evidence, but is not the Judge.",
      ),
    ],
    [
      copy(language, "质量状态 + 知识沉淀", "Quality state + knowledge persistence"),
      copy(
        language,
        "研究质量状态可以是候选、观察、需要复核或数据缺口；能沉淀的知识才进入内部记忆。",
        "Research Quality Gate decides the research status; Knowledge Gate decides persist, limited persist, temporary observation, or do_not_persist.",
      ),
    ],
    [
      copy(language, "读者边界", "Reader boundary"),
      copy(
        language,
        "读者边界只说明这不是投资建议或交易信号，不隐藏数据缺口、需要复核、反证或观点冲突。",
        "Reader Boundary Gate adds research boundaries only; it does not hide data_gap, needs_review, Red Team critique, agent conflicts, or evidence gaps.",
      ),
    ],
  ];

  return (
    <section className={`v35-system-panel ${compact ? "compact" : ""}`} aria-label={copy(language, "公开研究流程说明", "Public research process explanation")}>
      <div className="section-heading compact">
        <span>{copy(language, "研究流程", "Research process")}</span>
        <h2>{copy(language, "先打底，再多视角复核", "Dossier first, then multi-view review")}</h2>
        <p>
          {copy(
            language,
            "普通读者只需要按这个顺序理解：为什么研究、证据够不够、底稿怎么形成、不同视角如何复核、哪些地方仍需复核，以及哪些知识能进入下一轮记忆。",
            "v4 runs research_task -> evidence_packet -> K dossier -> F/W/G -> Chairman -> Red Team -> Research Quality Gate -> Knowledge Gate -> Alaya readback -> Reader Boundary.",
          )}
        </p>
        <p>
          {copy(
            language,
            "内部 Alaya 只指 GOTRA 内部记忆、反馈和回读状态；不是外部服务、外部项目或外部 repo。",
            "Alaya here only means GOTRA repo internal cognition flywheel / knowledge memory / feedback/readback state; it is not an external service, project, or repo.",
          )}
        </p>
      </div>
      <div className="v35-system-grid">
        {cards.map(([title, body]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResearchSystemPanel({ brief, language, compact = false }: { brief?: DailyReaderBrief; language: Language; compact?: boolean }) {
  return !brief || isV40Brief(brief) ? <V40ResearchSystemPanel language={language} compact={compact} /> : <V35ResearchSystemPanel language={language} compact={compact} />;
}

function V35ResearchSystemPanel({ language, compact = false }: { language: Language; compact?: boolean }) {
  const cards = [
    [
      copy(language, "Research task / 研究任务", "Research task"),
      copy(
        language,
        "先说明为什么今天研究这只股票、核心问题是什么、哪些证据缺失时不能下结论。",
        "Defines why the stock is studied today, the core questions, and what cannot be concluded without missing evidence.",
      ),
    ],
    [
      copy(language, "Evidence packet / 证据包", "Evidence packet"),
      copy(
        language,
        "把公开来源、freshness、missing required sources、data_gap 和限制条件放在 agent 之前。",
        "Places public sources, freshness, missing required sources, data_gap, and limitations before the agents write.",
      ),
    ],
    [
      copy(language, "K/F/W/G independent views", "K/F/W/G independent views"),
      copy(
        language,
        "四个视角基于同一任务书和证据包独立输出，保留分歧，而不是把不确定性压扁。",
        "Four views use the same task and evidence packet independently, preserving disagreement instead of flattening uncertainty.",
      ),
    ],
    [
      copy(language, "Chairman synthesis + Red Team audit", "Chairman synthesis + Red Team audit"),
      copy(
        language,
        "Chairman 综合冲突与证据强弱；Red Team audit 专门检查薄弱假设、overclaim 和 needs_review。",
        "Chairman synthesizes conflicts and evidence strength; Red Team audit checks weak assumptions, overclaiming, and needs_review.",
      ),
    ],
    [
      copy(language, "Alaya internal readback", "Alaya internal readback"),
      copy(
        language,
        "Alaya 只指 GOTRA 内部 cognition flywheel / knowledge memory / feedback state / readback，不是外部项目。",
        "Alaya only means GOTRA internal cognition flywheel / knowledge memory / feedback state / readback, not an external project.",
      ),
    ],
  ];

  return (
    <section className={`v35-system-panel ${compact ? "compact" : ""}`} aria-label={copy(language, "legacy v3.5 fallback 说明", "legacy v3.5 fallback explanation")}>
      <div className="section-heading compact">
        <span>{copy(language, "legacy v3.5 fallback", "legacy v3.5 fallback")}</span>
        <h2>{copy(language, "从研究任务到证据包，再到独立复核", "From research task to evidence packet to independent review")}</h2>
        <p>
          {copy(
            language,
            "v3.5 的价值不在于给一个动作答案，而是把 research_task、evidence_packet、K/F/W/G、Chairman、Red Team 和内部 Alaya readback 串成可审计研究链路。",
            "v3.5 is not an action-answer layer; it turns research_task, evidence_packet, K/F/W/G, Chairman, Red Team, and internal Alaya readback into an auditable research chain.",
          )}
        </p>
      </div>
      <div className="v35-system-grid">
        {cards.map(([title, body]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function todayReviewDueItems(brief: DailyReaderBrief): { symbol: string; due: string; status: string }[] {
  return brief.agent_analysis_items
    .map((item) => ({
      symbol: item.symbol,
      due: item.research_signal?.review_due_at ?? "",
      status: item.research_status ?? item.research_signal?.research_status ?? "",
    }))
    .filter((item) => item.due)
    .slice(0, 4);
}

function todayReviewDueSummary(brief: DailyReaderBrief, language: Language): string {
  const dueItems = todayReviewDueItems(brief);
  if (dueItems.length === 0) {
    return copy(language, "今天没有公开报告的复盘到期项。", "No public review-due item is reported today.");
  }
  return dueItems.map((item) => `${item.symbol} ${item.due}`).join(" · ");
}

function TodayPage({ state, language }: { state: DailyReaderBriefLoadState; language: Language }) {
  if (state.kind === "loading") {
    return (
      <span className="sr-only" role="status">
        {copy(language, "正在加载今日简报。", "Loading today's brief.")}
      </span>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        <PageIntro
          eyebrow={copy(language, "今日简报", "Today")}
          title={copy(language, "今日研究简报暂不可用", "Daily Research Brief unavailable")}
          body={copy(language, "公开状态文件无法合成今日简报；页面不会从私有或 raw 产物推断内容。", "The public status files cannot synthesize a daily brief; this page will not infer from private or raw artifacts.")}
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note" role="alert">
          {state.message}
        </section>
      </>
    );
  }

  const { brief } = state;
  const hasWatchlist = brief.watchlist.length > 0;
  const hasKnownGaps = brief.known_gaps.length > 0;
  const selectedAgentItems = brief.agent_analysis_items.slice(0, 8);
  const hasRichAgentBrief = selectedAgentItems.length > 0;
  const topFocusSymbols = selectedAgentItems.slice(0, 5).map((item) => item.symbol);
  const reviewCount = brief.full_analyst.needs_review_count + brief.full_analyst.data_gap_count;
  const reviewDueItems = todayReviewDueItems(brief);
  const cleanTldr = readerTldr(pickLocalized(language, brief.tldr));

  return (
    <>
      <section className="today-hero route-panel productized-today-hero" aria-labelledby="today-title">
        <div className="today-hero-copy">
          <span className="section-index">{copy(language, "今日简报", "Daily brief")}</span>
          <h1 id="today-title">{pickLocalized(language, brief.title)}</h1>
          <p className="today-date-line">
            <time dateTime={brief.brief_date}>{brief.brief_date}</time>
            <span>{copy(language, "生成时间", "Generated")} {formatLiveTimestamp(brief.generated_at, language)}</span>
          </p>
          <p className="today-reader-kicker">
            {copy(
              language,
              "研究简报，不是交易信号。部分项目仍需复核。",
              "Research brief, not a trading signal. Some items require review.",
            )}
          </p>
          <div className="today-tldr">
            <strong>{copy(language, "今天先读什么", "What to read first")}</strong>
            <p>{cleanTldr || pickLocalized(language, brief.reader_summary)}</p>
          </div>
          <div className="today-focus-row" aria-label={copy(language, "今日聚焦标的", "Top focus symbols")}>
            <span>{copy(language, "今日聚焦", "Top focus")}</span>
            {topFocusSymbols.map((symbol) => (
              <strong key={symbol}>{symbol}</strong>
            ))}
          </div>
          <div className="today-context-row">
            <ContextStatusExplainer language={language} type="research_only" />
            <ContextStatusExplainer language={language} type="data_gap" />
            <ContextStatusExplainer language={language} type="needs_review" />
          </div>
          <div className="hero-actions today-actions">
            <a className="primary-action" href="#today-agent-matrix-title">
              {copy(language, "读单票研究", "Read symbol briefs")}
            </a>
            <a className="secondary-action" href={routeHref("/why-gotra")}>
              {copy(language, "为什么这样设计", "Why GOTRA works this way")}
            </a>
            <a className="secondary-action" href={routeHref("/guide")}>
              {copy(language, "先看使用指南", "Read the guide first")}
            </a>
          </div>
        </div>
        <aside className="today-visual-panel" aria-label={copy(language, "今日研究视觉摘要", "Daily research visual summary")}>
          <img
            src={dailyBriefVisual}
            alt={copy(
              language,
              "带有研究便签、来源卡片和复核标记的每日分析简报视觉",
              "Daily analyst brief visual with research notes, source cards, and review markers",
            )}
            loading="eager"
          />
          <div className="today-health-panel">
            <div>
              <span>{copy(language, "公开研究摘要", "Public summaries")}</span>
              <strong>{brief.full_analyst.publish_count}</strong>
            </div>
            <div>
              <span>{copy(language, "待复核 / 缺口", "Review / gaps")}</span>
              <strong>{reviewCount}</strong>
            </div>
            <div>
              <span>{copy(language, "今日状态", "Today state")}</span>
              <strong>{dailyBriefHealthLabel(brief.system_health.full_analyst_canary, language)}</strong>
            </div>
          </div>
        </aside>
      </section>

      <ResearchSystemPanel brief={brief} language={language} compact />

      <section className="today-section" aria-labelledby="today-ops-title">
        <div className="section-heading compact">
          <span>{copy(language, "今日运行概览", "Daily operating snapshot")}</span>
          <h2 id="today-ops-title">{copy(language, "先看发布、复核、缺口和复盘到期", "Start with publishing, review, gaps, and review-due items")}</h2>
          <p>
            {copy(
              language,
              "这些数字来自公开 daily_reader_brief.json 与公开状态文件；它们解释今天能读什么、哪里仍需复核，不是投资建议或交易信号。",
              "These numbers come from public daily_reader_brief.json and public status files; they explain what is readable today and what still needs review, not investment advice or a trading signal.",
            )}
          </p>
        </div>
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "普通日报更新", "Ordinary reports updated")}</span>
            <strong>{brief.daily_report_status.reports_updated_count}</strong>
            <p>{pickLocalized(language, brief.daily_report_status.summary)}</p>
          </article>
          <article>
            <span>{copy(language, "发布 / 待复核 / 数据缺口", "Published / review / data gaps")}</span>
            <strong>{brief.full_analyst.publish_count} / {brief.full_analyst.needs_review_count} / {brief.full_analyst.data_gap_count}</strong>
            <p>{copy(language, "待复核和数据缺口会保留在主路径，不能被读成完整结论。", "Review items and data gaps stay on the main path and must not be read as complete conclusions.")}</p>
          </article>
          <article>
            <span>{copy(language, "复盘到期项", "Review-due items")}</span>
            <strong>{reviewDueItems.length}</strong>
            <p>{todayReviewDueSummary(brief, language)}</p>
          </article>
          <article>
            <span>{copy(language, "公开账本", "Public track record")}</span>
            <strong>{brief.full_analyst.publish_count > 0 ? copy(language, "可核对", "Available") : copy(language, "等待 publish", "Waiting for publish")}</strong>
            <p>
              {copy(language, "只把 PublicationDecision=publish 的研究判断写入 append-only 账本。", "Only PublicationDecision=publish research judgments enter the append-only ledger.")}{" "}
              <a href={routeHref("/track-record")}>{copy(language, "打开公开账本", "Open track record")}</a>
            </p>
          </article>
          <article>
            <span>{copy(language, "月度透明报告", "Monthly report")}</span>
            <strong>{copy(language, "公开错误和缺口", "Errors and gaps")}</strong>
            <p>
              {copy(language, "月报会汇总发布数、复盘覆盖、错误案例、数据缺口和改进事项。", "Monthly reports summarize publish counts, review coverage, error cases, data gaps, and improvements.")}{" "}
              <a href={routeHref("/monthly-reports")}>{copy(language, "打开月报", "Open monthly reports")}</a>
            </p>
          </article>
        </div>
      </section>

      <section className="today-section" aria-labelledby="today-top-items-title">
        <div className="section-heading compact">
          <span>{copy(language, "今日重点", "Top items")}</span>
          <h2 id="today-top-items-title">{copy(language, "今天先看什么", "What to read first today")}</h2>
          <p>{pickLocalized(language, brief.reader_summary)}</p>
        </div>
        <div className="today-card-grid">
          {brief.top_items.map((item) => (
            <article className="today-card" key={item.id}>
              <span>{pickLocalized(language, item.label)}</span>
              <h3>{pickLocalized(language, item.summary)}</h3>
              <p>{pickLocalized(language, item.why_it_matters)}</p>
              {item.raw_text ? (
                <details className="today-agent-details">
                  <summary>{copy(language, "展开原文", "Show original")}</summary>
                  <OriginalText value={item.raw_text} language={language} />
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {state.source === "fallback" || !hasRichAgentBrief ? (
        <section className="route-panel edge-state-note">
          {copy(
            language,
            "Full Analyst rich brief unavailable：当前页面从公开状态文件临时合成 fallback，不能展示完整 per-symbol agent 分析。",
            "Full Analyst rich brief unavailable: this page is using a public-status fallback and cannot show complete per-symbol agent analysis.",
          )}{" "}
          {state.fallbackReason ? <span className="mono">{state.fallbackReason}</span> : null}
        </section>
      ) : null}

      <section className="today-section" aria-labelledby="today-watchlist-title">
        <div className="section-heading compact">
          <span>{copy(language, "研究观察清单", "Research watchlist")}</span>
          <h2 id="today-watchlist-title">{copy(language, "哪些问题需要继续验证", "What still needs verification")}</h2>
          <p>
            {copy(
              language,
              "观察清单只说明下一次需要核对的问题或数据缺口，不是行动指令。",
              "The watchlist only states questions or data gaps to check next; it is not an action instruction.",
            )}
          </p>
        </div>
        {brief.research_watchlist.length > 0 ? (
          <div className="today-watchlist">
            {brief.research_watchlist.map((item) => (
              <article key={`${item.symbol}-${pickLocalized(language, item.question)}`}>
                <strong>{item.symbol}</strong>
                <span>{item.source}</span>
                <p>{pickLocalized(language, item.question)}</p>
                <small>{pickLocalized(language, item.reason)}</small>
                <p>{pickLocalized(language, item.next_check)}</p>
              </article>
            ))}
          </div>
        ) : hasWatchlist ? (
          <div className="today-watchlist">
            {brief.watchlist.map((item) => (
              <article key={`${item.symbol}-${pickLocalized(language, item.reason)}`}>
                <strong>{item.symbol}</strong>
                <span>{copy(language, "数据缺口", "Data gap")}</span>
                <p>{pickLocalized(language, item.reason)}</p>
                <small>{pickLocalized(language, item.reader_takeaway)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="edge-state-note">{copy(language, "今天没有公开标记的数据缺口观察项。", "No public data-gap watch item is marked today.")}</div>
        )}
      </section>

      <section className="report-two-column today-two-column" aria-label={copy(language, "今日变化与缺口", "Changes and gaps")}>
        <div>
          <h2>{copy(language, "研究观察 / 昨日以来变化", "Research observations / changes since last brief")}</h2>
          <ul className="today-list">
            {brief.changes_since_last_brief.map((change) => (
              <li key={`${change.zh}-${change.en}`}>{pickLocalized(language, change)}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>{copy(language, "已知缺口与风险", "Known gaps and risks")}</h2>
          <p className="muted">
            {copy(
              language,
              "缺口来自公开状态文件；页面不会用私有数据或 raw 运行日志补齐。",
              "Gaps come from public status files; this page does not fill them with private data or raw run logs.",
            )}
          </p>
          {hasKnownGaps ? (
            <div className="today-gap-list">
              {brief.known_gaps.map((gap) => (
                <article key={gap.code}>
                  <strong>{gap.symbol ?? gap.code}</strong>
                  <span>{gap.affected_report ?? pickLocalized(language, gap.label)}</span>
                  <p>{pickLocalized(language, gap.explanation)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">{copy(language, "暂无公开标记的数据缺口。", "No public data gap is currently marked.")}</p>
          )}
        </div>
      </section>

      <section className="today-section" aria-labelledby="today-full-analyst-title">
        <div className="section-heading compact">
          <span>{termLabel("full_analyst", language)}</span>
          <h2 id="today-full-analyst-title">{copy(language, "今日研究摘要", "Today's research summary")}</h2>
          <p>
            {copy(
              language,
              "本段解释 v4 完整研究链路（Full Analyst）本次公开发布状态、复核项和数据缺口；它是运行/状态证据和研究过程证据，不是正式验收或投资结论。",
              "This section explains the Full Analyst v4 public publication status, review items, and data gaps; it is runtime/status and research-process evidence, not formal acceptance or an investment conclusion.",
            )}
          </p>
          <p>{pickLocalized(language, brief.full_analyst.summary)}</p>
        </div>
        <div className="status-explanation-grid">
          <StatusExplanationCard rawStatus={brief.full_analyst.run_status ?? brief.research_effectiveness.canary_status} language={language} compact />
          <StatusExplanationCard rawStatus={brief.full_analyst.needs_review_count > 0 ? "needs_review" : "ok"} language={language} compact />
          <StatusExplanationCard rawStatus={brief.full_analyst.data_gap_count > 0 ? "data_gap" : "ok"} language={language} compact />
        </div>
        <div className="today-effect-grid today-full-analyst-grid">
          <article>
            <span>{copy(language, "今日阅读路径", "Reading path")}</span>
            <strong>{copy(language, "摘要 → 正反两面 → 待观察", "Summary → both sides → watch next")}</strong>
            <p>{copy(language, "先读重点，再打开 Full Analyst 原文核对。", "Start with priorities, then open the Full Analyst original when needed.")}</p>
          </article>
          <article>
            <span>{copy(language, "发布 / 复核 / 阻断", "Published / review / blocked")}</span>
            <strong>{brief.full_analyst.publish_count} / {brief.full_analyst.needs_review_count} / {brief.full_analyst.blocked_count}</strong>
            <p>{copy(language, "复核项保留在明面上，方便读者知道哪里还不能过度确定。", "Review items stay visible so readers can see where certainty is not justified yet.")}</p>
          </article>
          <article>
            <span>{copy(language, "数据缺口 / 失败", "Data gaps / failed")}</span>
            <strong>{brief.full_analyst.data_gap_count} / {brief.full_analyst.failed_count}</strong>
            <p>{copy(language, "缺口不是隐藏错误，而是下一轮研究要补的证据。", "A gap is not hidden; it is the evidence to check in the next research cycle.")}</p>
          </article>
        </div>
      </section>

      <section className="today-section" aria-labelledby="today-agent-matrix-title">
        <div className="section-heading compact">
          <span>{copy(language, "单票研究摘要", "Agent analysis matrix")}</span>
          <h2 id="today-agent-matrix-title">{copy(language, "今天研究链路分析了什么", "What the agent analyzed today")}</h2>
          <p>
            {copy(
              language,
              `daily_reader_brief.json 是本页数据源，包含 ${brief.agent_analysis_items.length} 个公开单票研究摘要；本页展示精选样本，完整阅读请打开完整研究链路 reader。`,
              `daily_reader_brief.json is this page's data source and contains ${brief.agent_analysis_items.length} public per-symbol research summaries; this page shows selected examples, and the full reading path is the Full Analyst reader.`,
            )}
          </p>
        </div>
        {hasRichAgentBrief ? (
          <div className="today-agent-grid">
            {selectedAgentItems.map((item) => (
            <article className="today-agent-card" key={item.symbol}>
                <div className="today-agent-head">
                  <span>{copy(language, "单票研究", "Symbol brief")}</span>
                  <strong>{item.symbol}</strong>
                  {item.research_status ? <em className="research-status-pill">{researchStatusLabel(item.research_status, language)}</em> : null}
                  <a className="inline-audit-link" href={symbolProfileRouteHref(item.symbol)}>
                    {copy(language, "打开个股档案", "Open symbol profile")}
                  </a>
                </div>
                <div className="symbol-brief-lede">
                  <span>{termLabel("chairman_synthesis", language)}</span>
                  <p>{firstLocalized(item.chairman_synthesis, language, pickLocalized(language, item.research_summary))}</p>
                </div>
                {item.k_deep_research.length > 0 ? (
                  <div className="symbol-brief-lede">
                    <span>{termLabel("k_dossier", language)}</span>
                    <p>{firstLocalized(item.k_deep_research, language, pickLocalized(language, item.research_summary))}</p>
                  </div>
                ) : (
                  <div className="symbol-brief-lede">
                    <span>{copy(language, "Why it matters", "Why it matters")}</span>
                    <p>{pickLocalized(language, item.research_summary)}</p>
                  </div>
                )}
                <div className="today-agent-columns symbol-brief-columns">
                  <div>
                    <h3>{item.f_partner_view.length > 0 ? copy(language, "F 独立视角", "F partner view") : copy(language, "正向证据", "Positive case")}</h3>
                    <ul>
                      {(item.f_partner_view.length > 0 ? item.f_partner_view : item.positive_case).slice(0, 2).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{item.w_partner_view.length > 0 ? copy(language, "W 独立视角", "W partner view") : copy(language, "反向证据", "Negative case")}</h3>
                    <ul>
                      {(item.w_partner_view.length > 0 ? item.w_partner_view : item.negative_case).slice(0, 2).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{item.red_team_audit.length > 0 ? termTitle("red_team_critique", language) : copy(language, "红队提醒", "Red-team caveat")}</h3>
                    <ul>
                      {(item.red_team_audit.length > 0 ? item.red_team_audit : item.red_team_review).slice(0, 2).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{item.watch_conditions.length > 0 ? termTitle("watch_conditions", language) : copy(language, "下一步观察", "Watch next")}</h3>
                    <ul>
                      {(item.watch_conditions.length > 0 ? item.watch_conditions : item.watch_items).slice(0, 2).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <details className="today-agent-details">
                  <summary>{copy(language, "风险与来源摘要", "Risks and source notes")}</summary>
                  <div className="today-agent-columns">
                    <div>
                      <h3>{copy(language, "风险因素", "Risk factors")}</h3>
                      <ul>
                        {item.risk_factors.slice(0, 3).map((value) => (
                          <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {item.source_notes.length > 0 ? (
                    <ul className="today-source-notes">
                      {item.source_notes.slice(0, 3).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  ) : null}
                  {item.raw_markdown ? (
                    <details className="today-agent-details">
                      <summary>{copy(language, "展开原文", "Show original")}</summary>
                      <OriginalText value={item.raw_markdown} language={language} />
                    </details>
                  ) : null}
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className="edge-state-note">
            {copy(language, "没有可展示的公开 per-symbol agent 分析；请打开 Full Analyst reader 或等待 rich brief artifact。", "No public per-symbol agent analysis is available; open the Full Analyst reader or wait for the rich brief artifact.")}
          </div>
        )}
      </section>

      <section className="report-two-column today-two-column" aria-label={copy(language, "运行框架与内部 Alaya", "Run framework and internal Alaya")}>
        <div>
          <h2>{copy(language, "提示词 / 运行框架摘要", "Prompt / run framework summary")}</h2>
          <p className="muted">
            {copy(
              language,
              "这里只展示公开安全的运行框架摘要，不展示 raw prompt、provider/model I/O 或凭据。",
              "This shows only the public-safe run-framework summary, not raw prompts, provider/model I/O, or credentials.",
            )}
          </p>
          <ul className="today-list">
            {brief.prompt_framework_summary.task_structure.map((item) => (
              <li key={`${item.zh}-${item.en}`}>{pickLocalized(language, item)}</li>
            ))}
            <li>{brief.prompt_framework_summary.judge_gate}</li>
            <li>{brief.prompt_framework_summary.public_safety_scan}</li>
            <li>{brief.prompt_framework_summary.raw_io_policy}</li>
          </ul>
        </div>
        <div>
          <h2>{copy(language, "GOTRA 内部 Alaya 认知飞轮", "GOTRA internal Alaya cognition flywheel")}</h2>
          <p className="muted">
            {copy(
              language,
              "这里的 Alaya 只指 GOTRA repo 内部的 cognition flywheel / knowledge memory / feedback state / readback 状态，不是外部服务。",
              "Alaya here only means the GOTRA repo internal cognition flywheel / knowledge memory / feedback state / readback state, not an external service.",
            )}
          </p>
          <div className="today-effect-grid today-alaya-grid">
            <article>
              <span>mode</span>
              <strong>{brief.internal_alaya.mode}</strong>
            </article>
            <article>
              <span>{copy(language, "同步 / 失败", "Synced / failed")}</span>
              <strong>{brief.internal_alaya.synced_count} / {brief.internal_alaya.failed_count}</strong>
            </article>
            <article>
              <span>{copy(language, "回读 / 失败", "Readback / failed")}</span>
              <strong>{brief.internal_alaya.readback_verified_count} / {brief.internal_alaya.readback_failed_count}</strong>
            </article>
          </div>
          <p className="muted">{pickLocalized(language, brief.internal_alaya.interpretation)}</p>
        </div>
      </section>

      <section className="today-section" aria-labelledby="today-effectiveness-title">
        <div className="section-heading compact">
          <span>{copy(language, "研究过程效果", "Research process effectiveness")}</span>
          <h2 id="today-effectiveness-title">{copy(language, "每天效果如何表达", "How daily effect is represented")}</h2>
          <p>
            {copy(
              language,
              "这里说的是公开日报是否按计划更新、缺口是否被标记、先行试跑是否健康；不是收益、业绩或预测正确性证明。",
              "This describes whether public reports updated, gaps were marked, and the canary is healthy; it is not a return, performance, or prediction-accuracy proof.",
            )}
          </p>
        </div>
        <div className="today-effect-grid">
          <article>
            <span>{copy(language, "日报更新", "Daily update")}</span>
            <strong>{dailyBriefHealthLabel(brief.research_effectiveness.daily_update_status, language)}</strong>
            <p>{brief.research_effectiveness.reports_updated_count} {copy(language, "份日报有公开更新", "reports have public updates")}</p>
          </article>
          <article>
            <span>{copy(language, "数据缺口", "Data gaps")}</span>
            <strong>{brief.research_effectiveness.reports_with_data_gaps_count}</strong>
            <p>{copy(language, "按公开状态文件统计，不补私有数据。", "Counted from public status files only.")}</p>
          </article>
          <article>
            <span>{copy(language, "先行试跑状态", "Canary state")}</span>
            <strong>{dailyBriefHealthLabel(brief.research_effectiveness.canary_status, language)}</strong>
            <p>{copy(language, "先行试跑健康不等于正式上线或结论升级。", "A healthy canary is not a production graduation or conclusion upgrade.")}</p>
          </article>
        </div>
        <div className="report-callout">
          <h3>{copy(language, "读者摘要", "Reader summary")}</h3>
            <p>{pickLocalized(language, brief.research_effectiveness.reader_summary)}</p>
        </div>
      </section>

      <section className="today-section today-reader-boundary" aria-labelledby="today-boundary-title">
        <div className="section-heading compact">
          <span>{copy(language, "阅读边界", "Reader boundary")}</span>
          <h2 id="today-boundary-title">{copy(language, "保留不确定性，而不是重复免责声明", "Keep uncertainty visible without turning the brief into disclaimers")}</h2>
          <p>
            {copy(
              language,
              "今日简报默认只保留轻量边界；完整证据边界、data_gap、needs_review 和内部 Alaya 说明放在 Why GOTRA 与方法论页面。",
              "The daily brief keeps the reader boundary light; the full evidence boundary, data_gap, needs_review, and internal Alaya explanation live on Why GOTRA and Methodology.",
            )}
          </p>
        </div>
        <div className="related-prediction-list today-links">
          <a href={routeHref("/why-gotra")}>{copy(language, "理解 GOTRA 的研究纪律", "Understand GOTRA's research discipline")}</a>
          <a href={routeHref("/methodology")}>{copy(language, "查看完整方法论", "Open full methodology")}</a>
          <a href={routeHref("/sources")}>{copy(language, "核对来源与产物", "Check sources and artifacts")}</a>
        </div>
      </section>

      <section className="today-section" aria-labelledby="today-next-title">
        <div className="section-heading compact">
          <span>{copy(language, "下一步观察", "Next watch")}</span>
          <h2 id="today-next-title">{copy(language, "明天或下一次看什么", "What to watch next")}</h2>
        </div>
        <ul className="today-list next-watch-list">
          {brief.next_watch.map((item) => (
            <li key={`${item.zh}-${item.en}`}>{pickLocalized(language, item)}</li>
          ))}
        </ul>
      </section>

      <section className="today-section" aria-labelledby="today-links-title">
        <div className="section-heading compact">
          <span>{copy(language, "完整材料", "Full materials")}</span>
          <h2 id="today-links-title">{copy(language, "继续核对公开材料", "Inspect the public materials")}</h2>
        </div>
        <div className="related-prediction-list today-links">
          <a href={routeHref("/guide")}>{copy(language, "使用指南", "Guide")}</a>
          <a href={routeHref("/why-gotra")}>{copy(language, "为什么是 GOTRA", "Why GOTRA")}</a>
          <a href={routeHref("/reports")}>{copy(language, "生产日报审计", "Production audit")}</a>
          <a href={routeHref("/monthly-reports")}>{copy(language, "月度透明报告", "Monthly transparency reports")}</a>
          <a href="/reports/latest/">{copy(language, "行情覆盖日报 reader", "Coverage report reader")}</a>
          <a href={routeHref("/reports/full-analyst")}>{copy(language, "Full Analyst reader", "Full Analyst reader")}</a>
        </div>
        <details className="audit-details today-technical-details">
          <summary>{copy(language, "Raw artifact / Open JSON / Open Markdown", "Raw artifact / Open JSON / Open Markdown")}</summary>
          <p className="muted">
            {copy(
              language,
              "以下链接只用于审计公开原始产物；普通阅读路径请返回今日简报、Why GOTRA、报告 reader 或生产审计页。",
              "The links below are only for auditing public raw artifacts; normal reading should return to today's brief, Why GOTRA, report readers, or the production audit page.",
            )}
          </p>
          <div className="related-prediction-list today-links">
            <a href={brief.links.daily_reader_brief}>{copy(language, "Open daily_reader_brief.json", "Open daily_reader_brief.json")}</a>
            <a href={brief.links.latest_report}>{copy(language, "Open coverage latest.md", "Open coverage latest.md")}</a>
            <a href={brief.links.full_analyst_report}>{copy(language, "Open Full Analyst Markdown", "Open Full Analyst Markdown")}</a>
            <a href={brief.links.status_json}>{copy(language, "Open status.json", "Open status.json")}</a>
            <a href={brief.links.full_analyst_status}>{copy(language, "Open Full Analyst status JSON", "Open Full Analyst status JSON")}</a>
            <a href={brief.links.full_analyst_monitor}>{copy(language, "Open monitor JSON", "Open monitor JSON")}</a>
            <a href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today")}</a>
          </div>
          <dl className="source-grid">
            <div>
              <dt>{copy(language, "简报格式版本", "Brief schema version")}</dt>
              <dd>{brief.schema_version}</dd>
            </div>
            <div>
              <dt>{copy(language, "简报日期", "Brief date")}</dt>
              <dd>{brief.brief_date}</dd>
            </div>
            <div>
              <dt>{copy(language, "生成时间", "Generated at")}</dt>
              <dd>{brief.generated_at}</dd>
            </div>
            <div>
              <dt>{copy(language, "运行 ID", "Run ID")}</dt>
              <dd className="mono">{brief.technical_status.run_id ?? brief.full_analyst.run_id}</dd>
            </div>
            <div>
              <dt>{copy(language, "运行状态", "Run status")}</dt>
              <dd>{runtimeStatusText(language, brief.technical_status.run_status ?? brief.full_analyst.run_status)}</dd>
            </div>
            <div>
              <dt>{copy(language, "Judge 闸门", "Judge gate")}</dt>
              <dd>{brief.technical_status.judge_gate ?? brief.prompt_framework_summary.judge_gate}</dd>
            </div>
            <div>
              <dt>{copy(language, "公开安全扫描", "Public safety scan")}</dt>
              <dd>{brief.technical_status.public_safety_scan ?? brief.prompt_framework_summary.public_safety_scan}</dd>
            </div>
            <div>
              <dt>{copy(language, "内部 Alaya 回读", "Internal Alaya readback")}</dt>
              <dd>{brief.technical_status.alaya_readback ?? brief.internal_alaya.readback_status ?? "unknown"}</dd>
            </div>
            <div>
              <dt>artifact path</dt>
              <dd>{brief.technical_status.artifact_path ?? brief.links.daily_reader_brief}</dd>
            </div>
            <div>
              <dt>source</dt>
              <dd>{state.source}</dd>
            </div>
          </dl>
          <p className="muted">
            {copy(
              language,
              "技术字段只用于审计；普通读者默认阅读上方摘要、观察清单、缺口和下一步观察。",
              "Technical fields are for audit only; the default reader experience is the summary, watchlist, gaps, and next-watch sections above.",
            )}
          </p>
        </details>
      </section>
    </>
  );
}

function WhyGotraPage({ language }: { language: Language }) {
  const comparisonRows = [
    [
      copy(language, "输出方式", "Output style"),
      copy(language, "把复杂证据压成一个行动答案。", "Compresses evidence into an action answer."),
      copy(language, "把变化、证据、缺口、反方和下一步拆开。", "Separates changes, evidence, gaps, counterpoints, and next checks."),
    ],
    [
      copy(language, "不确定性处理", "Uncertainty handling"),
      copy(language, "用单一方向感掩盖不确定性。", "Hides uncertainty behind directional certainty."),
      copy(language, "把 unresolved questions、watch conditions 和 confidence boundary 留在明面上。", "Keeps unresolved questions, watch conditions, and confidence boundary visible."),
    ],
    [
      termLabel("data_gap", language),
      copy(language, "常被隐藏，或被 stale data 填平。", "Often hidden or papered over with stale data."),
      copy(language, "明确告诉读者：这里证据还不够，下一步要补什么。", "Tells readers where evidence is incomplete and what to verify next."),
    ],
    [
      termLabel("research_task", language),
      copy(language, "通常直接跳到结论。", "Often jumps directly to an answer."),
      copy(language, "先说明为什么今天研究、核心问题和 must-not-conclude-without。", "Starts with why today, core questions, and must-not-conclude-without."),
    ],
    [
      termLabel("evidence_packet", language),
      copy(language, "来源和 freshness 经常不可见。", "Sources and freshness are often invisible."),
      copy(language, "把 source type、freshness、missing sources 和 data_gap 放在 agent 前。", "Places source type, freshness, missing sources, and data_gap before agents."),
    ],
    [
      termLabel("k_dossier", language),
      copy(language, "多个观点可能只是在薄上下文上并行写。", "Multiple views may write in parallel from thin context."),
      copy(language, "K deep research dossier 先行，F/W/G 必须基于 K 和证据包。", "K deep research dossier runs first; F/W/G must use K and the evidence packet."),
    ],
    [
      termLabel("perspective_agents", language),
      copy(language, "把观点压扁成一致口径。", "Flattens perspectives into one voice."),
      copy(language, "F/W/G 保留独立视角、分歧和证据强弱。", "F/W/G preserve independent views, disagreements, and evidence strength."),
    ],
    [
      termLabel("chairman_synthesis", language),
      copy(language, "常只是总结。", "Often only summarizes."),
      copy(language, "综合共识、冲突、权重、不确定性和 watch conditions。", "Synthesizes consensus, conflicts, weight, uncertainty, and watch conditions."),
    ],
    [
      termLabel("red_team_critique", language),
      copy(language, "容易被当成失败或最终裁判。", "Can be treated as failure or final judge."),
      copy(language, "只做反证和漏洞审计，不替代 Research Quality Gate。", "Audits counter-evidence and weaknesses; does not replace the Research Quality Gate."),
    ],
    [
      termLabel("alaya_internal_readback", language),
      copy(language, "可能被误解成外部服务或黑箱。", "Can be mistaken for an external service or black box."),
      copy(language, "只指 GOTRA 内部 cognition / memory / feedback / readback state。", "Only means GOTRA internal cognition / memory / feedback / readback state."),
    ],
    [
      termLabel("reader_boundary_gate", language),
      copy(language, "边界要么缺失，要么变成免责声明墙。", "Boundaries are either missing or become a wall of disclaimers."),
      copy(language, "Reader Boundary Gate 保留研究内容，只确保不是投资建议或交易信号。", "Reader Boundary Gate keeps research visible while preventing advice or signal framing."),
    ],
    [
      termLabel("needs_review", language),
      copy(language, "容易被包装成确定结论。", "Can be packaged as certainty."),
      copy(language, "作为质量控制保留，阻止薄弱假设直接进入简报。", "Kept as quality control before weak assumptions enter the brief."),
    ],
  ];

  const workflow = [
    [copy(language, "每日变化", "Daily changes"), copy(language, "先看发生了什么，而不是先要结论。", "Start with what changed, not a conclusion.")],
    [copy(language, "证据边界", "Evidence boundary"), copy(language, "把事实、场景、风险和缺口分开。", "Separate facts, scenarios, risks, and gaps.")],
    [copy(language, "红队复核", "Red-team review"), copy(language, "暴露薄弱假设和不能直接相信的地方。", "Expose weak assumptions and what should not be trusted yet.")],
    [copy(language, "内部记忆", "Internal memory"), copy(language, "用内部 readback 保持研究对象可追踪。", "Use internal readback to keep research objects traceable.")],
    [copy(language, "公开简报", "Public brief"), copy(language, "发布 public-safe 摘要和可核对入口。", "Publish public-safe summaries and inspectable links.")],
  ];

  return (
    <>
      <section className="why-hero route-panel" aria-labelledby="why-gotra-title">
        <div className="why-hero-copy">
          <span className="section-index">{copy(language, "为什么是 GOTRA", "Why GOTRA")}</span>
          <h1 id="why-gotra-title">
            {copy(
              language,
              "GOTRA 不是信号机器。",
              "GOTRA is not a signal machine.",
            )}
          </h1>
          <p>
            {copy(
              language,
              "它是一套研究纪律：看清发生了什么、证据够不够、哪里还需要复核。",
              "It is a research discipline for seeing what changed, what is known, and what still needs review.",
            )}
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={routeHref("/today")}>
              {copy(language, "阅读今日简报", "Read today's brief")}
            </a>
            <a className="secondary-action" href={routeHref("/methodology")}>
              {copy(language, "查看方法论", "Open methodology")}
            </a>
            <a className="secondary-action" href={routeHref("/sources")}>
              {copy(language, "核对来源", "Check sources")}
            </a>
          </div>
        </div>
        <figure className="why-visual-frame">
          <img
            src={whyGotraVisual}
            alt={copy(
              language,
              "证据层、数据缺口、红队复核和审计轨迹组成的负责研究系统视觉",
              "Responsible research system visual with evidence layers, data gaps, red-team review, and audit trail",
            )}
            loading="eager"
          />
        </figure>
      </section>

      <section className="why-section" aria-labelledby="why-direct-title">
        <div className="section-heading compact">
          <span>{copy(language, "直接建议的问题", "The problem with direct advice")}</span>
          <h2 id="why-direct-title">{copy(language, "虚假的确定性比不确定性更危险", "False certainty is more dangerous than uncertainty")}</h2>
          <p>
            {copy(
              language,
              "GOTRA 不直接输出行动建议，是因为那通常会隐藏不确定性，把证据压成一个看似便宜的答案，并鼓励用户跳过来源复核。",
              "GOTRA does not output action advice because it can hide uncertainty, compress evidence into a cheap-looking answer, and encourage action without source review.",
            )}
          </p>
        </div>
        <div className="why-problem-grid">
          {[
            copy(language, "隐藏证据不足", "Hides missing evidence"),
            copy(language, "把场景压成单一答案", "Compresses scenarios into one answer"),
            copy(language, "跳过来源复核", "Skips source review"),
            copy(language, "忽略数据缺口", "Ignores data gaps"),
            copy(language, "让信心看起来很便宜", "Makes confidence look cheap"),
          ].map((item) => (
            <article key={item}>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="why-section" aria-labelledby="why-instead-title">
        <div className="section-heading compact">
          <span>{copy(language, "GOTRA 的做法", "What GOTRA does instead")}</span>
          <h2 id="why-instead-title">
            {copy(
              language,
              "GOTRA 的价值不是替你下结论，而是把结论之前的研究过程摊开。",
              "GOTRA's value is not deciding for you; it lays out the research process before a conclusion.",
            )}
          </h2>
        </div>
        <div className="why-workflow">
          {workflow.map(([title, body], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <V40ResearchSystemPanel language={language} />

      <section className="why-section why-two-column" aria-label={copy(language, "缺口与复核价值", "Value of gaps and review")}>
        <article>
          <span>{copy(language, "Why data gaps matter", "Why data gaps matter")}</span>
          <h2>{copy(language, "数据缺口（data_gap）是诚实的研究状态", "data_gap is an honest research state")}</h2>
          <p>
            {copy(
              language,
              "当证据不足时，系统应该停止，而不是编出一个漂亮答案。缺口告诉你哪里还缺公开覆盖、哪里不能用旧数据冒充当前事实、下一步要补什么。",
              "When evidence is insufficient, the system should stop instead of inventing a polished answer. A gap tells you what public coverage is missing, what must not be treated as current, and what to verify next.",
            )}
          </p>
          <ContextStatusExplainer language={language} type="data_gap" />
        </article>
        <article>
          <span>{copy(language, "Why needs review matters", "Why needs review matters")}</span>
          <h2>{copy(language, "需要复核（needs_review）是质量控制，不是失败", "needs_review is quality control, not failure")}</h2>
          <p>
            {copy(
              language,
              "红队复核会指出薄弱假设、冲突来源和不能直接相信的地方。系统拒绝过度确定，反而让研究更可用。",
              "Red-team review points to weak assumptions, conflicting sources, and what cannot be trusted yet. Refusing over-certainty makes the research more useful.",
            )}
          </p>
          <ContextStatusExplainer language={language} type="needs_review" />
        </article>
      </section>

      <section className="why-section" aria-labelledby="why-compare-title">
        <div className="section-heading compact">
          <span>{copy(language, "差异化", "Difference")}</span>
          <h2 id="why-compare-title">{copy(language, "GOTRA 和普通信号工具有什么不同", "GOTRA vs signal tools")}</h2>
        </div>
        <div className="table-scroll">
          <table className="why-comparison-table">
            <thead>
              <tr>
                <th>{copy(language, "维度", "Dimension")}</th>
                <th>{copy(language, "普通信号工具", "Signal tool")}</th>
                <th>GOTRA</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([dimension, other, gotra]) => (
                <tr key={dimension}>
                  <td>{dimension}</td>
                  <td>{other}</td>
                  <td>{gotra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="why-section why-two-column" aria-label={copy(language, "每日怎么读", "How to use GOTRA")}>
        <article className="daily-brief-preview">
          <span>{copy(language, "What you read every day", "What you read every day")}</span>
          <h2>{copy(language, "每天读的是研究秩序", "You read research discipline every day")}</h2>
          <ul>
            <li>{copy(language, "先读 /today 今日重点。", "Start with /today top observations.")}</li>
            <li>{copy(language, "再看单票正反两面和红队提醒。", "Then read both sides and the red-team caveat.")}</li>
            <li>{copy(language, "遇到数据缺口（data_gap），把它当作研究待补项。", "Treat data_gap as research still to complete.")}</li>
            <li>{copy(language, "遇到需要复核（needs_review），看复核理由。", "When needs_review appears, read why.")}</li>
            <li>{copy(language, "用 sources / methodology 复核证据。", "Use sources / methodology to check evidence.")}</li>
          </ul>
        </article>
        <article className="why-boundary-card">
          <span>{copy(language, "What GOTRA will not do", "What GOTRA will not do")}</span>
          <h2>{copy(language, "边界保留在明面上", "Boundaries stay visible")}</h2>
          <ul>
            <li>{copy(language, "不输出 buy / sell / hold。", "No buy / sell / hold.")}</li>
            <li>{copy(language, "不提供 target price 或仓位指导。", "No target price or allocation guidance.")}</li>
            <li>{copy(language, "不承诺结果。", "No promised outcome.")}</li>
            <li>{copy(language, "不公开 hidden provider I/O。", "No hidden provider I/O in the public surface.")}</li>
            <li>{copy(language, "不假装不完整证据已经完整。", "No pretending incomplete evidence is complete.")}</li>
          </ul>
        </article>
      </section>
    </>
  );
}

function FullAnalystReaderPage({ state, language }: { state: DailyReaderBriefLoadState; language: Language }) {
  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取 Full Analyst reader artifact。", "Loading Full Analyst reader artifact.")}
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "Full Analyst reader 暂不可用：", "Full Analyst reader is unavailable:")} {state.message}
      </section>
    );
  }

  const { brief } = state;
  const items = brief.agent_analysis_items.slice(0, 24);
  const v40Reader = isV40Brief(brief);
  const v35Reader =
    !v40Reader &&
    (brief.schema === "gotra.daily_reader_brief.v3_5" ||
      brief.full_analyst.execution_model === "research_task_evidence_independent_agent_calls");
  const v3Reader = v35Reader || brief.schema === "gotra.daily_reader_brief.v3" || brief.full_analyst.execution_model === "independent_agent_calls";

  return (
    <>
      <section className="route-intro full-analyst-reader-hero" aria-labelledby="full-analyst-reader-title">
        <div>
          <span className="section-index">{termTitle("full_analyst", language)}</span>
          <h1 id="full-analyst-reader-title">{copy(language, "完整研究链路阅读器", "Full Analyst Research Reader")}</h1>
          <p>
            {copy(
              language,
              v40Reader
                ? "这是产品化研究阅读层：默认展示为什么今天研究、研究任务、证据是否足够、底稿、多视角复核、综合判断、反证审计、质量状态、知识沉淀、未解决问题和读者边界。Hash/timing 只放在下方审计折叠区。"
                : v35Reader
                ? "这是 Full Analyst v3.5 的产品化阅读层：默认先展示研究任务书、证据包、缺失必需来源，再展示基于证据包的 K/F/W/G 独立视角、主席综合、红队审计、agent timing/status 和 hash。Raw Markdown 只放在下方审计折叠区。"
                : v3Reader
                ? "这是 Full Analyst v3 的产品化阅读层：默认展示独立 agent 调用、K/F/W/G 独立视角、主席综合、红队审计、agent timing/status、证据缺口和观察条件。Raw Markdown 只放在下方审计折叠区。"
                : "这是 Full Analyst v2 的产品化阅读层：默认展示 Ksana 4.1-lite 的 K 深度研究、F/W/G 伙伴视角、主席综合、红队审计、证据缺口和观察条件。Raw Markdown 只放在下方审计折叠区。",
              v40Reader
                ? "This is the product reader for Full Analyst v4 Ksana Cognition Flywheel: why this stock today, research task, evidence packet, K deep research dossier, F/W/G independent perspectives, Chairman synthesis, Red Team critique, Research Quality Gate, Knowledge Gate, persisted memory, unresolved questions, and Reader Boundary are shown first. Hashes and timings stay in the audit disclosure below."
                : v35Reader
                ? "This is the product reader for Full Analyst v3.5: research task, evidence packet, missing required sources, evidence-based K/F/W/G independent views, Chairman synthesis, Red Team audit, agent timing/status, and hashes are shown first. Raw Markdown is only in the audit disclosure below."
                : v3Reader
                ? "This is the product reader for Full Analyst v3: independent agent calls, K/F/W/G independent views, Chairman synthesis, Red Team audit, agent timing/status, evidence gaps, and watch conditions are shown first. Raw Markdown is only in the audit disclosure below."
                : "This is the product reader for Full Analyst v2: K deep research, F/W/G partner views, Chairman synthesis, red-team audit, evidence gaps, and watch conditions are shown first. Raw Markdown is only in the audit disclosure below.",
            )}
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today's brief")}</a>
            <a className="secondary-action" href={routeHref("/reports")}>{copy(language, "打开审计中心", "Open audit center")}</a>
          </div>
        </div>
        <BookOpenCheck aria-hidden="true" size={26} />
      </section>
      <section className="today-section" aria-labelledby="full-analyst-symbols-title">
        <div className="section-heading compact">
          <span>{copy(language, "单票研究", "Symbol research")}</span>
          <h2 id="full-analyst-symbols-title">{copy(language, "按阅读结构展开", "Structured for reading")}</h2>
          <p>{pickLocalized(language, brief.full_analyst.summary)}</p>
        </div>
        <ResearchSystemPanel brief={brief} language={language} compact />
        <nav className="full-analyst-toc" aria-label={copy(language, "研究阅读器目录", "Research reader table of contents")}>
          <strong>{copy(language, "标的目录", "Symbol selector")}</strong>
          {items.map((item) => (
            <a href={`#symbol-${encodeURIComponent(item.symbol)}`} key={`toc-${item.symbol}`}>
              {item.symbol}
            </a>
          ))}
        </nav>
        <div className="today-agent-grid full-analyst-reader-grid">
          {items.map((item) => (
            <article className="today-agent-card" id={`symbol-${item.symbol}`} key={item.symbol}>
              <div className="today-agent-head">
                <span>{copy(language, "标的", "symbol")}</span>
                <strong>{item.symbol}</strong>
                {item.research_status ? <em className="research-status-pill">{researchStatusLabel(item.research_status, language)}</em> : null}
                <a className="inline-audit-link" href={symbolProfileRouteHref(item.symbol)}>
                  {copy(language, "打开个股档案", "Open symbol profile")}
                </a>
              </div>
              <div className="symbol-brief-lede">
                <span>{copy(language, "研究链路说明", "Research chain")}</span>
                <p>
                  {item.execution_model === "deep_research_dossier_then_parallel_perspectives"
                    ? fullAnalystExecutionText(brief, language)
                    : item.execution_model === "research_task_evidence_independent_agent_calls"
                    ? copy(language, "执行模型：研究任务书 + 证据包 + 独立 agent 调用；K/F/W/G 基于证据包运行。", "research task + evidence packet + independent agent calls; K/F/W/G run from the evidence packet.")
                    : item.execution_model === "independent_agent_calls"
                      ? fullAnalystExecutionText(brief, language)
                      : item.execution_model === "multi_perspective_single_call"
                        ? copy(language, "执行模型：一次调用内多视角；不是独立 agent。", "single-call multi-perspective; not independent agents.")
                        : item.execution_model ?? fullAnalystExecutionText(brief, language)}
                </p>
                <a className="inline-audit-link" href={evidencePacketRouteHref(item.symbol)}>
                  {copy(language, "查看证据包审计摘要", "Open EvidencePacket audit summary")}
                </a>
              </div>
              <div className="status-explanation-grid">
                <StatusExplanationCard rawStatus={item.research_status ?? brief.full_analyst.run_status} language={language} compact />
                {item.red_team_verdict ? <StatusExplanationCard rawStatus={item.red_team_verdict} language={language} compact /> : null}
              </div>
              {item.execution_model === "deep_research_dossier_then_parallel_perspectives" || item.execution_model === "independent_agent_calls" || item.execution_model === "research_task_evidence_independent_agent_calls" ? (
                <details className="audit-details symbol-agent-audit-details">
                  <summary>{copy(language, "查看审计元数据", "Show audit metadata")}</summary>
                  <p className="muted">
                    {copy(
                      language,
                      "hash、timing、parallelism、gate hash 和 retry/public-safety trigger 只用于审计；默认阅读应先看研究任务书、证据包、K 深度研究底稿、独立观点、红队复核和知识闸门。",
                      "Hashes, timings, parallelism, gate hashes, and retry/public-safety triggers are audit metadata; default reading should start with the research task, evidence packet, K dossier, independent views, red-team review, and knowledge gate.",
                    )}
                  </p>
                  <div className="symbol-agent-audit-grid" aria-label={copy(language, "v3 agent audit summary", "v3 agent audit summary")}>
                    {metadataEntries(item.agent_statuses, 6).length > 0 ? (
                      <div>
                        <h3>{copy(language, "Agent 状态", "Agent statuses")}</h3>
                        <ul>
                          {metadataEntries(item.agent_statuses, 6).map(([key, value]) => (
                            <li key={`${item.symbol}-status-${key}`}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.agent_timings, 7).length > 0 ? (
                      <div>
                        <h3>{copy(language, "Agent 耗时", "Agent timings")}</h3>
                        <ul>
                          {metadataEntries(item.agent_timings, 7).map(([key, value]) => (
                            <li key={`${item.symbol}-timing-${key}`}>{key}: {value}s</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.agent_retry_counts, 6).length > 0 ? (
                      <div>
                        <h3>{copy(language, "重试次数", "Retry counts")}</h3>
                        <ul>
                          {metadataEntries(item.agent_retry_counts, 6).map(([key, value]) => (
                            <li key={`${item.symbol}-retry-${key}`}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.agent_public_safety_triggers, 6).length > 0 ? (
                      <div>
                        <h3>{termLabel("public_safety_scan", language)}</h3>
                        <ul>
                          {metadataEntries(item.agent_public_safety_triggers, 6).map(([key, value]) => (
                            <li key={`${item.symbol}-trigger-${key}`}>{key}: {value || "none"}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.agent_hashes, 6).length > 0 ? (
                      <div>
                        <h3>{copy(language, "独立输出 hash", "Independent hashes")}</h3>
                        <ul>
                          {metadataEntries(item.agent_hashes, 6).map(([key, value]) => (
                            <li key={`${item.symbol}-hash-${key}`}>{key}: {shortHash(value)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(gateHashRecord(item), 5).length > 0 ? (
                      <div>
                        <h3>{copy(language, "闸门 hash", "Gate hashes")}</h3>
                        <ul>
                          {metadataEntries(gateHashRecord(item), 5).map(([key, value]) => (
                            <li key={`${item.symbol}-gate-hash-${key}`}>{key}: {shortHash(value)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.agent_research_signal_hashes, 6).length > 0 ? (
                      <div>
                        <h3>{copy(language, "ResearchSignal hash", "ResearchSignal hashes")}</h3>
                        <ul>
                          {metadataEntries(item.agent_research_signal_hashes, 6).map(([key, value]) => (
                            <li key={`${item.symbol}-signal-hash-${key}`}>{key}: {shortHash(value)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {metadataEntries(item.parallelism, 3).length > 0 ? (
                      <div>
                        <h3>{copy(language, "并行证据", "Parallelism")}</h3>
                        <ul>
                          {metadataEntries(item.parallelism, 3).map(([key, value]) => (
                            <li key={`${item.symbol}-parallel-${key}`}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}
              <div className="today-agent-columns symbol-brief-columns">
                {analystSectionRows(item, language).map(([title, list]) => (
                  <div key={String(title)}>
                    <h3>{String(title)}</h3>
                    <ul>
                      {list.slice(0, 3).map((value) => (
                        <li key={`${value.zh}-${value.en}`}>{pickLocalized(language, value)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {item.confidence_boundary ? (
                <p className="symbol-confidence-boundary">{pickLocalized(language, item.confidence_boundary)}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <section className="today-section" aria-labelledby="full-analyst-raw-title">
        <details className="audit-details raw-artifact-disclosure">
          <summary id="full-analyst-raw-title">{copy(language, "Raw artifact / Open Markdown", "Raw artifact / Open Markdown")}</summary>
          <p className="muted">
            {copy(
              language,
              "这个链接用于审计原始公开 Markdown，不是默认阅读入口。阅读结束可返回上方产品化 reader 或今日简报。",
              "This link is for auditing the public Markdown artifact, not the default reading entry. Return to the reader or today's brief when done.",
            )}
          </p>
          <div className="related-prediction-list">
            <a href={brief.links.full_analyst_report}>{copy(language, "打开 Full Analyst Markdown 原文", "Open Full Analyst Markdown original")}</a>
            <a href={routeHref("/reports/full-analyst")}>{copy(language, "返回 reader", "Back to reader")}</a>
            <a href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today")}</a>
          </div>
        </details>
      </section>
    </>
  );
}

function EvidencePacketAuditPage({
  state,
  language,
  evidenceId,
}: {
  state: DailyReaderBriefLoadState;
  language: Language;
  evidenceId: string;
}) {
  if (state.kind === "loading") {
    return (
      <section className="route-panel edge-state-note" role="status">
        {copy(language, "正在读取证据包审计摘要。", "Loading EvidencePacket audit summary.")}
      </section>
    );
  }
  if (state.kind === "error") {
    return (
      <section className="route-panel edge-state-note" role="alert">
        {copy(language, "证据包审计摘要暂不可用：", "EvidencePacket audit summary is unavailable:")} {state.message}
      </section>
    );
  }

  const { brief } = state;
  const normalizedEvidenceId = evidenceId.toLowerCase();
  const item =
    normalizedEvidenceId === "latest"
      ? brief.agent_analysis_items[0]
      : brief.agent_analysis_items.find((candidate) => candidate.symbol.toLowerCase() === normalizedEvidenceId || candidate.symbol.replace(":", "_").toLowerCase() === normalizedEvidenceId);
  const evidenceLines = readerMainList(item?.evidence_packet);
  const missingOrGaps = combineReaderLists(item?.evidence_gaps, item?.research_quality_gate, item?.reader_boundary_gate);

  return (
    <>
      <section className="route-intro full-analyst-reader-hero" aria-labelledby="evidence-packet-audit-title">
        <div>
          <span className="section-index">{copy(language, "EvidencePacket 审计", "EvidencePacket audit")}</span>
          <h1 id="evidence-packet-audit-title">{copy(language, "证据包审计摘要", "EvidencePacket audit summary")}</h1>
          <p>
            {copy(
              language,
              "这里展示公开 reader-safe 证据摘要和 Stage 4 schema 检查项。它不是 raw prompt、不是私有 provider I/O，也不是普通阅读主路径；普通读者可返回今日简报或完整研究链路 reader。",
              "This page shows reader-safe evidence summaries and Stage 4 schema checks. It is not a raw prompt, not private provider I/O, and not the main reading path; default readers can return to the daily brief or research reader.",
            )}
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={routeHref("/reports/full-analyst")}>{copy(language, "返回研究阅读器", "Back to research reader")}</a>
            <a className="secondary-action" href={routeHref("/today")}>{copy(language, "返回今日简报", "Back to today's brief")}</a>
          </div>
        </div>
        <Database aria-hidden="true" size={26} />
      </section>
      <section className="today-section" aria-labelledby="evidence-packet-current-title">
        <div className="section-heading compact">
          <span>{copy(language, "当前证据包", "Current packet")}</span>
          <h2 id="evidence-packet-current-title">{item?.symbol ?? evidenceId}</h2>
          <p>
            {copy(
              language,
              item ? "证据摘要来自 daily_reader_brief.v4 的公开字段；完整机器合同由后端 EvidencePacket 生成并校验。" : "没有找到该标的的公开证据包摘要；页面不会从 raw JSON 推断或伪造内容。",
              item ? "The summary comes from public daily_reader_brief.v4 fields; the full machine contract is generated and validated by backend EvidencePacket." : "No public evidence summary was found for this identifier; this page does not infer or fabricate content from raw JSON.",
            )}
          </p>
        </div>
        {item ? (
          <div className="today-agent-grid full-analyst-reader-grid evidence-packet-audit-grid">
            <article className="today-agent-card">
              <div className="today-agent-head">
                <span>{copy(language, "标的", "symbol")}</span>
                <strong>{item.symbol}</strong>
                {item.research_status ? <em className="research-status-pill">{researchStatusLabel(item.research_status, language)}</em> : null}
              </div>
              <h3>{termLabel("evidence_packet", language)}</h3>
              {evidenceLines.length > 0 ? (
                <ul>
                  {evidenceLines.slice(0, 8).map((line) => (
                    <li key={`${line.zh}-${line.en}`}>{pickLocalized(language, line)}</li>
                  ))}
                </ul>
              ) : (
                <p>{copy(language, "公开摘要没有证据包条目；研究对象必须保留 needs_review。", "No public evidence-packet summary is available; the research object must preserve needs_review.")}</p>
              )}
            </article>
            <article className="today-agent-card">
              <h3>{copy(language, "缺失项与数据缺口", "Missing items and data gaps")}</h3>
              {missingOrGaps.length > 0 ? (
                <ul>
                  {missingOrGaps.slice(0, 8).map((line) => (
                    <li key={`${line.zh}-${line.en}`}>{pickLocalized(language, line)}</li>
                  ))}
                </ul>
              ) : (
                <p>{copy(language, "当前公开摘要没有额外缺口说明；仍以 reader boundary 为准。", "The public summary has no additional gap notes; reader boundary still applies.")}</p>
              )}
            </article>
            <article className="today-agent-card">
              <h3>{copy(language, "Stage 4 schema 检查项", "Stage 4 schema checks")}</h3>
              <ul>
                <li>{copy(language, "必须包含 packet_id、symbol、as_of、sources、missing_items、future_data_check。", "Must include packet_id, symbol, as_of, sources, missing_items, and future_data_check.")}</li>
                <li>{copy(language, "每个 source 必须有 retrieved_at；缺失时后端 schema 校验失败。", "Every source must include retrieved_at; backend schema validation fails if it is missing.")}</li>
                <li>{copy(language, "future_data_check=false 时研究运行进入 blocked，不生成可发布判断。", "future_data_check=false blocks the research run; no publishable judgment is generated.")}</li>
                <li>{copy(language, "关键证据缺失会保留 needs_review 或 blocked，而不是包装成完整结论。", "Missing critical evidence remains needs_review or blocked instead of being presented as a complete conclusion.")}</li>
              </ul>
            </article>
          </div>
        ) : (
          <section className="route-panel edge-state-note">
            {copy(language, "未找到证据包摘要。请返回完整研究链路 reader 选择标的。", "Evidence summary not found. Return to the research reader and select a symbol.")}
          </section>
        )}
        <details className="audit-details raw-artifact-disclosure">
          <summary>{copy(language, "Raw artifact / 审计入口", "Raw artifact / audit links")}</summary>
          <p className="muted">
            {copy(
              language,
              "这些链接只用于审计公开产物。页面不会展示 raw provider I/O、完整内部 prompt、secret 或私有路径。",
              "These links are only for auditing public artifacts. This page does not expose raw provider I/O, full internal prompts, secrets, or private paths.",
            )}
          </p>
          <div className="related-prediction-list">
            <a href={brief.links.daily_reader_brief}>{copy(language, "打开 daily_reader_brief.json", "Open daily_reader_brief.json")}</a>
            <a href={brief.links.full_analyst_report}>{copy(language, "打开 Full Analyst Markdown", "Open Full Analyst Markdown")}</a>
            <a href={routeHref("/reports")}>{copy(language, "返回审计中心", "Back to audit center")}</a>
          </div>
        </details>
      </section>
    </>
  );
}

function PerformancePage({
  ledgerMetrics,
  snapshot,
  liveReportsState,
  language,
}: {
  ledgerMetrics: ReturnType<typeof computeSummary>;
  snapshot: PaperPortfolioSnapshot;
  liveReportsState: LiveReportsLoadState;
  language: Language;
}) {
  const latestEquity = snapshot.equity_curve.at(-1);
  const fixtureFutureDated = fixtureIsFutureDated(snapshot.as_of_date);

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "表现说明", "Performance Notes")}
        title={copy(language, "暂无生产表现跟踪", "No production performance tracking yet")}
        body={copy(language, "当前页面不把演示夹具或未来日期样本呈现为生产表现。研究过程效果请看今日简报，生产审计再看生产日报。", "This page does not present demo fixtures or future-dated samples as production performance. Use today's brief for research-process effectiveness, then production reports for audit details.")}
        icon={BarChart3}
      />
      <section className="route-panel performance-shell" aria-labelledby="performance-policy-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <div className="boundary-banner warning">
          <AlertCircle aria-hidden="true" size={18} />
          {copy(
            language,
            "暂无生产表现跟踪。当前只有演示夹具样本；它不构成业绩证明、收益承诺、交易信号或投资建议。",
            "No production performance tracking is available. Only a demo fixture / paper portfolio sample exists; it is not performance proof, a return promise, a trading signal, or investment advice.",
          )}
        </div>
        <LiveProductionStrip state={liveReportsState} language={language} />
        <div className="performance-empty-state">
          <h2 id="performance-policy-title">{copy(language, "生产表现状态", "Production performance status")}</h2>
          <p>
            {copy(
              language,
              "没有新的生产表现账本产物，所以本页不会伪造收益曲线、持仓或表现结论。研究过程效果请转到今日简报核对。",
              "No live performance ledger artifact exists, so this page does not fabricate an equity curve, holdings, or performance conclusion. Use today's brief for research-process effectiveness.",
            )}
          </p>
          <a className="secondary-action" href={routeHref("/reports")}>
            {copy(language, "查看生产日报和先行试跑监控", "Open daily reports and canary")}
          </a>
          <a className="primary-action" href={routeHref("/today")}>
            {copy(language, "阅读今日简报", "Read today's brief")}
          </a>
          <a className="secondary-action" href={routeHref("/track-record")}>
            {copy(language, "查看复盘覆盖率", "Open review coverage")}
          </a>
          <p>
            {copy(
              language,
              "Stage 10 复盘引擎的 ReviewResult、不可复盘原因和错误归因展示在公开研究账本；本页不把它们包装成收益能力、业绩证明或行动指令。",
              "Stage 10 ReviewResult rows, unavailable reasons, and attribution are shown in the public research ledger; this page does not package them as return capability, performance proof, or action guidance.",
            )}
          </p>
        </div>
        <details className="audit-details portfolio-metrics-detail demo-fixture-detail">
          <summary>
            {copy(
              language,
              `查看演示夹具样本（${fixtureFutureDated ? "未来日期样本，" : ""}非当前生产表现）`,
              `View demo fixture (${fixtureFutureDated ? "future-dated sample, " : ""}not current production performance)`,
            )}
          </summary>
          <div className="boundary-banner warning">
            <AlertCircle aria-hidden="true" size={18} />
            {copy(
              language,
              `演示夹具样本 as_of_date=${snapshot.as_of_date}，portfolio_id=${snapshot.portfolio_id}。这是未来日期样本，不是当前生产表现、实盘交易、业绩证明、收益承诺或测试用户验收依据。`,
              `fixture as_of_date=${snapshot.as_of_date}, portfolio_id=${snapshot.portfolio_id}. This is a demo/future fixture, not live trading, performance proof, return promise, or beta-user acceptance evidence.`,
            )}
          </div>
          {snapshot.small_sample_warning ? (
            <div className="boundary-banner warning">
              <AlertCircle aria-hidden="true" size={18} />
              {copy(language, "样本数很小。这个假设组合表现只是 demo 跟踪，不能解释为统计可靠、投资建议或业绩证明。", snapshot.small_sample_warning)}
            </div>
          ) : null}
        <div className="policy-grid">
          <article>
            <span>{copy(language, "策略版本", "policy_version")}</span>
            <strong>{snapshot.policy_version}</strong>
            <p>{snapshot.policy_boundary.shorting === "disabled" ? copy(language, "只做多 / 现金持有。禁用做空。", "Long-only / long-cash. Shorting is disabled.") : copy(language, "见策略边界。", "See policy boundary.")}</p>
          </article>
          <article>
            <span>{copy(language, "基准", "benchmarks")}</span>
            <strong>{snapshot.benchmark_ids.join(" · ")}</strong>
            <p>{copy(language, "基准序列来自权益曲线中的确定性夹具数据，不是实时行情。", "Benchmark series is deterministic fixture data in equity_curve.benchmark_equity.")}</p>
          </article>
          <article>
            <span>{copy(language, "样本数", "sample_size")}</span>
            <strong>{snapshot.metrics.sample_size} {copy(language, "笔已结算假设交易", "settled paper trade")}</strong>
            <p>{copy(language, `当前公开账本另有 ${ledgerMetrics.resolved} 条已结算演示行，不等同于假设组合快照样本。`, `Current public ledger still has ${ledgerMetrics.resolved} resolved demo rows outside this paper snapshot.`)}</p>
          </article>
        </div>
        <details className="audit-details portfolio-metrics-detail">
          <summary>{copy(language, "查看小样本指标（非业绩证明）", "View small-sample metrics (not performance proof)")}</summary>
        <div className="portfolio-metric-grid" aria-label="Paper portfolio metrics">
          <div>
            <span>{copy(language, "累计收益", "Cumulative return")}</span>
            <strong>{formatSignedPercent(snapshot.metrics.cumulative_return_pct)}</strong>
          </div>
          <div>
            <span>{copy(language, "基准收益", "Benchmark return")}</span>
            <strong>{formatSignedPercent(snapshot.metrics.benchmark_return_pct)}</strong>
          </div>
          <div>
            <span>{copy(language, "超额收益", "Excess return")}</span>
            <strong>{formatSignedPercent(snapshot.metrics.excess_return_pct)}</strong>
          </div>
          <div>
            <span>{copy(language, "最大回撤", "Max drawdown")}</span>
            <strong>{formatSignedPercent(snapshot.metrics.max_drawdown_pct)}</strong>
          </div>
          <div>
            <span>{copy(language, "胜率", "Win rate")}</span>
            <strong>{formatPercent(snapshot.metrics.win_rate)}</strong>
          </div>
          <div>
            <span>{copy(language, "平均暴露", "Average exposure")}</span>
            <strong>{formatPercent(snapshot.metrics.average_exposure)}</strong>
          </div>
          <div>
            <span>{copy(language, "换手", "Turnover")}</span>
            <strong>{formatNumber(snapshot.metrics.turnover, 2)}</strong>
          </div>
          <div>
            <span>{copy(language, "成本后收益", "Cost-adjusted return")}</span>
            <strong>{formatSignedPercent(snapshot.metrics.transaction_cost_adjusted_return_pct ?? null)}</strong>
          </div>
        </div>
        </details>
        <PortfolioComparisonBars snapshot={snapshot} language={language} />
        <div className="portfolio-grid">
          <section aria-labelledby="equity-curve-title">
            <h2 id="equity-curve-title">{copy(language, "权益曲线", "Equity curve")}</h2>
            <div className="equity-strip" aria-label={copy(language, "假设组合权益与基准权益", "Paper equity and benchmark equity")}>
              {snapshot.equity_curve.map((point) => (
                <div key={point.date}>
                  <span>{point.date}</span>
                  <strong>{formatCurrency(point.equity, snapshot.currency)}</strong>
                  <small>{copy(language, "基准", "Benchmark")} {formatCurrency(point.benchmark_equity, snapshot.currency)}</small>
                </div>
              ))}
            </div>
            {latestEquity ? (
              <p className="portfolio-footnote">
                {copy(language, `最新假设权益 ${formatCurrency(latestEquity.equity, snapshot.currency)}，基准 ${formatCurrency(latestEquity.benchmark_equity, snapshot.currency)}。`, `Latest paper equity ${formatCurrency(latestEquity.equity, snapshot.currency)} vs benchmark ${formatCurrency(latestEquity.benchmark_equity, snapshot.currency)}.`)}
              </p>
            ) : null}
          </section>
          <section aria-labelledby="cost-policy-title">
            <h2 id="cost-policy-title">{copy(language, "成本假设", "Cost assumptions")}</h2>
            <dl className="cost-list">
              <div>
                <dt>{copy(language, "佣金（bps）", "commission_bps")}</dt>
                <dd>{snapshot.cost_assumptions.commission_bps}</dd>
              </div>
              <div>
                <dt>{copy(language, "滑点（bps）", "slippage_bps")}</dt>
                <dd>{snapshot.cost_assumptions.slippage_bps}</dd>
              </div>
              <div>
                <dt>{copy(language, "汇兑成本（bps）", "fx_cost_bps")}</dt>
                <dd>{snapshot.cost_assumptions.fx_cost_bps}</dd>
              </div>
            </dl>
          </section>
        </div>
        <section className="portfolio-table-shell" aria-labelledby="paper-trades-title">
          <h2 id="paper-trades-title">{copy(language, "假设交易与持仓", "Paper trades and positions")}</h2>
          <div className="table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>prediction_id</th>
                  <th>{copy(language, "股票代码", "Ticker")}</th>
                  <th>{copy(language, "方向", "Side")}</th>
                  <th>{copy(language, "权重", "Weight")}</th>
                  <th>{copy(language, "入场日", "Entry")}</th>
                  <th>{copy(language, "退出日", "Exit")}</th>
                  <th>{copy(language, "净收益", "Net return")}</th>
                  <th>{copy(language, "基准", "Benchmark")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.trades.map((trade) => {
                  const position = snapshot.positions.find((item) => item.prediction_id === trade.prediction_id);
                  return (
                    <tr key={trade.trade_id}>
                      <td className="mono">{trade.prediction_id}</td>
                      <td>{trade.ticker}</td>
                      <td>{position?.side ?? "long"}</td>
                      <td>{formatPercent(trade.weight)}</td>
                      <td>{trade.entry_date}</td>
                      <td>{trade.exit_date}</td>
                      <td>{formatSignedPercent(trade.net_return_pct)}</td>
                      <td>{trade.benchmark_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        </details>
      </section>
    </>
  );
}

function MethodologyPage({ dataset, records, language }: { dataset: LedgerDataset; records: RecordView[]; language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "方法", "Methodology")}
        title={copy(language, "先固定规则，再解释结果", "Fixed rules before interpretation")}
        body={copy(language, "方法页把股票池、预测窗口、结算器、假设组合和数据边界放在结果之前，防止上线后口径漂移。", "This page places universe, horizon, resolver, portfolio, and data boundaries before interpretation so the public product cannot drift after launch.")}
        icon={BookOpenCheck}
      />
      <V40ResearchSystemPanel language={language} />
      <MethodologyProcessGraphic language={language} />
      <section className="route-panel" aria-labelledby="methodology-next-title">
        <div className="section-heading compact">
          <span>{copy(language, "继续阅读", "Continue reading")}</span>
          <h2 id="methodology-next-title">{copy(language, "从方法回到产品路径", "Return from methodology to the product path")}</h2>
          <p>
            {copy(
              language,
              "方法页解释证据边界；日常阅读应回到今日简报、Full Analyst reader、来源页或生产报告审计。",
              "The methodology page explains evidence boundaries; daily reading should return to Today's Brief, the Full Analyst reader, Sources, or production report audit.",
            )}
          </p>
          <div className="status-explanation-grid">
            <StatusExplanationCard rawStatus="PASS_V40_FRONTEND_PRODUCTIZATION_SMOKE" language={language} compact />
            <StatusExplanationCard rawStatus="PASS_WITH_REVIEW_ITEMS_2H_V40_KSANA_COGNITION_FLYWHEEL" language={language} compact />
          </div>
        </div>
        <div className="related-prediction-list today-links">
          <a href={routeHref("/today")}>{copy(language, "今日简报", "Today's brief")}</a>
          <a href={routeHref("/why-gotra")}>{copy(language, "为什么是 GOTRA", "Why GOTRA")}</a>
          <a href={routeHref("/reports")}>{copy(language, "生产报告审计", "Production reports audit")}</a>
          <a href={routeHref("/sources")}>{copy(language, "来源与产物", "Sources and artifacts")}</a>
          <a href={routeHref("/reports/full-analyst")}>{copy(language, "Full Analyst reader", "Full Analyst reader")}</a>
          <a href="/reports/latest/">{copy(language, "Latest report reader", "Latest report reader")}</a>
        </div>
      </section>
      <Suspense fallback={<ChartLoadingSkeleton />}>
        <BoundaryPanel metadata={dataset.metadata} language={language} />
        <CredibilityDashboard records={records} language={language} />
      </Suspense>
    </>
  );
}

function SourcesPage({
  dataset,
  liveReportsState,
  language,
}: {
  dataset: LedgerDataset | null;
  liveReportsState: LiveReportsLoadState;
  language: Language;
}) {
  const showSourceDetails = liveReportsState.kind !== "loading" && dataset !== null;

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "来源与产物", "Sources & Artifacts")}
        title={copy(language, "来源与产物", "Sources and Artifacts")}
        body={copy(language, "来源页先展示生产公开产物，再展示静态演示 / 归档产物；不会公开私有 GOTRA 原始产物。", "The sources page shows live production artifacts first, then static demo/archive artifacts; it never publishes private GOTRA raw artifacts.")}
        icon={Database}
      />
      <V40ResearchSystemPanel language={language} />
      <DataSourcePolicyPanel language={language} />
      <LiveArtifactSources state={liveReportsState} language={language} />
      {showSourceDetails ? (
        <>
          <StaticDemoArtifacts dataset={dataset} language={language} />
          <section className="route-panel" aria-labelledby="sources-title">
            <h2 id="sources-title">{copy(language, "公开可检查的数据面", "What public data can be inspected")}</h2>
            <p>
              {copy(language, "以下摘要来自静态演示 / 归档材料：演示账本、证据索引、清单、内容索引和生成的公开安全快照。它们不是最新生产状态；最新生产状态在上方生产公开产物。", "The following summaries come from static demo/archive materials: demo ledger, evidence index, manifest, content index, and generated public-safe snapshots. They are not the latest production status; live artifacts above are the current production state.")}
            </p>
            <ContentTypeChart language={language} />
            <div className="source-reader-grid" aria-label="Public-safe data surfaces">
              <div>
                <span>{copy(language, "账本快照", "Ledger snapshot")}</span>
                <strong>{dataset.metadata.record_count} {copy(language, "条记录", "records")}</strong>
                <p>{copy(language, "包含预测、状态、证据摘要和边界元数据的公开安全演示记录。", "Public-safe demo records with prediction, status, evidence summary, and boundary metadata.")}</p>
              </div>
              <div>
                <span>{copy(language, "快照日期", "Snapshot date")}</span>
                <strong>{dataset.metadata.snapshot_date}</strong>
                <p>{copy(language, "当前公开数据切片的读者日期。", "Reader-facing date for the current public data cut.")}</p>
              </div>
              <div>
                <span>{copy(language, "内容索引", "Content index")}</span>
                <strong>{contentItems.length} {copy(language, "篇简报", "notes")}</strong>
                <p>{copy(language, "带声明边界和关联预测链接的公开简报 / 报告。", "Public notes and reports with claim boundaries and related prediction links.")}</p>
              </div>
            </div>
            <details className="audit-details">
              <summary>{copy(language, "技术来源", "Technical provenance")}</summary>
              <dl className="source-grid">
                <div>
                  <dt>dataset_id</dt>
                  <dd>{dataset.metadata.dataset_id}</dd>
                </div>
                <div>
                  <dt>dataset_type</dt>
                  <dd>{dataset.metadata.dataset_type}</dd>
                </div>
                <div>
                  <dt>manifest</dt>
                  <dd>public/data/manifest.json</dd>
                </div>
                <div>
                  <dt>evidence_index</dt>
                  <dd>public/data/evidence-index.json</dd>
                </div>
              </dl>
            </details>
          </section>
        </>
      ) : null}
    </>
  );
}

function DataSourcePolicyPanel({ language }: { language: Language }) {
  return (
    <section className="route-panel live-sources-shell" aria-labelledby="data-source-policy-title">
      <div className="section-heading-row">
        <div>
          <span>{copy(language, "免费数据源分层", "Free source layering")}</span>
          <h2 id="data-source-policy-title">{copy(language, "原型期数据源用途与授权边界", "Prototype data-source purpose and authorization boundaries")}</h2>
        </div>
      </div>
      <p>
        {copy(
          language,
          "这些来源只用于公开研究证据、披露事实或宏观背景。价格源有显式 priority chain；免费源不会被描述成生产级实时行情授权，也不会单独支撑商业发布。",
          "These sources are used for public research evidence, disclosure facts, or macro context. Price sources have an explicit priority chain; free sources are not described as production realtime market-data authorization or as sole support for commercial release.",
        )}
      </p>
      <div className="live-artifact-table-wrap data-source-table-wrap">
        <table className="live-artifact-table data-source-policy-table">
          <thead>
            <tr>
              <th>{copy(language, "来源", "Source")}</th>
              <th>{copy(language, "类型", "Type")}</th>
              <th>{copy(language, "市场", "Markets")}</th>
              <th>{copy(language, "用途", "Purpose")}</th>
              <th>{copy(language, "限制", "Limits")}</th>
              <th>{copy(language, "商业边界", "Commercial boundary")}</th>
            </tr>
          </thead>
          <tbody>
            {dataSourcePolicies.map((source) => (
              <tr key={source.id}>
                <td>
                  <strong>{source.name}</strong>
                  <small>{source.id}</small>
                </td>
                <td>{dataSourceText(language, source.sourceType)}</td>
                <td>{source.markets.join(" / ")}</td>
                <td>{dataSourceText(language, source.purpose)}</td>
                <td>{dataSourceText(language, source.limits)}</td>
                <td>{dataSourceText(language, source.commercialBoundary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="audit-details">
        <summary>{copy(language, "查看数据源 priority chain 与硬边界", "Show priority chain and hard boundaries")}</summary>
        <ul>
          <li>{copy(language, "价格源 priority chain: Yahoo chart via GOTRA price_cache -> Stooq -> Alpha Vantage free tier。", "Price source priority chain: Yahoo chart via GOTRA price_cache -> Stooq -> Alpha Vantage free tier.")}</li>
          <li>{copy(language, "SEC EDGAR 必须使用 User-Agent，且不超过 10 requests/second。", "SEC EDGAR must use a User-Agent and stay at or below 10 requests/second.")}</li>
          <li>{copy(language, "FRED 只用于宏观证据；HKEXnews 只用于公告和披露事实。", "FRED is macro evidence only; HKEXnews is for announcements and disclosure facts only.")}</li>
          <li>{copy(language, "完整机器可读配置在后端 config/data_sources.yml；公开页面只展示 reader-safe 摘要。", "The full machine-readable registry lives in backend config/data_sources.yml; this public page only shows a reader-safe summary.")}</li>
        </ul>
      </details>
    </section>
  );
}

function contentTypeLabel(type: ContentItem["type"], language: Language): string {
  return contentTypeText(language, type);
}

function boundaryLabel(boundary: string, language: Language): string {
  switch (boundary) {
    case "research_information_only":
      return copy(language, "研究信息", "Research information only");
    case "not_investment_advice":
      return copy(language, "非投资建议", "Not investment advice");
    case "not_trading_signal":
      return copy(language, "非交易信号", "Not a trading signal");
    case "no_guarantee_of_future_performance":
      return copy(language, "不保证未来表现", "No guarantee of future performance");
    case "no_performance_proof":
      return copy(language, "非业绩证明", "No performance proof");
    case "not_science_public_proof":
      return copy(language, "非科学证明", "Not scientific proof");
    case "demo_public_safe_dataset":
      return copy(language, "公开安全演示数据", "Demo public-safe dataset");
    default:
      return boundary.replaceAll("_", " ");
  }
}

function tagLabel(tag: string, language: Language): string {
  const labels: Record<string, { zh: string; en: string }> = {
    "morning-brief": { zh: "晨间简报", en: "Morning brief" },
    "evening-review": { zh: "晚间复盘", en: "Evening review" },
    "watch-queue": { zh: "观察队列", en: "Watch queue" },
    ledger: { zh: "公开账本", en: "Ledger" },
    "pending-records": { zh: "待判定记录", en: "Pending records" },
    limitations: { zh: "限制", en: "Limitations" },
    "resolved-only": { zh: "仅统计已结算", en: "Resolved-only" },
    "needs-review": { zh: "待复核", en: "Needs review" },
    methodology: { zh: "方法", en: "Methodology" },
    "data-boundary": { zh: "数据边界", en: "Data boundary" },
    "public-ledger": { zh: "公开账本", en: "Public ledger" },
    transparency: { zh: "透明度", en: "Transparency" },
    "paper-portfolio": { zh: "假设 paper 组合", en: "Paper portfolio" },
    operations: { zh: "运营", en: "Operations" },
  };
  const label = labels[tag];
  return label ? copy(language, label.zh, label.en) : tag.replaceAll("-", " ");
}

function localizedReportField(item: ContentItem, language: Language) {
  const report = item.report;
  if (!report) {
    return null;
  }

  if (language === "en") {
    return report;
  }

  if (item.slug === "weekly-ledger-update-2026-06-25") {
    return {
      ...report,
      targets: ["TSM", "NVDA", "3690.HK"],
      today_change: "账本状态未变化；没有新增公开来源包或结算器事件。",
      evidence_status: "今天没有检查新增公开 filing、市场数据源、公司更新或结算器事件；只使用当前公开安全账本行。",
      main_risks: ["已结算参照行可能被误读为新增证明。", "待判定行不能被提前解释为成功或失败。", "港股记录需要单独处理来源、日历、币种和公司行动。"],
      why_today_matters: "晨间队列把已结算参照行与未结算观察行分开，帮助读者先看证据层级，再看是否能更新结论。",
      background_context: [
        "TSM 是已结算半导体参照行，用来说明预测、实际涨跌和误差字段如何进入公开账本。",
        "NVDA 仍是半导体观察行，没有公开 outcome 字段，所以不是成功或失败案例。",
        "3690.HK 保留港股处理问题：来源、交易日历、币种和公司行动都必须明确。",
      ],
      recent_changes: ["没有新增公开来源包。", "没有新增结算器输出。", "没有把当日市场波动用作正确性证据。"],
      positive_view: ["公开账本能把参照行和观察行放在同一视图，降低审计成本。", "待判定行保持待判定，保护 resolved-only 统计口径。", "观察队列给出具体触发条件，而不是一句笼统关注。"],
      opposing_view: ["反方审查：没有新增公开证据，就不能暗示系统今天学到了新的市场事实。", "反方审查：一个已结算参照行不能证明整体准确率或商业价值。", "反方审查：港股来源或公司行动冲突可能阻塞结算，不能强行给结论。"],
      observation_triggers: ["NVDA 到达 outcome 可用日期并获得公开安全 adjusted close 输入。", "3690.HK 的港股来源、日历和公司行动检查通过。", "任何观察行通过政策从待判定变为已结算。"],
      risks_uncertainty: ["没有新增来源包，所以这是操作简报，不是新增证据简报。", "待判定记录可能因数据边界原因继续冻结。", "市场波动本身不能让未结算行可比较。"],
      reader_takeaways: ["读者应看到系统在看什么，以及需要什么证据才会更新。", "这些标的不是买入、卖出、持有、仓位、入场或退出指令。", "价值来自可追溯：对象、证据缺口、下一步触发条件和边界先公开。"],
      comparability: ["TSM 可作为已结算参照，因为存在实际涨跌和误差字段。", "NVDA 与 3690.HK 仍不可比较，因为公开 outcome 字段缺失。", "参照行与观察行属于不同证据层。"],
      error_attribution: ["晨间简报不新增错误归因。", "TSM 只用于解释字段结构，不用于证明系统能力。", "未来归因需要已结算 outcome 和公开安全来源链。"],
      system_learning: ["系统在更新前保持参照、观察和证据层分离。", "弱证据保持弱，不升级成更强认知层。", "下一次更新必须引用具体公开来源或结算器事件。"],
      tomorrow_watch: ["检查 NVDA 是否满足公开安全结算条件。", "检查 3690.HK 的港股来源约束是否清晰。", "新结算行若出现，应复核方向、幅度和归因。"],
    };
  }

  if (item.slug === "error-review-first-public-snapshot") {
    return {
      ...report,
      targets: ["TSM", "MSFT", "NVDA"],
      today_change: "没有写入新结果字段；没有把待判定记录转换成已结算 outcome。",
      evidence_status: "没有附加新的公开安全来源包或结算器输出，因此记录证据缺口，而不是更新判断。",
      main_risks: ["错误行可能被误解为产品失败，而不是审计对象。", "待判定行可能在证据不足时被误计为命中或错误。", "无状态变化的一天需要明确解释证据缺口才有阅读价值。"],
      why_today_matters: "晚间复盘展示收口纪律：什么都没结算时，账本也要明确说明没变、错误仍公开、待判定为什么继续待判定。",
      background_context: ["TSM 是已结算参照行。", "MSFT 是可见错误复盘行，保留它是为了避免只展示成功。", "NVDA 仍是待判定观察行。"],
      recent_changes: ["没有新增结算器输出。", "没有新的公开安全来源包改变判断。", "resolved-only 统计边界不变。"],
      positive_view: ["明确无状态变化可以防止静默回填。", "保留 MSFT 错误行体现账本公开错误的机制。", "待判定原因和下一步检查让安静的一天也可审计。"],
      opposing_view: ["反方审查：无状态变化的一天研究信号有限，不能包装成新结论。", "反方审查：公开错误提升可审计性，但不能证明系统已完成校准。", "反方审查：若未来来源缺失或冲突，诚实输出应是 blocked 或 needs_review。"],
      observation_triggers: ["待判定行到达 outcome 可用日期并获得公开安全 adjusted close 数据。", "出现代码变更、公司行动或交易日历冲突，需要标记 blocked 或 needs_review。", "大误差已结算行进入归因复盘队列。"],
      risks_uncertainty: ["没有来源包意味着没有新判断。", "错误公开需要归因和边界，否则容易被误读。", "预测与实际可比较必须同时具备预测字段和公开安全结果字段。"],
      reader_takeaways: ["无变化的一天仍能说明什么没发生、为什么没发生。", "账本设计是暴露错误和待判定状态，不是给行动指令。", "明天有价值的问题是是否出现公开结算器事件或冲突，而不是价格是否波动。"],
      comparability: ["TSM 与 MSFT 可作为已结算参照，因为公开结果字段存在。", "NVDA 还不可比较，因为公开 outcome 字段缺失。", "预测 vs 实际只适用于已结算行。"],
      error_attribution: ["MSFT 作为错误复盘行保持可见。", "今天没有新增来源包或结算器事件，所以不新增归因。", "未来归因应分离方向错误、幅度错误、证据缺口和流程教训。"],
      system_learning: ["系统今天没有学到新的市场事实。", "它强化了流程规则：没有公开 outcome 字段就不能强行结论化。", "错误必须继续链接到公开安全证据链，供后续流程复盘。"],
      tomorrow_watch: ["检查 NVDA 是否满足公开 adjusted close 输入。", "复核大误差已结算行的方向、幅度和归因。", "任何新增来源包都必须先过数据、声明和安全边界。"],
    };
  }

  return report;
}

function BoundaryChips({ item, language, compact = false }: { item: ContentItem; language: Language; compact?: boolean }) {
  const boundaries = compact ? item.claim_boundary.slice(0, 3) : item.claim_boundary;
  return (
    <div className="boundary-chip-row" aria-label="Claim boundary">
      {boundaries.map((boundary) => (
        <span key={boundary}>{boundaryLabel(boundary, language)}</span>
      ))}
    </div>
  );
}

function RelatedPredictionLinks({ ids, language }: { ids: string[]; language: Language }) {
  if (ids.length === 0) {
    return <p className="muted">{copy(language, "无直接关联的公开预测。", "No directly related public prediction.")}</p>;
  }

  return (
    <div className="related-prediction-list">
      {ids.map((predictionId) => (
        <a className="mono" href={predictionRouteHref(predictionId)} key={predictionId}>
          {copy(language, "查看记录", "View record")} › {predictionId}
        </a>
      ))}
    </div>
  );
}

function reportTldr(item: ContentItem, language: Language): string {
  const localized = localizedReportField(item, language);
  if (localized) {
    return localized.tldr;
  }
  if (item.slug === "weekly-ledger-update-2026-06-25") {
    return copy(
      language,
      "今日观察 TSM、NVDA、3690.HK。结论未变化，因为没有新增公开证据；TSM 只是已结算参照行，NVDA 与 3690.HK 仍是待判定观察行。",
      "Today watches TSM, NVDA, and 3690.HK. The conclusion is unchanged because no new public evidence was added; TSM is only a resolved reference row, while NVDA and 3690.HK remain pending observation rows.",
    );
  }
  if (item.slug === "error-review-first-public-snapshot") {
    return copy(
      language,
      "本日账本无状态变更；没有新增可结算窗口，也没有新增公开证据包。pending / frozen_pending 继续等待 outcome，不回填实际值。",
      "No ledger status changed today; no new eligible resolution window or public evidence packet was added. pending / frozen_pending rows continue waiting for outcomes and are not backfilled.",
    );
  }
  return item.report?.tldr ?? item.summary;
}

function ReportPreviewCard({ item, language }: { item: ContentItem; language: Language }) {
  const report = localizedReportField(item, language);
  if (!report) {
    return null;
  }

  return (
    <div className="report-preview" aria-label={copy(language, "简报预览", "Report preview")}>
      <div className="report-preview-tldr">
        <span>{copy(language, "TLDR", "TLDR")}</span>
        <p>{report.tldr}</p>
      </div>
      <dl>
        <div>
          <dt>{copy(language, "标的", "Targets")}</dt>
          <dd>{report.targets.join(" · ")}</dd>
        </div>
        <div>
          <dt>{copy(language, "今日变化", "Today change")}</dt>
          <dd>{report.today_change}</dd>
        </div>
        <div>
          <dt>{copy(language, "证据状态", "Evidence status")}</dt>
          <dd>{report.evidence_status}</dd>
        </div>
        <div>
          <dt>{copy(language, "主要风险", "Main risks")}</dt>
          <dd>{report.main_risks.slice(0, 2).join(" · ")}</dd>
        </div>
        <div>
          <dt>{copy(language, "阅读时间", "Reading time")}</dt>
          <dd>{report.reading_time_minutes} min · {contentTypeLabel(item.type, language)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ReportListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="brief-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function NoteReportDetail({ item, language }: { item: ContentItem; language: Language }) {
  const report = localizedReportField(item, language);
  if (!report) {
    return null;
  }

  return (
    <section className="note-report" aria-labelledby="note-report-title">
      <div className="note-report-header">
        <div>
          <span className="section-index">{contentTypeLabel(item.type, language)}</span>
          <h2 id="note-report-title">{copy(language, "研究简报", "Research brief")}</h2>
          <p>{copy(language, "先给结论、证据状态和下一步，再展开背景、正反观点、触发条件和边界。", "Conclusion, evidence state, and next step come first; background, opposing review, triggers, and boundary follow.")}</p>
        </div>
        <dl>
          <div>
            <dt>{copy(language, "报告日期", "Report date")}</dt>
            <dd>{formatReaderDateForLanguage(report.report_date, language)}</dd>
          </div>
          <div>
            <dt>{copy(language, "状态", "Status")}</dt>
            <dd>{reportStatusLabel(report.status, language)}</dd>
          </div>
          <div>
            <dt>{copy(language, "结论", "Conclusion")}</dt>
            <dd>{conclusionChangeLabel(report.conclusion_change.status, language)}</dd>
          </div>
        </dl>
      </div>

      <aside className="brief-summary-rail" aria-label={copy(language, "简报摘要栏", "Brief summary rail")}>
        <div>
          <span>{copy(language, "标的", "Targets")}</span>
          <strong>{report.targets.join(" · ")}</strong>
        </div>
        <div>
          <span>{copy(language, "今日变化", "Today change")}</span>
          <strong>{report.today_change}</strong>
        </div>
        <div>
          <span>{copy(language, "证据状态", "Evidence status")}</span>
          <strong>{report.evidence_status}</strong>
        </div>
        <div>
          <span>{copy(language, "主要风险", "Main risks")}</span>
          <strong>{report.main_risks.slice(0, 2).join(" · ")}</strong>
        </div>
        <div>
          <span>{copy(language, "阅读时间", "Reading time")}</span>
          <strong>{report.reading_time_minutes} min</strong>
        </div>
      </aside>

      <section className="report-five-question" aria-label={copy(language, "五问简报摘要", "Five question report summary")}>
        <article>
          <span>1</span>
          <strong>{copy(language, "今天看了什么？", "What did we watch today?")}</strong>
          <p>{report.watched_scope.map((scope) => scope.ticker ?? scope.company ?? scope.label).join(" · ")}</p>
        </article>
        <article>
          <span>2</span>
          <strong>{copy(language, "结论变了吗？", "Did the conclusion change?")}</strong>
          <p>{conclusionChangeLabel(report.conclusion_change.status, language)}</p>
        </article>
        <article>
          <span>3</span>
          <strong>{copy(language, "为什么变 / 为什么没变？", "Why did it change or not change?")}</strong>
          <p>{copy(language, item.slug === "error-review-first-public-snapshot" ? "本日账本无状态变更；无新增公开证据包或 resolver output，因此不更新判断。" : "没有新增公开证据；pending / frozen_pending 不是成功或失败，因此不更新判断。", report.why_or_why_not[0])}</p>
        </article>
        <article>
          <span>4</span>
          <strong>{copy(language, "接下来看什么？", "What do we watch next?")}</strong>
          <p>{report.next_watch_queue.map((item) => item.item).join(" · ")}</p>
        </article>
        <article>
          <span>5</span>
          <strong>{copy(language, "这能当投资建议吗？", "Is this investment advice?")}</strong>
          <p>{copy(language, "不能。它只是研究信息，不是交易信号、实时交易、业绩证明或未来保证。", "No. It is research information only, not a trading signal, live trading, performance proof, or future guarantee.")}</p>
        </article>
      </section>

      <section className="brief-lede" aria-labelledby="brief-why-today-title">
        <span>{copy(language, "为什么今天值得看", "Why today matters")}</span>
        <h3 id="brief-why-today-title">{report.why_today_matters}</h3>
      </section>

      <section className="report-callout" aria-labelledby="report-tldr-title">
        <h3 id="report-tldr-title">TLDR</h3>
        <p>{reportTldr(item, language)}</p>
      </section>

      <div className="brief-report-layout">
        <ReportListSection title={copy(language, "公司 / 行业 / 事件 / 历史账本背景", "Company / industry / event / ledger context")} items={report.background_context} />
        <ReportListSection title={copy(language, "最近变化或无新增证据", "Recent changes or no-new-evidence statement")} items={report.recent_changes} />
        <ReportListSection title={copy(language, "正方观点", "Positive view")} items={report.positive_view} />
        <ReportListSection title={copy(language, "反方审查", "Opposing / red-team view")} items={report.opposing_view} />
      </div>

      <section aria-labelledby="report-watched-title">
        <h3 id="report-watched-title">{copy(language, "今天看了什么 / 复核范围", "Today watched / reviewed scope")}</h3>
        <div className="report-watch-grid">
          {report.watched_scope.map((scope) => (
            <article key={`${scope.label}-${scope.prediction_id ?? scope.ticker ?? scope.company}`}>
              <div className="content-card-meta">
                <span>{scopeLayerLabel(scope.layer, language)}</span>
                {scope.resolution_status ? <span>{ledgerStatusReaderLabel(scope.resolution_status, language)}</span> : null}
              </div>
              <h4>{scope.label}</h4>
              <dl>
                {scope.ticker ? (
                  <div>
                    <dt>{copy(language, "股票代码", "Ticker")}</dt>
                    <dd className="mono">{scope.ticker}</dd>
                  </div>
                ) : null}
                {scope.company ? (
                  <div>
                    <dt>{copy(language, "公司", "Company")}</dt>
                    <dd>{scope.company}</dd>
                  </div>
                ) : null}
                {scope.prediction_id ? (
                  <div>
                    <dt>{copy(language, "记录", "Prediction")}</dt>
                    <dd>
                      <a className="mono" href={predictionRouteHref(scope.prediction_id)}>
                        {copy(language, "查看记录", "View record")} › {scope.prediction_id}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p>{copy(language, scope.resolution_status === "resolved" ? "作为已结算参照行复核；它不是新增证明。" : "作为待判定观察行保留；不补写结果字段，不把待判定当成成功或失败。", scope.why_watched)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-two-column" aria-label="Ledger and evidence update">
        <div>
          <h3>{copy(language, "账本变化", "Ledger changes")}</h3>
          <ul>
            {(language === "zh" && item.slug === "error-review-first-public-snapshot"
              ? ["本日账本无状态变更。", "pending 与 frozen_pending 记录继续等待公开 outcome，不回填。", "已结算行只作为历史账本状态复核。"]
              : report.ledger_changes
            ).map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{copy(language, "证据更新", "Evidence update")}</h3>
          <div className="report-evidence-list">
            {report.evidence_updates.map((update) => (
              <article key={`${update.topic}-${update.evidence_layer}`}>
                <span>{evidenceLayerLabel(update.evidence_layer, language)}</span>
                <strong>{update.topic}</strong>
                <p>{copy(language, "本简报未新增外部公开证据；仅使用当前公开安全账本状态说明观察队列和边界。", update.update)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="report-two-column" aria-label="Conclusion change and rationale">
        <div className="report-callout">
          <h3>{copy(language, "结论变了吗？", "Conclusion change")}</h3>
          <strong>{conclusionChangeLabel(report.conclusion_change.status, language)}</strong>
          <p>{copy(language, item.slug === "error-review-first-public-snapshot" ? "本日账本无状态变更，且没有新增公开证据包或 resolver output，因此结论未变化。" : "没有新增公开证据；观察队列保持原状态，因此结论未变化。", report.conclusion_change.summary)}</p>
        </div>
        <div>
          <h3>{copy(language, "为什么变 / 为什么没变？", "Why / why not")}</h3>
          <ul>
            {(language === "zh"
              ? ["只使用当前公开安全账本行。", "没有新增公开文件、市场数据来源或公司更新。", "待判定 / 冻结待判定不是成功或失败。", "市场波动本身不能作为预测正确性证据。"]
              : report.why_or_why_not
            ).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="report-next-title">
        <h3 id="report-next-title">{copy(language, "接下来看什么", "Next watch queue")}</h3>
        <div className="report-queue-grid">
          {report.next_watch_queue.map((queueItem) => (
            <article key={`${queueItem.item}-${queueItem.next_check}`}>
              <strong>{queueItem.item}</strong>
              <p>{copy(language, "等待公开 source / resolver 输入达到可结算条件；不到条件不补数。", queueItem.next_check)}</p>
              <small>{copy(language, "下一步必须是可验证触发条件，不是笼统“继续关注”。", queueItem.reason)}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="brief-report-layout">
        <ReportListSection title={copy(language, "可对照性", "Comparability")} items={report.comparability} />
        <ReportListSection title={copy(language, "误差 / 方向 / 幅度 / 归因", "Error / direction / magnitude / attribution")} items={report.error_attribution} />
        <ReportListSection title={copy(language, "系统学到了什么", "What the system learned")} items={report.system_learning} />
        <ReportListSection title={copy(language, "明日继续观察", "What to observe tomorrow")} items={report.tomorrow_watch} />
        <ReportListSection title={copy(language, "风险与不确定性", "Risks and uncertainty")} items={report.risks_uncertainty} />
        <ReportListSection title={copy(language, "读者可带走什么", "Reader takeaways")} items={report.reader_takeaways} />
      </div>

    </section>
  );
}

function ReportsPage({ language }: { language: Language }) {
  const [loadState, setLoadState] = useState<ReportDeskLoadState>({ kind: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    const statusUrl = reportAssetPath("status.json");
    const markdownUrl = reportAssetPath("latest.md");
    const fullAnalystStatusUrl = reportAssetPath("status_full_analyst_evening_hk.json");
    const fullAnalystMonitorUrl = reportAssetPath("status_full_analyst_monitor.json");
    setIsRefreshing(true);

    try {
      const [statusResult, markdownResult, marketStatusResult, fullAnalystStatusResult, fullAnalystMonitorResult] = await Promise.allSettled([
        fetchJson<ReportRawStatus>(statusUrl),
        fetchText(markdownUrl),
        fetchMarketReportStatuses(),
        fetchJson<ReportRawStatus>(fullAnalystStatusUrl),
        fetchJson<ReportRawStatus>(fullAnalystMonitorUrl),
      ]);
      setLoadState({
        kind: "ready",
        ...buildReportDeskArtifacts(statusResult, markdownResult),
        marketStatuses:
          marketStatusResult.status === "fulfilled"
            ? marketStatusResult.value
            : marketStatusFallbacks(marketStatusResult.reason instanceof Error ? marketStatusResult.reason.message : String(marketStatusResult.reason)),
        fullAnalystPilot:
          fullAnalystStatusResult.status === "fulfilled"
            ? normalizeFullAnalystPilotStatus(fullAnalystStatusResult.value)
            : null,
        fullAnalystMonitor:
          fullAnalystMonitorResult.status === "fulfilled"
            ? normalizeFullAnalystMonitorStatus(fullAnalystMonitorResult.value)
            : null,
        fullAnalystPilotError:
          fullAnalystStatusResult.status === "rejected"
            ? fullAnalystStatusResult.reason instanceof Error
              ? fullAnalystStatusResult.reason.message
              : String(fullAnalystStatusResult.reason)
            : null,
        fullAnalystMonitorError:
          fullAnalystMonitorResult.status === "rejected"
            ? fullAnalystMonitorResult.reason instanceof Error
              ? fullAnalystMonitorResult.reason.message
              : String(fullAnalystMonitorResult.reason)
            : null,
        lastFetchedAt: new Date().toISOString(),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const deskProps =
    loadState.kind === "ready"
      ? {
          status: loadState.status,
          statusError: loadState.statusError,
          markdown: loadState.markdown,
          markdownError: loadState.markdownError,
          marketStatuses: loadState.marketStatuses,
          fullAnalystMonitor: loadState.fullAnalystMonitor,
          fullAnalystMonitorError: loadState.fullAnalystMonitorError,
          fullAnalystPilot: loadState.fullAnalystPilot,
          fullAnalystPilotError: loadState.fullAnalystPilotError,
          lastFetchedAt: loadState.lastFetchedAt,
        }
      : {
          status: null,
          statusError: null,
          markdown: null,
          markdownError: null,
          marketStatuses: marketStatusFallbacks(null),
          fullAnalystMonitor: null,
          fullAnalystMonitorError: null,
          fullAnalystPilot: null,
          fullAnalystPilotError: null,
          lastFetchedAt: null,
        };

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "公开产物审计", "Public artifact audit")}
        title={copy(language, "审计中心", "Audit Center")}
        body={copy(
          language,
          "完整状态、覆盖率、数据缺口和公开产物链接在这里审计；普通读者每日入口请看今日简报。不是投资建议、交易信号、业绩证明或科学证明。",
          "Audit complete status, coverage, data gaps, and public artifact links here; everyday readers should start with Today's Brief. Not investment advice, not a trading signal, and not performance proof or science proof.",
        )}
        icon={FileText}
      />
      <ReportTypeIndex language={language} />
      {loadState.kind === "loading" ? (
        <section className="route-panel reports-shell analyst-desk-shell" aria-labelledby="reports-loading-title">
          <div className="edge-state-note" role="status" id="reports-loading-title">
            {copy(language, "正在加载生产日报状态和最新 Markdown 产物。", "Loading production daily status and latest markdown artifacts.")}
          </div>
        </section>
      ) : null}
      {loadState.kind !== "loading" ? (
        <Suspense fallback={<ChartLoadingSkeleton />}>
          <AnalystDesk
            language={language}
            {...deskProps}
            isRefreshing={isRefreshing}
            onRefresh={loadReports}
            assetHref={reportAssetPath}
          />
        </Suspense>
      ) : null}
    </>
  );
}

function ReportTypeIndex({ language }: { language: Language }) {
  return (
    <section className="route-panel report-type-index" aria-labelledby="report-type-index-title">
      <div className="section-heading compact">
        <span>{copy(language, "报告类型", "Report types")}</span>
        <h2 id="report-type-index-title">{copy(language, "先分清这些公开产物", "Separate these public artifacts first")}</h2>
        <p>
          {copy(
            language,
            "审计中心同时展示覆盖日报、研究链路产物、状态 JSON 和监控产物；它们都是运行/状态证据或研究过程证据，不是投资建议、交易信号、科学证明或业绩证明。",
            "The Audit Center shows coverage reports, Full Analyst v4, status JSON, and monitor artifacts; all are runtime/status or research-process evidence, not investment advice, trading signals, science proof, or performance proof.",
          )}
        </p>
      </div>
      <div className="report-type-grid">
        {guideReportTypes.map((item) => (
          <a href={item.href} key={item.id}>
            <strong>{guideCopy(item.label, language)}</strong>
            <p>{guideCopy(item.body, language)}</p>
          </a>
        ))}
      </div>
      <div className="evidence-boundary">
        <p className="desk-source-note">
          {copy(
            language,
            "v4 的审计中心追踪研究任务书、证据包、K 深度研究底稿、F/W/G 独立视角、主席综合、红队反证审计、研究质量闸门、知识闸门与 GOTRA 内部 Alaya 回读；Alaya 只指 repo 内部 cognition flywheel / knowledge memory / feedback state，不是外部服务。",
            "The v4 Audit Center tracks Research Task, Evidence Packet, K dossier, F/W/G, Chairman, Red Team, Research Quality Gate, Knowledge Gate, and GOTRA internal Alaya readback; Alaya only means the repo-internal cognition flywheel / knowledge memory / feedback state, not an external service.",
          )}
        </p>
        <div className="status-explanation-grid">
          <StatusExplanationCard rawStatus="completed_with_review_items" language={language} compact />
          <StatusExplanationCard rawStatus="needs_review" language={language} compact />
          <StatusExplanationCard rawStatus="data_gap" language={language} compact />
        </div>
      </div>
    </section>
  );
}

function HowToReadGotra({ language }: { language: Language }) {
  return (
    <section className="reader-guide" aria-labelledby="reader-guide-title">
      <div className="section-heading compact">
        <span>{copy(language, "阅读路径", "Reading path")}</span>
        <h2 id="reader-guide-title">{copy(language, "如何阅读 GOTRA", "How to read GOTRA")}</h2>
        <p>
          {copy(
              language,
              "阅读顺序把今日简报、研究阅读器、审计中心、来源和方法论分开；Demo/表现说明只作为归档入口，不是主阅读路径。",
              "The reading order separates Today's Brief, the v4 Full Analyst reader, Audit Center, Sources, and Methodology; Demo and performance notes are archive-only, not the main reading path.",
          )}
        </p>
      </div>
      <div className="reader-guide-grid">
        {guideReadingOrder.map((entry, index) => (
          <a href={entry.href} key={entry.href}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{guideCopy(entry.title, language)}</strong>
            <p>{guideCopy(entry.body, language)}</p>
          </a>
        ))}
      </div>
      <div className="reader-guide-actions">
        <a className="secondary-action" href={routeHref("/guide")}>
          {copy(language, "打开完整使用指南", "Open the full guide")}
        </a>
      </div>
    </section>
  );
}

function GuidePage({ language }: { language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "使用指南", "Guide")}
        title={copy(language, "如何阅读 GOTRA", "How to read GOTRA")}
        body={copy(
          language,
          "这页解释普通读者每天应该先看什么、生产日报和研究阅读器各自代表什么、内部 Alaya 如何限定，以及哪些说法不能被升级成投资或业绩声明。",
          "This page explains what everyday readers should read first, what production reports and Full Analyst mean, how internal Alaya is bounded, and which claims must not be upgraded into investment or performance statements.",
        )}
        icon={BookOpenCheck}
      />

      <section className="guide-hero route-panel" aria-labelledby="guide-reading-title">
        <div className="section-heading compact">
          <span>{copy(language, "七步阅读顺序", "Seven-step reading order")}</span>
          <h2 id="guide-reading-title">{copy(language, "从摘要到审计，再到方法", "From summary to audit to method")}</h2>
          <p>
            {copy(
              language,
              "按这个顺序读，能避免把 demo、状态证据、先行试跑、方法说明和正式结论混在一起。",
              "Reading in this order prevents demo data, status evidence, canary output, method notes, and formal conclusions from being mixed together.",
            )}
          </p>
        </div>
        <ol className="guide-step-list">
          {guideReadingOrder.map((step) => (
            <li key={step.id}>
              <a href={step.href}>
                <span>{step.route}</span>
                <strong>{guideCopy(step.title, language)}</strong>
                <p>{guideCopy(step.body, language)}</p>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-section" aria-labelledby="guide-flow-title">
        <div className="section-heading compact">
          <span>{copy(language, "每日系统流", "Daily system flow")}</span>
          <h2 id="guide-flow-title">{copy(language, "从股票池到公开产物", "From universe to public artifacts")}</h2>
          <p>
            {copy(
              language,
              "这不是后端重跑说明，而是读者理解公开页面时需要知道的运行链路和边界。",
              "This is not an instruction to rerun the backend; it is the operating chain and boundary readers need for interpreting the public site.",
            )}
          </p>
        </div>
        <div className="guide-flow-grid">
          {guideSystemFlow.map((step, index) => (
            <article key={step.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{guideCopy(step.title, language)}</h3>
              <p>{guideCopy(step.body, language)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-report-types-title">
        <div className="section-heading compact">
          <span>{copy(language, "公开产物", "Public artifacts")}</span>
          <h2 id="guide-report-types-title">{copy(language, "报告类型怎么分", "How report types differ")}</h2>
          <p>
            {copy(
              language,
              "`/reports/latest/` 是行情覆盖日报 reader；研究阅读器是单独的候选研究阅读层。两者都不是交易信号。",
              "`/reports/latest/` is the coverage report reader; Full Analyst reader is a separate canary research reading layer. Neither is a trading signal.",
            )}
          </p>
        </div>
        <div className="report-type-grid">
          {guideReportTypes.map((item) => (
            <a href={item.href} key={item.id}>
              <strong>{guideCopy(item.label, language)}</strong>
              <p>{guideCopy(item.body, language)}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-paths-title">
        <div className="section-heading compact">
          <span>{copy(language, "三条读者路径", "Three reader paths")}</span>
          <h2 id="guide-paths-title">{copy(language, "普通读者、每日读者和审计者看到不同层级", "Beginners, daily readers, and auditors use different layers")}</h2>
          <p>
            {copy(
              language,
              "GOTRA v4 把研究过程产品化，但不要求每个人先读 hash、timing 或 raw JSON。先读简报；需要追证据时再打开审计中心。",
              "GOTRA v4 productizes the research process, but nobody has to start with hashes, timings, or raw JSON. Start with the brief; open the Audit Center when you need evidence.",
            )}
          </p>
        </div>
        <div className="guide-playbook-grid">
          <article>
            <h3>{copy(language, "新用户路径", "Beginner path")}</h3>
            <ol>
              <li>{copy(language, "从 /today 读 TLDR 和 top observations。", "Start at /today for TLDR and top observations.")}</li>
              <li>{copy(language, "先看需要复核（needs_review）/ 数据缺口（data_gap）的简短解释。", "Read the short needs_review / data_gap explanation.")}</li>
              <li>{copy(language, "不要把研究状态当成交易按钮。", "Do not treat research status as a trading button.")}</li>
            </ol>
          </article>
          <article>
            <h3>{copy(language, "每日读者路径", "Daily reader path")}</h3>
            <ol>
              <li>{copy(language, "打开研究阅读器。", "Open the Research Reader.")}</li>
              <li>{copy(language, "按研究任务、证据、底稿、多视角复核、综合判断、反证审计顺序读。", "Read Research Task, Evidence Packet, K dossier, F/W/G, Chairman, and Red Team in order.")}</li>
              <li>{copy(language, "用观察条件和未解决问题安排下一步复核。", "Use watch conditions and unresolved questions for the next review.")}</li>
            </ol>
          </article>
          <article>
            <h3>{copy(language, "审计者路径", "Auditor path")}</h3>
            <ol>
              <li>{copy(language, "从审计中心查看生产状态徽标。", "Start from Audit Center live status badges.")}</li>
              <li>{copy(language, "在 details 中打开原始审计产物，不把 raw JSON 当 reader。", "Open raw artifacts in details; do not treat raw JSON as the reader.")}</li>
              <li>{copy(language, "核对内部 Alaya 回读、公开安全扫描、fallback 和证据层级。", "Check Alaya readback, public safety, fallback, and evidence layer.")}</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-playbooks-title">
        <div className="section-heading compact">
          <span>{copy(language, "复核手册", "Review playbook")}</span>
          <h2 id="guide-playbooks-title">{copy(language, "需要复核、数据缺口和原始审计产物怎么读", "How to read needs_review, data_gap, and raw artifacts")}</h2>
        </div>
        <div className="guide-playbook-grid">
          <article>
            <h3>{termLabel("needs_review", language)}</h3>
            <p>{copy(language, "这是质量控制，不是工程失败。先看红队反证审计、弱假设、冲突来源和研究质量闸门理由。", "This is quality control, not an engineering failure. Read Red Team critique, weak assumptions, conflicting sources, and Research Quality Gate reasons first.")}</p>
          </article>
          <article>
            <h3>{termLabel("data_gap", language)}</h3>
            <p>{copy(language, "这是证据缺口，不应被页面隐藏。看缺失必需来源、过期来源和下一轮需要补的公开来源。", "This is an evidence gap and should not be hidden. Check missing required sources, stale sources, and the public sources needed next.")}</p>
          </article>
          <article>
            <h3>{termLabel("raw_artifact", language)}</h3>
            <p>{copy(language, "raw JSON、Markdown、hash 和 timing 只在审计中心 details 中打开；主阅读路径始终回到 /today 或完整研究链路 reader。", "Raw JSON, Markdown, hashes, and timings open only inside Evidence Center details; the main reading path returns to /today or the Research Reader.")}</p>
          </article>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="guide-glossary-title">
        <div className="section-heading compact">
          <span>{copy(language, "术语表", "Glossary")}</span>
          <h2 id="guide-glossary-title">{copy(language, "关键术语", "Key terms")}</h2>
          <p>
            {copy(
              language,
              "这些术语在今日简报、生产日报、来源页和方法论里反复出现。",
              "These terms recur across Today's Brief, Production Reports, Sources, and Methodology.",
            )}
          </p>
        </div>
        <dl className="guide-glossary-grid">
          {guideGlossary.map((item) => (
            <div key={item.term}>
              <dt>
                <span>{item.term}</span>
                <strong>{guideCopy(item.label, language)}</strong>
              </dt>
              <dd>{guideCopy(item.definition, language)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="guide-section guide-boundary-section" aria-labelledby="guide-boundary-title">
        <div className="section-heading compact">
          <span>{copy(language, "证据边界", "Evidence boundary")}</span>
          <h2 id="guide-boundary-title">{copy(language, "不要把这些层级混起来", "Do not merge these layers")}</h2>
          <p>
            {copy(
              language,
              "local checks、browser smoke、public artifact smoke、long-run/formal acceptance、science/public claim 是不同证据层。这个站点目前提供的是公开可检查的运行/状态与演示材料，不提供投资建议、交易性指令、科学验证结论或业绩证明。",
              "Local checks, browser smoke, public artifact smoke, long-run/formal acceptance, and science/public claim are separate evidence layers. This site currently provides inspectable public runtime/status and demo materials, not investment advice, trading signals, science proof, or performance proof.",
            )}
          </p>
        </div>
        <div className="today-boundary-grid">
          {[
            copy(language, "研究信息，不是投资建议", "Research information, not investment advice"),
            copy(language, "不是交易信号或仓位指令", "Not a trading signal or position instruction"),
            copy(language, "不是业绩证明或未来表现保证", "Not performance proof or a return promise"),
            copy(language, "不是科学/公开有效性证明", "Not science/public validity proof"),
            copy(language, "研究阅读器仍是候选研究路径", "Full Analyst remains candidate/canary"),
            copy(language, "内部 Alaya 不是外部服务", "Internal Alaya is not an external service"),
          ].map((item) => (
            <article key={item}>
              <span>{copy(language, "边界", "Boundary")}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function NotesPage({ language }: { language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "文章", "Articles")}
        title={copy(language, "透明度文章", "Transparency Articles")}
        body={copy(language, "这里是静态文章归档，不是最新生产日报，也不是今日简报。每天先看「今日简报」。", "This is a static article archive, not the latest production daily reports and not today's brief. Start with Today.")}
        icon={FileText}
      />
      <section className="route-panel notes-shell" aria-labelledby="notes-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <div className="notes-archive-head">
          <div>
            <h2 id="notes-title">{copy(language, "静态文章归档", "Static article archive")}</h2>
            <p className="muted">
              {copy(
                language,
                "这些文章来自 2026-06-25 的内容索引，是归档透明度材料，不是最新生产日报。",
                "These articles come from the 2026-06-25 content index. They are archive/static transparency material, not latest production daily reports.",
              )}
            </p>
          </div>
          <a className="primary-action" href={routeHref("/today")}>
            {copy(language, "阅读今日简报", "Read today's brief")}
          </a>
          <a className="secondary-action" href={routeHref("/reports")}>
            {copy(language, "查看生产日报审计", "Open production audit")}
          </a>
        </div>
        <p className="muted">
          {copy(
            language,
            "文章可用于理解方法、错误复盘和边界；当前生产运行状态只在生产日报页展示。",
            "Articles explain method, error review, and boundaries; current production runtime state is shown only on the Production Daily Reports page.",
          )}
        </p>
        <div className="content-card-grid">
          {contentItems.map((item) => (
            <article className="content-card" key={item.slug}>
              <div className="content-card-meta">
                <span>{contentTypeLabel(item.type, language)}</span>
                <time dateTime={item.published_at}>{formatReaderDateForLanguage(item.published_at, language)}</time>
              </div>
              <h3>
                <a href={noteRouteHref(item.slug)}>{itemTitle(item, language)}</a>
              </h3>
              <p>{itemSummary(item, language)}</p>
              {item.report ? <ReportPreviewCard item={item} language={language} /> : null}
              <div className="tag-row">
                {item.tags.map((tag) => (
                  <span key={tag}>{tagLabel(tag, language)}</span>
                ))}
              </div>
              <BoundaryChips item={item} language={language} compact />
              <RelatedPredictionLinks ids={item.related_prediction_ids} language={language} />
              <a className="secondary-action" href={noteRouteHref(item.slug)}>
                {copy(language, "阅读简报", "Read note")}
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function NoteDetailPage({ item, language }: { item: ContentItem | null; language: Language }) {
  if (!item) {
    return (
      <>
        <PageIntro
          eyebrow={copy(language, "简报", "Notes")}
          title={copy(language, "未找到简报", "Note not found")}
          body={copy(language, "当前 content index 中没有该 slug；页面不会伪造缺失内容。", "The current content index does not include this slug; the page will not fabricate missing content.")}
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note">
          {copy(language, "返回", "Return to")} <a href={routeHref("/notes")}>Notes</a> {copy(language, "查看当前 public-safe 内容索引。", "to view the current public-safe content index.")}
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow={contentTypeLabel(item.type, language)} title={itemTitle(item, language)} body={itemSummary(item, language)} icon={FileText} />
      <article className="route-panel note-detail" aria-labelledby="note-detail-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <div className="note-reader-head">
          <div>
            <span className="section-index">{copy(language, "读者优先", "Reader first")}</span>
            <h2 id="note-detail-title">{item.report ? copy(language, "晨报 / 晚报详情", "Morning/evening report view") : copy(language, "可读简报", "Readable note view")}</h2>
            <p>
              {copy(language, `发布于 ${formatReaderDateForLanguage(item.published_at, language)}，类型为 ${contentTypeLabel(item.type, language)}。审计记录与技术来源在下方折叠；默认视图从结论、证据、下一步和边界开始。`, `Published ${formatReaderDateForLanguage(item.published_at, language)} as ${contentTypeLabel(item.type, language)}. Technical provenance is available below, but the default view starts with reader conclusions, evidence, next steps, and boundary.`)}
            </p>
          </div>
        </div>
        <NoteReportDetail item={item} language={language} />
        {!item.report ? (
          <section className="report-callout" aria-labelledby="note-summary-title">
            <h3 id="note-summary-title">{copy(language, "摘要", "Summary")}</h3>
            <p>{itemSummary(item, language)}</p>
          </section>
        ) : null}
        <section>
          <h3>{copy(language, "标签", "Tags")}</h3>
          <div className="tag-row">
            {item.tags.map((tag) => (
              <span key={tag}>{tagLabel(tag, language)}</span>
            ))}
          </div>
        </section>
        <section>
          <h3>{copy(language, "关联预测", "Related predictions")}</h3>
          <RelatedPredictionLinks ids={item.related_prediction_ids} language={language} />
        </section>
        <details className="audit-details">
          <summary>{copy(language, "审计详情 / 技术来源", "Audit details / technical provenance")}</summary>
          <dl className="source-grid">
            <div>
              <dt>published_at</dt>
              <dd>{item.published_at}</dd>
            </div>
            <div>
              <dt>type</dt>
              <dd>{item.type}</dd>
            </div>
            <div>
              <dt>body_source</dt>
              <dd>{item.body_source}</dd>
            </div>
            {item.report ? (
              <div>
                <dt>report_kind</dt>
                <dd>{item.report.report_kind}</dd>
              </div>
            ) : null}
          </dl>
          <div className="related-prediction-list">
            <a href={routeHref("/ledger")}>#/ledger</a>
            <a href={routeHref("/methodology")}>#/methodology</a>
            <a href={routeHref("/performance")}>#/performance</a>
          </div>
          <p>
            {copy(language, "完整 Markdown 正文存放在", "Full markdown body is stored at")} <span className="mono">{item.body_source}</span>{" "}
            {copy(language, "并通过本地内容检查验证边界文本与内部路线链接。", "and validated by local content checks for boundary text and internal route links.")}
          </p>
        </details>
      </article>
    </>
  );
}

function PredictionDetailPage({
  record,
  missingPredictionId,
  dataset,
  language,
}: {
  record: RecordView | null;
  missingPredictionId: string | null;
  dataset: LedgerDataset;
  language: Language;
}) {
  if (!record) {
    return (
      <>
        <PageIntro
          eyebrow={copy(language, "记录详情", "Prediction detail")}
          title={copy(language, "未找到记录", "Prediction not found")}
          body={copy(language, "当前公开安全演示快照中没有找到该 prediction_id；页面不会回填或伪造缺失记录。", "The current public-safe demo snapshot does not include that prediction_id; the page will not backfill or fabricate missing records.")}
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note">
          {copy(language, "未找到该记录：", "Missing record:")}<span className="mono">{missingPredictionId ?? "unknown"}</span>。{copy(language, "返回", "Return to")}{" "}
          <a href={routeHref("/ledger")}>{copy(language, "账本", "Ledger")}</a> {copy(language, "浏览当前快照。", "to browse the current snapshot.")}
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "记录详情", "Prediction detail")}
        title={`${record.ticker} · ${record.company}`}
        body={copy(language, "单条记录页只展示当前公开安全快照中已有的预测、结果和技术来源；待判定 / 冻结待判定不补写实际结果。", "This detail page only shows prediction, outcome, and provenance already present in the current public-safe snapshot; pending/frozen_pending rows are not backfilled.")}
        icon={FileText}
      />
      <section className="route-panel prediction-detail-page" aria-labelledby="prediction-detail-title">
        <div className="drawer-title-line">
          <h2 id="prediction-detail-title" className="drawer-record-title">
            {record.prediction_id}
          </h2>
          <span className={`status-badge ${record.status}`}>{statusText(language, record.status)}</span>
        </div>
        <div className="detail-metrics">
          <div>
            <span>{copy(language, "决策日期", "Decision date")}</span>
            <strong>{record.decision_date}</strong>
          </div>
          <div>
            <span>{copy(language, "预测窗口", "Prediction window")}</span>
            <strong>{record.prediction_window}</strong>
          </div>
          <div>
            <span>{copy(language, "预测涨跌幅", "Expected change")}</span>
            <strong>{record.expected_change_pct}%</strong>
          </div>
          <div>
            <span>{copy(language, "实际涨跌幅", "Actual change")}</span>
            <strong>{record.actual_change_pct === null ? copy(language, "暂无", "Pending") : `${record.actual_change_pct}%`}</strong>
          </div>
          <div>
            <span>{copy(language, "误差", "Error")}</span>
            <strong>{record.error === null ? copy(language, "暂无", "Pending") : `${record.error}pp`}</strong>
          </div>
          <div>
            <span>{copy(language, "证据数", "Evidence count")}</span>
            <strong>{record.evidence_count}</strong>
          </div>
        </div>
        <section className="detail-section">
          <h3>{copy(language, "推理摘要", "Reasoning summary")}</h3>
          <p>{record.reasoning}</p>
        </section>
        <section className="detail-section">
          <h3>{copy(language, "证据来源", "Evidence sources")}</h3>
          <ul className="evidence-list">
            {record.evidence.map((item) => (
              <li key={`${item.source}-${item.date}`}>
                <span>{item.source}</span>
                <span className="mono">{item.date}</span>
              </li>
            ))}
          </ul>
          <details className="audit-details">
            <summary>{copy(language, "技术来源", "Technical provenance")}</summary>
            <p className="muted">
              dataset_id: <span className="mono">{record.provenance.dataset_id}</span> · source:{" "}
              <span className="mono">{record.provenance.source}</span>
            </p>
          </details>
        </section>
        <section className="detail-section">
          <h3>{copy(language, "边界", "Claim boundary")}</h3>
          <p>{boundarySentence(language)}</p>
          <p className="muted">
            {copy(language, "公开快照日期", "Public snapshot date")}: <span className="mono">{dataset.metadata.snapshot_date}</span>
          </p>
        </section>
          <a className="secondary-action" href={routeHref("/ledger")}>
          {copy(language, "返回账本", "Back to Ledger")}
        </a>
      </section>
    </>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseBrowserRoute(window.location.pathname, window.location.hash));
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage());
  const [dataset, setDataset] = useState<LedgerDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [tickerFilter, setTickerFilter] = useState("all");
  const [sort, setSort] = useState<SortState>({ key: "decision_date", direction: "desc" });
  const [selectedTicker, setSelectedTicker] = useState("");
  const [dashboardRequested, setDashboardRequested] = useState(false);
  const [missingPredictionId, setMissingPredictionId] = useState<string | null>(null);
  const [reportStatusState, setReportStatusState] = useState<DailyDeskSnapshotState>({ kind: "loading" });
  const [liveReportsState, setLiveReportsState] = useState<LiveReportsLoadState>({ kind: "loading" });
  const [dailyBriefState, setDailyBriefState] = useState<DailyReaderBriefLoadState>({ kind: "loading" });
  const [homeDetailsReady, setHomeDetailsReady] = useState(false);
  const [homeReportStatusRequested, setHomeReportStatusRequested] = useState(false);
  const reportStatusLoadRef = useRef<HTMLDivElement | null>(null);
  const dashboardLoadRef = useRef<HTMLElement | null>(null);
  const routeNeedsDataset = routeRequiresLedgerDataset(route);
  const routeShouldLoadDataset = routeShouldLoadLedgerDataset(route);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseBrowserRoute(window.location.pathname, window.location.hash));
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);

  const loadDataset = useCallback(() => {
    setError(null);
    setDataset(null);
    loadLedgerDataset()
      .then(setDataset)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unknown ledger load error");
      });
  }, []);

  useEffect(() => {
    if (!routeShouldLoadDataset) {
      setError(null);
      setDataset(null);
      return;
    }

    if (route.name === "home") {
      setError(null);
      setDataset(null);
      const timeout = window.setTimeout(loadDataset, 1800);
      return () => window.clearTimeout(timeout);
    }

    loadDataset();
  }, [loadDataset, route.name, routeShouldLoadDataset]);

  useEffect(() => {
    const needsLiveReports = route.name === "ledger" || route.name === "performance" || route.name === "sources";
    if (!needsLiveReports) {
      return;
    }

    let cancelled = false;
    setLiveReportsState({ kind: "loading" });
    loadLiveReportsSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setLiveReportsState({ kind: "ready", snapshot });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setLiveReportsState({
            kind: "error",
            message: reason instanceof Error ? reason.message : "Unknown live reports load error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [route.name]);

  useEffect(() => {
    if (route.name !== "today" && route.name !== "fullAnalystReport" && route.name !== "evidencePacketAudit" && route.name !== "symbolProfile") {
      return;
    }

    let cancelled = false;
    setDailyBriefState({ kind: "loading" });
    import("./data/dailyReaderBrief")
      .then((module) => module.loadDailyReaderBrief())
      .then((result) => {
        if (cancelled) {
          return;
        }
        setDailyBriefState({
          kind: "ready",
          brief: result.brief,
          source: result.kind,
          fallbackReason: result.kind === "fallback" ? result.reason : null,
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setDailyBriefState({
            kind: "error",
            message: reason instanceof Error ? reason.message : "Unknown daily reader brief load error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [route.name]);

  useEffect(() => {
    if (route.name !== "home" || !homeReportStatusRequested) {
      return;
    }

    let cancelled = false;

    Promise.allSettled([fetchJson<ReportRawStatus>(reportAssetPath("status.json")), fetchMarketReportStatuses()])
      .then(([statusResult, marketStatusResult]) => {
        if (cancelled) {
          return;
        }
        const marketStatuses =
          marketStatusResult.status === "fulfilled"
            ? marketStatusResult.value
            : marketStatusFallbacks(marketStatusResult.reason instanceof Error ? marketStatusResult.reason.message : String(marketStatusResult.reason));
        const fallbackStatus = marketStatuses.find((item) => item.status)?.status ?? null;
        const primaryStatus = statusResult.status === "fulfilled" ? normalizeReportStatus(statusResult.value) : fallbackStatus;

        if (primaryStatus) {
          setReportStatusState({
            kind: "ready",
            status: primaryStatus,
            marketStatuses,
            lastFetchedAt: new Date().toISOString(),
          });
          return;
        }

        setReportStatusState({
          kind: "error",
          message:
            statusResult.status === "rejected" && statusResult.reason instanceof Error
              ? statusResult.reason.message
              : "Unknown report status load error",
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setReportStatusState({
            kind: "error",
            message: reason instanceof Error ? reason.message : "Unknown report status load error",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [homeReportStatusRequested, route.name]);

  useEffect(() => {
    if (route.name !== "home") {
      setHomeReportStatusRequested(false);
      return;
    }

    if (homeReportStatusRequested || !dataset) {
      return;
    }

    const element = reportStatusLoadRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      const timeout = window.setTimeout(() => setHomeReportStatusRequested(true), 3000);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setHomeReportStatusRequested(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [dataset, homeReportStatusRequested, route.name]);

  const views = useMemo(() => {
    if (!dataset) {
      return [];
    }
    return dataset.records.map((record) => toRecordView(record, dataset));
  }, [dataset]);

  const metrics = useMemo(() => (dataset ? computeSummary(dataset) : null), [dataset]);
  const tickers = useMemo(() => buildTickerList(views), [views]);
  const activeTicker = selectedTicker && tickers.includes(selectedTicker) ? selectedTicker : tickers[0] ?? "";
  const routeRecord = useMemo(() => {
    if (route.name !== "prediction") {
      return null;
    }
    return views.find((record) => record.prediction_id === route.predictionId) ?? null;
  }, [route, views]);
  const activeNote = useMemo(() => {
    if (route.name !== "note") {
      return null;
    }
    return findContentItem(route.slug);
  }, [route]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (dashboardRequested || !activeTicker) {
      return;
    }

    const element = dashboardLoadRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setDashboardRequested(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDashboardRequested(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeTicker, dashboardRequested]);

  const openRecord = useCallback((record: RecordView) => {
    setMissingPredictionId(null);
    trackEvent("ledger_detail_open", { prediction_id: record.prediction_id });
    window.location.hash = predictionRouteHref(record.prediction_id).slice(1);
  }, []);

  useEffect(() => {
    if (views.length === 0) {
      return;
    }

    const predictionId = new URLSearchParams(window.location.search).get("prediction_id");
    if (!predictionId) {
      return;
    }

    const nextHash = predictionRouteHref(predictionId);
    window.history.replaceState({}, "", `${window.location.pathname}${nextHash}`);
    setRoute(parseHashRoute(nextHash));
  }, [views]);

  useEffect(() => {
    if (route.name === "prediction" && views.length > 0 && !routeRecord) {
      setMissingPredictionId(route.predictionId);
      return;
    }
    setMissingPredictionId(null);
  }, [route, routeRecord, views.length]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const result = views.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [record.ticker, record.company].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDirection = directionFilter === "all" || record.direction === directionFilter;
      const matchesTicker = tickerFilter === "all" || record.ticker === tickerFilter;
      return matchesQuery && matchesStatus && matchesDirection && matchesTicker;
    });

    return result.sort((a, b) => {
      const base = compareRecord(a, b, sort.key);
      return sort.direction === "asc" ? base : -base;
    });
  }, [debouncedQuery, directionFilter, sort, statusFilter, tickerFilter, views]);

  const handleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    writeStoredLanguage(nextLanguage);
  };

  const hasDataset = dataset !== null && metrics !== null;
  const routeDataPending =
    (route.name === "today" && dailyBriefState.kind === "loading") ||
    (route.name === "fullAnalystReport" && dailyBriefState.kind === "loading") ||
    (route.name === "symbolProfile" && dailyBriefState.kind === "loading") ||
    (route.name === "evidencePacketAudit" && dailyBriefState.kind === "loading") ||
    (route.name === "sources" && liveReportsState.kind === "loading") ||
    (route.name === "home" && hasDataset && !homeDetailsReady);

  const showSubscribe =
    !routeDataPending &&
    (route.name === "home" ||
      route.name === "guide" ||
      route.name === "today" ||
      route.name === "whyGotra" ||
      route.name === "beta" ||
      route.name === "trackRecord" ||
      route.name === "trackRecordEntry" ||
      route.name === "monthlyReports" ||
      route.name === "monthlyReportDetail" ||
      route.name === "symbolProfile" ||
      route.name === "fullAnalystReport" ||
      route.name === "evidencePacketAudit" ||
      route.name === "notes" ||
      route.name === "note");
  const pageShellClassName =
    (route.name === "today" || route.name === "fullAnalystReport") && dailyBriefState.kind === "loading" ? "page-shell today-pending-shell" : "page-shell";

  useEffect(() => {
    if (route.name !== "home" || !hasDataset) {
      setHomeDetailsReady(false);
      return;
    }

    setHomeDetailsReady(false);
    const timeout = window.setTimeout(() => setHomeDetailsReady(true), 750);
    return () => window.clearTimeout(timeout);
  }, [hasDataset, route.name]);

  if (error && routeNeedsDataset) {
    return (
      <main className="error-screen">
        <AlertCircle aria-hidden="true" size={24} />
        <h1>Ledger data failed to load</h1>
        <p>{error}</p>
        <button className="retry-button" type="button" onClick={loadDataset}>
          重试加载
        </button>
      </main>
    );
  }

  if (route.name === "home" && !hasDataset) {
    return (
      <div className="app-shell">
        <AnalyticsProvider />
        <SiteHeader activePath={routeActivePath(route)} language={language} onLanguageChange={handleLanguageChange} />
        <main className="page-shell">
          <HomeLoadingHero language={language} />
        </main>
      </div>
    );
  }

  if (routeNeedsDataset && !hasDataset) {
    return <LedgerLoadingSkeleton />;
  }

  if (routeNeedsDataset && !activeTicker) {
    return (
      <main className="error-screen">
        <AlertCircle aria-hidden="true" size={24} />
        <h1>Ledger data has no renderable records</h1>
        <p>public-safe demo 数据已加载，但没有可渲染的记录；页面不会回填或伪造后验结果。</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AnalyticsProvider />
      {dataset ? <SeoHead dataset={dataset} records={views} activeRecord={routeRecord} route={route} language={language} /> : null}
      <SiteHeader activePath={routeActivePath(route)} language={language} onLanguageChange={handleLanguageChange} />

      <main className={pageShellClassName}>
        {route.name === "home" && hasDataset ? (
          <>
            <Hero dataset={dataset} metrics={metrics} records={views} language={language} />
            <div ref={reportStatusLoadRef}>
              <DailyDeskSnapshot reportStatus={reportStatusState} language={language} todayHref={routeHref("/today")} reportsHref={routeHref("/reports")} />
            </div>
            {homeDetailsReady ? (
              <>
                <HowToReadGotra language={language} />
                <Suspense fallback={<ChartLoadingSkeleton />}>
                  <HowItWorks language={language} />
                  <TrustStrip records={views} language={language} />
                </Suspense>
                {dashboardRequested ? (
                  <Suspense fallback={<ChartLoadingSkeleton />}>
                    <CognitionDashboard
                      dataset={dataset}
                      records={views}
                      tickers={tickers}
                      selectedTicker={activeTicker}
                      language={language}
                      onTickerChange={setSelectedTicker}
                      onSelectRecord={openRecord}
                    />
                  </Suspense>
                ) : (
                  <ChartLoadingSkeleton containerRef={dashboardLoadRef} />
                )}
                <Suspense fallback={<ChartLoadingSkeleton />}>
                  <CredibilityDashboard records={views} language={language} />
                </Suspense>
              </>
            ) : null}
          </>
        ) : null}

        {route.name === "guide" ? <GuidePage language={language} /> : null}

        {route.name === "today" ? <TodayPage state={dailyBriefState} language={language} /> : null}

        {route.name === "whyGotra" ? <WhyGotraPage language={language} /> : null}

        {route.name === "beta" ? <BetaReadinessPage language={language} /> : null}

        {route.name === "fullAnalystReport" ? <FullAnalystReaderPage state={dailyBriefState} language={language} /> : null}

        {route.name === "evidencePacketAudit" ? <EvidencePacketAuditPage state={dailyBriefState} language={language} evidenceId={route.evidenceId} /> : null}

        {route.name === "symbolProfile" ? <SymbolProfilePage state={dailyBriefState} language={language} symbol={route.symbol} /> : null}

        {route.name === "trackRecord" ? <TrackRecordPage language={language} /> : null}

        {route.name === "trackRecordEntry" ? <TrackRecordPage entryId={route.entryId} language={language} /> : null}

        {route.name === "monthlyReports" ? <MonthlyReportsPage language={language} /> : null}

        {route.name === "monthlyReportDetail" ? <MonthlyReportDetailPage month={route.month} language={language} /> : null}

        {route.name === "ledger" && hasDataset ? (
          <>
            <PageIntro
              eyebrow={copy(language, "Demo 账本", "Demo Ledger")}
              title={copy(language, "冻结 Demo 账本", "Frozen Demo Ledger")}
              body={copy(language, "这是公开研究账本的冻结公开安全演示快照，属于可审计 AI 金融研究发布账本的一部分；它不是最新生产日报，也不是实时预测账本。最新生产日报请看下方入口。", "This is a frozen public-safe demo snapshot of the auditable AI financial research publication ledger, not the latest production daily report and not a live prediction ledger. Use the link below for current production reports.")}
              icon={Database}
            />
            <section className="route-panel demo-ledger-banner" aria-labelledby="demo-ledger-title">
              <div className="boundary-banner warning">
                <AlertCircle aria-hidden="true" size={18} />
                <span>
                  {copy(language, "这是冻结公开安全演示快照", "This is a frozen public-safe demo snapshot")}
                </span>
              </div>
              <h2 id="demo-ledger-title">{copy(language, "不是最新生产日报", "Not the latest production daily report")}</h2>
              <p>
                {copy(
                  language,
                  `snapshot_date=${dataset.metadata.snapshot_date}；dataset_id=${dataset.metadata.dataset_id}。它用于公开安全演示和历史可读性，不是最新日报、不是实时生产预测账本，也不是投资建议或交易信号。`,
                  `snapshot_date=${dataset.metadata.snapshot_date}; dataset_id=${dataset.metadata.dataset_id}. It is used for public-safe demo and historical readability, not latest daily reports, not a live production prediction ledger, and not advice or a trading signal.`,
                )}
              </p>
              <a className="secondary-action" href={routeHref("/reports")}>
                {copy(language, "查看最新生产日报", "Open latest production reports")}
              </a>
            </section>
            <LiveProductionStrip state={liveReportsState} language={language} />
            <LedgerStatusChart metrics={metrics} language={language} />
            <section className="ledger-section" id="full-ledger" aria-labelledby="full-ledger-title">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <span className="section-index">{copy(language, "S5 · 演示快照", "S5 · Demo snapshot")}</span>
                <h2 id="full-ledger-title">{copy(language, "冻结 Demo 账本", "Frozen Demo Ledger")}</h2>
                <p>
                  {copy(language, `这是全部 ${views.length} 条冻结演示判断，可搜索、筛选、逐条核对；它不是 6/30 生产数据，也不是投资行动指令。`, `These are all ${views.length} frozen demo judgments. Search, filter, and inspect records one by one; this is not 6/30 production data and not an investment action instruction.`)}
                </p>
                <div className="status-legend" aria-label="Ledger status legend">
                  <span>
                    <i className="legend-dot resolved" />
                    {statusText(language, "resolved")}
                  </span>
                  <span>
                    <i className="legend-dot frozen_pending" />
                    {statusText(language, "frozen_pending")}
                  </span>
                  <span>
                    <i className="legend-dot pending" />
                    {statusText(language, "pending")}
                  </span>
                </div>
              </div>
              <div className="filters">
                <label className="search-box">
                  <Search aria-hidden="true" size={16} />
                  <span className="sr-only">{copy(language, "搜索账本", "Search ledger")}</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy(language, "搜索股票代码或公司", "Search ticker or company")}
                  />
                </label>
                <label>
                  <span>{copy(language, "状态", "Status")}</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="all">{copy(language, "全部", "All")}</option>
                    <option value="resolved">{statusText(language, "resolved")}</option>
                    <option value="frozen_pending">{statusText(language, "frozen_pending")}</option>
                    <option value="pending">{statusText(language, "pending")}</option>
                  </select>
                </label>
                <label>
                  <span>{copy(language, "方向", "Direction")}</span>
                  <select
                    value={directionFilter}
                    onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}
                  >
                    <option value="all">{copy(language, "全部方向", "All directions")}</option>
                    <option value="up">{copy(language, "看涨", "Up")}</option>
                    <option value="down">{copy(language, "看跌", "Down")}</option>
                    <option value="neutral">{copy(language, "中性", "Neutral")}</option>
                  </select>
                </label>
                <label>
                  <span>{copy(language, "标的", "Ticker")}</span>
                  <select value={tickerFilter} onChange={(event) => setTickerFilter(event.target.value)}>
                    <option value="all">{copy(language, "全部标的", "All tickers")}</option>
                    {tickers.map((ticker) => (
                      <option value={ticker} key={ticker}>
                        {ticker}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="ledger-count-line">
              {copy(language, `当前显示 ${filteredRecords.length} / ${views.length} 条快照数据；统计口径只把已结算记录纳入命中率与误差。`, `Showing ${filteredRecords.length} / ${views.length} snapshot records; resolved-only metrics only include resolved rows for hit rate and error.`)}
            </div>
            {missingPredictionId ? (
              <div className="edge-state-note" role="status">
                {copy(language, "未找到该记录：", "Missing record:")}<span className="mono">{missingPredictionId}</span>。{copy(language, "请检查 prediction_id，或使用下方搜索和筛选浏览当前公开安全演示快照。", "Check prediction_id, or use search and filters below to browse the current public-safe demo snapshot.")}
              </div>
            ) : null}

            <LedgerTable records={filteredRecords} sort={sort} language={language} onSort={handleSort} onSelect={openRecord} />
          </div>
            </section>
          </>
        ) : null}

        {route.name === "prediction" && hasDataset ? (
          <PredictionDetailPage record={routeRecord} missingPredictionId={missingPredictionId} dataset={dataset} language={language} />
        ) : null}

        {route.name === "performance" && hasDataset ? (
          <PerformancePage
            ledgerMetrics={metrics}
            snapshot={latestPaperPortfolioSnapshot}
            liveReportsState={liveReportsState}
            language={language}
          />
        ) : null}
        {route.name === "system" ? <SystemRulesPage language={language} /> : null}
        {route.name === "methodology" && hasDataset ? <MethodologyPage dataset={dataset} records={views} language={language} /> : null}
        {route.name === "sources" ? <SourcesPage dataset={dataset} liveReportsState={liveReportsState} language={language} /> : null}
        {route.name === "reports" ? <ReportsPage language={language} /> : null}
        {route.name === "notes" ? <NotesPage language={language} /> : null}
        {route.name === "note" ? <NoteDetailPage item={activeNote} language={language} /> : null}

        {showSubscribe ? <Subscribe language={language} /> : null}
        {!routeDataPending && dataset ? <SiteFooter metadata={dataset.metadata} language={language} /> : null}
      </main>
    </div>
  );
}

export default App;
