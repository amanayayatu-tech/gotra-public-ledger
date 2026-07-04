import { ArrowRight, BookOpenCheck, BrainCircuit, Database, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { RecordView, SummaryMetrics } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import type { Language } from "../i18n/language";
import { boundarySentence, copy } from "../i18n/language";

type HeroProps = {
  dataset: LedgerDataset;
  metrics: SummaryMetrics;
  records: RecordView[];
  language: Language;
};

type V4BriefStatus = {
  brief_date?: string;
  schema?: string;
  methodology_version?: string;
  execution_model?: string;
  full_analyst?: {
    run_status?: string;
    canary_status?: string;
    needs_review_count?: number;
    data_gap_count?: number;
  };
  internal_alaya?: {
    readback_status?: string | null;
    readback_verified_count?: number;
  };
};

type BriefStatusState =
  | { kind: "loading" }
  | { kind: "ready"; status: V4BriefStatus }
  | { kind: "unavailable"; message: string };

function shortBoundary(language: Language): string {
  return boundarySentence(language).replaceAll(". ", " · ").replaceAll("。", " · ").replace(/ · $/, "");
}

function displayValue(value: string | number | null | undefined, fallback = "not_reported"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function HeroStatusStrip({ language, state }: { language: Language; state: BriefStatusState }) {
  const label = copy(language, "v4 public artifact status", "v4 public artifact status");

  if (state.kind === "loading") {
    return (
      <div className="v4-status-strip" aria-label={label}>
        <span>{copy(language, "v4 状态读取中", "v4 status loading")}</span>
        <strong>{copy(language, "正在读取 daily_reader_brief.v4", "Loading daily_reader_brief.v4")}</strong>
        <a href="/#/today">{copy(language, "先去今日简报", "Open today's brief")}</a>
      </div>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <div className="v4-status-strip warning" aria-label={label}>
        <span>{copy(language, "v4 状态暂不可用", "v4 status unavailable")}</span>
        <strong>{state.message}</strong>
        <a href="/#/today">{copy(language, "返回今日简报", "Back to today's brief")}</a>
      </div>
    );
  }

  const { status } = state;
  const fullAnalyst = status.full_analyst ?? {};
  const alaya = status.internal_alaya ?? {};
  const items = [
    [copy(language, "Brief date", "Brief date"), displayValue(status.brief_date)],
    [copy(language, "Methodology", "Methodology"), displayValue(status.methodology_version)],
    [copy(language, "Execution", "Execution"), displayValue(status.execution_model)],
    [copy(language, "Run status", "Run status"), displayValue(fullAnalyst.run_status ?? fullAnalyst.canary_status)],
    [copy(language, "Review / gap", "Review / gap"), `${displayValue(fullAnalyst.needs_review_count, "0")} / ${displayValue(fullAnalyst.data_gap_count, "0")}`],
    [copy(language, "Alaya readback", "Alaya readback"), displayValue(alaya.readback_status ?? alaya.readback_verified_count)],
  ];

  return (
    <div className="v4-status-strip" aria-label={label}>
      {items.map(([name, value]) => (
        <div key={name}>
          <span>{name}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Hero({ language }: HeroProps) {
  const [briefStatus, setBriefStatus] = useState<BriefStatusState>({ kind: "loading" });
  const heroAsset = `${import.meta.env.BASE_URL}images/v4-cognition-flywheel-flow.svg`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}reports/daily_reader_brief.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<V4BriefStatus>;
      })
      .then((status) => {
        if (!cancelled) {
          setBriefStatus({ kind: "ready", status });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setBriefStatus({
            kind: "unavailable",
            message: reason instanceof Error ? reason.message : String(reason),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mechanismCards = [
    [
      <BookOpenCheck aria-hidden="true" size={18} key="task" />,
      copy(language, "Research Task", "Research Task"),
      copy(language, "先说明为什么今天研究、核心问题和必需证据。", "Defines why this stock is studied today, core questions, and required evidence."),
    ],
    [
      <Database aria-hidden="true" size={18} key="evidence" />,
      copy(language, "Evidence Packet", "Evidence Packet"),
      copy(language, "公开证据、缺失来源、freshness 和 data_gap 先于结论出现。", "Public evidence, missing sources, freshness, and data_gap appear before conclusions."),
    ],
    [
      <GitBranch aria-hidden="true" size={18} key="parallel" />,
      copy(language, "K Dossier -> F/W/G", "K Dossier -> F/W/G"),
      copy(language, "K deep research dossier 先行；F/W/G 基于 K 并行审查。", "K deep research dossier runs first; F/W/G review in parallel from K."),
    ],
    [
      <BrainCircuit aria-hidden="true" size={18} key="gate" />,
      copy(language, "Knowledge Gate", "Knowledge Gate"),
      copy(language, "决定哪些知识沉淀到内部 Alaya memory，哪些保持 unresolved。", "Decides what persists to internal Alaya memory and what remains unresolved."),
    ],
  ];

  return (
    <section className="hero-section v4-home-hero" id="hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="hero-boundary-note">
          <ShieldCheck aria-hidden="true" size={16} />
          {shortBoundary(language)}
        </div>
        <p className="hero-brand-motif">{copy(language, "GOTRA v4 · Ksana cognition flywheel", "GOTRA v4 · Ksana cognition flywheel")}</p>
        <h1 id="page-title" className="hero-title">
          {copy(
            language,
            "把研究过程讲清楚，再交给你判断。",
            "GOTRA v4 shows how the research was made, then leaves the decision to you.",
          )}
        </h1>
        <p>
          {copy(
            language,
            "GOTRA v4 是一套 Ksana cognition flywheel：K deep research dossier 先行，F/W/G 基于 K 并行，Chairman 综合冲突，Red Team 反证，Knowledge Gate 决定沉淀。它不是荐股 agent，也不是交易信号。",
            "GOTRA v4 is a Ksana cognition flywheel: K deep research dossier first, F/W/G run in parallel from K, Chairman synthesizes conflicts, Red Team critiques, and Knowledge Gate decides what persists. It is not a stock-picking agent or a trading signal.",
          )}
        </p>
        <div className="hero-mechanism-strip" aria-label={copy(language, "v4 研究链路", "v4 research chain")}>
          <span>Research Task</span>
          <span>Evidence Packet</span>
          <span>K Dossier</span>
          <span>F/W/G Parallel</span>
          <span>Knowledge Gate</span>
        </div>
        <div className="hero-actions" aria-label="Page shortcuts">
          <a className="primary-action" href="/#/today">
            {copy(language, "阅读今日简报", "Read today's brief")}
            <ArrowRight aria-hidden="true" size={16} />
          </a>
          <a className="secondary-action" href="/#/reports/full-analyst">
            {copy(language, "打开研究阅读器", "Open research reader")}
          </a>
        </div>
        <HeroStatusStrip language={language} state={briefStatus} />
      </div>

      <div className="hero-side v4-hero-side">
        <figure className="hero-asset-frame v4-flow-frame">
          <img
            src={heroAsset}
            alt={copy(language, "GOTRA v4 Ksana cognition flywheel: research task, evidence packet, K dossier, F/W/G, Chairman, Red Team, Knowledge Gate, Alaya readback, Reader Boundary, public brief", "GOTRA v4 Ksana cognition flywheel: research task, evidence packet, K dossier, F/W/G, Chairman, Red Team, Knowledge Gate, Alaya readback, Reader Boundary, public brief")}
            width={1200}
            height={760}
            loading="eager"
            decoding="async"
          />
        </figure>
        <div className="home-priority-grid v4-mechanism-grid" aria-label={copy(language, "v4 机制摘要", "v4 mechanism summary")}>
          {mechanismCards.map(([icon, title, body]) => (
            <article key={String(title)}>
              {icon}
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
