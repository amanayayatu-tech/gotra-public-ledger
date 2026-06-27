import { BarChart3, CheckCircle2, Database, Hash, Percent, ShieldCheck, Target } from "lucide-react";
import { formatNumber, formatPercent, type RecordView } from "../data/metrics";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";

type CredibilityDashboardProps = {
  records: RecordView[];
  language: Language;
};

type CredibilityMetric = {
  label: string;
  value: string;
  conclusion: string;
  reference: string;
  icon: typeof Database;
  tone?: "danger" | "warn";
};

function computeCredibility(records: RecordView[]) {
  const settled = records.filter((record) => record.status === "resolved");
  const frozenPending = records.filter((record) => record.status === "frozen_pending");
  const misses = settled.filter((record) => record.direction_correct === false);
  const hits = settled.filter((record) => record.direction_correct === true);
  const errors = settled.map((record) => record.error).filter((value): value is number => typeof value === "number");
  const coverageDenominator = settled.length + frozenPending.length;

  return {
    total: records.length,
    settled: settled.length,
    frozenPending: frozenPending.length,
    tickerCoverage: new Set(records.map((record) => record.ticker)).size,
    settlementCoverage: coverageDenominator > 0 ? settled.length / coverageDenominator : null,
    misses: misses.length,
    missRate: settled.length > 0 ? misses.length / settled.length : null,
    hitRate: settled.length > 0 ? hits.length / settled.length : null,
    averageAbsoluteError:
      errors.length > 0 ? errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length : null,
    errorSampleSize: errors.length,
  };
}

export function CredibilityDashboard({ records, language }: CredibilityDashboardProps) {
  const credibility = computeCredibility(records);
  const settledReference = `n=${credibility.settled}`;
  const coverageBase = `${credibility.settled}/(${credibility.settled}+${credibility.frozenPending})`;

  const metrics: CredibilityMetric[] = [
    {
      label: copy(language, "累计公开预测", "Public predictions"),
      value: String(credibility.total),
      conclusion: copy(language, `当前公开安全演示快照公开 ${credibility.total} 条记录。`, `The current public-safe demo snapshot exposes ${credibility.total} records.`),
      reference: copy(language, "参照：原始记录全量，不做扩写或补数。", "Reference: all raw records, with no expansion or backfill."),
      icon: Database,
    },
    {
      label: copy(language, "已结算数", "Resolved records"),
      value: String(credibility.settled),
      conclusion: copy(language, `${credibility.settled} 条进入已结算口径。`, `${credibility.settled} records enter the resolved denominator.`),
      reference: copy(language, `参照：命中率、误差、错误公开率只使用已结算记录，${settledReference}。`, `Reference: hit rate, error, and public-miss rate use resolved only, ${settledReference}.`),
      icon: CheckCircle2,
    },
    {
      label: copy(language, "结算覆盖率", "Settlement coverage"),
      value: formatPercent(credibility.settlementCoverage),
      conclusion: copy(language, `已结算覆盖 ${coverageBase}。`, `Resolved coverage is ${coverageBase}.`),
      reference: copy(language, "参照：已结算 /（已结算 + 冻结待判定），待判定单独列示。", "Reference: settled/(settled+frozen_pending), with pending shown separately."),
      icon: Percent,
    },
    {
      label: copy(language, "错误公开率", "Public miss rate"),
      value: formatPercent(credibility.missRate),
      conclusion: copy(language, `${credibility.misses} 条方向判错仍留在公开账本。`, `${credibility.misses} direction misses remain in the public ledger.`),
      reference: copy(language, `参照：错误数 / 已结算，${settledReference}。`, `Reference: misses/settled, ${settledReference}.`),
      icon: ShieldCheck,
      tone: credibility.misses > 0 ? "danger" : undefined,
    },
    {
      label: copy(language, "覆盖标的数", "Targets covered"),
      value: String(credibility.tickerCoverage),
      conclusion: copy(language, `当前快照覆盖 ${credibility.tickerCoverage} 个股票代码。`, `The current snapshot covers ${credibility.tickerCoverage} tickers.`),
      reference: copy(language, "参照：去重股票代码数，用于判断账本覆盖面。", "Reference: unique ticker count for coverage context."),
      icon: Hash,
    },
    {
      label: copy(language, "方向命中率", "Direction hit rate"),
      value: formatPercent(credibility.hitRate),
      conclusion: copy(language, `参照 50% 方向随机基线；${settledReference} 仍偏小。`, `Compared with a 50% directional random baseline; ${settledReference} is still small.`),
      reference: copy(language, "仅作公开安全演示读数，非 OOS 验证或交易信号。", "Public-safe demo reading only; not OOS validation or a trading signal."),
      icon: Target,
      tone: "warn",
    },
    {
      label: copy(language, "平均绝对误差", "Average absolute error"),
      value: `${formatNumber(credibility.averageAbsoluteError)}pp`,
      conclusion: copy(language, `基于有误差字段的已结算记录，n=${credibility.errorSampleSize}。`, `Based on resolved records with error fields, n=${credibility.errorSampleSize}.`),
      reference: copy(language, "参照：0pp 表示完全贴合；这里只展示历史偏差。", "Reference: 0pp would be exact fit; this only shows historical deviation."),
      icon: BarChart3,
      tone: "warn",
    },
  ];

  return (
    <section className="credibility-dashboard" id="credibility-dashboard" aria-labelledby="credibility-title">
      <div className="credibility-heading">
        <span className="section-index">{copy(language, "S5.5 · 信用看板", "S5.5 · Credibility dashboard")}</span>
        <h2 id="credibility-title">{copy(language, "信用看板", "Credibility dashboard")}</h2>
        <p>
          {copy(language, "基于公开安全演示数据，把公开记录、结算覆盖、错误公开与“仅已结算”统计口径放在同一处查看。", "Based on public-safe demo data, this view keeps public records, settlement coverage, public errors, and resolved-only metrics together.")}
        </p>
      </div>

      <div className="credibility-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={`credibility-card ${metric.tone ?? ""}`} key={metric.label}>
              <div className="credibility-card-top">
                <Icon aria-hidden="true" size={18} />
                <span>{metric.label}</span>
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.conclusion}</p>
              <small>{metric.reference}</small>
            </article>
          );
        })}
      </div>

      <p className="credibility-footnote">
        {copy(language, "口径：命中率、平均误差、错误公开率只基于已结算记录计算；待判定 / 冻结待判定不进入这些分母。本区块基于公开安全演示数据，非 OOS、非科学证明、非投资建议。", "Method: hit rate, average error, and public-miss rate only use resolved records; pending/frozen_pending stay out of those denominators. This section is public-safe demo data, not OOS validation, scientific proof, or investment advice.")}
      </p>
    </section>
  );
}
