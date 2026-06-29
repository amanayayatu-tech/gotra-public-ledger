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
import { BoundaryPanel } from "./components/BoundaryPanel";
import { CredibilityDashboard } from "./components/CredibilityDashboard";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { LedgerTable, type SortKey, type SortState } from "./components/LedgerTable";
import { AnalystDesk } from "./components/reports/AnalystDesk";
import { DailyDeskSnapshot, type DailyDeskSnapshotState } from "./components/reports/DailyDeskSnapshot";
import {
  buildReportDeskArtifacts,
  normalizeReportStatus,
  type ReportDeskArtifacts,
  type ReportRawStatus,
} from "./components/reports/ReportStatusModel";
import { SeoHead } from "./components/SeoHead";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { Subscribe } from "./components/Subscribe";
import { TrustStrip } from "./components/TrustStrip";
import { buildTickerList } from "./data/cognition";
import { contentItems, findContentItem } from "./data/content";
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
import {
  boundarySentence,
  contentTypeText,
  copy,
  layerText,
  readStoredLanguage,
  statusText,
  writeStoredLanguage,
  type Language,
} from "./i18n/language";
import { noteRouteHref, parseBrowserRoute, parseHashRoute, predictionRouteHref, routeHref, type AppRoute } from "./routes/hashRouter";

const CognitionDashboard = lazy(() =>
  import("./components/CognitionDashboard").then((module) => ({ default: module.CognitionDashboard })),
);

type StatusFilter = "all" | LedgerStatus;
type DirectionFilter = "all" | RecordView["direction"];

type ReportDeskLoadState =
  | { kind: "loading" }
  | ({
      kind: "ready";
      lastFetchedAt: string;
    } & ReportDeskArtifacts);

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
  if (route.name === "note") {
    return "/notes";
  }
  return route.path;
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

function PerformancePage({
  ledgerMetrics,
  snapshot,
  language,
}: {
  ledgerMetrics: ReturnType<typeof computeSummary>;
  snapshot: PaperPortfolioSnapshot;
  language: Language;
}) {
  const latestEquity = snapshot.equity_curve.at(-1);

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "表现", "Performance")}
        title={copy(language, "假设组合跟踪", "Hypothetical paper tracking")}
        body={copy(language, "这里展示按 `portfolio_policy_v1` 机械生成的公开安全假设组合快照。它不是实时交易、不是投资建议，也不是业绩证明。", "This page shows a public-safe paper portfolio snapshot mechanically generated under portfolio_policy_v1. It is not live trading, investment advice, or performance proof.")}
        icon={BarChart3}
      />
      <section className="route-panel performance-shell" aria-labelledby="performance-policy-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        {snapshot.small_sample_warning ? (
          <div className="boundary-banner warning">
            <AlertCircle aria-hidden="true" size={18} />
            {copy(language, "样本数很小。这个假设组合表现只是早期跟踪，不能解释为统计可靠、投资建议或业绩证明。", snapshot.small_sample_warning)}
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
      <MethodologyProcessGraphic language={language} />
      <BoundaryPanel metadata={dataset.metadata} />
      <CredibilityDashboard records={records} language={language} />
    </>
  );
}

function SourcesPage({ dataset, language }: { dataset: LedgerDataset; language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "来源", "Sources")}
        title={copy(language, "公开安全来源记录", "Public-safe provenance")}
        body={copy(language, "来源页只展示公开安全数据集、清单和证据索引口径；不会公开私有 GOTRA 原始产物。", "This page only exposes public-safe dataset, manifest, and evidence-index surfaces; it never publishes private GOTRA raw artifacts.")}
        icon={Database}
      />
      <section className="route-panel" aria-labelledby="sources-title">
        <h2 id="sources-title">{copy(language, "哪些公开数据可被检查", "What public data can be inspected")}</h2>
        <p>
          {copy(language, "可见来源层故意很小：当前演示账本、证据索引、清单、内容索引和生成的公开安全快照。技术文件路径只在下方审计详情中显示。", "The visible source layer is intentionally small: current demo ledger, evidence index, manifest, content index, and generated public-safe snapshots. Technical file paths are available below only as audit details.")}
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
    setIsRefreshing(true);

    try {
      const [statusResult, markdownResult] = await Promise.allSettled([
        fetchJson<ReportRawStatus>(statusUrl),
        fetchText(markdownUrl),
      ]);
      setLoadState({
        kind: "ready",
        ...buildReportDeskArtifacts(statusResult, markdownResult),
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
          lastFetchedAt: loadState.lastFetchedAt,
        }
      : {
          status: null,
          statusError: null,
          markdown: null,
          markdownError: null,
          lastFetchedAt: null,
        };

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "报告", "Reports")}
        title={copy(language, "GOTRA 每日股票池分析台", "GOTRA Daily Stock-Pool Desk")}
        body={copy(language, "公开安全分析台：只读展示覆盖率、交易日、异常清单和公开报告产物；不是投资建议、交易信号、业绩证明或科学证明。", "Public-safe analyst desk for read-only coverage, trading dates, exception tape, and public report artifacts; not advice, a trading signal, performance proof, or science proof.")}
        icon={FileText}
      />
      {loadState.kind === "loading" ? (
        <section className="route-panel reports-shell analyst-desk-shell" aria-labelledby="reports-loading-title">
          <div className="edge-state-note" role="status" id="reports-loading-title">
            {copy(language, "正在加载 /reports/status.json 和 /reports/latest.md。", "Loading /reports/status.json and /reports/latest.md.")}
          </div>
        </section>
      ) : null}
      {loadState.kind !== "loading" ? (
        <AnalystDesk
          language={language}
          {...deskProps}
          isRefreshing={isRefreshing}
          onRefresh={loadReports}
          assetHref={reportAssetPath}
        />
      ) : null}
    </>
  );
}

function HowToReadGotra({ language }: { language: Language }) {
  const entries = [
    {
      href: routeHref("/"),
      label: copy(language, "首页", "Home"),
      body: copy(language, "看当前状态、项目定位和最新运行摘要。", "Start with current status, project positioning, and the latest runtime summary."),
    },
    {
      href: routeHref("/ledger"),
      label: copy(language, "账本", "Ledger"),
      body: copy(language, "查看公开记录、纸面组合和表现跟踪；不是业绩承诺。", "Inspect public records, paper tracking, and performance tracking; not a performance promise."),
    },
    {
      href: routeHref("/reports"),
      label: copy(language, "报告", "Reports"),
      body: copy(language, "查看每日股票池报告、异常清单和简报复盘。", "Read daily stock-pool reports, exception lists, and notes or reviews."),
    },
    {
      href: routeHref("/system"),
      label: copy(language, "系统", "System"),
      body: copy(language, "查看方法、来源、证据边界和系统运行说明。", "Review methods, sources, evidence boundaries, and system operating notes."),
    },
  ];

  return (
    <section className="reader-guide" aria-labelledby="reader-guide-title">
      <div className="section-heading compact">
        <span>{copy(language, "阅读路径", "Reading path")}</span>
        <h2 id="reader-guide-title">{copy(language, "如何阅读 GOTRA", "How to read GOTRA")}</h2>
        <p>
          {copy(
            language,
            "这四个入口把概览、记录、报告和系统说明分开；先读状态，再进账本或报告，最后用系统材料核对边界。",
            "The four entries separate overview, records, reports, and system context; read status first, then ledger or reports, then use system materials to check boundaries.",
          )}
        </p>
      </div>
      <div className="reader-guide-grid">
        {entries.map((entry, index) => (
          <a href={entry.href} key={entry.href}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{entry.label}</strong>
            <p>{entry.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function NotesPage({ language }: { language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "简报", "Notes")}
        title={copy(language, "研究简报与透明度报告", "Research notes and transparency reports")}
        body={copy(language, "Notes 是持续运营入口。默认展示结论、证据、下一步和边界；技术来源收起在审计区。", "Notes are the continuing operations surface. The default view shows conclusions, evidence, next steps, and boundary; technical provenance is collapsed.")}
        icon={FileText}
      />
      <section className="route-panel notes-shell" aria-labelledby="notes-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <h2 id="notes-title">{copy(language, "公开简报列表", "Public-safe articles")}</h2>
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
  const dashboardLoadRef = useRef<HTMLElement | null>(null);

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
    loadDataset();
  }, [loadDataset]);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ReportRawStatus>(reportAssetPath("status.json"))
      .then((status) => {
        if (!cancelled) {
          setReportStatusState({
            kind: "ready",
            status: normalizeReportStatus(status),
            lastFetchedAt: new Date().toISOString(),
          });
        }
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
  }, []);

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

  if (error) {
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

  if (!dataset || !metrics) {
    return <LedgerLoadingSkeleton />;
  }

  if (!activeTicker) {
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
      <SeoHead dataset={dataset} records={views} activeRecord={routeRecord} />
      <SiteHeader activePath={routeActivePath(route)} language={language} onLanguageChange={handleLanguageChange} />

      <main className="page-shell">
        {route.name === "home" ? (
          <>
            <Hero dataset={dataset} metrics={metrics} records={views} language={language} />
            <DailyDeskSnapshot reportStatus={reportStatusState} language={language} reportsHref={routeHref("/reports")} />
            <HowToReadGotra language={language} />
            <HowItWorks language={language} />
            <TrustStrip records={views} language={language} />
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
            <CredibilityDashboard records={views} language={language} />
          </>
        ) : null}

        {route.name === "ledger" ? (
          <>
            <PageIntro
              eyebrow={copy(language, "账本", "Ledger")}
              title={copy(language, "完整公开预测账本", "Complete public prediction ledger")}
              body={copy(language, "完整账本保留搜索、筛选、排序和逐条详情链接。待判定与冻结待判定不进入“仅已结算”指标。", "The full ledger keeps search, filters, sorting, and shareable detail URLs. pending and frozen_pending rows stay outside resolved-only metrics.")}
              icon={Database}
            />
            <LedgerStatusChart metrics={metrics} language={language} />
            <section className="ledger-section" id="full-ledger" aria-labelledby="full-ledger-title">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <span className="section-index">{copy(language, "S5 · 完整账本", "S5 · Full ledger")}</span>
                <h2 id="full-ledger-title">{copy(language, "完整公开账本", "Full public ledger")}</h2>
                <p>
                  {copy(language, `这是全部 ${views.length} 条公开判断，可搜索、筛选、逐条核对；它不是投资行动指令。`, `These are all ${views.length} public judgments. Search, filter, and inspect records one by one; this is not an investment action instruction.`)}
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

        {route.name === "prediction" ? (
          <PredictionDetailPage record={routeRecord} missingPredictionId={missingPredictionId} dataset={dataset} language={language} />
        ) : null}

        {route.name === "performance" ? (
          <PerformancePage ledgerMetrics={metrics} snapshot={latestPaperPortfolioSnapshot} language={language} />
        ) : null}
        {route.name === "system" ? <SystemRulesPage language={language} /> : null}
        {route.name === "methodology" ? <MethodologyPage dataset={dataset} records={views} language={language} /> : null}
        {route.name === "sources" ? <SourcesPage dataset={dataset} language={language} /> : null}
        {route.name === "reports" ? <ReportsPage language={language} /> : null}
        {route.name === "notes" ? <NotesPage language={language} /> : null}
        {route.name === "note" ? <NoteDetailPage item={activeNote} language={language} /> : null}

        {route.name === "home" || route.name === "notes" || route.name === "note" ? <Subscribe language={language} /> : null}
        <SiteFooter metadata={dataset.metadata} language={language} />
      </main>
    </div>
  );
}

export default App;
