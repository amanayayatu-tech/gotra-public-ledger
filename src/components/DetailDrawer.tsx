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
        The source snapshot still marks this record as pending, but its
        outcome_availability_date has passed. The MVP preserves it as frozen
        pending instead of inventing or backfilling an outcome.
      </p>
    );
  }

  if (record.direction_correct === "pending") {
    return <p>This record is pending in the frozen source snapshot.</p>;
  }

  return (
    <p>
      Direction result: <strong>{record.direction_correct ? "correct" : "incorrect"}</strong>.
      Absolute error: <strong>{formatNumber(record.error)}</strong> percentage points.
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
              <span>Decision date</span>
              <strong>{record.decision_date}</strong>
            </div>
            <div>
              <span>Window</span>
              <strong>{record.prediction_window}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{formatPercent(record.confidence, 0)}</strong>
            </div>
            <div>
              <span>Expected</span>
              <strong>{formatSignedPercent(record.expected_change_pct)}</strong>
            </div>
            <div>
              <span>Actual</span>
              <strong>{formatSignedPercent(record.actual_change_pct)}</strong>
            </div>
            <div>
              <span>Error</span>
              <strong>{formatNumber(record.error)}</strong>
            </div>
          </section>

          <section className="detail-section">
            <h3>
              <FileText aria-hidden="true" size={16} />
              Reasoning
            </h3>
            <p>{record.reasoning}</p>
          </section>

          <section className="detail-section">
            <h3>
              <CalendarDays aria-hidden="true" size={16} />
              Evidence sources
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
              Prediction vs actual
            </h3>
            <ResultText record={record} />
            <p className="muted">
              outcome_availability_date: <span className="mono">{record.outcome_availability_date}</span>
            </p>
          </section>

          <section className="detail-section">
            <h3>
              <ShieldAlert aria-hidden="true" size={16} />
              Boundary labels
            </h3>
            <BoundaryPills labels={metadata.claim_boundary} />
          </section>

          <section className="detail-section provenance-block">
            <h3>Record provenance</h3>
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
                <dd>{record.provenance.source_record_index}</dd>
              </div>
              <div>
                <dt>immutable_demo_snapshot</dt>
                <dd>{String(record.provenance.immutable_demo_snapshot)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
