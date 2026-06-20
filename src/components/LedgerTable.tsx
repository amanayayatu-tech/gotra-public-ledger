import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  statusLabel,
  type LedgerStatus,
  type RecordView,
} from "../data/metrics";

export type SortKey =
  | "decision_date"
  | "ticker"
  | "confidence"
  | "expected_change_pct"
  | "error"
  | "evidence_count";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

type LedgerTableProps = {
  records: RecordView[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  onSelect: (record: RecordView) => void;
};

const columns: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: "ticker", label: "Ticker" },
  { key: "decision_date", label: "日期" },
  { key: "confidence", label: "置信度" },
  { key: "expected_change_pct", label: "预测" },
  { key: "error", label: "实际 / 误差" },
  { key: "evidence_count", label: "证据" },
];

function DirectionBadge({ direction }: { direction: RecordView["direction"] }) {
  const label = direction === "up" ? "看涨" : direction === "down" ? "看跌" : "中性";
  return <span className={`direction-badge ${direction}`}>{label}</span>;
}

function StatusBadge({ status }: { status: LedgerStatus }) {
  return <span className={`status-badge ${status}`}>{statusLabel(status)}</span>;
}

function SortIcon({ sort, columnKey }: { sort: SortState; columnKey: SortKey }) {
  if (sort.key !== columnKey) {
    return <ArrowUpDown aria-hidden="true" size={13} />;
  }

  return sort.direction === "asc" ? (
    <ArrowUp aria-hidden="true" size={13} />
  ) : (
    <ArrowDown aria-hidden="true" size={13} />
  );
}

export function LedgerTable({ records, sort, onSort, onSelect }: LedgerTableProps) {
  return (
    <div className="table-scroll" aria-live="polite">
      <table className="ledger-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>
                <button type="button" onClick={() => onSort(column.key)}>
                  {column.label}
                  <SortIcon sort={sort} columnKey={column.key} />
                </button>
              </th>
            ))}
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.prediction_id} onClick={() => onSelect(record)}>
              <td>
                <button
                  className="row-open"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(record);
                  }}
                >
                  <span className="ticker">{record.ticker}</span>
                  <span>{record.company}</span>
                  <small>{record.sector}</small>
                </button>
              </td>
              <td>
                <span className="mono">{record.decision_date}</span>
                <small>{record.prediction_window}</small>
              </td>
              <td>
                <span className="mono">{formatPercent(record.confidence, 0)}</span>
              </td>
              <td>
                <DirectionBadge direction={record.direction} />
                <span className="mono">{formatSignedPercent(record.expected_change_pct)}</span>
              </td>
              <td>
                {record.actual_change_pct === null ? (
                  <span className="muted">n/a</span>
                ) : (
                  <span className="mono">{formatSignedPercent(record.actual_change_pct)}</span>
                )}
                <small>{record.error === null ? "error n/a" : `error ${formatNumber(record.error)} pp`}</small>
              </td>
              <td>
                <span className="mono">{record.evidence_count}</span>
              </td>
              <td>
                <StatusBadge status={record.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? <div className="empty-state">No matching demo records.</div> : null}
    </div>
  );
}
