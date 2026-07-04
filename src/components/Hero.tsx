import { ArrowRight, BookOpenCheck, BrainCircuit, Database, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { RecordView, SummaryMetrics } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import { researchStatusLabel, termTitle } from "../data/terminology";
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
  const label = copy(language, "公开研究简报状态", "Public research brief status");

  if (state.kind === "loading") {
    return (
      <div className="v4-status-strip" aria-label={label}>
        <span>{copy(language, "公开简报读取中", "Public brief loading")}</span>
        <strong>{copy(language, "正在读取今日公开研究简报", "Loading today's public research brief")}</strong>
        <a href="/#/today">{copy(language, "先去今日简报", "Open today's brief")}</a>
      </div>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <div className="v4-status-strip warning" aria-label={label}>
        <span>{copy(language, "公开简报暂不可用", "Public brief unavailable")}</span>
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
    [copy(language, "研究状态", "Research status"), researchStatusLabel(rawRunStatus, language)],
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
        <summary>{copy(language, "查看审计字段", "View audit fields")}</summary>
        <code>{displayValue(rawRunStatus)}</code>
        <code>{displayValue(status.execution_model)}</code>
        <code>{displayValue(status.methodology_version)}</code>
        <p>{copy(language, "执行模型、方法版本和原始状态码只用于审计；主路径只展示读者解释。", "Execution model, methodology version, and raw status codes are audit fields; the reader path shows explanations first.")}</p>
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
      copy(language, "为什么今天研究", "Why this today"),
      copy(language, "先说明研究原因、核心问题，以及哪些证据不足时不能下结论。", "Starts with the reason, core questions, and what cannot be concluded without evidence."),
    ],
    [
      <Database aria-hidden="true" size={18} key="evidence" />,
      copy(language, "证据够不够", "Is evidence enough"),
      copy(language, "公开来源、时效、缺失来源和数据缺口先于任何研究判断。", "Public sources, freshness, missing sources, and gaps come before any research judgment."),
    ],
    [
      <GitBranch aria-hidden="true" size={18} key="parallel" />,
      copy(language, "多视角复核", "Multi-view review"),
      copy(language, "不同视角保留分歧和反证，不把不确定性压成一个答案。", "Different views keep disagreements and counter-evidence visible instead of compressing uncertainty into one answer."),
    ],
    [
      <BrainCircuit aria-hidden="true" size={18} key="gate" />,
      copy(language, "留下未解决问题", "Keep unresolved questions"),
      copy(language, "能沉淀的进入内部记忆；证据不足的问题保留到下一轮。", "What can persist goes to internal memory; insufficiently evidenced questions carry forward."),
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
        <div className="hero-mechanism-strip" aria-label={copy(language, "公开研究阅读顺序", "Public research reading order")}>
          <span>{copy(language, "今日观察", "Daily observation")}</span>
          <span>{copy(language, "公开证据", "Public evidence")}</span>
          <span>{copy(language, "多视角复核", "Multi-view review")}</span>
          <span>{copy(language, "反证与缺口", "Critique and gaps")}</span>
          <span>{copy(language, "公开简报", "Public brief")}</span>
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
