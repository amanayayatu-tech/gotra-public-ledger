import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { formatNumber, formatPercent, formatSignedPercent, type RecordView } from "../data/metrics";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";

type TrustStripProps = {
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

function attributionSummary(record: RecordView | null, language: Language): string {
  if (!record) {
    return copy(language, "暂无已结算记录可归因。", "No resolved record is available for attribution yet.");
  }

  const error = formatNumber(Math.abs(record.error ?? 0));
  if (record.direction_correct === false) {
    return copy(
      language,
      `归因摘要：错在方向。该窗口预测方向与实际走势相反，最大误差 ${error}pp。`,
      `Attribution summary: direction miss. The predicted direction was opposite to the actual move, with ${error}pp error.`,
    );
  }

  return copy(
    language,
    `归因摘要：错在幅度。方向一致，但预测幅度与实际变化相差 ${error}pp。`,
    `Attribution summary: magnitude miss. The direction matched, but magnitude differed by ${error}pp.`,
  );
}

export function TrustStrip({ records, language }: TrustStripProps) {
  const settled = records.filter((record) => record.status === "resolved");
  const frozenPending = records.filter((record) => record.status === "frozen_pending");
  const misses = settled.filter((record) => record.direction_correct === false);
  const largestErrorRecord = getLargestErrorRecord(records);
  const reviewDenominator = settled.length + frozenPending.length;

  return (
    <section className="trust-section" id="trust-strip" aria-labelledby="trust-title">
      <div className="section-heading compact">
        <span>{copy(language, "S3 · 信任机制", "S3 · Trust strip")}</span>
        <h2 id="trust-title">{copy(language, "我们连错误也公开", "Errors stay public too")}</h2>
        <p>{copy(language, "信用不是只展示漂亮结果，而是把错的记录也放在同一个账本里，供任何人回看。", "Credibility does not come from showing only good-looking results; mistakes stay in the same ledger for review.")}</p>
      </div>

      <div className="trust-grid" aria-label={copy(language, "账本信任指标", "Ledger trust metrics")}>
        <div>
          <ShieldCheck aria-hidden="true" size={22} />
          <span>{copy(language, "累计公开预测", "Public predictions")}</span>
          <strong>{records.length}</strong>
          <small>{copy(language, "全部来自公开安全快照数据", "All from public-safe snapshot data")}</small>
        </div>
        <div>
          <CheckCircle2 aria-hidden="true" size={22} />
          <span>{copy(language, "结算覆盖率", "Settlement coverage")}</span>
          <strong>{formatPercent(reviewDenominator > 0 ? settled.length / reviewDenominator : null)}</strong>
          <small>
            {copy(language, `${settled.length}/${reviewDenominator}，冻结待判定不回填`, `${settled.length}/${reviewDenominator}, frozen pending is not backfilled`)}
          </small>
        </div>
        <div>
          <AlertTriangle aria-hidden="true" size={22} />
          <span>{copy(language, "公开错误数", "Public misses")}</span>
          <strong>{misses.length > 0 ? misses.length : "暂无"}</strong>
          <small>{copy(language, `在 ${settled.length} 条已结算记录中公开保留`, `Visible across ${settled.length} resolved records`)}</small>
        </div>
        <div>
          <Zap aria-hidden="true" size={22} />
          <span>{copy(language, "最大单次误差", "Largest single error")}</span>
          <strong className="trust-danger-value">
            {largestErrorRecord ? `${formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp` : "暂无"}
          </strong>
          <small>
            {largestErrorRecord
              ? `${largestErrorRecord.ticker} · ${largestErrorRecord.decision_date}`
              : copy(language, "暂无已结算记录", "No resolved record yet")}
          </small>
        </div>
      </div>

      <article className="mistake-card">
        <div>
          <span>{copy(language, "这是我们错得最离谱的一次，我们留着它。", "This is the largest visible miss, and it stays public.")}</span>
          <h3>
            {largestErrorRecord
              ? `${largestErrorRecord.ticker} · ${largestErrorRecord.company}`
              : copy(language, "暂无已结算错误记录", "No resolved miss yet")}
          </h3>
        </div>
        {largestErrorRecord ? (
          <dl>
            <div>
              <dt>{copy(language, "预测", "Prediction")}</dt>
              <dd>{formatSignedPercent(largestErrorRecord.expected_change_pct)}</dd>
            </div>
            <div>
              <dt>{copy(language, "实际", "Actual")}</dt>
              <dd>{formatSignedPercent(largestErrorRecord.actual_change_pct)}</dd>
            </div>
            <div>
              <dt>{copy(language, "误差", "Error")}</dt>
              <dd className="trust-danger-value">{formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp</dd>
            </div>
          </dl>
        ) : null}
        <div>
          <p>{attributionSummary(largestErrorRecord, language)}</p>
          {largestErrorRecord ? (
            <p>
              {copy(language, "最大误差明细：", "Largest-error detail: ")}
              {largestErrorRecord.ticker} {copy(language, "预测", "predicted")}{" "}
              {formatSignedPercent(largestErrorRecord.expected_change_pct)}，{copy(language, "实际", "actual")}{" "}
              {formatSignedPercent(largestErrorRecord.actual_change_pct)}，{copy(language, "误差", "error")}{" "}
              {formatNumber(Math.abs(largestErrorRecord.error ?? 0))}pp，{copy(language, "仍保留在公开账本中。", "still remains in the public ledger.")}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
