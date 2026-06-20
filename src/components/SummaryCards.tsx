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
      label: "Total",
      value: String(metrics.total),
      detail: "Demo records",
      icon: Database,
    },
    {
      label: "Resolved",
      value: String(metrics.resolved),
      detail: "Used for hit/error metrics",
      icon: CheckCircle2,
    },
    {
      label: "Frozen pending",
      value: String(metrics.frozenPending + metrics.pending),
      detail: "Not live/current",
      icon: Snowflake,
      tone: "warn",
    },
    {
      label: "Direction hit rate",
      value: formatPercent(metrics.directionHitRate),
      detail: "Demo resolved records only",
      icon: Target,
    },
    {
      label: "Average absolute error",
      value: formatNumber(metrics.averageAbsoluteError),
      detail: "Percentage points",
      icon: Ruler,
    },
    {
      label: "Ticker coverage",
      value: String(metrics.tickerCoverage),
      detail: "Unique tickers",
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
