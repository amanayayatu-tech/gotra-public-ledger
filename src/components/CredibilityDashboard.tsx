import { BarChart3, CheckCircle2, Database, Hash, Percent, ShieldCheck, Target } from "lucide-react";
import { formatNumber, formatPercent, type RecordView } from "../data/metrics";

type CredibilityDashboardProps = {
  records: RecordView[];
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

export function CredibilityDashboard({ records }: CredibilityDashboardProps) {
  const credibility = computeCredibility(records);
  const settledReference = `n=${credibility.settled}`;
  const coverageBase = `${credibility.settled}/(${credibility.settled}+${credibility.frozenPending})`;

  const metrics: CredibilityMetric[] = [
    {
      label: "累计公开预测",
      value: String(credibility.total),
      conclusion: `当前 public-safe demo snapshot 公开 ${credibility.total} 条记录。`,
      reference: "参照：原始 records 全量，不做扩写或补数。",
      icon: Database,
    },
    {
      label: "已结算数",
      value: String(credibility.settled),
      conclusion: `${credibility.settled} 条进入 resolved 口径。`,
      reference: `参照：命中率、误差、错误公开率只使用 resolved，${settledReference}。`,
      icon: CheckCircle2,
    },
    {
      label: "结算覆盖率",
      value: formatPercent(credibility.settlementCoverage),
      conclusion: `已结算覆盖 ${coverageBase}。`,
      reference: "参照：settled/(settled+frozen_pending)，pending 单独列示。",
      icon: Percent,
    },
    {
      label: "错误公开率",
      value: formatPercent(credibility.missRate),
      conclusion: `${credibility.misses} 条方向判错仍留在公开账本。`,
      reference: `参照：misses/settled，${settledReference}。`,
      icon: ShieldCheck,
      tone: credibility.misses > 0 ? "danger" : undefined,
    },
    {
      label: "覆盖标的数",
      value: String(credibility.tickerCoverage),
      conclusion: `当前 snapshot 覆盖 ${credibility.tickerCoverage} 个 ticker。`,
      reference: "参照：去重 ticker 数，用于判断账本覆盖面。",
      icon: Hash,
    },
    {
      label: "方向命中率",
      value: formatPercent(credibility.hitRate),
      conclusion: `参照 50% 方向随机基线；${settledReference} 仍偏小。`,
      reference: "仅作 public-safe demo 读数，非 OOS 验证或交易信号。",
      icon: Target,
      tone: "warn",
    },
    {
      label: "平均绝对误差",
      value: `${formatNumber(credibility.averageAbsoluteError)}pp`,
      conclusion: `基于有 error 的 resolved 记录，n=${credibility.errorSampleSize}。`,
      reference: "参照：0pp 表示完全贴合；这里只展示历史偏差。",
      icon: BarChart3,
      tone: "warn",
    },
  ];

  return (
    <section className="credibility-dashboard" id="credibility-dashboard" aria-labelledby="credibility-title">
      <div className="credibility-heading">
        <span className="section-index">S5.5 · Credibility dashboard</span>
        <h2 id="credibility-title">信用看板</h2>
        <p>
          基于 public-safe demo 数据，把公开记录、结算覆盖、错误公开与 resolved-only 统计口径放在同一处查看。
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
        口径：命中率、平均误差、错误公开率只基于 resolved 记录计算；pending/frozen_pending 不进入这些分母。
        本区块基于 public-safe demo 数据，非 OOS、非科学证明、非投资建议。
      </p>
    </section>
  );
}
