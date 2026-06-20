import { ArrowDown, BookOpenCheck, CheckCircle2, Clock3, Database, ShieldCheck } from "lucide-react";
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

function MiniProofCard({ records }: { records: RecordView[] }) {
  const largestErrorRecord = getLargestErrorRecord(records);
  const latestSettled = [...records]
    .filter((record) => record.status === "resolved")
    .sort((a, b) => b.decision_date.localeCompare(a.decision_date, "en"))[0];

  return (
    <aside className="hero-proof" aria-label="公开账本即时证据">
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
          GOTRA 每天对一批美股/港股形成判断，并把每一次预测带时间戳写入公开账本。窗口到期后自动与真实走势对照：
          对就是对，错就是错，错在哪、如何修正，也一起留下来。
        </p>
        <div className="hero-actions" aria-label="Page shortcuts">
          <a className="primary-action" href="#how-it-works">
            看它如何运作
            <ArrowDown aria-hidden="true" size={16} />
          </a>
          <a className="secondary-action" href="#full-ledger">
            查看完整账本
          </a>
        </div>
      </div>

      <div className="hero-side">
        <div className="hero-stat-grid" aria-label="Dataset summary">
          <div>
            <Database aria-hidden="true" size={18} />
            <span>公开判断记录</span>
            <strong>{metrics.total}</strong>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>已到期结算</span>
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
            <Clock3 aria-hidden="true" size={18} />
            <span>覆盖股票</span>
            <strong>{metrics.tickerCoverage}</strong>
          </div>
        </div>
        <p className="hero-data-note">
          包含 {metrics.pending + metrics.frozenPending} 条未公开 outcome 的 pending/frozen_pending 记录；本页面不回填后验结果。
          <span> snapshot_date {dataset.metadata.snapshot_date}</span>
        </p>
        <MiniProofCard records={records} />
      </div>
    </section>
  );
}
