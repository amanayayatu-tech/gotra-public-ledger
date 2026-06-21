import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Database, Hash, Ruler, Snowflake, Target } from "lucide-react";
import { formatNumber, formatPercent, type SummaryMetrics } from "../data/metrics";

type SummaryCardsProps = {
  metrics: SummaryMetrics;
};

type Card = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "warn";
};

export function SummaryCards({ metrics }: SummaryCardsProps) {
  const cards: Card[] = [
    {
      label: "总记录数",
      value: String(metrics.total),
      detail: "演示记录",
      icon: Database,
    },
    {
      label: "已结算",
      value: String(metrics.resolved),
      detail: "public-safe demo · 非 OOS",
      icon: CheckCircle2,
    },
    {
      label: "冻结待判定",
      value: String(metrics.frozenPending),
      detail: metrics.pending > 0 ? `${metrics.pending} 条待判定单独统计` : "不是实时数据",
      icon: Snowflake,
      tone: "warn",
    },
    {
      label: "方向命中率",
      value: formatPercent(metrics.directionHitRate),
      detail: "public-safe demo · 非 OOS",
      icon: Target,
    },
    {
      label: "平均绝对误差",
      value: formatNumber(metrics.averageAbsoluteError),
      detail: "public-safe demo · 非 OOS",
      icon: Ruler,
    },
    {
      label: "覆盖股票",
      value: String(metrics.tickerCoverage),
      detail: "不同 ticker 数量",
      icon: Hash,
    },
  ];

  return (
    <section className="summary-grid" aria-label="Ledger summary">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className={`summary-card ${card.tone ?? ""}`} key={card.label}>
            <Icon aria-hidden="true" size={18} />
            <div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
