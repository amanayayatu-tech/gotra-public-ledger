import { AlertTriangle, BadgeInfo, ShieldCheck } from "lucide-react";
import type { LedgerMetadata } from "../data/schema";

type BoundaryPanelProps = {
  metadata: LedgerMetadata;
};

export function BoundaryPills({ labels }: { labels: string[] }) {
  return (
    <div className="boundary-pills" aria-label="Claim boundary">
      {labels.map((label) => (
        <span className="boundary-pill" key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function BoundaryPanel({ metadata }: BoundaryPanelProps) {
  return (
    <section className="side-panel boundary-panel" aria-labelledby="boundary-heading">
      <div className="panel-heading">
        <ShieldCheck aria-hidden="true" size={18} />
        <div>
          <h2 id="boundary-heading">Methodology and Boundary</h2>
          <p>Frozen public-safe demo snapshot</p>
        </div>
      </div>

      <BoundaryPills labels={metadata.claim_boundary} />

      <dl className="boundary-list">
        <div>
          <dt>snapshot_date</dt>
          <dd>{metadata.snapshot_date}</dd>
        </div>
        <div>
          <dt>dataset_type</dt>
          <dd>{metadata.dataset_type}</dd>
        </div>
        <div>
          <dt>source</dt>
          <dd>{metadata.source.type}</dd>
        </div>
      </dl>

      <div className="callout warning">
        <AlertTriangle aria-hidden="true" size={16} />
        <p>{metadata.pending_outcome_boundary.note}</p>
      </div>

      <div className="callout">
        <BadgeInfo aria-hidden="true" size={16} />
        <p>
          direct_llm is referenced only as direct_llm_parametric_memory_control:
          modern LLM parameter memory cannot be truncated by decision_date and
          may contain hindsight market narratives. It is a diagnostic control,
          not a clean no-future baseline.
        </p>
      </div>
    </section>
  );
}
