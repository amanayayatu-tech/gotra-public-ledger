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

function attributionSummary(record: RecordView | null): string {
  if (!record) {
    return "暂无已结算记录可归因。";
  }

  const error = formatNumber(Math.abs(record.error ?? 0));
  if (record.direction_correct === false) {
    return `归因摘要：错在方向。该窗口预测方向与实际走势相反，最大误差 ${error}pp。`;
  }

  return `归因摘要：错在幅度。方向一致，但预测幅度与实际变化相差 ${error}pp。`;
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
          <strong>{misses.length > 0 ? misses.length : "暂无"}</strong>
          <small>在 {settled.length} 条已结算记录中公开保留</small>
        </div>
        <div>
          <Zap aria-hidden="true" size={22} />
          <span>最大单次误差</span>
          <strong className="trust-danger-value">
            {largestErrorRecord ? `${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp` : "暂无"}
          </strong>
          <small>
            {largestErrorRecord
              ? `${largestErrorRecord.ticker} · ${largestErrorRecord.decision_date}`
              : "暂无已结算记录"}
          </small>
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
              <dd className="trust-danger-value">{formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp</dd>
            </div>
          </dl>
        ) : null}
        <div>
          <p>{attributionSummary(largestErrorRecord)}</p>
          {largestErrorRecord ? (
            <p>
              最大误差明细：{largestErrorRecord.ticker} 预测{" "}
              {formatSignedPercent(largestErrorRecord.expected_change_pct)}，实际{" "}
              {formatSignedPercent(largestErrorRecord.actual_change_pct)}，误差{" "}
              {formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp，仍保留在公开账本中。
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
