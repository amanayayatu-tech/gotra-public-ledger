import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RecordView } from "../data/metrics";

type CoverageChartProps = {
  records: RecordView[];
};

type SectorRow = {
  sector: string;
  count: number;
};

export function CoverageChart({ records }: CoverageChartProps) {
  const rows = [...records.reduce((map, record) => {
    map.set(record.sector, (map.get(record.sector) ?? 0) + 1);
    return map;
  }, new Map<string, number>())]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <section className="side-panel chart-panel" aria-labelledby="coverage-heading">
      <div className="panel-heading">
        <div>
          <h2 id="coverage-heading">标的覆盖</h2>
          <p>冻结演示数据中的主要行业</p>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 18, top: 8, bottom: 8 }}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis
              type="category"
              dataKey="sector"
              width={112}
              tick={{ fill: "#53616f", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f4" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const row = payload[0].payload as SectorRow;
                return (
                  <div className="chart-tooltip">
                    <strong>{row.sector}</strong>
                    <span>{row.count} 条演示记录</span>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" fill="#0f766e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
