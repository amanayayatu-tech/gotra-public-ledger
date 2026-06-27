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
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";

type CognitionDashboardProps = {
  dataset: LedgerDataset;
  records: RecordView[];
  tickers: string[];
  selectedTicker: string;
  language: Language;
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

function formatPointValue(value: number | null, language: Language): string {
  return value === null ? copy(language, "暂无", "Pending") : `${formatNumber(value)}${copy(language, " 点", "pp")}`;
}

function formatErrorValue(value: number | null, language: Language): string {
  return value === null ? copy(language, "暂无", "Pending") : `${formatNumber(Math.abs(value))}pp`;
}

function ChartTooltip({ active, payload, language }: TooltipProps<number, string> & { language: Language }) {
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
      <span>{copy(language, "窗口", "Window")}：{point.window}</span>
      <span>{copy(language, "预测", "Prediction")}：{formatSignedPercent(point.predicted)}</span>
      <span>{copy(language, "实际", "Actual")}：{formatSignedPercent(point.actual)}</span>
      <span>{copy(language, "误差", "Error")}：{formatErrorValue(point.error, language)}</span>
      <span>{resultLabel(point)}</span>
      <span>{copy(language, "累计方向命中率", "Cumulative direction hit rate")}：{point.cumulativeAccuracy === null ? copy(language, "暂无", "Pending") : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>{copy(language, "平均误差", "Average error")}：{formatPointValue(point.averageError, language)}</span>
    </div>
  );
}

function EvolutionTooltip({ active, payload, language }: TooltipProps<number, string> & { language: Language }) {
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
      <span>{copy(language, "累计方向命中率", "Cumulative direction hit rate")}：{point.cumulativeAccuracy === null ? copy(language, "暂无", "Pending") : `${point.cumulativeAccuracy.toFixed(1)}%`}</span>
      <span>{copy(language, "平均误差", "Average error")}：{formatPointValue(point.averageError, language)}</span>
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

function PredictionOutcomeChart({ points, language }: { points: CognitionPoint[]; language: Language }) {
  const chartPoints: CognitionChartPoint[] = points.map((point) => ({
    ...point,
    pendingPredicted: point.status === "resolved" ? null : point.predicted,
  }));
  const hasActual = chartPoints.some((point) => typeof point.actual === "number");
  const hasResolved = chartPoints.some((point) => point.status === "resolved");
  const hasPending = chartPoints.some((point) => point.status !== "resolved");

  return (
    <section className="chart-card main-chart-card" aria-labelledby="prediction-chart-title">
      <div className="chart-card-header">
        <div>
          <h2 id="prediction-chart-title">{copy(language, "系统当时预期 vs 后来真实表现", "Original expectation vs later actual movement")}</h2>
          <p>
            {language === "zh" ? (hasActual
              ? "蓝线是当时预测，绿/红/灰点分别代表方向判对、判错、待判定或冻结待判定。"
              : "暂无实际：当前标的尚无已结算记录；图表只显示预测线，不回填实际涨跌或误差。") : (hasActual
              ? "Blue line is the original prediction; green/red/gray dots show direction hit, miss, pending, or frozen pending."
              : "No actual value yet: the current target has no resolved record, so the chart does not backfill actual/error fields.")}
          </p>
          <span className="chart-boundary-label">{copy(language, "公开安全演示 · 非 OOS", "public-safe demo · not OOS")}</span>
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
            <Tooltip content={<ChartTooltip language={language} />} />
            <Legend verticalAlign="top" height={28} />
            <Line
              type="monotone"
              dataKey="predicted"
              name={copy(language, "预测涨跌幅", "Expected change")}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "#2563eb" }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            {hasActual ? (
              <Line
                type="monotone"
                dataKey="actual"
                name={copy(language, "实际涨跌幅", "Actual change")}
                stroke="#0f766e"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={<CustomDot />}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ) : null}
            {hasResolved && hasPending ? (
              <Line
                type="monotone"
                dataKey="pendingPredicted"
                name={copy(language, "待判定/冻结", "Pending/frozen")}
                stroke="#8a97a3"
                strokeWidth={2}
                strokeDasharray="2 5"
                dot={<PendingDot />}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function EvolutionChart({ points, language }: { points: CognitionPoint[]; language: Language }) {
  return (
    <section className="chart-card" aria-labelledby="evolution-chart-title">
      <div className="chart-card-header">
        <div>
          <h2 id="evolution-chart-title">{copy(language, "方向命中与误差如何变化", "How direction hit rate and error change")}</h2>
          <p>{copy(language, "只用已结算记录计算；待判定与冻结待判定不进入命中率和误差分母。", "Only resolved records are counted; pending and frozen pending stay outside hit-rate and error denominators.")}</p>
          <span className="chart-boundary-label">{copy(language, "公开安全演示 · 非 OOS", "public-safe demo · not OOS")}</span>
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
            <Tooltip content={<EvolutionTooltip language={language} />} />
            <Legend verticalAlign="top" height={28} />
            <Line
              yAxisId="left"
              type="stepAfter"
              dataKey="cumulativeAccuracy"
              name={copy(language, "累计方向命中率", "Cumulative direction hit rate")}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="averageError"
              name={copy(language, "平均误差", "Average error")}
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
  language,
  onSelectRecord,
}: {
  records: RecordView[];
  language: Language;
  onSelectRecord: (record: RecordView) => void;
}) {
  return (
    <section className="chart-card timeline-card" aria-labelledby="timeline-title">
      <div className="chart-card-header">
        <div>
          <h2 id="timeline-title">{copy(language, "证据 / 来源时间线", "Evidence/source timeline")}</h2>
          <p>{copy(language, "每条判断都保留时间、来源数量和结果状态，便于逐条追责。", "Each judgment keeps time, source count, and result status for record-level accountability.")}</p>
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
                <small>
                  {copy(
                    language,
                    `${record.evidence_count} 个公开来源摘要 · 技术路径在记录详情中折叠`,
                    `${record.evidence_count} public source summaries · technical paths are collapsed in record detail`,
                  )}
                </small>
              </span>
              <span className="timeline-count">{copy(language, `${record.evidence_count} 个来源`, `${record.evidence_count} sources`)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ErrorReview({ record, language }: { record: RecordView | null; language: Language }) {
  return (
    <section className="chart-card review-card" aria-labelledby="review-title">
      <div className="chart-card-header">
        <div>
          <h2 id="review-title">{copy(language, "错误复盘", "Error review")}</h2>
          <p>{copy(language, "只解释历史偏差，不生成任何行动指令。", "Explains historical deviation only; no action instruction is generated.")}</p>
        </div>
        <AlertTriangle aria-hidden="true" size={20} />
      </div>
      <p>{describeLargestError(record)}</p>
      {record ? (
        <dl className="review-facts">
          <div>
            <dt>{copy(language, "记录 ID", "prediction_id")}</dt>
            <dd>{record.prediction_id}</dd>
          </div>
          <div>
            <dt>{copy(language, "预测 / 实际", "Prediction / actual")}</dt>
            <dd>
              {formatSignedPercent(record.expected_change_pct)} / {formatSignedPercent(record.actual_change_pct)}
            </dd>
          </div>
          <div>
            <dt>{copy(language, "推理摘要", "reasoning")}</dt>
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
  language,
  onTickerChange,
  onSelectRecord,
}: CognitionDashboardProps) {
  const cognition = buildTickerCognition(selectedTicker, records);
  const latest = cognition.latestRecord;

  return (
    <section className="ticker-workbench" id="ledger-proof" aria-labelledby="ledger-proof-title">
      <div className="section-heading proof-heading">
        <span>{copy(language, "S4 · 账本证据", "S4 · Ledger proof")}</span>
        <h2 id="ledger-proof-title">{copy(language, "挑一只股票，看 GOTRA 对它的判断是怎么一步步演化的", "Pick a target and inspect how GOTRA's view evolved")}</h2>
        <p>
          {copy(language, `默认选中记录最多的标的；当前数据中是 ${selectedTicker}。所有图表来自快照日期 ${dataset.metadata.snapshot_date} 的公开安全演示快照，非 OOS。`, `The default target has the most records; currently ${selectedTicker}. All charts come from the public-safe demo snapshot at snapshot_date ${dataset.metadata.snapshot_date}; not OOS.`)}
        </p>
      </div>

      <div className="ticker-workbench-inner">
        <div className="ticker-header">
          <div>
            <h2>{cognition.profile.displayName}</h2>
            <p>
              {language === "zh"
                ? `${cognition.profile.description}GOTRA 对${cognition.profile.shortName}做了 ${cognition.records.length} 次判断，${cognition.resolvedCount} 次已结算，方向命中 ${formatPercent(cognition.hitRate)}，平均误差 ${formatPointValue(cognition.averageError, language)}；公开安全演示 · 非 OOS。`
                : `${cognition.profile.displayName} has ${cognition.records.length} GOTRA judgments, ${cognition.resolvedCount} resolved records, ${formatPercent(cognition.hitRate)} direction hit rate, and ${formatPointValue(cognition.averageError, language)} average error; public-safe demo · not OOS.`}
            </p>
          </div>
          <div className="ticker-stat-row">
            <span>{copy(language, `${cognition.records.length} 条记录`, `${cognition.records.length} records`)}</span>
            <span>{copy(language, `${cognition.resolvedCount} 已结算`, `${cognition.resolvedCount} resolved`)}</span>
            <span>{copy(language, `${formatPercent(cognition.hitRate)} 方向命中`, `${formatPercent(cognition.hitRate)} direction hit`)}</span>
            <span>{copy(language, `${formatPointValue(cognition.averageError, language)}平均误差`, `${formatPointValue(cognition.averageError, language)} avg error`)}</span>
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
              <span>{copy(language, "最新记录", "Latest record")}</span>
              <strong>
                {latest.decision_date} · {formatSignedPercent(latest.expected_change_pct)} · {latest.prediction_window}
              </strong>
            </div>
          </div>
          <p>{describeRecordOutcome(latest)}</p>
          <button type="button" onClick={() => onSelectRecord(latest)}>
            {copy(language, "打开记录", "Open record")}
          </button>
        </div>

        <div className="chart-grid">
          <PredictionOutcomeChart points={cognition.points} language={language} />
          <EvolutionChart points={cognition.points} language={language} />
          <EvidenceTimeline records={cognition.records} language={language} onSelectRecord={onSelectRecord} />
          <ErrorReview record={cognition.largestErrorRecord} language={language} />
        </div>
      </div>
    </section>
  );
}
