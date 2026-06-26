import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  type LedgerStatus,
  type RecordView,
} from "../data/metrics";
import type { Language } from "../i18n/language";
import { copy, directionText, statusText } from "../i18n/language";

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
  language: Language;
  onSort: (key: SortKey) => void;
  onSelect: (record: RecordView, trigger?: HTMLElement) => void;
};

function columns(language: Language): Array<{ key: SortKey; label: string; className?: string }> {
  return [
    { key: "ticker", label: copy(language, "标的", "Ticker") },
    { key: "decision_date", label: copy(language, "日期", "Date") },
    { key: "confidence", label: copy(language, "置信度", "Confidence") },
    { key: "expected_change_pct", label: copy(language, "预测", "Prediction") },
    { key: "error", label: copy(language, "实际 / 误差", "Actual / error") },
    { key: "evidence_count", label: copy(language, "证据", "Evidence") },
  ];
}

function DirectionBadge({ direction, language }: { direction: RecordView["direction"]; language: Language }) {
  const label = directionText(language, direction);
  return <span className={`direction-badge ${direction}`}>{label}</span>;
}

function formatErrorText(value: number | null, language: Language): string {
  return value === null ? copy(language, "误差暂无", "Error pending") : `${copy(language, "误差", "Error")} ${formatNumber(Math.abs(value))}pp`;
}

function StatusBadge({ status, language }: { status: LedgerStatus; language: Language }) {
  return <span className={`status-badge ${status}`}>{statusText(language, status)}</span>;
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

function isProtocolPlaceholder(record: RecordView): boolean {
  return (
    record.status !== "resolved" &&
    record.direction === "neutral" &&
    record.expected_change_pct === 0 &&
    record.confidence === 0
  );
}

export function LedgerTable({ records, sort, language, onSort, onSelect }: LedgerTableProps) {
  return (
    <div className="ledger-table-shell" aria-live="polite">
      <div className="table-scroll ledger-table-desktop">
      <table className="ledger-table">
        <thead>
          <tr>
            {columns(language).map((column) => (
              <th
                aria-sort={
                  sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                }
                className={column.className}
                key={column.key}
                scope="col"
              >
                <button type="button" onClick={() => onSort(column.key)}>
                  {column.label}
                  <SortIcon sort={sort} columnKey={column.key} />
                </button>
              </th>
            ))}
            <th scope="col">{copy(language, "状态", "Status")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.prediction_id}
              onClick={(event) => onSelect(record, event.currentTarget)}
            >
              <td>
                <button
                  type="button"
                  className="row-open-button"
                  aria-label={`打开 ${record.prediction_id} 详情`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(record, event.currentTarget);
                  }}
                  >
                  <span className="ticker">{record.ticker}</span>
                  <span>{record.company}</span>
                  <small>{record.sector}</small>
                  {isProtocolPlaceholder(record) ? (
                    <small className="placeholder-label">{copy(language, "协议占位，不是研究判断", "Protocol placeholder, not a research judgment")}</small>
                  ) : null}
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
                <DirectionBadge direction={record.direction} language={language} />
                <span className="mono">{formatSignedPercent(record.expected_change_pct)}</span>
              </td>
              <td>
                {record.actual_change_pct === null ? (
                  <span className="muted">{copy(language, "暂无", "Pending")}</span>
                ) : (
                  <span className="mono">{formatSignedPercent(record.actual_change_pct)}</span>
                )}
                <small>{formatErrorText(record.error, language)}</small>
              </td>
              <td>
                <span className="mono">{record.evidence_count}</span>
              </td>
              <td>
                <StatusBadge status={record.status} language={language} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="ledger-mobile-cards" aria-label={copy(language, "移动端账本卡片", "Mobile ledger cards")}>
        {records.map((record) => (
          <article
            className={`ledger-mobile-card ${isProtocolPlaceholder(record) ? "placeholder" : ""}`}
            key={record.prediction_id}
          >
            <button
              aria-label={copy(language, `打开 ${record.prediction_id} 详情`, `Open ${record.prediction_id} detail`)}
              onClick={(event) => onSelect(record, event.currentTarget)}
              type="button"
            >
              <div className="ledger-mobile-card-head">
                <div>
                  <strong className="ticker">{record.ticker}</strong>
                  <span>{record.company}</span>
                </div>
                <StatusBadge status={record.status} language={language} />
              </div>
              {isProtocolPlaceholder(record) ? (
                <p className="placeholder-note">{copy(language, "协议占位行：0% 中性不是实际研究判断。", "Protocol placeholder: 0% neutral is not an actual research judgment.")}</p>
              ) : null}
              <dl className="ledger-mobile-metrics">
                <div>
                  <dt>{copy(language, "预测", "Prediction")}</dt>
                  <dd>
                    <DirectionBadge direction={record.direction} language={language} />
                    <span className="mono">{formatSignedPercent(record.expected_change_pct)}</span>
                  </dd>
                </div>
                <div>
                  <dt>{copy(language, "实际", "Actual")}</dt>
                  <dd className="mono">{record.actual_change_pct === null ? copy(language, "暂无", "Pending") : formatSignedPercent(record.actual_change_pct)}</dd>
                </div>
                <div>
                  <dt>{copy(language, "误差", "Error")}</dt>
                  <dd>{record.error === null ? copy(language, "暂无", "Pending") : `${formatNumber(Math.abs(record.error))}pp`}</dd>
                </div>
                <div>
                  <dt>{copy(language, "日期", "Date")}</dt>
                  <dd className="mono">{record.decision_date}</dd>
                </div>
              </dl>
            </button>
          </article>
        ))}
      </div>
      {records.length === 0 ? (
        <div className="empty-state">{copy(language, "没有匹配的快照记录。请调整搜索词、状态、方向或标的筛选。", "No matching snapshot records. Adjust search, status, direction, or ticker filters.")}</div>
      ) : null}
    </div>
  );
}
