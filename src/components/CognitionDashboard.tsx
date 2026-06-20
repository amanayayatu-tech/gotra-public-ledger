import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  Gauge,
  LineChart as LineChartIcon,
  ListTree,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  buildTickerCognition,
  describeLargestError,
  describeRecordOutcome,
  resultLabel,
  statusTone,
  type CognitionPoint,
} from "../data/cognition";
import { getCompanyProfile } from "../data/companyProfiles";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  type RecordView,
  type SummaryMetrics,
} from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import { BoundaryPills } from "./BoundaryPanel";
import { GlossaryStrip, TermTip } from "./TermTip";

type CognitionDashboardProps = {
  dataset: LedgerDataset;
  records: RecordView[];
  metrics: SummaryMetrics;
  tickers: string[];
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  onSelectRecord: (record: RecordView) => void;
};

type ChartTooltipPayload = Array<{
  name?: string;
  value?: number | string | null;
  payload?: CognitionPoint;
}>;

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = (payload as ChartTooltipPayload)[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="chart-tooltip cognition-tooltip">
      <strong>{point.date}</strong>
      <span>窗口：{point.window}</span>
      <span>预测：{formatSignedPercent(point.predicted)}</span>
      <span>实际：{formatSignedPercent(point.actual)}</span>
      <span>{resultLabel(point)}</span>
      <span>累计准确率：{point.cumulativeAccuracy === null ? "n/a" : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>平均误差：{formatNumber(point.averageError)} pp</span>
    </div>
  );
}

function EvolutionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = (payload as ChartTooltipPayload)[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="chart-tooltip cognition-tooltip">
      <strong>{point.date}</strong>
      <span>{resultLabel(point)}</span>
      <span>累计准确率：{point.cumulativeAccuracy === null ? "n/a" : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>平均误差：{formatNumber(point.averageError)} pp</span>
    </div>
  );
}

function CustomDot(props: { cx?: number; cy?: number; payload?: CognitionPoint }) {
  const { cx, cy, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return null;
  }

  return <circle className={`outcome-dot ${statusTone(payload)}`} cx={cx} cy={cy} r={5} />;
}

function MetricTile({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: string;
  note: string;
}) {
  return (
    <div className="metric-tile">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}

function TickerChips({
  tickers,
  records,
  selectedTicker,
  onTickerChange,
}: {
  tickers: string[];
  records: RecordView[];
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
}) {
  return (
    <div className="ticker-chip-row" role="tablist" aria-label="Ticker selector">
      {tickers.map((ticker) => {
        const tickerRecords = records.filter((record) => record.ticker === ticker);
        const profile = getCompanyProfile(ticker, tickerRecords[0]?.company ?? ticker);
        const active = ticker === selectedTicker;
        return (
          <button
            className={`ticker-chip ${active ? "active" : ""}`}
            key={ticker}
            onClick={() => onTickerChange(ticker)}
            role="tab"
            aria-selected={active}
            type="button"
          >
            <span>{profile.displayName}</span>
            <small>{tickerRecords.length} 条</small>
          </button>
        );
      })}
    </div>
  );
}

function PredictionOutcomeChart({ points }: { points: CognitionPoint[] }) {
  return (
    <section className="chart-card main-chart-card" aria-labelledby="prediction-chart-title">
      <div className="chart-card-header">
        <div>
          <h2 id="prediction-chart-title">
            <TermTip term="expected_change_pct" compact /> vs <TermTip term="actual_change_pct" compact />
          </h2>
          <p>绿色点代表方向判对，红色点代表判错，中性点代表 pending 或 frozen_pending。</p>
        </div>
        <LineChartIcon aria-hidden="true" size={20} />
      </div>
      <div className="chart-frame tall-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 14, right: 18, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#e6ecea" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#66757f", fontSize: 12 }} tickMargin={8} />
            <YAxis
              tick={{ fill: "#66757f", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <ReferenceLine y={0} stroke="#aeb8b4" strokeDasharray="4 4" />
            <Tooltip content={<ChartTooltip />} />
            <Legend verticalAlign="top" height={28} />
            <Line
              type="monotone"
              dataKey="predicted"
              name="预测涨跌幅"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "#2563eb" }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="实际涨跌幅"
              stroke="#0f766e"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function EvolutionChart({ points }: { points: CognitionPoint[] }) {
  return (
    <section className="chart-card" aria-labelledby="evolution-chart-title">
      <div className="chart-card-header">
        <div>
          <h2 id="evolution-chart-title">
            <TermTip term="cumulative_accuracy" compact /> & <TermTip term="average_error" compact />
          </h2>
          <p>右轴为平均误差（越低越好），左轴为累计方向准确率。</p>
        </div>
        <Activity aria-hidden="true" size={20} />
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 14, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#e6ecea" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#66757f", fontSize: 12 }} tickMargin={8} />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fill: "#66757f", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#66757f", fontSize: 12 }}
              tickFormatter={(value) => `${value}`}
              width={38}
            />
            <Tooltip content={<EvolutionTooltip />} />
            <Legend verticalAlign="top" height={28} />
            <Line
              yAxisId="left"
              type="stepAfter"
              dataKey="cumulativeAccuracy"
              name="累计准确率"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="averageError"
              name="平均误差"
              stroke="#d97706"
              strokeWidth={2}
              dot={{ r: 3, fill: "#d97706", strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function EvidenceTimeline({
  records,
  onSelectRecord,
}: {
  records: RecordView[];
  onSelectRecord: (record: RecordView) => void;
}) {
  return (
    <section className="chart-card timeline-card" aria-labelledby="timeline-title">
      <div className="chart-card-header">
        <div>
          <h2 id="timeline-title">证据/来源时间线</h2>
          <p>每条记录保留来源数量、来源标签和结果状态。</p>
        </div>
        <ListTree aria-hidden="true" size={20} />
      </div>
      <ol className="timeline-list">
        {records.map((record) => (
          <li key={record.prediction_id}>
            <button type="button" onClick={() => onSelectRecord(record)}>
              <span className="timeline-date mono">{record.decision_date}</span>
              <span className={`status-dot ${record.status}`} aria-hidden="true" />
              <span className="timeline-main">
                <strong>
                  {formatSignedPercent(record.expected_change_pct)} · {record.prediction_window}
                </strong>
                <small>{record.evidence.map((item) => item.source).join(" / ")}</small>
              </span>
              <span className="timeline-count">{record.evidence_count} sources</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ErrorReview({ record }: { record: RecordView | null }) {
  return (
    <section className="chart-card review-card" aria-labelledby="review-title">
      <div className="chart-card-header">
        <div>
          <h2 id="review-title">错误复盘</h2>
          <p>只解释历史偏差，不生成任何交易建议。</p>
        </div>
        <AlertTriangle aria-hidden="true" size={20} />
      </div>
      <p>{describeLargestError(record)}</p>
      {record ? (
        <dl className="review-facts">
          <div>
            <dt>prediction_id</dt>
            <dd>{record.prediction_id}</dd>
          </div>
          <div>
            <dt>预测 / 实际</dt>
            <dd>
              {formatSignedPercent(record.expected_change_pct)} / {formatSignedPercent(record.actual_change_pct)}
            </dd>
          </div>
          <div>
            <dt>reasoning</dt>
            <dd>{record.reasoning}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

export function CognitionDashboard({
  dataset,
  records,
  metrics,
  tickers,
  selectedTicker,
  onTickerChange,
  onSelectRecord,
}: CognitionDashboardProps) {
  const cognition = buildTickerCognition(selectedTicker, records);
  const latest = cognition.latestRecord;

  return (
    <>
      <section className="hero-workbench" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="section-kicker">
            <Database aria-hidden="true" size={15} />
            {dataset.metadata.dataset_type}
          </div>
          <h1 id="page-title">认知演化视图</h1>
          <p>
            GOTRA Public Ledger 把历史预测、实际结果、方向判对/判错和误差变化放在同一个公开账本里。
          </p>
        </div>
        <div className="snapshot-card">
          <div>
            <span>snapshot_date</span>
            <strong>{dataset.metadata.snapshot_date}</strong>
          </div>
          <div>
            <span>source</span>
            <strong>{dataset.metadata.source.type}</strong>
          </div>
          <BoundaryPills labels={dataset.metadata.claim_boundary} />
        </div>
      </section>

      <section className="metric-grid" aria-label="Global cognition overview">
        <MetricTile icon={<Target size={18} />} label="总记录数" value={String(metrics.total)} note="frozen demo records" />
        <MetricTile icon={<CheckCircle2 size={18} />} label="已结算" value={String(metrics.resolved)} note="用于命中率计算" />
        <MetricTile
          icon={<Gauge size={18} />}
          label={<TermTip term="direction_hit_rate" compact />}
          value={formatPercent(metrics.directionHitRate)}
          note="demo/resolved only"
        />
        <MetricTile
          icon={<BarChart3 size={18} />}
          label={<TermTip term="average_error" compact />}
          value={`${formatNumber(metrics.averageAbsoluteError)} pp`}
          note="越低越好"
        />
        <MetricTile
          icon={<Clock3 size={18} />}
          label="pending / frozen"
          value={`${metrics.pending} / ${metrics.frozenPending}`}
          note="不回填后验结果"
        />
        <MetricTile icon={<CircleDot size={18} />} label="覆盖 ticker" value={String(metrics.tickerCoverage)} note="可切换单标的" />
      </section>

      <section className="ticker-workbench" aria-label="Single ticker cognition workbench">
        <div className="ticker-header">
          <div>
            <h2>{cognition.profile.displayName}</h2>
            <p>{cognition.profile.description}</p>
          </div>
          <div className="ticker-stat-row">
            <span>{cognition.records.length} records</span>
            <span>{cognition.resolvedCount} resolved</span>
            <span>{formatPercent(cognition.hitRate)} hit rate</span>
            <span>{formatNumber(cognition.averageError)} pp avg error</span>
          </div>
        </div>

        <TickerChips
          tickers={tickers}
          records={records}
          selectedTicker={selectedTicker}
          onTickerChange={onTickerChange}
        />

        <div className="latest-record">
          <div className="latest-title">
            <CalendarDays aria-hidden="true" size={18} />
            <div>
              <span>最新记录</span>
              <strong>
                {latest.decision_date} · {formatSignedPercent(latest.expected_change_pct)} · {latest.prediction_window}
              </strong>
            </div>
          </div>
          <p>{describeRecordOutcome(latest)}</p>
          <button type="button" onClick={() => onSelectRecord(latest)}>
            打开记录
          </button>
        </div>

        <div className="chart-grid">
          <PredictionOutcomeChart points={cognition.points} />
          <EvolutionChart points={cognition.points} />
          <EvidenceTimeline records={cognition.records} onSelectRecord={onSelectRecord} />
          <ErrorReview record={cognition.largestErrorRecord} />
        </div>
      </section>

      <section className="boundary-footer" aria-label="Boundary and glossary">
        <div>
          <h2>
            <ShieldCheck aria-hidden="true" size={18} />
            边界与术语
          </h2>
          <p>
            页面是 frontend UX/smoke evidence only；图表展示 frozen demo snapshot，不是 OOS、science/public proof、formal acceptance、trading signal 或投资建议。
          </p>
          <p>
            direct_llm 只按 direct_llm_parametric_memory_control 理解：现代 LLM 参数记忆不能按 decision_date 截断，可能含历史后验市场叙事，不是 clean no-future baseline。
          </p>
        </div>
        <GlossaryStrip />
      </section>
    </>
  );
}
