import { useEffect, useMemo, useState } from "react";
import { AlertCircle, GitBranch, RefreshCw, Search } from "lucide-react";
import { BoundaryPanel, BoundaryPills } from "./components/BoundaryPanel";
import { CoverageChart } from "./components/CoverageChart";
import { DetailDrawer } from "./components/DetailDrawer";
import { LedgerTable, type SortKey, type SortState } from "./components/LedgerTable";
import { SummaryCards } from "./components/SummaryCards";
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

  if (!dataset || !metrics) {
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
            <span>Frozen demo snapshot</span>
          </div>
        </div>
        <div className="topbar-meta">
          <span>snapshot_date {dataset.metadata.snapshot_date}</span>
          <span>{dataset.metadata.dataset_type}</span>
        </div>
      </header>

      <main className="page-shell">
        <section className="ledger-intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <div className="section-kicker">
              <GitBranch aria-hidden="true" size={15} />
              public-safe demo dataset
            </div>
            <h1 id="page-title">GOTRA Public Ledger</h1>
            <p>
              Frozen, public-safe prediction ledger rebuilt from the demo zip.
              The source snapshot is not live and does not establish OOS or
              public science claims.
            </p>
          </div>
          <BoundaryPills labels={dataset.metadata.claim_boundary} />
        </section>

        <SummaryCards metrics={metrics} />

        <section className="workbench" aria-label="Ledger workbench">
          <div className="ledger-panel">
            <div className="ledger-toolbar">
              <div>
                <h2>Ledger</h2>
                <p>
                  {filteredRecords.length} of {views.length} records shown
                </p>
              </div>
              <div className="filters">
                <label className="search-box">
                  <Search aria-hidden="true" size={16} />
                  <span className="sr-only">Search ledger</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search ticker, company, sector"
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="all">All</option>
                    <option value="resolved">Resolved</option>
                    <option value="frozen_pending">Frozen pending</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label>
                  <span>Sector</span>
                  <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                    <option value="all">All sectors</option>
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

          <aside className="right-rail">
            <BoundaryPanel metadata={dataset.metadata} />
            <CoverageChart records={views} />
          </aside>
        </section>
      </main>

      <DetailDrawer record={selectedRecord} metadata={dataset.metadata} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}

export default App;
