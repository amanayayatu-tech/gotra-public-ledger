import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { CognitionDashboard } from "./components/CognitionDashboard";
import { DetailDrawer } from "./components/DetailDrawer";
import { LedgerTable, type SortKey, type SortState } from "./components/LedgerTable";
import { buildTickerList } from "./data/cognition";
import { computeSummary, toRecordView, type LedgerStatus, type RecordView } from "./data/metrics";
import { loadLedgerDataset, type LedgerDataset } from "./data/schema";

type StatusFilter = "all" | LedgerStatus;

function compareRecord(a: RecordView, b: RecordView, key: SortKey): number {
  const left = a[key];
  const right = b[key];

  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return -1;
  }
  if (right === null) {
    return 1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "en");
}

function App() {
  const [dataset, setDataset] = useState<LedgerDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sort, setSort] = useState<SortState>({ key: "decision_date", direction: "desc" });
  const [selectedRecord, setSelectedRecord] = useState<RecordView | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("");

  useEffect(() => {
    loadLedgerDataset()
      .then(setDataset)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unknown ledger load error");
      });
  }, []);

  const views = useMemo(() => {
    if (!dataset) {
      return [];
    }
    return dataset.records.map((record) => toRecordView(record, dataset));
  }, [dataset]);

  const metrics = useMemo(() => (dataset ? computeSummary(dataset) : null), [dataset]);
  const tickers = useMemo(() => buildTickerList(views), [views]);
  const activeTicker = selectedTicker && tickers.includes(selectedTicker) ? selectedTicker : tickers[0] ?? "";

  const sectors = useMemo(
    () => [...new Set(views.map((record) => record.sector))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [views],
  );

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = views.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [record.ticker, record.company, record.sector, record.prediction_id]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesSector = sectorFilter === "all" || record.sector === sectorFilter;
      return matchesQuery && matchesStatus && matchesSector;
    });

    return result.sort((a, b) => {
      const base = compareRecord(a, b, sort.key);
      return sort.direction === "asc" ? base : -base;
    });
  }, [query, sectorFilter, sort, statusFilter, views]);

  const handleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  if (error) {
    return (
      <main className="error-screen">
        <AlertCircle aria-hidden="true" size={24} />
        <h1>Ledger data failed to load</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!dataset || !metrics || !activeTicker) {
    return (
      <main className="loading-screen">
        <RefreshCw aria-hidden="true" size={22} />
        <span>Loading ledger.demo.json</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            GL
          </span>
          <div>
            <strong>GOTRA Public Ledger</strong>
            <span>认知演化 · 冻结演示快照</span>
          </div>
        </div>
        <div className="topbar-meta" aria-label="Dataset boundary">
          <span title={`snapshot_date ${dataset.metadata.snapshot_date}`}>冻结快照日期 {dataset.metadata.snapshot_date}</span>
          <span title="Research information only">研究信息展示</span>
          <span title="Not investment advice">不是投资建议</span>
        </div>
      </header>

      <main className="page-shell">
        <CognitionDashboard
          dataset={dataset}
          records={views}
          metrics={metrics}
          tickers={tickers}
          selectedTicker={activeTicker}
          onTickerChange={setSelectedTicker}
          onSelectRecord={setSelectedRecord}
        />

        <section className="ledger-section" aria-label="Ledger table">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <h2>公开账本明细</h2>
                <p>
                  当前显示 {filteredRecords.length} / {views.length} 条记录
                </p>
              </div>
              <div className="filters">
                <label className="search-box">
                  <Search aria-hidden="true" size={16} />
                  <span className="sr-only">Search ledger</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索股票、公司或行业"
                  />
                </label>
                <label>
                  <span>状态</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="all">全部</option>
                    <option value="resolved">已结算</option>
                    <option value="frozen_pending">冻结待判定</option>
                    <option value="pending">待判定</option>
                  </select>
                </label>
                <label>
                  <span>行业</span>
                  <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                    <option value="all">全部行业</option>
                    {sectors.map((sector) => (
                      <option value={sector} key={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <LedgerTable records={filteredRecords} sort={sort} onSort={handleSort} onSelect={setSelectedRecord} />
          </div>
        </section>
      </main>

      <DetailDrawer record={selectedRecord} metadata={dataset.metadata} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}

export default App;
