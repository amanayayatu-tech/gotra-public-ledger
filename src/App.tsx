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

function formatReaderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function reportStatusLabel(status: string): string {
  switch (status) {
    case "demo_format":
      return "Demo operating format";
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    default:
      return status.replaceAll("_", " ");
  }
}

function conclusionChangeLabel(status: string): string {
  switch (status) {
    case "unchanged":
      return "Unchanged";
    case "strengthened":
      return "Strengthened";
    case "weakened":
      return "Weakened";
    case "conflict_found":
      return "Conflict found";
    case "needs_review":
      return "Needs review";
    case "no_new_evidence":
      return "No new public evidence";
    default:
      return status.replaceAll("_", " ");
  }
}

function evidenceLayerLabel(layer: string): string {
  switch (layer) {
    case "no_new_evidence":
      return "No new public evidence";
    case "public_safe_demo":
      return "Public-safe demo";
    case "local_checks":
      return "Local checks";
    default:
      return layer.replaceAll("_", " ");
  }
}

function scopeLayerLabel(layer: string): string {
  switch (layer) {
    case "background":
      return "Background layer";
    case "evidence":
      return "Evidence layer";
    case "background_and_evidence":
      return "Background + evidence";
    default:
      return layer.replaceAll("_", " ");
  }
}

function ledgerStatusReaderLabel(status: string): string {
  switch (status) {
    case "resolved":
      return "Resolved";
    case "pending":
      return "Pending";
    case "frozen_pending":
      return "Frozen pending";
    default:
      return status.replaceAll("_", " ");
  }
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

function LedgerStatusChart({ metrics }: { metrics: ReturnType<typeof computeSummary> }) {
  const rows = [
    { label: "Resolved", value: metrics.resolved, tone: "default" as const },
    { label: "Pending", value: metrics.pending, tone: "blue" as const },
    { label: "Frozen pending", value: metrics.frozenPending, tone: "amber" as const },
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="reader-chart" aria-labelledby="ledger-status-chart-title">
      <div>
        <span className="section-index">Actual repo data</span>
        <h2 id="ledger-status-chart-title">Ledger status distribution</h2>
        <p>Counts come from the current public ledger snapshot. Pending and frozen rows remain outside resolved-only metrics.</p>
      </div>
      <div className="data-bar-list">
        {rows.map((row) => (
          <DataBar key={row.label} {...row} max={max} />
        ))}
      </div>
    </section>
  );
}

function ContentTypeChart() {
  const counts = contentItems.reduce<Record<string, number>>((acc, item) => {
    const label = contentTypeLabel(item.type);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(counts);
  const max = Math.max(...rows.map(([, value]) => value), 1);

  return (
    <section className="reader-chart compact" aria-labelledby="content-chart-title">
      <div>
        <span className="section-index">Content index</span>
        <h2 id="content-chart-title">Published note types</h2>
        <p>Rendered from the public content index; file-level provenance is collapsed below.</p>
      </div>
      <div className="data-bar-list">
        {rows.map(([label, value]) => (
          <DataBar key={label} label={label} value={value} max={max} tone="blue" />
        ))}
      </div>
    </section>
  );
}

function PortfolioComparisonBars({ snapshot }: { snapshot: PaperPortfolioSnapshot }) {
  const values = [
    { label: "Paper cumulative", value: snapshot.metrics.cumulative_return_pct },
    { label: "Benchmark", value: snapshot.metrics.benchmark_return_pct },
    { label: "Excess", value: snapshot.metrics.excess_return_pct },
  ];
  const max = Math.max(...values.map((row) => Math.abs(row.value)), 1);

  return (
    <section className="reader-chart compact" aria-labelledby="portfolio-bars-title">
      <div>
        <span className="section-index">Policy-bound snapshot</span>
        <h2 id="portfolio-bars-title">Return comparison</h2>
        <p>These bars use the deterministic paper portfolio snapshot, not live market data.</p>
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

function EvidenceLoopDiagram() {
  const steps = ["Morning brief", "Evidence check", "Gate/Judge", "Ledger update", "Evening review"];
  return (
    <section className="process-strip" aria-labelledby="evidence-loop-title">
      <div className="process-strip-head">
        <span className="section-index">Daily research loop</span>
        <h2 id="evidence-loop-title">Morning brief to evening review</h2>
        <p>Visual operating pattern only: it lowers reading cost and does not add evidence or performance claims.</p>
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

function SystemFlowDiagram() {
  const groups = [
    { title: "1. Intake", body: "Ticker identity, boundary checks, and research job creation." },
    { title: "2. Research", body: "`ksana` plan, public research packet, and separated positive/negative/neutral views." },
    { title: "3. Critique", body: "Synthesis, red-team report, and evidence/boundary gate before public output." },
    { title: "4. Cognition", body: "`alaya` object, weekly operation, and Gate-Judge cognition layering." },
  ];
  return (
    <section className="system-flow-diagram" aria-labelledby="system-diagram-title">
      <div className="process-strip-head">
        <span className="section-index">Research cognition factory</span>
        <h2 id="system-diagram-title">From ticker to cognition layer</h2>
        <p>No buy/sell path exists in this diagram; every output passes through evidence and boundary gates.</p>
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

function MethodologyProcessGraphic() {
  const steps = [
    ["Public ledger", "Predictions stay separate from outcomes."],
    ["Resolver", "Expired eligible rows can resolve only with public-safe price evidence."],
    ["Paper portfolio", "Long-only hypothetical mapping under fixed policy."],
    ["Reports", "Notes explain uncertainty, changes, next watch queue, and boundaries."],
  ] as const;
  return (
    <section className="process-strip methodology-process" aria-labelledby="method-process-title">
      <div className="process-strip-head">
        <span className="section-index">Method surface</span>
        <h2 id="method-process-title">Interpretation order</h2>
        <p>The product reads left to right: record first, outcome second, policy-bound paper view third, report last.</p>
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

const systemReasons = [
  "Ticker identity is resolved first so the system does not research the wrong asset or confuse an ADR, primary listing, or ambiguous symbol.",
  "LLM output is labeled draft/unverified because public research summaries can still contain missing context, weak sourcing, or unsupported inference.",
  "Positive, negative, and neutral agents are separated before synthesis so disagreement remains visible instead of being averaged into fake certainty.",
  "Red-team review is mandatory because the system must actively search for overclaims, hidden assumptions, missing counterevidence, and boundary breaks.",
  "Boundary gates run before public output or `alaya` integration so private artifacts, raw provider output, and advice-like wording cannot slip through.",
  "Cognition layers replace confidence theater: weak evidence can stay weak, be downgraded, frozen, rejected, or sent to human review.",
  "The system must not silently turn research into investment advice; every public object keeps a traceable next step and explicit uncertainty.",
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

const failureConditions = [
  "Outputs buy, sell, hold, position-size, entry, or exit advice.",
  "Claims proof from local research, local checks, or smoke evidence.",
  "Hides red-team findings, unresolved objections, blocked states, or uncertainty.",
  "Uses private data, private GOTRA artifacts, raw prompts, completions, provider raw output, scorer transcripts, DBs, secrets, auth/session files, or local private paths in public output.",
  "Stores raw provider output where only public-safe summaries are allowed.",
  "Upgrades weak evidence into a strong cognition layer.",
  "Cannot explain why a cognition object was promoted, downgraded, frozen, rejected, or sent to human review.",
];

function SystemRulesPage() {
  return (
    <>
      <PageIntro
        eyebrow="System"
        title="Weekly Research Cognition System"
        body="DRAFT_PRD operating contract for a weekly research cognition factory. It describes a proposed workflow for traceable research objects, uncertainty labels, red-team critique, and cognition-layer decisions; it is not a trading machine."
        icon={ShieldCheck}
      />
      <section className="route-panel system-shell" aria-labelledby="system-boundary-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          Research information only. Not investment advice. Not a trading signal. Not live trading. Not performance proof. No performance proof. No guarantee of future performance.
        </div>
        <div className="boundary-banner warning">
          <AlertCircle aria-hidden="true" size={18} />
          Status: DRAFT_PRD. This page is a design target and operating contract, not evidence that the full weekly
          system is already implemented, stable, profitable, scientifically validated, or launch-ready.
        </div>

        <section aria-labelledby="system-summary-title" className="system-summary-grid">
          <div>
            <h2 id="system-summary-title">Plain-language summary</h2>
            <p>
              A ticker enters the system, but the system does not immediately say buy or sell. It creates a research
              job, checks identity and boundaries, asks `ksana` to plan the research, gathers public information, runs
              positive, negative, and neutral views, red-teams the result, checks boundaries again, stores an `alaya`
              cognition object, and assigns a cognition layer.
            </p>
            <p>
              The goal is traceability, uncertainty labeling, and harder-to-fool research. Public output should explain
              what was studied, what evidence was considered, what remains uncertain, what cognition layer was assigned,
              and what must happen next.
            </p>
          </div>
          <div className="system-rule-card">
            <span>Research factory rule</span>
            <strong>No immediate trading action</strong>
            <p>
              A ticker is a starting point for a public-safe research object. It is not a direct instruction, signal,
              allocation, entry, exit, or guarantee.
            </p>
          </div>
        </section>

        <SystemFlowDiagram />
        <EvidenceLoopDiagram />

        <details className="audit-details system-steps-detail">
          <summary>Full operating steps</summary>
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
          <h2 id="system-why-title">Why this exists</h2>
          <div className="system-reason-grid">
            {systemReasons.map((reason) => (
              <article key={reason}>
                <p>{reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="system-agents-title">
          <h2 id="system-agents-title">Agent responsibility table</h2>
          <div className="table-scroll">
            <table className="portfolio-table system-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Responsibility</th>
                  <th>Must not do</th>
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
          <h2 id="system-labels-title">Status, layer, and evidence labels</h2>
          <p>
            These label families must not be mixed. Research status describes workflow progress, cognition layer
            describes object strength and next action, and evidence label describes what proof layer currently exists.
          </p>
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
        </section>

        <section aria-labelledby="system-output-title">
          <h2 id="system-output-title">Public output rule</h2>
          <div className="system-output-grid">
            <article>
              <h3>Public output may show</h3>
              <ul>
                <li>what was studied</li>
                <li>public evidence considered</li>
                <li>uncertainty and unresolved questions</li>
                <li>cognition layer</li>
                <li>what must happen next</li>
              </ul>
            </article>
            <article>
              <h3>Public output must not show</h3>
              <ul>
                <li>private prompt chains</li>
                <li>provider raw output</li>
                <li>secret data</li>
                <li>unredacted internal scoring</li>
                <li>trading instructions</li>
              </ul>
            </article>
          </div>
        </section>

        <section aria-labelledby="system-failures-title">
          <h2 id="system-failures-title">Failure conditions</h2>
          <ul className="system-failure-list">
            {failureConditions.map((failure) => (
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
}: {
  ledgerMetrics: ReturnType<typeof computeSummary>;
  snapshot: PaperPortfolioSnapshot;
}) {
  const latestEquity = snapshot.equity_curve.at(-1);

  return (
    <>
      <PageIntro
        eyebrow="Performance"
        title="Hypothetical paper tracking"
        body="这里展示按 portfolio_policy_v1 机械生成的 public-safe paper portfolio snapshot。它不是 live trading、不是 investment advice，也不是 performance proof。"
        icon={BarChart3}
      />
      <section className="route-panel performance-shell" aria-labelledby="performance-policy-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          Hypothetical paper tracking only. Not live trading, not investment advice, not a trading signal,
          not performance proof, and no guarantee of future performance.
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
            <p>{snapshot.policy_boundary.shorting === "disabled" ? "Long-only / long-cash. Shorting is disabled." : "See policy boundary."}</p>
          </article>
          <article>
            <span>benchmarks</span>
            <strong>{snapshot.benchmark_ids.join(" · ")}</strong>
            <p>Benchmark series is deterministic fixture data in equity_curve.benchmark_equity.</p>
          </article>
          <article>
            <span>sample_size</span>
            <strong>{snapshot.metrics.sample_size} settled paper trade</strong>
            <p>Current public ledger still has {ledgerMetrics.resolved} resolved demo rows outside this paper snapshot.</p>
          </article>
        </div>
        <div className="portfolio-metric-grid" aria-label="Paper portfolio metrics">
          <div>
            <span>Cumulative return</span>
            <strong>{formatSignedPercent(snapshot.metrics.cumulative_return_pct)}</strong>
          </div>
          <div>
            <span>Benchmark return</span>
            <strong>{formatSignedPercent(snapshot.metrics.benchmark_return_pct)}</strong>
          </div>
          <div>
            <span>Excess return</span>
            <strong>{formatSignedPercent(snapshot.metrics.excess_return_pct)}</strong>
          </div>
          <div>
            <span>Max drawdown</span>
            <strong>{formatSignedPercent(snapshot.metrics.max_drawdown_pct)}</strong>
          </div>
          <div>
            <span>Win rate</span>
            <strong>{formatPercent(snapshot.metrics.win_rate)}</strong>
          </div>
          <div>
            <span>Average exposure</span>
            <strong>{formatPercent(snapshot.metrics.average_exposure)}</strong>
          </div>
          <div>
            <span>Turnover</span>
            <strong>{formatNumber(snapshot.metrics.turnover, 2)}</strong>
          </div>
          <div>
            <span>Cost-adjusted return</span>
            <strong>{formatSignedPercent(snapshot.metrics.transaction_cost_adjusted_return_pct ?? null)}</strong>
          </div>
        </div>
        <PortfolioComparisonBars snapshot={snapshot} />
        <div className="portfolio-grid">
          <section aria-labelledby="equity-curve-title">
            <h2 id="equity-curve-title">Equity curve</h2>
            <div className="equity-strip" aria-label="Paper equity and benchmark equity">
              {snapshot.equity_curve.map((point) => (
                <div key={point.date}>
                  <span>{point.date}</span>
                  <strong>{formatCurrency(point.equity, snapshot.currency)}</strong>
                  <small>Benchmark {formatCurrency(point.benchmark_equity, snapshot.currency)}</small>
                </div>
              ))}
            </div>
            {latestEquity ? (
              <p className="portfolio-footnote">
                Latest paper equity {formatCurrency(latestEquity.equity, snapshot.currency)} vs benchmark{" "}
                {formatCurrency(latestEquity.benchmark_equity, snapshot.currency)}.
              </p>
            ) : null}
          </section>
          <section aria-labelledby="cost-policy-title">
            <h2 id="cost-policy-title">Cost assumptions</h2>
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
          <h2 id="paper-trades-title">Paper trades and positions</h2>
          <div className="table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>prediction_id</th>
                  <th>Ticker</th>
                  <th>Side</th>
                  <th>Weight</th>
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

function MethodologyPage({ dataset, records }: { dataset: LedgerDataset; records: RecordView[] }) {
  return (
    <>
      <PageIntro
        eyebrow="Methodology"
        title="Fixed rules before interpretation"
        body="方法页把 universe、horizon、resolver、portfolio 和数据边界放在结果之前，防止上线后口径漂移。"
        icon={BookOpenCheck}
      />
      <MethodologyProcessGraphic />
      <BoundaryPanel metadata={dataset.metadata} />
      <CredibilityDashboard records={records} />
    </>
  );
}

function SourcesPage({ dataset }: { dataset: LedgerDataset }) {
  return (
    <>
      <PageIntro
        eyebrow="Sources"
        title="Public-safe provenance"
        body="来源页只展示 public-safe dataset、manifest 和 evidence-index 口径；不会公开 private GOTRA raw artifacts。"
        icon={Database}
      />
      <section className="route-panel" aria-labelledby="sources-title">
        <h2 id="sources-title">What public data can be inspected</h2>
        <p>
          The visible source layer is intentionally small: current demo ledger, evidence index, manifest, content index,
          and generated public-safe snapshots. Technical file paths are available below only as audit details.
        </p>
        <ContentTypeChart />
        <div className="source-reader-grid" aria-label="Public-safe data surfaces">
          <div>
            <span>Ledger snapshot</span>
            <strong>{dataset.metadata.record_count} records</strong>
            <p>Public-safe demo records with prediction, status, evidence summary, and boundary metadata.</p>
          </div>
          <div>
            <span>Snapshot date</span>
            <strong>{dataset.metadata.snapshot_date}</strong>
            <p>Reader-facing date for the current public data cut.</p>
          </div>
          <div>
            <span>Content index</span>
            <strong>{contentItems.length} notes</strong>
            <p>Public notes and reports with claim boundaries and related prediction links.</p>
          </div>
        </div>
        <details className="audit-details">
          <summary>Technical provenance</summary>
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

function contentTypeLabel(type: ContentItem["type"]): string {
  switch (type) {
    case "method_note":
      return "Method note";
    case "weekly_review":
      return "Weekly ledger update";
    case "error_review":
      return "Error review";
    case "monthly_transparency":
      return "Transparency note";
    case "daily_morning_brief":
      return "Morning brief";
    case "daily_evening_review":
      return "Evening review";
    case "research_recap":
      return "Research recap";
  }
}

function boundaryLabel(boundary: string): string {
  switch (boundary) {
    case "research_information_only":
      return "Research information only";
    case "not_investment_advice":
      return "Not investment advice";
    case "not_trading_signal":
      return "Not a trading signal";
    case "no_guarantee_of_future_performance":
      return "No guarantee of future performance";
    case "no_performance_proof":
      return "No performance proof";
    case "not_science_public_proof":
      return "Not scientific proof";
    case "demo_public_safe_dataset":
      return "Demo public-safe dataset";
    default:
      return boundary.replaceAll("_", " ");
  }
}

function BoundaryChips({ item }: { item: ContentItem }) {
  return (
    <div className="boundary-chip-row" aria-label="Claim boundary">
      {item.claim_boundary.map((boundary) => (
        <span key={boundary}>{boundaryLabel(boundary)}</span>
      ))}
    </div>
  );
}

function RelatedPredictionLinks({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return <p className="muted">No directly related public prediction.</p>;
  }

  return (
    <div className="related-prediction-list">
      {ids.map((predictionId) => (
        <a className="mono" href={predictionRouteHref(predictionId)} key={predictionId}>
          {predictionId}
        </a>
      ))}
    </div>
  );
}

function NoteReportDetail({ item }: { item: ContentItem }) {
  const report = item.report;
  if (!report) {
    return null;
  }

  return (
    <section className="note-report" aria-labelledby="note-report-title">
      <div className="note-report-header">
        <div>
          <span className="section-index">{contentTypeLabel(item.type)}</span>
          <h2 id="note-report-title">Reader report</h2>
        </div>
        <dl>
          <div>
            <dt>Report date</dt>
            <dd>{formatReaderDate(report.report_date)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{reportStatusLabel(report.status)}</dd>
          </div>
          <div>
            <dt>Conclusion</dt>
            <dd>{conclusionChangeLabel(report.conclusion_change.status)}</dd>
          </div>
        </dl>
      </div>

      <section className="report-four-question" aria-label="Four question report summary">
        <article>
          <span>1</span>
          <strong>What was watched</strong>
          <p>{report.watched_scope.map((scope) => scope.ticker ?? scope.company ?? scope.label).join(" · ")}</p>
        </article>
        <article>
          <span>2</span>
          <strong>Did conclusion change</strong>
          <p>{conclusionChangeLabel(report.conclusion_change.status)}</p>
        </article>
        <article>
          <span>3</span>
          <strong>Why / why not</strong>
          <p>{report.why_or_why_not[0]}</p>
        </article>
        <article>
          <span>4</span>
          <strong>What to watch next</strong>
          <p>{report.next_watch_queue.map((item) => item.item).join(" · ")}</p>
        </article>
      </section>

      <section className="report-callout" aria-labelledby="report-tldr-title">
        <h3 id="report-tldr-title">TLDR</h3>
        <p>{report.tldr}</p>
      </section>

      <section aria-labelledby="report-watched-title">
        <h3 id="report-watched-title">Today watched / Reviewed scope</h3>
        <div className="report-watch-grid">
          {report.watched_scope.map((scope) => (
            <article key={`${scope.label}-${scope.prediction_id ?? scope.ticker ?? scope.company}`}>
              <div className="content-card-meta">
                <span>{scopeLayerLabel(scope.layer)}</span>
                {scope.resolution_status ? <span>{ledgerStatusReaderLabel(scope.resolution_status)}</span> : null}
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
                    <dt>Prediction</dt>
                    <dd>
                      <a className="mono" href={predictionRouteHref(scope.prediction_id)}>
                        {scope.prediction_id}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p>{scope.why_watched}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-two-column" aria-label="Ledger and evidence update">
        <div>
          <h3>Ledger changes</h3>
          <ul>
            {report.ledger_changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Evidence update</h3>
          <div className="report-evidence-list">
            {report.evidence_updates.map((update) => (
              <article key={`${update.topic}-${update.evidence_layer}`}>
                <span>{evidenceLayerLabel(update.evidence_layer)}</span>
                <strong>{update.topic}</strong>
                <p>{update.update}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="report-two-column" aria-label="Conclusion change and rationale">
        <div className="report-callout">
          <h3>Conclusion change</h3>
          <strong>{conclusionChangeLabel(report.conclusion_change.status)}</strong>
          <p>{report.conclusion_change.summary}</p>
        </div>
        <div>
          <h3>Why / why not</h3>
          <ul>
            {report.why_or_why_not.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="report-next-title">
        <h3 id="report-next-title">Next watch queue</h3>
        <div className="report-queue-grid">
          {report.next_watch_queue.map((queueItem) => (
            <article key={`${queueItem.item}-${queueItem.next_check}`}>
              <strong>{queueItem.item}</strong>
              <p>{queueItem.next_check}</p>
              <small>{queueItem.reason}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="report-callout warning" aria-labelledby="report-boundary-title">
        <h3 id="report-boundary-title">Boundary / what this does not prove</h3>
        <p>{report.boundary_note}</p>
      </section>
    </section>
  );
}

function NotesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Notes"
        title="Research notes and transparency reports"
        body="Notes 是持续运营入口。这里展示 public-safe 内容、边界、报告结论和 related predictions；技术来源默认收起在审计区。"
        icon={FileText}
      />
      <section className="route-panel notes-shell" aria-labelledby="notes-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          Research information only. Not investment advice. Not a trading signal. No performance proof. No guarantee of future performance.
        </div>
        <h2 id="notes-title">Initial public-safe articles</h2>
        <div className="content-card-grid">
          {contentItems.map((item) => (
            <article className="content-card" key={item.slug}>
              <div className="content-card-meta">
                <span>{contentTypeLabel(item.type)}</span>
                <time dateTime={item.published_at}>{item.published_at.slice(0, 10)}</time>
              </div>
              <h3>
                <a href={noteRouteHref(item.slug)}>{item.title}</a>
              </h3>
              <p>{item.summary}</p>
              {item.report ? (
                <dl className="report-card-summary">
                  <div>
                    <dt>Conclusion</dt>
                    <dd>{conclusionChangeLabel(item.report.conclusion_change.status)}</dd>
                  </div>
                  <div>
                    <dt>Report date</dt>
                    <dd>{formatReaderDate(item.report.report_date)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="tag-row">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <BoundaryChips item={item} />
              <RelatedPredictionLinks ids={item.related_prediction_ids} />
              <a className="secondary-action" href={noteRouteHref(item.slug)}>
                Read note
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function NoteDetailPage({ item }: { item: ContentItem | null }) {
  if (!item) {
    return (
      <>
        <PageIntro
          eyebrow="Notes"
          title="Note not found"
          body="当前 content index 中没有该 slug；页面不会伪造缺失内容。"
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note">
          返回 <a href={routeHref("/notes")}>Notes</a> 查看当前 public-safe 内容索引。
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow={contentTypeLabel(item.type)} title={item.title} body={item.summary} icon={FileText} />
      <article className="route-panel note-detail" aria-labelledby="note-detail-title">
        <div className="boundary-banner">
          <ShieldCheck aria-hidden="true" size={18} />
          Research information only. Not investment advice. Not a trading signal. No performance proof. No guarantee of future performance.
        </div>
        <div className="note-reader-head">
          <div>
            <span className="section-index">Reader first</span>
            <h2 id="note-detail-title">{item.report ? "Morning/evening report view" : "Readable note view"}</h2>
            <p>
              Published {formatReaderDate(item.published_at)} as {contentTypeLabel(item.type)}. Technical provenance is
              available below, but the default view starts with reader conclusions, evidence, next steps, and boundary.
            </p>
          </div>
          <BoundaryChips item={item} />
        </div>
        <NoteReportDetail item={item} />
        {!item.report ? (
          <section className="report-callout" aria-labelledby="note-summary-title">
            <h3 id="note-summary-title">Summary</h3>
            <p>{item.summary}</p>
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
          <h3>Claim boundary</h3>
          <BoundaryChips item={item} />
        </section>
        <section>
          <h3>Related predictions</h3>
          <RelatedPredictionLinks ids={item.related_prediction_ids} />
        </section>
        <details className="audit-details">
          <summary>Audit details / technical provenance</summary>
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
}: {
  record: RecordView | null;
  missingPredictionId: string | null;
  dataset: LedgerDataset;
}) {
  if (!record) {
    return (
      <>
        <PageIntro
          eyebrow="Prediction detail"
          title="Prediction not found"
          body="当前 public-safe demo 快照中没有找到该 prediction_id；页面不会回填或伪造缺失记录。"
          icon={AlertCircle}
        />
        <section className="route-panel edge-state-note">
          未找到该记录：<span className="mono">{missingPredictionId ?? "unknown"}</span>。返回{" "}
          <a href={routeHref("/ledger")}>Ledger</a> 浏览当前快照。
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="Prediction detail"
        title={`${record.ticker} · ${record.company}`}
        body="单条记录页只展示当前 public-safe 快照中已有的 prediction、outcome 和 provenance；pending/frozen_pending 不补写实际结果。"
        icon={FileText}
      />
      <section className="route-panel prediction-detail-page" aria-labelledby="prediction-detail-title">
        <div className="drawer-title-line">
          <h2 id="prediction-detail-title" className="drawer-record-title">
            {record.prediction_id}
          </h2>
          <span className={`status-badge ${record.status}`}>{record.status}</span>
        </div>
        <div className="detail-metrics">
          <div>
            <span>decision_date</span>
            <strong>{record.decision_date}</strong>
          </div>
          <div>
            <span>prediction_window</span>
            <strong>{record.prediction_window}</strong>
          </div>
          <div>
            <span>expected_change_pct</span>
            <strong>{record.expected_change_pct}%</strong>
          </div>
          <div>
            <span>actual_change_pct</span>
            <strong>{record.actual_change_pct === null ? "暂无" : `${record.actual_change_pct}%`}</strong>
          </div>
          <div>
            <span>error</span>
            <strong>{record.error === null ? "暂无" : `${record.error}pp`}</strong>
          </div>
          <div>
            <span>evidence_count</span>
            <strong>{record.evidence_count}</strong>
          </div>
        </div>
        <section className="detail-section">
          <h3>Reasoning summary</h3>
          <p>{record.reasoning}</p>
        </section>
        <section className="detail-section">
          <h3>Evidence / provenance</h3>
          <ul className="evidence-list">
            {record.evidence.map((item) => (
              <li key={`${item.source}-${item.date}`}>
                <span>{item.source}</span>
                <span className="mono">{item.date}</span>
              </li>
            ))}
          </ul>
          <p className="muted">
            dataset_id: <span className="mono">{record.provenance.dataset_id}</span> · source:{" "}
            <span className="mono">{record.provenance.source}</span>
          </p>
        </section>
        <section className="detail-section">
          <h3>Claim boundary</h3>
          <p>{dataset.metadata.claim_boundary.join(" · ")}</p>
        </section>
        <a className="secondary-action" href={routeHref("/ledger")}>
          返回 Ledger
        </a>
      </section>
    </>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute(window.location.hash));
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
      <SiteHeader activePath={routeActivePath(route)} />

      <main className="page-shell">
        {route.name === "home" ? (
          <>
            <Hero dataset={dataset} metrics={metrics} records={views} />
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
              eyebrow="Ledger"
              title="Complete public prediction ledger"
              body="完整账本保留当前 demo 的搜索、筛选、排序和逐条 detail URL。pending 与 frozen_pending 不进入 resolved-only 指标。"
              icon={Database}
            />
            <LedgerStatusChart metrics={metrics} />
            <section className="ledger-section" id="full-ledger" aria-labelledby="full-ledger-title">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <span className="section-index">S5 · Full ledger</span>
                <h2 id="full-ledger-title">完整公开账本</h2>
                <p>
                  这是全部 {views.length} 条公开判断，任你搜索、筛选、逐条核对；它不是投资行动指令。
                </p>
                <div className="status-legend" aria-label="Ledger status legend">
                  <span>
                    <i className="legend-dot resolved" />
                    已结算
                  </span>
                  <span>
                    <i className="legend-dot frozen_pending" />
                    冻结待判定
                  </span>
                  <span>
                    <i className="legend-dot pending" />
                    待判定
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
                    placeholder="搜索 ticker 或公司"
                  />
                </label>
                <label>
                  <span>状态</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="all">全部</option>
                    <option value="resolved">已结算</option>
                    <option value="frozen_pending">冻结待判定</option>
                    <option value="pending">待判定</option>
                  </select>
                </label>
                <label>
                  <span>方向</span>
                  <select
                    value={directionFilter}
                    onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}
                  >
                    <option value="all">全部方向</option>
                    <option value="up">看涨</option>
                    <option value="down">看跌</option>
                    <option value="neutral">中性</option>
                  </select>
                </label>
                <label>
                  <span>标的</span>
                  <select value={tickerFilter} onChange={(event) => setTickerFilter(event.target.value)}>
                    <option value="all">全部标的</option>
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
              当前显示 {filteredRecords.length} / {views.length} 条快照数据；统计口径只把已结算记录纳入命中率与误差。
            </div>
            {missingPredictionId ? (
              <div className="edge-state-note" role="status">
                未找到该记录：<span className="mono">{missingPredictionId}</span>。请检查 prediction_id，或使用下方搜索和筛选浏览当前
                public-safe demo 快照。
              </div>
            ) : null}

            <LedgerTable records={filteredRecords} sort={sort} onSort={handleSort} onSelect={openRecord} />
          </div>
            </section>
          </>
        ) : null}

        {route.name === "prediction" ? (
          <PredictionDetailPage record={routeRecord} missingPredictionId={missingPredictionId} dataset={dataset} />
        ) : null}

        {route.name === "performance" ? (
          <PerformancePage ledgerMetrics={metrics} snapshot={latestPaperPortfolioSnapshot} />
        ) : null}
        {route.name === "system" ? <SystemRulesPage /> : null}
        {route.name === "methodology" ? <MethodologyPage dataset={dataset} records={views} /> : null}
        {route.name === "sources" ? <SourcesPage dataset={dataset} /> : null}
        {route.name === "notes" ? <NotesPage /> : null}
        {route.name === "note" ? <NoteDetailPage item={activeNote} /> : null}

        {route.name === "home" || route.name === "notes" || route.name === "note" ? <Subscribe /> : null}
        <SiteFooter metadata={dataset.metadata} />
      </main>
    </div>
  );
}

export default App;
