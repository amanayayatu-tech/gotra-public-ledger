import { ArrowRight, BookOpenCheck, BrainCircuit, Database, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { RecordView, SummaryMetrics } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import { executionModelExplanation, researchStatusLabel, termExplanation, termLabel, termTitle } from "../data/terminology";
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
  const rawRunStatus = fullAnalyst.run_status ?? fullAnalyst.canary_status;
  const items = [
    [copy(language, "简报日期", "Brief date"), displayValue(status.brief_date)],
    [copy(language, "方法版本", "Methodology"), displayValue(status.methodology_version)],
    [copy(language, "执行模型", "Execution"), executionModelExplanation(status.execution_model, language)],
    [copy(language, "运行状态", "Run status"), researchStatusLabel(rawRunStatus, language)],
    [copy(language, "复核项 / 数据缺口", "Review / gap"), `${displayValue(fullAnalyst.needs_review_count, "0")} / ${displayValue(fullAnalyst.data_gap_count, "0")}`],
    [termTitle("alaya_internal_readback", language), researchStatusLabel(String(alaya.readback_status ?? alaya.readback_verified_count ?? "unavailable"), language)],
  ];

  return (
    <div className="v4-status-strip" aria-label={label}>
      {items.map(([name, value]) => (
        <div key={name}>
          <span>{name}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <details className="audit-details inline-status-code">
        <summary>{copy(language, "查看原始状态码", "View raw status codes")}</summary>
        <code>{displayValue(rawRunStatus)}</code>
        <code>{displayValue(status.execution_model)}</code>
        <p>{copy(language, "这些原始字段只用于审计；中文主路径以上方解释为准。", "These raw fields are for audit only; the reader path uses the explanations above.")}</p>
      </details>
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
      termLabel("research_task", language),
      termExplanation("research_task", language),
    ],
    [
      <Database aria-hidden="true" size={18} key="evidence" />,
      termLabel("evidence_packet", language),
      termExplanation("evidence_packet", language),
    ],
    [
      <GitBranch aria-hidden="true" size={18} key="parallel" />,
      copy(language, "K 底稿 -> F/W/G 独立视角", "K Dossier -> F/W/G"),
      copy(language, "K 深度研究底稿先行；F/W/G 基于 K 并行审查。", "K deep research dossier runs first; F/W/G review in parallel from K."),
    ],
    [
      <BrainCircuit aria-hidden="true" size={18} key="gate" />,
      termLabel("knowledge_gate", language),
      copy(language, "决定哪些知识沉淀到内部 Alaya 记忆，哪些保持未解决。", "Decides what persists to internal Alaya memory and what remains unresolved."),
    ],
  ];

  return (
    <section className="hero-section v4-home-hero" id="hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="hero-boundary-note">
          <ShieldCheck aria-hidden="true" size={16} />
          {shortBoundary(language)}
        </div>
        <p className="hero-brand-motif">
          {copy(language, "可审计 AI 金融研究发布账本 · 研究信息", "Auditable AI financial research ledger · research only")}
        </p>
        <h1 id="page-title" className="hero-title">
          {copy(
            language,
            "可审计 AI 金融研究发布账本",
            "Auditable AI financial research publication ledger",
          )}
        </h1>
        <p>
          {copy(
              language,
            "GOTRA 把每日研究观察、公开证据、数据缺口、复核项和审计记录放在同一条公开账本里。内部研究链路仍可在方法论和审计页查看；首页先说明它不是荐股 agent，也不是交易信号。",
            "GOTRA puts daily research observations, public evidence, data gaps, review items, and audit records into one public ledger. The internal research chain remains available in Methodology and Audit; the homepage first states that this is not a stock-picking agent or a trading signal.",
          )}
        </p>
        <div className="hero-mechanism-strip" aria-label={copy(language, "v4 研究链路", "v4 research chain")}>
          <span>{termTitle("research_task", language)}</span>
          <span>{termTitle("evidence_packet", language)}</span>
          <span>{termTitle("k_dossier", language)}</span>
          <span>{copy(language, "F/W/G 并行", "F/W/G Parallel")}</span>
          <span>{termTitle("knowledge_gate", language)}</span>
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
            alt={copy(language, "GOTRA 可审计研究账本流程：今日观察、证据包、K 底稿、独立视角、综合、红队、知识闸门、公开简报", "GOTRA auditable research ledger flow: daily observation, evidence packet, K dossier, independent perspectives, synthesis, Red Team, Knowledge Gate, public brief")}
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
