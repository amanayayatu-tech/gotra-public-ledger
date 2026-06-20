import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { BoundaryPanel } from "./components/BoundaryPanel";
import { CognitionDashboard } from "./components/CognitionDashboard";
import { DetailDrawer } from "./components/DetailDrawer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { LedgerTable, type SortKey, type SortState } from "./components/LedgerTable";
import { SiteFooter } from "./components/SiteFooter";
import { TrustStrip } from "./components/TrustStrip";
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
            <span>公开预测账本 · 错误也留痕</span>
          </div>
        </div>
        <div className="topbar-meta" aria-label="Dataset boundary">
          <a href="#how-it-works">方法</a>
          <a href="#ledger-proof">证据</a>
          <a href="#full-ledger">账本</a>
          <a href="#method-boundary">边界</a>
        </div>
      </header>

      <main className="page-shell">
        <Hero dataset={dataset} metrics={metrics} records={views} />
        <HowItWorks />
        <TrustStrip records={views} />
        <CognitionDashboard
          dataset={dataset}
          records={views}
          tickers={tickers}
          selectedTicker={activeTicker}
          onTickerChange={setSelectedTicker}
          onSelectRecord={setSelectedRecord}
        />

        <section className="ledger-section" id="full-ledger" aria-labelledby="full-ledger-title">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <span className="section-index">S5 · Full ledger</span>
                <h2 id="full-ledger-title">完整公开账本</h2>
                <p>
                  这是全部 {views.length} 条公开判断，任你搜索、筛选、逐条核对；它不是荐股列表。
                </p>
                <div className="status-legend" aria-label="Ledger status legend">
                  <span>
                    <i className="legend-dot resolved" />
                    已结算
                  </span>
                  <span>
                    <i className="legend-dot frozen_pending" />
                    冻结待判定
                  </span>
                  <span>
                    <i className="legend-dot pending" />
                    待判定
                  </span>
                </div>
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
            <div className="ledger-count-line">
              当前显示 {filteredRecords.length} / {views.length} 条快照数据；统计口径只把已结算记录纳入命中率与误差。
            </div>

            <LedgerTable records={filteredRecords} sort={sort} onSort={handleSort} onSelect={setSelectedRecord} />
          </div>
        </section>

        <BoundaryPanel metadata={dataset.metadata} />
        <SiteFooter metadata={dataset.metadata} />
      </main>

      <DetailDrawer record={selectedRecord} metadata={dataset.metadata} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}

export default App;
