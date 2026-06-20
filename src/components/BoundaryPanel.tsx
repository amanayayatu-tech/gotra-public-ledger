import { AlertTriangle, BadgeInfo, BookOpenCheck, Scale, ShieldCheck } from "lucide-react";
import type { LedgerMetadata } from "../data/schema";
import { GlossaryStrip } from "./TermTip";

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
    <section className="boundary-panel" id="method-boundary" aria-labelledby="boundary-heading">
      <div className="section-heading">
        <span>S6 · Method & boundary</span>
        <h2 id="boundary-heading">我们主动告诉你这些限制</h2>
        <p>
          透明边界不是削弱可信度，而是让这份账本知道自己能说明什么、不能说明什么。
        </p>
      </div>

      <div className="boundary-layout">
        <div className="method-card">
          <BookOpenCheck aria-hidden="true" size={20} />
          <h3>方法论简述</h3>
          <p>
            页面展示固定股票池中的公开预测记录。方向命中率与平均误差只用已结算记录计算；
            pending 和 frozen_pending 不进入分母，也不会被补写实际结果。
          </p>
          <p>
            每条记录保留 prediction_id、decision_date、prediction_window、reasoning、evidence 和 provenance，
            方便从表格或抽屉逐条核对。
          </p>
        </div>

        <div className="method-card">
          <Scale aria-hidden="true" size={20} />
          <h3>诚实边界声明</h3>
          <BoundaryPills labels={metadata.claim_boundary} />
          <p>
            本页是 research information only，不构成 investment advice。它展示的是 demo/public-safe snapshot，
            不是 OOS、science/public proof、formal acceptance 或 trading signal。
          </p>
        </div>

        <div className="method-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <h3>快照来源</h3>
          <dl className="boundary-list">
            <div>
              <dt>snapshot_date</dt>
              <dd>{metadata.snapshot_date}</dd>
            </div>
            <div>
              <dt>dataset_type</dt>
              <dd title={metadata.dataset_type}>{datasetDisplayLabel(metadata.dataset_type)}</dd>
            </div>
            <div>
              <dt>source.type</dt>
              <dd title={metadata.source.type}>{sourceDisplayLabel(metadata.source.type)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="boundary-callouts">
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
      </div>

      <GlossaryStrip />
    </section>
  );
}
