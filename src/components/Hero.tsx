import { ArrowDown, AlertTriangle, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { describeLargestError } from "../data/cognition";
import {
  formatNumber,
  formatSignedPercent,
  type RecordView,
  type SummaryMetrics,
} from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import type { Language } from "../i18n/language";
import { boundarySentence, copy } from "../i18n/language";

type HeroProps = {
  dataset: LedgerDataset;
  metrics: SummaryMetrics;
  records: RecordView[];
  language: Language;
};

function getLargestErrorRecord(records: RecordView[]): RecordView | null {
  const settled = records.filter((record) => record.status === "resolved" && typeof record.error === "number");
  if (settled.length === 0) {
    return null;
  }

  return settled.reduce((largest, record) =>
    Math.abs(record.error ?? 0) > Math.abs(largest.error ?? 0) ? record : largest,
  );
}

function getLatestSettledRecord(records: RecordView[]): RecordView | null {
  return (
    [...records]
      .filter((record) => record.status === "resolved")
      .sort(
        (a, b) =>
          b.decision_date.localeCompare(a.decision_date, "en") ||
          b.prediction_id.localeCompare(a.prediction_id, "en"),
      )[0] ?? null
  );
}

function getOpenMistakeCount(records: RecordView[]): number {
  return records.filter((record) => record.status === "resolved" && record.direction_correct === false).length;
}

function buildMiniSeries(records: RecordView[]): RecordView[] {
  const latestSettled = getLatestSettledRecord(records);
  if (!latestSettled) {
    return [];
  }

  return records
    .filter((record) => record.status === "resolved" && record.ticker === latestSettled.ticker)
    .sort(
      (a, b) =>
        a.decision_date.localeCompare(b.decision_date, "en") ||
        a.prediction_id.localeCompare(b.prediction_id, "en"),
    )
    .slice(-6);
}

function toPolyline(values: number[], min: number, max: number): string {
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 74 - ((value - min) / range) * 54;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function HeroMiniChart({ records, language }: { records: RecordView[]; language: Language }) {
  const series = buildMiniSeries(records);
  const latest = series.at(-1);

  if (!latest || series.length === 0) {
    return (
      <div className="hero-mini-chart empty" aria-label={copy(language, "预测 vs 实际迷你图", "Prediction vs actual mini chart")}>
        <div className="proof-head">
          <span>{copy(language, "预测 vs 实际", "Prediction vs actual")}</span>
          <strong>{copy(language, "暂无", "None")}</strong>
        </div>
        <p>{copy(language, "暂无已结算记录可绘制折线。", "No resolved records are available for this line chart.")}</p>
      </div>
    );
  }

  const values = series.flatMap((record) => [record.expected_change_pct, record.actual_change_pct ?? 0]);
  const min = Math.min(-1, ...values);
  const max = Math.max(1, ...values);

  return (
    <div className="hero-mini-chart" aria-label={copy(language, "预测 vs 实际迷你图", "Prediction vs actual mini chart")}>
      <div className="proof-head">
        <span>{copy(language, "预测 vs 实际", "Prediction vs actual")}</span>
        <strong>
          {latest.ticker} · {latest.prediction_window}
        </strong>
      </div>
      <svg viewBox="0 0 100 84" role="img" aria-label={`${latest.ticker} 最近已结算预测与实际折线`}>
        <line x1="0" x2="100" y1="74" y2="74" />
        <line x1="0" x2="100" y1="47" y2="47" />
        <line x1="0" x2="100" y1="20" y2="20" />
        <polyline className="predicted-line" points={toPolyline(series.map((record) => record.expected_change_pct), min, max)} />
        <polyline className="actual-line" points={toPolyline(series.map((record) => record.actual_change_pct ?? 0), min, max)} />
      </svg>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="predicted" />
          {copy(language, "预测", "Predicted")}
        </span>
        <span>
          <i className="actual" />
          {copy(language, "实际", "Actual")}
        </span>
      </div>
    </div>
  );
}

function reportCtaClick(target: "full-ledger") {
  window.dispatchEvent(new CustomEvent("cta_click", { detail: { target } }));
}

function MiniProofCard({ records, language }: { records: RecordView[]; language: Language }) {
  const largestErrorRecord = getLargestErrorRecord(records);
  const latestSettled = getLatestSettledRecord(records);

  return (
    <div className="hero-proof" aria-label={copy(language, "公开账本即时证据", "Public ledger evidence")}>
      <div className="proof-head">
        <span>{copy(language, "账本现状", "Ledger state")}</span>
        <strong>prediction ledger</strong>
      </div>
      <div className="proof-row">
        <span>{copy(language, "最新已结算记录", "Latest resolved ledger record")}</span>
        <strong>
          {latestSettled ? `${latestSettled.ticker} · ${latestSettled.decision_date}` : copy(language, "暂无已结算记录", "No resolved record")}
        </strong>
      </div>
      <div className="proof-grid">
        <div>
          <span>{copy(language, "预测", "Prediction")}</span>
          <strong>{latestSettled ? formatSignedPercent(latestSettled.expected_change_pct) : copy(language, "暂无", "None")}</strong>
        </div>
        <div>
          <span>{copy(language, "实际", "Actual")}</span>
          <strong>{latestSettled ? formatSignedPercent(latestSettled.actual_change_pct) : copy(language, "暂无", "None")}</strong>
        </div>
        <div>
          <span>{copy(language, "误差", "Error")}</span>
          <strong>{latestSettled ? `${formatNumber(Math.abs(latestSettled.error ?? 0))}pp` : copy(language, "暂无", "None")}</strong>
        </div>
      </div>
      <div className="proof-error">
        <span>{copy(language, "最大公开错误", "Largest visible error")}</span>
        <strong>
          {largestErrorRecord
            ? `${largestErrorRecord.ticker} · ${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp`
            : copy(language, "暂无", "None")}
        </strong>
        <p>{describeLargestError(largestErrorRecord)}</p>
      </div>
    </div>
  );
}

export function Hero({ dataset, metrics, records, language }: HeroProps) {
  const openMistakes = getOpenMistakeCount(records);
  const largestErrorRecord = getLargestErrorRecord(records);
  const latestNoteSlug = "weekly-ledger-update-2026-06-25";

  return (
    <section className="hero-section" id="hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="hero-boundary-note">
          <ShieldCheck aria-hidden="true" size={16} />
          {shortBoundary(language)}
        </div>
        <p className="hero-brand-motif">{copy(language, "公开研究账本，不是交易机器", "Public research ledger, not a trading machine")}</p>
        <h1 id="page-title">{copy(language, "先看今天研究了什么，再看证据和边界", "See what was watched, then the evidence and boundary")}</h1>
        <p>
          {copy(language, "GOTRA Public Ledger 展示 public-safe 研究记录、结算状态、错误和下一步观察。它帮助读者理解研究过程，而不是给出买卖、仓位或收益承诺。", "GOTRA Public Ledger shows public-safe research records, resolution state, errors, and next watch steps. It helps readers understand the research process, not buy/sell, sizing, or return promises.")}
        </p>
        <div className="home-priority-grid" aria-label={copy(language, "首页信息优先级", "Home information priority")}>
          <article>
            <span>{copy(language, "它是什么", "What it is")}</span>
            <strong>{copy(language, "公开研究账本", "Public research ledger")}</strong>
            <p>{copy(language, "记录研究对象、公开证据、结论变化和错误。", "Tracks research subjects, public evidence, conclusion changes, and errors.")}</p>
          </article>
          <article>
            <span>{copy(language, "它不是什么", "What it is not")}</span>
            <strong>{copy(language, "不是投资建议", "Not investment advice")}</strong>
            <p>{copy(language, "不是交易信号、实时交易或业绩证明。", "Not a trading signal, live trading, or performance proof.")}</p>
          </article>
          <article>
            <span>{copy(language, "最新简报", "Latest note")}</span>
            <strong>{copy(language, "晨间观察队列", "Morning watch queue")}</strong>
            <p>
              <a href={`#/notes/${latestNoteSlug}`}>{copy(language, "阅读最新简报", "Read latest note")}</a>
            </p>
          </article>
          <article>
            <span>{copy(language, "快照日期", "Snapshot date")}</span>
            <strong>{dataset.metadata.snapshot_date}</strong>
            <p>{copy(language, "与最新简报、最新已结算记录分开定义。", "Distinct from latest note and latest resolved record.")}</p>
          </article>
        </div>
        <div className="hero-actions" aria-label="Page shortcuts">
          <a className="primary-action" href="#full-ledger" onClick={() => reportCtaClick("full-ledger")}>
            {copy(language, "浏览公开账本", "Browse ledger")}
            <ArrowDown aria-hidden="true" size={16} />
          </a>
          <a className="secondary-action" href="#method-boundary">
            {copy(language, "查看方法与边界", "View method and boundary")}
          </a>
        </div>
      </div>

      <div className="hero-side">
        <div className="hero-stat-grid" aria-label="Dataset summary">
          <div>
            <Database aria-hidden="true" size={18} />
            <span>{copy(language, "已公开预测", "Public records")}</span>
            <strong>{metrics.total}</strong>
          </div>
          <div>
            <AlertTriangle aria-hidden="true" size={18} />
            <span>{copy(language, "公开错误", "Visible errors")}</span>
            <strong>{openMistakes}</strong>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>{copy(language, "已结算记录", "Resolved records")}</span>
            <strong>{metrics.resolved}</strong>
          </div>
          <div>
            <AlertTriangle aria-hidden="true" size={18} />
            <span>{copy(language, "最大误差记录", "Largest error record")}</span>
            <strong>
              {largestErrorRecord
                ? `${largestErrorRecord.ticker} · ${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp`
                : copy(language, "暂无", "None")}
            </strong>
          </div>
        </div>
        <HeroMiniChart records={records} language={language} />
        <p className="hero-data-note">
          {copy(language, `包含 ${metrics.pending + metrics.frozenPending} 条未公开 outcome 的 pending/frozen_pending 记录；本页面不回填后验结果。`, `Contains ${metrics.pending + metrics.frozenPending} pending/frozen_pending records without public outcomes; this page does not backfill hindsight results.`)}
          <span> public-safe demo · not OOS · snapshot_date {dataset.metadata.snapshot_date}</span>
        </p>
        <MiniProofCard records={records} language={language} />
      </div>
    </section>
  );
}

function shortBoundary(language: Language): string {
  return boundarySentence(language).replaceAll(". ", " · ").replaceAll("。", " · ").replace(/ · $/, "");
}
