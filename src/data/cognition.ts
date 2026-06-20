import { getCompanyProfile, type CompanyProfile } from "./companyProfiles";
import { formatNumber, formatPercent, formatSignedPercent, type RecordView } from "./metrics";

export type CognitionPoint = {
  prediction_id: string;
  date: string;
  label: string;
  window: string;
  predicted: number;
  actual: number | null;
  error: number | null;
  status: RecordView["status"];
  directionCorrect: boolean | null;
  cumulativeAccuracy: number | null;
  averageError: number | null;
  evidenceCount: number;
  evidenceSources: string;
  reasoning: string;
};

export type TickerCognition = {
  ticker: string;
  profile: CompanyProfile;
  records: RecordView[];
  points: CognitionPoint[];
  resolvedCount: number;
  frozenPendingCount: number;
  pendingCount: number;
  hitRate: number | null;
  averageError: number | null;
  latestRecord: RecordView;
  largestErrorRecord: RecordView | null;
};

const dateSorter = (left: RecordView, right: RecordView) =>
  left.decision_date.localeCompare(right.decision_date, "en") ||
  left.prediction_id.localeCompare(right.prediction_id, "en");

export function buildTickerList(records: RecordView[]): string[] {
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(record.ticker, (counts.get(record.ticker) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([ticker]) => ticker);
}

export function buildTickerCognition(ticker: string, records: RecordView[]): TickerCognition {
  const tickerRecords = records.filter((record) => record.ticker === ticker).sort(dateSorter);
  const profile = getCompanyProfile(ticker, tickerRecords[0]?.company ?? ticker);
  let resolvedCount = 0;
  let hitCount = 0;
  let errorSum = 0;

  const points = tickerRecords.map((record) => {
    const isResolved = record.status === "resolved" && record.direction_correct !== "pending";
    if (isResolved) {
      const absoluteError = Math.abs(record.error ?? 0);
      resolvedCount += 1;
      if (record.direction_correct === true) {
        hitCount += 1;
      }
      errorSum += absoluteError;
    }

    return {
      prediction_id: record.prediction_id,
      date: record.decision_date,
      label: record.decision_date.slice(5),
      window: record.prediction_window,
      predicted: record.expected_change_pct,
      actual: record.actual_change_pct,
      error: record.error,
      status: record.status,
      directionCorrect: record.direction_correct === "pending" ? null : record.direction_correct,
      cumulativeAccuracy: resolvedCount > 0 ? (hitCount / resolvedCount) * 100 : null,
      averageError: resolvedCount > 0 ? errorSum / resolvedCount : null,
      evidenceCount: record.evidence_count,
      evidenceSources: record.evidence.map((item) => item.source).join(" / "),
      reasoning: record.reasoning,
    };
  });

  const latestRecord = [...tickerRecords].sort((a, b) => b.decision_date.localeCompare(a.decision_date, "en"))[0];
  const resolvedRecords = tickerRecords.filter((record) => record.status === "resolved");
  const largestErrorRecord =
    resolvedRecords.length === 0
      ? null
      : resolvedRecords.reduce((largest, record) =>
          Math.abs(record.error ?? 0) > Math.abs(largest.error ?? 0) ? record : largest,
        );

  return {
    ticker,
    profile,
    records: tickerRecords,
    points,
    resolvedCount,
    frozenPendingCount: tickerRecords.filter((record) => record.status === "frozen_pending").length,
    pendingCount: tickerRecords.filter((record) => record.status === "pending").length,
    hitRate: resolvedCount > 0 ? hitCount / resolvedCount : null,
    averageError: resolvedCount > 0 ? errorSum / resolvedCount : null,
    latestRecord,
    largestErrorRecord,
  };
}

export function describeRecordOutcome(record: RecordView): string {
  if (record.status === "frozen_pending") {
    return "源快照仍标记为 pending；本页面保留冻结状态，不补写后验结果。";
  }
  if (record.status === "pending" || record.direction_correct === "pending") {
    return "结果尚未进入可判定状态。";
  }
  return record.direction_correct
      ? `方向一致，幅度误差为 ${formatNumber(Math.abs(record.error ?? 0))} percentage points。`
      : `方向不一致，幅度误差为 ${formatNumber(Math.abs(record.error ?? 0))} percentage points。`;
}

export function describeLargestError(record: RecordView | null): string {
  if (!record) {
    return "当前标的没有已结算记录可复盘。";
  }

  const predicted = formatSignedPercent(record.expected_change_pct);
  const actual = formatSignedPercent(record.actual_change_pct);
  const error = formatNumber(Math.abs(record.error ?? 0));

  if (record.direction_correct === false) {
    return `最大偏差出现在 ${record.decision_date}：预测为 ${predicted}，实际为 ${actual}，方向相反，误差 ${error} percentage points。这说明该窗口的方向判断偏离了随后观察到的价格变化。`;
  }

  return `最大幅度误差出现在 ${record.decision_date}：预测为 ${predicted}，实际为 ${actual}，方向一致但幅度偏差 ${error} percentage points。这更像是幅度估计问题，而不是方向判断问题。`;
}

export function resultLabel(point: CognitionPoint): string {
  if (point.status === "frozen_pending") {
    return "冻结 pending";
  }
  if (point.status === "pending") {
    return "pending";
  }
  return point.directionCorrect ? "方向判对" : "方向判错";
}

export function statusTone(point: CognitionPoint): "hit" | "miss" | "neutral" {
  if (point.status !== "resolved" || point.directionCorrect === null) {
    return "neutral";
  }
  return point.directionCorrect ? "hit" : "miss";
}

export function metricSubtitle(totalResolved: number, hitRate: number | null): string {
  return totalResolved === 0 ? "暂无已结算样本" : `${totalResolved} 条已结算 · ${formatPercent(hitRate)}`;
}
