import { AlertTriangle, BadgeInfo, ShieldCheck } from "lucide-react";
import type { LedgerMetadata } from "../data/schema";

type BoundaryPanelProps = {
  metadata: LedgerMetadata;
};

const boundaryLabelMap: Record<string, string> = {
  "Research information only": "研究信息展示",
  "Not investment advice": "不是投资建议",
  "Demo/public-safe dataset": "公开安全演示数据",
  "Not OOS": "不声称 OOS",
  "Not science/public proof": "不声称科学/公开证明",
  "Not trading signal": "不是交易信号",
};

function datasetDisplayLabel(value: string): string {
  return value === "frozen_demo_snapshot/public_safe_demo" ? "公开安全演示数据" : value;
}

function sourceDisplayLabel(value: string): string {
  return value === "zip_demo_rebuilt_public_safe_dataset" ? "demo zip 重建数据" : value;
}

export function BoundaryPills({ labels }: { labels: string[] }) {
  return (
    <div className="boundary-pills" aria-label="Claim boundary">
      {labels.map((label) => (
        <span className="boundary-pill" key={label} title={label}>
          {boundaryLabelMap[label] ?? label}
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
          <h2 id="boundary-heading">方法与边界</h2>
          <p>冻结的公开安全演示快照</p>
        </div>
      </div>

      <BoundaryPills labels={metadata.claim_boundary} />

      <dl className="boundary-list">
        <div>
          <dt>冻结快照日期</dt>
          <dd title={`snapshot_date ${metadata.snapshot_date}`}>{metadata.snapshot_date}</dd>
        </div>
        <div>
          <dt>数据类型</dt>
          <dd title={`dataset_type ${metadata.dataset_type}`}>{datasetDisplayLabel(metadata.dataset_type)}</dd>
        </div>
        <div>
          <dt>来源</dt>
          <dd title={`source.type ${metadata.source.type}`}>{sourceDisplayLabel(metadata.source.type)}</dd>
        </div>
      </dl>

      {metadata.pending_outcome_boundary ? (
        <div className="callout warning">
          <AlertTriangle aria-hidden="true" size={16} />
          <p>{metadata.pending_outcome_boundary.note}</p>
        </div>
      ) : null}

      <div className="callout">
        <BadgeInfo aria-hidden="true" size={16} />
        <p>
          direct_llm 只按 direct_llm_parametric_memory_control 理解：现代 LLM
          参数记忆不能按 decision_date 截断，可能含历史后验市场叙事；它不是
          clean no-future baseline。
        </p>
      </div>
    </section>
  );
}
