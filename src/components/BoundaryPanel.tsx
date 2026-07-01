import { useState } from "react";
import { AlertTriangle, BadgeInfo, BookOpenCheck, ChevronDown, Scale, ShieldCheck } from "lucide-react";
import type { LedgerMetadata } from "../data/schema";
import { copy, type Language } from "../i18n/language";
import { GlossaryStrip } from "./TermTip";

type BoundaryPanelProps = {
  metadata: LedgerMetadata;
  language: Language;
};

const boundaryLabelMap: Record<string, { zh: string; en: string }> = {
  "Research information only": { zh: "研究信息展示", en: "Research information only" },
  "Not investment advice": { zh: "不是投资建议", en: "Not investment advice" },
  "Demo/public-safe dataset": { zh: "公开安全演示数据", en: "Demo/public-safe dataset" },
  "Not OOS": { zh: "不声称 OOS", en: "Not OOS validation" },
  "Not science/public proof": { zh: "不声称科学公开证明", en: "Not science/public proof" },
  "Not trading signal": { zh: "不是交易信号", en: "Not a trading signal" },
};

function boundaryDisplayLabel(label: string, language: Language): string {
  const mapped = boundaryLabelMap[label];
  return mapped ? copy(language, mapped.zh, mapped.en) : label;
}

function datasetDisplayLabel(value: string, language: Language): string {
  return value === "frozen_demo_snapshot/public_safe_demo"
    ? copy(language, "公开安全演示数据", "public-safe demo dataset")
    : value;
}

function sourceDisplayLabel(value: string, language: Language): string {
  return value === "zip_demo_rebuilt_public_safe_dataset"
    ? copy(language, "演示压缩包重建数据", "rebuilt demo zip dataset")
    : value;
}

export function BoundaryPills({ labels, language = "zh" }: { labels: string[]; language?: Language }) {
  return (
    <div className="boundary-pills" aria-label="Claim boundary">
      {labels.map((label) => (
        <span className="boundary-pill" key={label} title={label}>
          {boundaryDisplayLabel(label, language)}
        </span>
      ))}
    </div>
  );
}

export function BoundaryPanel({ metadata, language }: BoundaryPanelProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const coreBoundaries = [
    copy(language, "研究用途", "Research use"),
    copy(language, "非投资建议", "Not investment advice"),
    copy(language, "demo 数据", "Demo data"),
  ];

  return (
    <section className="boundary-panel" id="method-boundary" aria-labelledby="boundary-heading">
      <div className="section-heading">
        <span>{copy(language, "S6 · 方法与边界", "S6 · Method and Boundaries")}</span>
        <h2 id="boundary-heading">{copy(language, "我们主动告诉你这些限制", "The limits are stated up front")}</h2>
        <p>
          {copy(
            language,
            "透明边界不是削弱可信度，而是让这份账本知道自己能说明什么、不能说明什么。",
            "Transparent boundaries do not weaken credibility; they make clear what this ledger can and cannot support.",
          )}
        </p>
      </div>

      <div className="boundary-layout">
        <div className="method-card">
          <BookOpenCheck aria-hidden="true" size={20} />
          <h3>{copy(language, "方法论简述", "Method summary")}</h3>
          <p>
            {copy(
              language,
              "页面展示固定股票池中的公开预测记录。方向命中率、平均误差与错误公开率只用已结算记录计算；待判定和冻结待判定不进入分母，也不会被补写实际结果。上述统计均为公开安全演示读数，非 OOS 验证。",
              "This page shows public prediction records from a fixed stock universe. Direction hit rate, average error, and public miss rate use resolved records only; pending and frozen-pending rows stay out of the denominator and no actual result is backfilled. These are public-safe demo readings, not OOS validation.",
            )}
          </p>
          <p>
            {copy(
              language,
              "每条记录保留记录 ID、决策日期、预测窗口、推理摘要、证据和技术来源，方便从表格或详情页逐条核对。",
              "Each record keeps its record ID, decision date, prediction window, reasoning summary, evidence, and technical provenance so it can be checked row by row.",
            )}
          </p>
        </div>

        <div className="method-card">
          <Scale aria-hidden="true" size={20} />
          <h3>{copy(language, "边界与局限", "Boundaries and limits")}</h3>
          <ul className="core-boundary-list" aria-label="Core boundary statements">
            {coreBoundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
          <p>{copy(language, "完整声明边界标签来自当前元数据：", "Full claim-boundary labels come from the current metadata:")}</p>
          <BoundaryPills labels={metadata.claim_boundary} language={language} />
        </div>

        <div className="method-card">
          <ShieldCheck aria-hidden="true" size={20} />
          <h3>{copy(language, "快照来源", "Snapshot source")}</h3>
          <dl className="boundary-list">
            <div>
              <dt>{copy(language, "快照日期", "Snapshot date")}</dt>
              <dd>{metadata.snapshot_date}</dd>
            </div>
            <div>
              <dt>{copy(language, "数据集类型", "Dataset type")}</dt>
              <dd title={metadata.dataset_type}>{datasetDisplayLabel(metadata.dataset_type, language)}</dd>
            </div>
            <div>
              <dt>{copy(language, "来源类型", "Source type")}</dt>
              <dd title={metadata.source.type}>{sourceDisplayLabel(metadata.source.type, language)}</dd>
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

        <div className="technical-appendix">
          <button
            aria-controls="technical-details"
            aria-expanded={technicalOpen}
            className="technical-toggle"
            onClick={() => setTechnicalOpen((current) => !current)}
            type="button"
          >
            <BadgeInfo aria-hidden="true" size={16} />
            {copy(language, "展开技术细节", "Show technical details")}
            <ChevronDown aria-hidden="true" className={technicalOpen ? "open" : ""} size={16} />
          </button>
          {technicalOpen ? (
            <div className="callout technical-details" id="technical-details">
              <p>
                {copy(
                  language,
                  "direct_llm 只按 direct_llm_parametric_memory_control 理解：现代 LLM 参数记忆不能按 decision_date 截断，可能含历史后验市场叙事；它不是 clean no-future baseline。该 caveat 仅用于解释技术参照系，不构成 OOS、科学公开证明或交易信号。",
                  "direct_llm should only be read as direct_llm_parametric_memory_control: modern LLM parametric memory cannot be cut off at decision_date and may contain later market narratives. It is not a clean no-future baseline. This caveat explains the technical reference only; it is not OOS validation, science/public proof, or a trading signal.",
                )}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <GlossaryStrip language={language} />
    </section>
  );
}
