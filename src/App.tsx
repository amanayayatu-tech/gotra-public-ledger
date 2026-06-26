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
import { noteRouteHref, parseHashRoute, predictionRouteHref, routeHref, type AppRoute } from "./routes/hashRouter";

const CognitionDashboard = lazy(() =>
  import("./components/CognitionDashboard").then((module) => ({ default: module.CognitionDashboard })),
);

type StatusFilter = "all" | LedgerStatus;
type DirectionFilter = "all" | RecordView["direction"];

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
    return copy(language, "晨间简报：Public Alpha 观察队列", "Morning Brief: Public Alpha Watch Queue");
  }
  if (item.slug === "error-review-first-public-snapshot") {
    return copy(language, "晚间复盘：首个公开快照限制", "Evening Review: First Public Snapshot Limits");
  }
  if (item.slug === "method-note-public-ledger-v1") {
    return copy(language, "方法说明：Public Ledger v1 边界", "Method Note: Public Ledger v1 Boundaries");
  }
  if (item.slug === "alpha-transparency-note-2026-06") {
    return copy(language, "透明度说明：Public Alpha 样本风险", "Transparency Note: Public Alpha Sample Risk");
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
      "本日晚间复盘以账本状态变化为主语：本日账本无状态变更，pending / frozen_pending 不回填。",
      "This evening review is ledger-change centered: no status changed today, and pending / frozen_pending rows are not backfilled.",
    );
  }
  if (item.slug === "method-note-public-ledger-v1") {
    return copy(
      language,
      "解释预测、结果、paper portfolio 与 claim boundary 如何先分离、再解释。",
      "Explains how predictions, outcomes, paper portfolio snapshots, and claim boundaries stay separate before interpretation.",
    );
  }
  if (item.slug === "alpha-transparency-note-2026-06") {
    return copy(
      language,
      "说明 Public Alpha 的小样本、pending/blocked 记录和透明度风险。",
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
        <span className="section-index">{copy(language, "真实 repo 数据", "Actual repo data")}</span>
        <h2 id="ledger-status-chart-title">{copy(language, "账本状态分布", "Ledger status distribution")}</h2>
        <p>{copy(language, "计数来自当前 public ledger snapshot。pending 与 frozen 行不进入 resolved-only 指标。", "Counts come from the current public ledger snapshot. Pending and frozen rows remain outside resolved-only metrics.")}</p>
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
        <p>{copy(language, "从公开内容索引渲染；文件级 provenance 默认折叠在下方。", "Rendered from the public content index; file-level provenance is collapsed below.")}</p>
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
    { label: copy(language, "Paper 累计", "Paper cumulative"), value: snapshot.metrics.cumulative_return_pct },
    { label: copy(language, "基准", "Benchmark"), value: snapshot.metrics.benchmark_return_pct },
    { label: copy(language, "超额", "Excess"), value: snapshot.metrics.excess_return_pct },
  ];
  const max = Math.max(...values.map((row) => Math.abs(row.value)), 1);

  return (
    <section className="reader-chart compact" aria-labelledby="portfolio-bars-title">
      <div>
        <span className="section-index">{copy(language, "策略约束快照", "Policy-bound snapshot")}</span>
        <h2 id="portfolio-bars-title">{copy(language, "收益对比", "Return comparison")}</h2>
        <p>{copy(language, "这些条形图使用确定性 paper portfolio snapshot，不是实时市场数据。", "These bars use the deterministic paper portfolio snapshot, not live market data.")}</p>
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
    copy(language, "Gate/Judge", "Gate/Judge"),
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
    { title: copy(language, "1. 输入", "1. Intake"), body: copy(language, "ticker 身份、边界检查、研究任务创建。", "Ticker identity, boundary checks, and research job creation.") },
    { title: copy(language, "2. 研究", "2. Research"), body: copy(language, "`ksana` 计划、公开研究包、正/反/中性视角分离。", "`ksana` plan, public research packet, and separated positive/negative/neutral views.") },
    { title: copy(language, "3. 批判", "3. Critique"), body: copy(language, "综合、red-team 报告，并在公开输出前经过证据/边界门。", "Synthesis, red-team report, and evidence/boundary gate before public output.") },
    { title: copy(language, "4. 认知", "4. Cognition"), body: copy(language, "`alaya` 对象、周度运行、Gate-Judge 认知分层。", "`alaya` object, weekly operation, and Gate-Judge cognition layering.") },
  ];
  return (
    <section className="system-flow-diagram" aria-labelledby="system-diagram-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "研究认知工厂", "Research cognition factory")}</span>
        <h2 id="system-diagram-title">{copy(language, "从 ticker 到认知层", "From ticker to cognition layer")}</h2>
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
    [copy(language, "结算器", "Resolver"), copy(language, "只有 public-safe 价格证据齐备时，过期可结算行才会结算。", "Expired eligible rows can resolve only with public-safe price evidence.")],
    [copy(language, "Paper portfolio", "Paper portfolio"), copy(language, "固定策略下的 long-only 假设映射。", "Long-only hypothetical mapping under fixed policy.")],
    [copy(language, "简报", "Reports"), copy(language, "Notes 解释不确定性、变化、下一步观察和边界。", "Notes explain uncertainty, changes, next watch queue, and boundaries.")],
  ] as const;
  return (
    <section className="process-strip methodology-process" aria-labelledby="method-process-title">
      <div className="process-strip-head">
        <span className="section-index">{copy(language, "方法界面", "Method surface")}</span>
        <h2 id="method-process-title">{copy(language, "解释顺序", "Interpretation order")}</h2>
        <p>{copy(language, "产品按从左到右阅读：先记录，再结果，再策略约束 paper 视图，最后是简报解释。", "The product reads left to right: record first, outcome second, policy-bound paper view third, report last.")}</p>
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

function SystemRulesPage({ language }: { language: Language }) {
  const localizedReasons = [
    copy(language, "先解析 ticker 身份，避免研究错资产、ADR/主上市混淆或代码歧义。", "Ticker identity is resolved first so the system does not research the wrong asset or confuse an ADR, primary listing, or ambiguous symbol."),
    copy(language, "LLM 输出只能标为 draft/unverified，因为公开研究摘要仍可能缺上下文、弱来源或 unsupported inference。", "LLM output is labeled draft/unverified because public research summaries can still contain missing context, weak sourcing, or unsupported inference."),
    copy(language, "正面、负面、中性 agent 在综合前分离，让分歧可见，而不是平均成虚假的确定性。", "Positive, negative, and neutral agents are separated before synthesis so disagreement remains visible instead of being averaged into fake certainty."),
    copy(language, "Red-team 是必经步骤，主动寻找 overclaim、隐藏假设、缺失反证和边界破坏。", "Red-team review is mandatory because the system must actively search for overclaims, hidden assumptions, missing counterevidence, and boundary breaks."),
    copy(language, "公开输出或 `alaya` 集成前先跑边界门，防止 private artifacts、raw provider output 和建议式表述泄漏。", "Boundary gates run before public output or `alaya` integration so private artifacts, raw provider output, and advice-like wording cannot slip through."),
    copy(language, "认知层替代 confidence theater：弱证据可以保持弱、降级、冻结、拒绝或转人工复核。", "Cognition layers replace confidence theater: weak evidence can stay weak, be downgraded, frozen, rejected, or sent to human review."),
    copy(language, "系统不能悄悄把研究变成投资建议；每个公开对象都要保留可追踪下一步和明确不确定性。", "The system must not silently turn research into investment advice; every public object keeps a traceable next step and explicit uncertainty."),
  ];
  const localizedFailures = [
    copy(language, "输出买入、卖出、持有、仓位、入场或退出建议。", "Outputs buy, sell, hold, position-size, entry, or exit advice."),
    copy(language, "把 local research、local checks 或 smoke evidence 说成证明。", "Claims proof from local research, local checks, or smoke evidence."),
    copy(language, "隐藏 red-team 发现、未解决异议、blocked 状态或不确定性。", "Hides red-team findings, unresolved objections, blocked states, or uncertainty."),
    copy(language, "在公开输出中使用 private data、private GOTRA artifacts、raw prompts、completions、provider raw output、scorer transcripts、DBs、secrets、auth/session files 或 local private paths。", "Uses private data, private GOTRA artifacts, raw prompts, completions, provider raw output, scorer transcripts, DBs, secrets, auth/session files, or local private paths in public output."),
    copy(language, "在只允许 public-safe summaries 的位置存储 raw provider output。", "Stores raw provider output where only public-safe summaries are allowed."),
    copy(language, "把弱证据升级为强认知层。", "Upgrades weak evidence into a strong cognition layer."),
    copy(language, "无法解释一个 cognition object 为什么被升级、降级、冻结、拒绝或送人工复核。", "Cannot explain why a cognition object was promoted, downgraded, frozen, rejected, or sent to human review."),
  ];
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "系统", "System")}
        title="Weekly Research Cognition System"
        body={copy(language, "DRAFT_PRD 操作契约：一个周度研究认知工厂的设计目标，用于 traceable research objects、不确定性标签、red-team 批判和 cognition-layer 决策；它不是交易机器。", "DRAFT_PRD operating contract for a weekly research cognition factory. It describes a proposed workflow for traceable research objects, uncertainty labels, red-team critique, and cognition-layer decisions; it is not a trading machine.")}
        icon={ShieldCheck}
      />
      <section className="route-panel system-shell" aria-labelledby="system-boundary-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          {boundarySentence(language)}
        </div>
        <div className="boundary-banner warning">
          <AlertCircle aria-hidden="true" size={18} />
          {copy(language, "状态：DRAFT_PRD。本页是设计目标和操作契约，不是完整周度系统已经实现、稳定、盈利、科学验证或 launch-ready 的证据。", "Status: DRAFT_PRD. This page is a design target and operating contract, not evidence that the full weekly system is already implemented, stable, profitable, scientifically validated, or launch-ready.")}
        </div>

        <section aria-labelledby="system-summary-title" className="system-summary-grid">
          <div>
            <h2 id="system-summary-title">{copy(language, "白话总结", "Plain-language summary")}</h2>
            <p>
              {copy(language, "ticker 进入系统后，不会立即给出买卖。它先创建研究任务，检查身份和边界，让 `ksana` 规划研究，收集公开信息，分别运行正面、负面和中性视角，red-team 结果，再次检查边界，存储 `alaya` cognition object，并分配 cognition layer。", "A ticker enters the system, but the system does not immediately say buy or sell. It creates a research job, checks identity and boundaries, asks `ksana` to plan the research, gathers public information, runs positive, negative, and neutral views, red-teams the result, checks boundaries again, stores an `alaya` cognition object, and assigns a cognition layer.")}
            </p>
            <p>
              {copy(language, "目标是可追踪、不确定性标注和更难被欺骗的研究。公开输出应说明研究了什么、考虑了哪些证据、哪里仍不确定、分配了什么 cognition layer，以及下一步必须发生什么。", "The goal is traceability, uncertainty labeling, and harder-to-fool research. Public output should explain what was studied, what evidence was considered, what remains uncertain, what cognition layer was assigned, and what must happen next.")}
            </p>
          </div>
          <div className="system-rule-card">
            <span>{copy(language, "研究工厂规则", "Research factory rule")}</span>
            <strong>{copy(language, "没有即时交易动作", "No immediate trading action")}</strong>
            <p>
              {copy(language, "ticker 只是 public-safe research object 的起点。它不是直接指令、信号、配置、入场、退出或保证。", "A ticker is a starting point for a public-safe research object. It is not a direct instruction, signal, allocation, entry, exit, or guarantee.")}
            </p>
          </div>
        </section>

        <SystemFlowDiagram language={language} />
        <EvidenceLoopDiagram language={language} />

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
          <h2 id="system-agents-title">{copy(language, "Agent 责任表", "Agent responsibility table")}</h2>
          <div className="table-scroll">
            <table className="portfolio-table system-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>{copy(language, "责任", "Responsibility")}</th>
                  <th>{copy(language, "不得做", "Must not do")}</th>
                </tr>
              </thead>
              <tbody>
                {agentResponsibilities.map(([agent, responsibility, mustNot]) => (
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
            {copy(language, "这些标签族不能混用。Research status 描述工作流进度，cognition layer 描述对象强度和下一步，evidence label 描述当前证据层级。", "These label families must not be mixed. Research status describes workflow progress, cognition layer describes object strength and next action, and evidence label describes what proof layer currently exists.")}
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
                <li>cognition layer</li>
                <li>{copy(language, "下一步必须发生什么", "what must happen next")}</li>
              </ul>
            </article>
            <article>
              <h3>{copy(language, "公开输出不得展示", "Public output must not show")}</h3>
              <ul>
                <li>private prompt chains</li>
                <li>provider raw output</li>
                <li>{copy(language, "secret data", "secret data")}</li>
                <li>{copy(language, "未脱敏 internal scoring", "unredacted internal scoring")}</li>
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
        title={copy(language, "假设 paper tracking", "Hypothetical paper tracking")}
        body={copy(language, "这里展示按 portfolio_policy_v1 机械生成的 public-safe paper portfolio snapshot。它不是 live trading、不是 investment advice，也不是 performance proof。", "This page shows a public-safe paper portfolio snapshot mechanically generated under portfolio_policy_v1. It is not live trading, investment advice, or performance proof.")}
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
            {snapshot.small_sample_warning}
          </div>
        ) : null}
        <div className="policy-grid">
          <article>
            <span>policy_version</span>
            <strong>{snapshot.policy_version}</strong>
            <p>{snapshot.policy_boundary.shorting === "disabled" ? copy(language, "Long-only / long-cash。禁用做空。", "Long-only / long-cash. Shorting is disabled.") : copy(language, "见策略边界。", "See policy boundary.")}</p>
          </article>
          <article>
            <span>benchmarks</span>
            <strong>{snapshot.benchmark_ids.join(" · ")}</strong>
            <p>{copy(language, "基准序列是 equity_curve.benchmark_equity 中的确定性 fixture 数据。", "Benchmark series is deterministic fixture data in equity_curve.benchmark_equity.")}</p>
          </article>
          <article>
            <span>sample_size</span>
            <strong>{snapshot.metrics.sample_size} {copy(language, "笔已结算 paper trade", "settled paper trade")}</strong>
            <p>{copy(language, `当前 public ledger 另有 ${ledgerMetrics.resolved} 条已结算 demo 行，不等同于 paper snapshot 样本。`, `Current public ledger still has ${ledgerMetrics.resolved} resolved demo rows outside this paper snapshot.`)}</p>
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
            <div className="equity-strip" aria-label="Paper equity and benchmark equity">
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
                {copy(language, `最新 paper equity ${formatCurrency(latestEquity.equity, snapshot.currency)}，基准 ${formatCurrency(latestEquity.benchmark_equity, snapshot.currency)}。`, `Latest paper equity ${formatCurrency(latestEquity.equity, snapshot.currency)} vs benchmark ${formatCurrency(latestEquity.benchmark_equity, snapshot.currency)}.`)}
              </p>
            ) : null}
          </section>
          <section aria-labelledby="cost-policy-title">
            <h2 id="cost-policy-title">{copy(language, "成本假设", "Cost assumptions")}</h2>
            <dl className="cost-list">
              <div>
                <dt>commission_bps</dt>
                <dd>{snapshot.cost_assumptions.commission_bps}</dd>
              </div>
              <div>
                <dt>slippage_bps</dt>
                <dd>{snapshot.cost_assumptions.slippage_bps}</dd>
              </div>
              <div>
                <dt>fx_cost_bps</dt>
                <dd>{snapshot.cost_assumptions.fx_cost_bps}</dd>
              </div>
            </dl>
          </section>
        </div>
        <section className="portfolio-table-shell" aria-labelledby="paper-trades-title">
          <h2 id="paper-trades-title">{copy(language, "Paper trades 与 positions", "Paper trades and positions")}</h2>
          <div className="table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>prediction_id</th>
                  <th>Ticker</th>
                  <th>{copy(language, "方向", "Side")}</th>
                  <th>{copy(language, "权重", "Weight")}</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Net return</th>
                  <th>Benchmark</th>
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
        body={copy(language, "方法页把 universe、horizon、resolver、portfolio 和数据边界放在结果之前，防止上线后口径漂移。", "This page places universe, horizon, resolver, portfolio, and data boundaries before interpretation so the public product cannot drift after launch.")}
        icon={BookOpenCheck}
      />
      <MethodologyProcessGraphic language={language} />
      <BoundaryPanel metadata={dataset.metadata} />
      <CredibilityDashboard records={records} />
    </>
  );
}

function SourcesPage({ dataset, language }: { dataset: LedgerDataset; language: Language }) {
  return (
    <>
      <PageIntro
        eyebrow={copy(language, "来源", "Sources")}
        title={copy(language, "Public-safe provenance", "Public-safe provenance")}
        body={copy(language, "来源页只展示 public-safe dataset、manifest 和 evidence-index 口径；不会公开 private GOTRA raw artifacts。", "This page only exposes public-safe dataset, manifest, and evidence-index surfaces; it never publishes private GOTRA raw artifacts.")}
        icon={Database}
      />
      <section className="route-panel" aria-labelledby="sources-title">
        <h2 id="sources-title">{copy(language, "哪些公开数据可被检查", "What public data can be inspected")}</h2>
        <p>
          {copy(language, "可见 source layer 故意很小：当前 demo ledger、evidence index、manifest、content index 和生成的 public-safe snapshots。技术文件路径只在下方审计详情中显示。", "The visible source layer is intentionally small: current demo ledger, evidence index, manifest, content index, and generated public-safe snapshots. Technical file paths are available below only as audit details.")}
        </p>
        <ContentTypeChart language={language} />
        <div className="source-reader-grid" aria-label="Public-safe data surfaces">
          <div>
            <span>{copy(language, "账本快照", "Ledger snapshot")}</span>
            <strong>{dataset.metadata.record_count} {copy(language, "条记录", "records")}</strong>
            <p>{copy(language, "包含 prediction、status、evidence summary 和 boundary metadata 的 public-safe demo records。", "Public-safe demo records with prediction, status, evidence summary, and boundary metadata.")}</p>
          </div>
          <div>
            <span>{copy(language, "快照日期", "Snapshot date")}</span>
            <strong>{dataset.metadata.snapshot_date}</strong>
            <p>{copy(language, "当前公开数据切片的读者日期。", "Reader-facing date for the current public data cut.")}</p>
          </div>
          <div>
            <span>{copy(language, "内容索引", "Content index")}</span>
            <strong>{contentItems.length} {copy(language, "篇简报", "notes")}</strong>
            <p>{copy(language, "带 claim boundaries 和 related prediction links 的公开 notes / reports。", "Public notes and reports with claim boundaries and related prediction links.")}</p>
          </div>
        </div>
        <details className="audit-details">
          <summary>{copy(language, "技术 provenance", "Technical provenance")}</summary>
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
      return copy(language, "public-safe 演示数据", "Demo public-safe dataset");
    default:
      return boundary.replaceAll("_", " ");
  }
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

function NoteReportDetail({ item, language }: { item: ContentItem; language: Language }) {
  const report = item.report;
  if (!report) {
    return null;
  }

  return (
    <section className="note-report" aria-labelledby="note-report-title">
      <div className="note-report-header">
        <div>
          <span className="section-index">{contentTypeLabel(item.type, language)}</span>
          <h2 id="note-report-title">{copy(language, "研究简报", "Research brief")}</h2>
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

      <section className="report-callout" aria-labelledby="report-tldr-title">
        <h3 id="report-tldr-title">TLDR</h3>
        <p>{reportTldr(item, language)}</p>
      </section>

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
                    <dt>Ticker</dt>
                    <dd className="mono">{scope.ticker}</dd>
                  </div>
                ) : null}
                {scope.company ? (
                  <div>
                    <dt>Company</dt>
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
              <p>{copy(language, scope.resolution_status === "resolved" ? "作为已结算参照行复核；它不是新增证明。" : "作为待判定观察行保留；不补写 outcome，不把 pending 当成成功或失败。", scope.why_watched)}</p>
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
                <p>{copy(language, "本简报未新增外部公开证据；仅使用当前 public-safe 账本状态说明观察队列和边界。", update.update)}</p>
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
              ? ["只使用当前 public-safe 账本行。", "没有新增公开 filing、市场数据 source 或公司更新。", "pending / frozen_pending 不是成功或失败。", "市场波动本身不能作为预测正确性证据。"]
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
              {item.report ? (
                <dl className="report-card-summary">
                  <div>
                    <dt>{copy(language, "结论", "Conclusion")}</dt>
                    <dd>{conclusionChangeLabel(item.report.conclusion_change.status, language)}</dd>
                  </div>
                  <div>
                    <dt>{copy(language, "报告日期", "Report date")}</dt>
                    <dd>{formatReaderDateForLanguage(item.report.report_date, language)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="tag-row">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
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
              {copy(language, `发布于 ${formatReaderDateForLanguage(item.published_at, language)}，类型为 ${contentTypeLabel(item.type, language)}。技术 provenance 在下方折叠；默认视图从结论、证据、下一步和边界开始。`, `Published ${formatReaderDateForLanguage(item.published_at, language)} as ${contentTypeLabel(item.type, language)}. Technical provenance is available below, but the default view starts with reader conclusions, evidence, next steps, and boundary.`)}
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
          <h3>Tags</h3>
          <div className="tag-row">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>
        <section>
          <h3>{copy(language, "关联预测", "Related predictions")}</h3>
          <RelatedPredictionLinks ids={item.related_prediction_ids} language={language} />
        </section>
        <details className="audit-details">
          <summary>{copy(language, "审计详情 / 技术 provenance", "Audit details / technical provenance")}</summary>
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
            Full markdown body is stored at <span className="mono">{item.body_source}</span> and validated by local
            content checks for boundary text and internal route links.
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
          body={copy(language, "当前 public-safe demo 快照中没有找到该 prediction_id；页面不会回填或伪造缺失记录。", "The current public-safe demo snapshot does not include that prediction_id; the page will not backfill or fabricate missing records.")}
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note">
          {copy(language, "未找到该记录：", "Missing record:")}<span className="mono">{missingPredictionId ?? "unknown"}</span>。{copy(language, "返回", "Return to")}{" "}
          <a href={routeHref("/ledger")}>Ledger</a> 浏览当前快照。
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow={copy(language, "记录详情", "Prediction detail")}
        title={`${record.ticker} · ${record.company}`}
        body={copy(language, "单条记录页只展示当前 public-safe 快照中已有的 prediction、outcome 和 provenance；pending/frozen_pending 不补写实际结果。", "This detail page only shows prediction, outcome, and provenance already present in the current public-safe snapshot; pending/frozen_pending rows are not backfilled.")}
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
            <summary>{copy(language, "技术 provenance", "Technical provenance")}</summary>
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
          {copy(language, "返回 Ledger", "Back to Ledger")}
        </a>
      </section>
    </>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute(window.location.hash));
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
  const dashboardLoadRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseHashRoute(window.location.hash));
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
            <HowItWorks />
            <TrustStrip records={views} />
            {dashboardRequested ? (
              <Suspense fallback={<ChartLoadingSkeleton />}>
                <CognitionDashboard
                  dataset={dataset}
                  records={views}
                  tickers={tickers}
                  selectedTicker={activeTicker}
                  onTickerChange={setSelectedTicker}
                  onSelectRecord={openRecord}
                />
              </Suspense>
            ) : (
              <ChartLoadingSkeleton containerRef={dashboardLoadRef} />
            )}
            <CredibilityDashboard records={views} />
          </>
        ) : null}

        {route.name === "ledger" ? (
          <>
            <PageIntro
              eyebrow={copy(language, "账本", "Ledger")}
              title={copy(language, "完整公开预测账本", "Complete public prediction ledger")}
              body={copy(language, "完整账本保留搜索、筛选、排序和逐条 detail URL。pending 与 frozen_pending 不进入 resolved-only 指标。", "The full ledger keeps search, filters, sorting, and shareable detail URLs. pending and frozen_pending rows stay outside resolved-only metrics.")}
              icon={Database}
            />
            <LedgerStatusChart metrics={metrics} language={language} />
            <section className="ledger-section" id="full-ledger" aria-labelledby="full-ledger-title">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <span className="section-index">S5 · Full ledger</span>
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
                  <span className="sr-only">Search ledger</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy(language, "搜索 ticker 或公司", "Search ticker or company")}
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
                {copy(language, "未找到该记录：", "Missing record:")}<span className="mono">{missingPredictionId}</span>。{copy(language, "请检查 prediction_id，或使用下方搜索和筛选浏览当前 public-safe demo 快照。", "Check prediction_id, or use search and filters below to browse the current public-safe demo snapshot.")}
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
        {route.name === "notes" ? <NotesPage language={language} /> : null}
        {route.name === "note" ? <NoteDetailPage item={activeNote} language={language} /> : null}

        {route.name === "home" || route.name === "notes" || route.name === "note" ? <Subscribe language={language} /> : null}
        <SiteFooter metadata={dataset.metadata} language={language} />
      </main>
    </div>
  );
}

export default App;
