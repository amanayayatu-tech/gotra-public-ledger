import { AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import { describeLargestError } from "../data/cognition";
import { formatNumber, formatPercent, formatSignedPercent, type RecordView } from "../data/metrics";

type TrustStripProps = {
  records: RecordView[];
};

const dayMs = 24 * 60 * 60 * 1000;

function getLargestErrorRecord(records: RecordView[]): RecordView | null {
  const settled = records.filter((record) => record.status === "resolved" && typeof record.error === "number");
  if (settled.length === 0) {
    return null;
  }

  return settled.reduce((largest, record) =>
    Math.abs(record.error ?? 0) > Math.abs(largest.error ?? 0) ? record : largest,
  );
}

function getLongestTrackingDays(records: RecordView[]): number {
  const byTicker = new Map<string, RecordView[]>();
  records.forEach((record) => {
    byTicker.set(record.ticker, [...(byTicker.get(record.ticker) ?? []), record]);
  });

  return Math.max(
    0,
    ...[...byTicker.values()].map((tickerRecords) => {
      const times = tickerRecords.flatMap((record) => [
        new Date(`${record.decision_date}T00:00:00Z`).getTime(),
        new Date(`${record.outcome_availability_date}T00:00:00Z`).getTime(),
      ]);
      return Math.round((Math.max(...times) - Math.min(...times)) / dayMs);
    }),
  );
}

export function TrustStrip({ records }: TrustStripProps) {
  const settled = records.filter((record) => record.status === "resolved");
  const frozenPending = records.filter((record) => record.status === "frozen_pending");
  const misses = settled.filter((record) => record.direction_correct === false);
  const largestErrorRecord = getLargestErrorRecord(records);
  const reviewDenominator = settled.length + frozenPending.length;
  const trackingDays = getLongestTrackingDays(records);

  return (
    <section className="trust-section" id="trust-strip" aria-labelledby="trust-title">
      <div className="section-heading compact">
        <span>S3 · Trust strip</span>
        <h2 id="trust-title">我们连错误也公开</h2>
        <p>信用不是只展示漂亮结果，而是把错的记录也放在同一个账本里，供任何人回看。</p>
      </div>

      <div className="trust-grid" aria-label="Ledger trust metrics">
        <div>
          <ShieldCheck aria-hidden="true" size={22} />
          <span>累计公开预测</span>
          <strong>{records.length}</strong>
          <small>全部来自 public-safe 快照数据</small>
        </div>
        <div>
          <CheckCircle2 aria-hidden="true" size={22} />
          <span>结算覆盖率</span>
          <strong>{formatPercent(reviewDenominator > 0 ? settled.length / reviewDenominator : null)}</strong>
          <small>
            {settled.length}/{reviewDenominator}，冻结待判定不回填
          </small>
        </div>
        <div>
          <AlertTriangle aria-hidden="true" size={22} />
          <span>公开错误数</span>
          <strong>{misses.length}</strong>
          <small>在 {settled.length} 条已结算记录中公开保留</small>
        </div>
        <div>
          <TrendingUp aria-hidden="true" size={22} />
          <span>最长单标的追踪</span>
          <strong>{trackingDays} 天</strong>
          <small>按记录日期与 outcome 窗口派生</small>
        </div>
      </div>

      <article className="mistake-card">
        <div>
          <span>这是我们错得最离谱的一次，我们留着它。</span>
          <h3>
            {largestErrorRecord
              ? `${largestErrorRecord.ticker} · ${largestErrorRecord.company}`
              : "暂无已结算错误记录"}
          </h3>
        </div>
        {largestErrorRecord ? (
          <dl>
            <div>
              <dt>预测</dt>
              <dd>{formatSignedPercent(largestErrorRecord.expected_change_pct)}</dd>
            </div>
            <div>
              <dt>实际</dt>
              <dd>{formatSignedPercent(largestErrorRecord.actual_change_pct)}</dd>
            </div>
            <div>
              <dt>误差</dt>
              <dd>{formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp</dd>
            </div>
          </dl>
        ) : null}
        <p>{describeLargestError(largestErrorRecord)}</p>
      </article>
    </section>
  );
}
