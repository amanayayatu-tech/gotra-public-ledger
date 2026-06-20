import { useEffect } from "react";
import { CalendarDays, FileText, Scale, ShieldAlert, X } from "lucide-react";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  statusLabel,
  type RecordView,
} from "../data/metrics";
import type { LedgerMetadata } from "../data/schema";
import { BoundaryPills } from "./BoundaryPanel";

type DetailDrawerProps = {
  record: RecordView | null;
  metadata: LedgerMetadata;
  onClose: () => void;
};

function ResultText({ record }: { record: RecordView }) {
  if (record.status === "frozen_pending") {
    return (
      <p>
        源快照仍把这条记录标为 pending，但 outcome_availability_date 已经过去。
        页面保留冻结待判定状态，不补写或伪造后验结果。
      </p>
    );
  }

  if (record.direction_correct === "pending") {
    return <p>这条记录在冻结源快照中仍是待判定。</p>;
  }

  return (
    <p>
      方向结果：<strong>{record.direction_correct ? "判对" : "判错"}</strong>。
      绝对误差：<strong>{formatNumber(record.error)}</strong> 个百分点。
    </p>
  );
}

export function DetailDrawer({ record, metadata, onClose }: DetailDrawerProps) {
  useEffect(() => {
    if (!record) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("drawer-open");
    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.classList.remove("drawer-open");
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [record, onClose]);

  if (!record) {
    return null;
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label="Ledger record detail">
      <button className="drawer-backdrop" aria-label="Close detail" onClick={onClose} />
      <aside className="detail-drawer">
        <header className="drawer-header">
          <div>
            <div className="drawer-title-line">
              <strong>{record.ticker}</strong>
              <span>{record.company}</span>
              <span className={`status-badge ${record.status}`}>{statusLabel(record.status)}</span>
            </div>
            <p>{record.prediction_id}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close detail" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <section className="detail-metrics" aria-label="Prediction and outcome">
            <div>
              <span>决策日期</span>
              <strong>{record.decision_date}</strong>
            </div>
            <div>
              <span>窗口</span>
              <strong>{record.prediction_window}</strong>
            </div>
            <div>
              <span>置信度</span>
              <strong>{formatPercent(record.confidence, 0)}</strong>
            </div>
            <div>
              <span>预测涨跌幅</span>
              <strong>{formatSignedPercent(record.expected_change_pct)}</strong>
            </div>
            <div>
              <span>实际涨跌幅</span>
              <strong>{formatSignedPercent(record.actual_change_pct)}</strong>
            </div>
            <div>
              <span>误差</span>
              <strong>{formatNumber(record.error)}</strong>
            </div>
          </section>

          <section className="detail-section">
            <h3>
              <FileText aria-hidden="true" size={16} />
              推理摘要
            </h3>
            <p>{record.reasoning}</p>
          </section>

          <section className="detail-section">
            <h3>
              <CalendarDays aria-hidden="true" size={16} />
              证据来源
            </h3>
            <ul className="evidence-list">
              {record.evidence.map((item) => (
                <li key={`${item.source}-${item.date}`}>
                  <span>{item.source}</span>
                  <span className="mono">{item.date}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-section">
            <h3>
              <Scale aria-hidden="true" size={16} />
              预测 vs 实际
            </h3>
            <ResultText record={record} />
            <p className="muted">
              outcome_availability_date: <span className="mono">{record.outcome_availability_date}</span>
            </p>
          </section>

          <section className="detail-section">
            <h3>
              <ShieldAlert aria-hidden="true" size={16} />
              边界标签
            </h3>
            <BoundaryPills labels={metadata.claim_boundary} />
          </section>

          <section className="detail-section provenance-block">
            <h3>记录来源审计</h3>
            <dl>
              <div>
                <dt>dataset_id</dt>
                <dd>{record.provenance.dataset_id}</dd>
              </div>
              <div>
                <dt>source</dt>
                <dd>{record.provenance.source}</dd>
              </div>
              <div>
                <dt>source_record_index</dt>
                <dd>{record.provenance.source_record_index ?? "暂无"}</dd>
              </div>
              <div>
                <dt>immutable_demo_snapshot</dt>
                <dd>
                  {record.provenance.immutable_demo_snapshot === undefined
                    ? "暂无"
                    : String(record.provenance.immutable_demo_snapshot)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
