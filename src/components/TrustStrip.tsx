import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { formatNumber, formatPercent, formatSignedPercent, type RecordView } from "../data/metrics";

type TrustStripProps = {
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

export function TrustStrip({ records }: TrustStripProps) {
  const settled = records.filter((record) => record.status === "resolved");
  const frozenPending = records.filter((record) => record.status === "frozen_pending");
  const misses = settled.filter((record) => record.direction_correct === false);
  const largestErrorRecord = getLargestErrorRecord(records);
  const reviewDenominator = settled.length + frozenPending.length;

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
          <Zap aria-hidden="true" size={22} />
          <span>最大单次误差</span>
          <strong className="red-value">
            {largestErrorRecord ? `${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp` : "暂无"}
          </strong>
          <small>
            {largestErrorRecord
              ? `${largestErrorRecord.ticker} ${largestErrorRecord.decision_date}`
              : "暂无已结算记录"}
          </small>
        </div>
      </div>

      {largestErrorRecord ? (
        <p className="trust-footnote">
          最大误差记录：{largestErrorRecord.ticker} 预测{" "}
          {formatSignedPercent(largestErrorRecord.expected_change_pct)}，实际{" "}
          {formatSignedPercent(largestErrorRecord.actual_change_pct)}，误差{" "}
          {formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp。该记录仍保留在公开账本中。
        </p>
      ) : null}
    </section>
  );
}
