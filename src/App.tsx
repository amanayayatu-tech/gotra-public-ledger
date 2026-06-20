import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type DirectionFilter = "all" | RecordView["direction"];

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [tickerFilter, setTickerFilter] = useState("all");
  const [sort, setSort] = useState<SortState>({ key: "decision_date", direction: "desc" });
  const [selectedRecord, setSelectedRecord] = useState<RecordView | null>(null);
  const [selectedTicker, setSelectedTicker] = useState("");
  const lastRecordTriggerRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const openRecord = useCallback((record: RecordView, trigger?: HTMLElement) => {
    lastRecordTriggerRef.current = trigger ?? null;
    setSelectedRecord(record);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("prediction_id", record.prediction_id);
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, []);

  const closeRecord = useCallback(() => {
    setSelectedRecord(null);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("prediction_id");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    window.setTimeout(() => lastRecordTriggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (views.length === 0 || selectedRecord) {
      return;
    }

    const predictionId = new URLSearchParams(window.location.search).get("prediction_id");
    if (!predictionId) {
      return;
    }

    const linkedRecord = views.find((record) => record.prediction_id === predictionId);
    if (linkedRecord) {
      setSelectedRecord(linkedRecord);
      window.setTimeout(() => document.getElementById("full-ledger")?.scrollIntoView({ block: "start" }), 0);
    }
  }, [selectedRecord, views]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    const result = views.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [record.ticker, record.company].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDirection = directionFilter === "all" || record.direction === directionFilter;
      const matchesTicker = tickerFilter === "all" || record.ticker === tickerFilter;
      return matchesQuery && matchesStatus && matchesDirection && matchesTicker;
    });

    return result.sort((a, b) => {
      const base = compareRecord(a, b, sort.key);
      return sort.direction === "asc" ? base : -base;
    });
  }, [debouncedQuery, directionFilter, sort, statusFilter, tickerFilter, views]);

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

  if (!dataset || !metrics) {
    return (
      <main className="loading-screen">
        <RefreshCw aria-hidden="true" size={22} />
        <span>Loading ledger.demo.json</span>
      </main>
    );
  }

  if (!activeTicker) {
    return (
      <main className="error-screen">
        <AlertCircle aria-hidden="true" size={24} />
        <h1>Ledger data has no renderable records</h1>
        <p>public-safe demo 数据已加载，但没有可渲染的记录；页面不会回填或伪造后验结果。</p>
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
                    placeholder="搜索 ticker 或公司"
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
                  <span>方向</span>
                  <select
                    value={directionFilter}
                    onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}
                  >
                    <option value="all">全部方向</option>
                    <option value="up">看涨</option>
                    <option value="down">看跌</option>
                    <option value="neutral">中性</option>
                  </select>
                </label>
                <label>
                  <span>标的</span>
                  <select value={tickerFilter} onChange={(event) => setTickerFilter(event.target.value)}>
                    <option value="all">全部标的</option>
                    {tickers.map((ticker) => (
                      <option value={ticker} key={ticker}>
                        {ticker}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="ledger-count-line">
              当前显示 {filteredRecords.length} / {views.length} 条快照数据；统计口径只把已结算记录纳入命中率与误差。
            </div>

            <LedgerTable records={filteredRecords} sort={sort} onSort={handleSort} onSelect={openRecord} />
          </div>
        </section>

        <BoundaryPanel metadata={dataset.metadata} />
        <SiteFooter metadata={dataset.metadata} />
      </main>

      <DetailDrawer record={selectedRecord} metadata={dataset.metadata} onClose={closeRecord} />
    </div>
  );
}

export default App;
