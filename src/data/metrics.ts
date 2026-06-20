import type { LedgerDataset, LedgerRecord } from "./schema";

export type LedgerStatus = "resolved" | "frozen_pending" | "pending";

export type RecordView = LedgerRecord & {
  status: LedgerStatus;
  evidence_count: number;
};

export type SummaryMetrics = {
  total: number;
  resolved: number;
  pending: number;
  frozenPending: number;
  directionHitRate: number | null;
  averageAbsoluteError: number | null;
  tickerCoverage: number;
};

const dateToTime = (date: string) => new Date(`${date}T00:00:00Z`).getTime();

export function getLedgerStatus(record: LedgerRecord, boundaryDate: string): LedgerStatus {
  if (record.direction_correct !== "pending") {
    return "resolved";
  }

  return dateToTime(record.outcome_availability_date) <= dateToTime(boundaryDate)
    ? "frozen_pending"
    : "pending";
}

export function toRecordView(record: LedgerRecord, dataset: LedgerDataset): RecordView {
  return {
    ...record,
    status: getLedgerStatus(record, dataset.metadata.current_date_for_boundary_review),
    evidence_count: record.evidence.length,
  };
}

export function computeSummary(dataset: LedgerDataset): SummaryMetrics {
  const views = dataset.records.map((record) => toRecordView(record, dataset));
  const resolved = views.filter((record) => record.status === "resolved");
  const hits = resolved.filter((record) => record.direction_correct === true).length;
  const errors = resolved
    .map((record) => record.error)
    .filter((value): value is number => typeof value === "number");

  return {
    total: views.length,
    resolved: resolved.length,
    pending: views.filter((record) => record.status === "pending").length,
    frozenPending: views.filter((record) => record.status === "frozen_pending").length,
    directionHitRate: resolved.length > 0 ? hits / resolved.length : null,
    averageAbsoluteError:
      errors.length > 0
        ? errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length
        : null,
    tickerCoverage: new Set(views.map((record) => record.ticker)).size,
  };
}

export function formatPercent(value: number | null, digits = 1): string {
  return value === null ? "暂无" : `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(value: number | null, digits = 1): string {
  if (value === null) {
    return "暂无";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "暂无" : value.toFixed(digits);
}

export function statusLabel(status: LedgerStatus): string {
  switch (status) {
    case "resolved":
      return "已结算";
    case "frozen_pending":
      return "冻结待判定";
    case "pending":
      return "待判定";
  }
}
