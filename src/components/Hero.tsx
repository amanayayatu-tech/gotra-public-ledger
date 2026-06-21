import { ArrowDown, AlertTriangle, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { describeLargestError } from "../data/cognition";
import {
  formatNumber,
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

function HeroMiniChart({ records }: { records: RecordView[] }) {
  const series = buildMiniSeries(records);
  const latest = series.at(-1);

  if (!latest || series.length === 0) {
    return (
      <div className="hero-mini-chart empty" aria-label="预测 vs 实际迷你图">
        <div className="proof-head">
          <span>预测 vs 实际</span>
          <strong>暂无</strong>
        </div>
        <p>暂无已结算记录可绘制折线。</p>
      </div>
    );
  }

  const values = series.flatMap((record) => [record.expected_change_pct, record.actual_change_pct ?? 0]);
  const min = Math.min(-1, ...values);
  const max = Math.max(1, ...values);

  return (
    <div className="hero-mini-chart" aria-label="预测 vs 实际迷你图">
      <div className="proof-head">
        <span>预测 vs 实际</span>
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

function reportCtaClick(target: "full-ledger") {
  window.dispatchEvent(new CustomEvent("cta_click", { detail: { target } }));
}

function MiniProofCard({ records }: { records: RecordView[] }) {
  const largestErrorRecord = getLargestErrorRecord(records);
  const latestSettled = getLatestSettledRecord(records);

  return (
    <div className="hero-proof" aria-label="公开账本即时证据">
      <div className="proof-head">
        <span>公开账本即时证据</span>
        <strong>prediction ledger</strong>
      </div>
      <div className="proof-row">
        <span>最新已结算记录</span>
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
        <span>我们也公开最大错误</span>
        <strong>
          {largestErrorRecord
            ? `${largestErrorRecord.ticker} · ${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp`
            : "暂无"}
        </strong>
        <p>{describeLargestError(largestErrorRecord)}</p>
      </div>
    </div>
  );
}

export function Hero({ dataset, metrics, records }: HeroProps) {
  const openMistakes = getOpenMistakeCount(records);
  const largestErrorRecord = getLargestErrorRecord(records);

  return (
    <section className="hero-section" id="hero" aria-labelledby="page-title">
      <div className="hero-copy">
        <div className="hero-boundary-note">
          <ShieldCheck aria-hidden="true" size={16} />
          research information only · not investment advice / public-safe demo
        </div>
        <p className="hero-brand-motif">别人制造注意力，GOTRA 制造信用</p>
        <h1 id="page-title">一个会公开承认错误的 AI 股票研究系统</h1>
        <p>
          GOTRA 每天对一批美股/港股形成判断，并把每一次预测带时间戳写入公开账本。窗口到期后与真实走势对照：
          对就是对，错就是错；public-safe demo 只展示研究信息，不构成 OOS 验证或投资建议。
        </p>
        <div className="hero-actions" aria-label="Page shortcuts">
          <a className="primary-action" href="#full-ledger" onClick={() => reportCtaClick("full-ledger")}>
            浏览公开预测
            <ArrowDown aria-hidden="true" size={16} />
          </a>
          <a className="secondary-action" href="#method-boundary">
            查看方法与边界
          </a>
        </div>
      </div>

      <div className="hero-side">
        <div className="hero-stat-grid" aria-label="Dataset summary">
          <div>
            <Database aria-hidden="true" size={18} />
            <span>已公开预测</span>
            <strong>{metrics.total}</strong>
          </div>
          <div>
            <AlertTriangle aria-hidden="true" size={18} />
            <span>公开承认错误</span>
            <strong>{openMistakes}</strong>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>已结算记录</span>
            <strong>{metrics.resolved}</strong>
          </div>
          <div>
            <AlertTriangle aria-hidden="true" size={18} />
            <span>最大误差记录</span>
            <strong>
              {largestErrorRecord
                ? `${largestErrorRecord.ticker} · ${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp`
                : "暂无"}
            </strong>
          </div>
        </div>
        <HeroMiniChart records={records} />
        <p className="hero-data-note">
          包含 {metrics.pending + metrics.frozenPending} 条未公开 outcome 的 pending/frozen_pending 记录；本页面不回填后验结果。
          <span> public-safe demo · 非 OOS · snapshot_date {dataset.metadata.snapshot_date}</span>
        </p>
        <MiniProofCard records={records} />
      </div>
    </section>
  );
}
