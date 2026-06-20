import { ArrowRight, BookOpenCheck, CheckCircle2, Database, ShieldCheck, Sigma } from "lucide-react";
import { describeLargestError } from "../data/cognition";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  type RecordView,
  type SummaryMetrics,
} from "../data/metrics";
import type { LedgerDataset } from "../data/schema";

type HeroProps = {
  dataset: LedgerDataset;
  metrics: SummaryMetrics;
  records: RecordView[];
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
  return [...records]
    .filter((record) => record.status === "resolved")
    .sort(
      (a, b) =>
        b.decision_date.localeCompare(a.decision_date, "en") ||
        b.prediction_id.localeCompare(a.prediction_id, "en"),
    )[0] ?? null;
}

function buildMiniSeries(records: RecordView[], ticker: string): RecordView[] {
  const settled = records
    .filter((record) => record.status === "resolved" && record.ticker === ticker)
    .sort((a, b) => a.decision_date.localeCompare(b.decision_date, "en"));
  return settled.slice(-6);
}

function toPolyline(values: number[], min: number, max: number): string {
  if (values.length === 0) {
    return "";
  }

  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 78 - ((value - min) / range) * 56;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function HeroMiniChart({ records }: { records: RecordView[] }) {
  const latestSettled = getLatestSettledRecord(records);
  const series = latestSettled ? buildMiniSeries(records, latestSettled.ticker) : [];
  const values = series.flatMap((record) =>
    typeof record.actual_change_pct === "number"
      ? [record.expected_change_pct, record.actual_change_pct]
      : [record.expected_change_pct],
  );
  const min = Math.min(-1, ...values);
  const max = Math.max(1, ...values);
  const predictedLine = toPolyline(series.map((record) => record.expected_change_pct), min, max);
  const actualLine = toPolyline(
    series.map((record) => (typeof record.actual_change_pct === "number" ? record.actual_change_pct : 0)),
    min,
    max,
  );

  return (
    <div className="hero-mini-chart" aria-label="预测与实际迷你图">
      <div className="proof-head">
        <span>预测 vs 实际</span>
        <strong>{latestSettled ? `${latestSettled.ticker} · ${latestSettled.prediction_window}` : "暂无"}</strong>
      </div>
      <svg viewBox="0 0 100 88" role="img" aria-label="Recent prediction and actual movement lines">
        <line x1="0" x2="100" y1="78" y2="78" />
        <line x1="0" x2="100" y1="50" y2="50" />
        <line x1="0" x2="100" y1="22" y2="22" />
        {predictedLine ? <polyline className="predicted-line" points={predictedLine} /> : null}
        {actualLine ? <polyline className="actual-line" points={actualLine} /> : null}
      </svg>
      <div className="chart-legend">
        <span>
          <i className="predicted" />
          预测
        </span>
        <span>
          <i className="actual" />
          实际
        </span>
      </div>
    </div>
  );
}

function MiniProofCard({ records }: { records: RecordView[] }) {
  const largestErrorRecord = getLargestErrorRecord(records);
  const latestSettled = getLatestSettledRecord(records);

  return (
    <aside className="hero-proof" aria-label="公开账本即时证据">
      <div className="proof-head">
        <span>最近一个已到期的模板记录</span>
        <strong>查看复盘</strong>
      </div>
      <div className="proof-row">
        <span>{latestSettled ? `${latestSettled.decision_date} · ${latestSettled.company}` : "最新已结算记录"}</span>
        <strong>
          {latestSettled ? `${latestSettled.ticker} · ${latestSettled.decision_date}` : "暂无已结算记录"}
        </strong>
      </div>
      <div className="proof-grid">
        <div>
          <span>预测</span>
          <strong>{latestSettled ? formatSignedPercent(latestSettled.expected_change_pct) : "暂无"}</strong>
        </div>
        <div>
          <span>实际</span>
          <strong>{latestSettled ? formatSignedPercent(latestSettled.actual_change_pct) : "暂无"}</strong>
        </div>
        <div>
          <span>误差</span>
          <strong>{latestSettled ? `${formatNumber(Math.abs(latestSettled.error ?? 0))}pp` : "暂无"}</strong>
        </div>
      </div>
      <div className="proof-error">
        <span>最大误差记录</span>
        <strong>
          {largestErrorRecord
            ? `${largestErrorRecord.ticker} · ${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp`
            : "暂无"}
        </strong>
        <p>{describeLargestError(largestErrorRecord)}</p>
      </div>
    </aside>
  );
}

export function Hero({ dataset, metrics, records }: HeroProps) {
  return (
    <section className="hero-section" id="hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="hero-boundary-note">
          <ShieldCheck aria-hidden="true" size={16} />
          研究信息展示，非投资建议
        </div>
        <h1 id="page-title">一个会公开承认错误的 AI 股票研究系统</h1>
        <p>
          GOTRA 每日研究市场，形成可验证的观点并公开记录。到期后与真实结果对照，承认错误，分析原因，更新认知。
        </p>
        <div className="hero-actions" aria-label="Page shortcuts">
          <a className="primary-action" href="#full-ledger">
            浏览公开预测
            <ArrowRight aria-hidden="true" size={16} />
          </a>
          <a className="secondary-action" href="#method-boundary">
            查看方法与边界
          </a>
        </div>
      </div>

      <div className="hero-side">
        <div className="hero-panel-title">
          <span>实时概览（公开数据快照）</span>
          <a href="#full-ledger">查看全部</a>
        </div>
        <div className="hero-stat-grid" aria-label="Dataset summary">
          <div>
            <Database aria-hidden="true" size={18} />
            <span>总记录</span>
            <strong>{metrics.total}</strong>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>已到期/已结算</span>
            <strong>
              {metrics.resolved}/{metrics.total}
            </strong>
          </div>
          <div>
            <BookOpenCheck aria-hidden="true" size={18} />
            <span>方向命中率</span>
            <strong>{formatPercent(metrics.directionHitRate)}</strong>
          </div>
          <div>
            <Sigma aria-hidden="true" size={18} />
            <span>平均绝对误差</span>
            <strong>{metrics.averageAbsoluteError === null ? "暂无" : `${formatNumber(metrics.averageAbsoluteError)}pp`}</strong>
          </div>
        </div>
        <HeroMiniChart records={records} />
        <p className="hero-data-note">
          包含 {metrics.pending + metrics.frozenPending} 条未公开 outcome 的 pending/frozen_pending 记录；本页面不回填后验结果。
          <span> snapshot_date {dataset.metadata.snapshot_date}</span>
        </p>
        <MiniProofCard records={records} />
      </div>
    </section>
  );
}
