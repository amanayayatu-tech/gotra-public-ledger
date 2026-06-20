import {
  Activity,
  AlertTriangle,
  CalendarDays,
  LineChart as LineChartIcon,
  ListTree,
} from "lucide-react";
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
import { formatNumber, formatPercent, formatSignedPercent, type RecordView } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";

type CognitionDashboardProps = {
  dataset: LedgerDataset;
  records: RecordView[];
  tickers: string[];
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  onSelectRecord: (record: RecordView) => void;
};

type ChartTooltipPayload = Array<{
  name?: string;
  value?: number | string | null;
  payload?: CognitionChartPoint;
}>;

type CognitionChartPoint = CognitionPoint & {
  pendingPredicted: number | null;
};

function formatPointValue(value: number | null): string {
  return value === null ? "暂无" : `${formatNumber(value)} 点`;
}

function formatErrorValue(value: number | null): string {
  return value === null ? "暂无" : `${formatNumber(Math.abs(value))} 点`;
}

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
      <span>误差：{formatErrorValue(point.error)}</span>
      <span>{resultLabel(point)}</span>
      <span>累计准确率：{point.cumulativeAccuracy === null ? "暂无" : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>平均误差：{formatPointValue(point.averageError)}</span>
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
      <span>累计准确率：{point.cumulativeAccuracy === null ? "暂无" : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>平均误差：{formatPointValue(point.averageError)}</span>
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

function PendingDot(props: { cx?: number; cy?: number; payload?: CognitionChartPoint }) {
  const { cx, cy, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || !payload || payload.status === "resolved") {
    return null;
  }

  return <circle className={`pending-chart-dot ${payload.status}`} cx={cx} cy={cy} r={5} />;
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
  const chartPoints: CognitionChartPoint[] = points.map((point) => ({
    ...point,
    pendingPredicted: point.status === "resolved" ? null : point.predicted,
  }));

  return (
    <section className="chart-card main-chart-card" aria-labelledby="prediction-chart-title">
      <div className="chart-card-header">
        <div>
          <h2 id="prediction-chart-title">系统当时预期 vs 后来真实表现</h2>
          <p>蓝线是当时预测，绿/红/灰点分别代表方向判对、判错、待判定或冻结待判定。</p>
          <span className="chart-boundary-label">public-safe demo · 非 OOS</span>
        </div>
        <LineChartIcon aria-hidden="true" size={20} />
      </div>
      <div className="chart-frame tall-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartPoints} margin={{ top: 14, right: 18, bottom: 10, left: 0 }}>
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
            <Line
              type="monotone"
              dataKey="pendingPredicted"
              name="待判定/冻结"
              stroke="#8a97a3"
              strokeWidth={2}
              strokeDasharray="2 5"
              dot={<PendingDot />}
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
          <h2 id="evolution-chart-title">方向命中与误差如何变化</h2>
          <p>只用已结算记录计算；待判定与冻结待判定不进入命中率和误差分母。</p>
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
          <p>每条判断都保留时间、来源数量和结果状态，便于逐条追责。</p>
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
              <span className="timeline-count">{record.evidence_count} 个来源</span>
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
  tickers,
  selectedTicker,
  onTickerChange,
  onSelectRecord,
}: CognitionDashboardProps) {
  const cognition = buildTickerCognition(selectedTicker, records);
  const latest = cognition.latestRecord;

  return (
    <section className="ticker-workbench" id="ledger-proof" aria-labelledby="ledger-proof-title">
      <div className="section-heading proof-heading">
        <span>S4 · Ledger proof</span>
        <h2 id="ledger-proof-title">挑一只股票，看 GOTRA 对它的判断是怎么一步步演化的</h2>
        <p>
          默认选中记录最多的标的；当前数据中是 {selectedTicker}。所有图表来自 snapshot_date{" "}
          {dataset.metadata.snapshot_date} 的公开安全快照。
        </p>
      </div>

      <div className="ticker-workbench-inner">
        <div className="ticker-header">
          <div>
            <h2>{cognition.profile.displayName}</h2>
            <p>
              {cognition.profile.description}
              GOTRA 对{cognition.profile.shortName}做了 {cognition.records.length} 次判断，
              {cognition.resolvedCount} 次已结算，方向命中 {formatPercent(cognition.hitRate)}，平均误差{" "}
              {formatPointValue(cognition.averageError)}。
            </p>
          </div>
          <div className="ticker-stat-row">
            <span>{cognition.records.length} 条记录</span>
            <span>{cognition.resolvedCount} 已结算</span>
            <span>{formatPercent(cognition.hitRate)} 方向命中</span>
            <span>{formatPointValue(cognition.averageError)}平均误差</span>
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
      </div>
    </section>
  );
}
