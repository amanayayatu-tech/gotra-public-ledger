export type ResearchLedgerGate = {
  gate?: string;
  status?: string;
  reader_safe_reason?: string;
};

export type ResearchLedgerEntry = {
  schema: "gotra.ledger_entry.v1";
  entry_id: string;
  base_entry_id: string;
  version: number;
  previous_version_hash?: string;
  signal_id: string;
  published_at: string;
  as_of_date: string;
  window_days: number;
  review_due_at: string;
  status: "publish" | "needs_review" | "blocked";
  symbol: string;
  exchange: string;
  provider_ticker?: string;
  research_status?: string;
  methodology_version?: string;
  execution_model?: string;
  research_signal_hash: string;
  publication_decision_hash: string;
  evidence_packet_hash: string;
  evidence_packet_link?: string;
  publication_decision?: {
    decision?: string;
    reader_safe_reasons?: string[];
    publish_with_boundary?: boolean;
    gates?: Record<string, ResearchLedgerGate>;
  };
  research_signal?: {
    hypothesis?: string;
    confidence?: string;
    evidence_ids?: string[];
    counter_evidence?: string[];
    uncertainty?: string[];
    boundary?: string;
  };
  boundary?: string;
  previous_hash: string;
  hash: string;
};

export type ResearchLedgerManifest = {
  schema: "gotra.public_research_ledger.v1";
  generated_at: string;
  entry_count: number;
  appended_count?: number;
  integrity: {
    ok: boolean;
    entry_count?: number;
    latest_hash?: string;
    reason?: string;
  };
  query_fields?: string[];
  boundary?: string;
  entries: ResearchLedgerEntry[];
};

export type ResearchLedgerLoadState =
  | { kind: "loading" }
  | { kind: "ready"; manifest: ResearchLedgerManifest }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

function reportsAssetPath(fileName: string): string {
  const normalized = fileName.replace(/^\/+/, "").replace(/^reports\//, "");
  return `${import.meta.env.BASE_URL}reports/${normalized}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntry(value: unknown): ResearchLedgerEntry | null {
  if (!isObject(value) || value.schema !== "gotra.ledger_entry.v1") {
    return null;
  }
  const entry = value as Record<string, unknown>;
  const requiredStringFields = [
    "entry_id",
    "base_entry_id",
    "signal_id",
    "published_at",
    "as_of_date",
    "review_due_at",
    "status",
    "symbol",
    "exchange",
    "research_signal_hash",
    "publication_decision_hash",
    "evidence_packet_hash",
    "previous_hash",
    "hash",
  ];
  if (requiredStringFields.some((field) => typeof entry[field] !== "string")) {
    return null;
  }
  if (typeof entry.version !== "number" || typeof entry.window_days !== "number") {
    return null;
  }
  return value as ResearchLedgerEntry;
}

export function normalizeResearchLedgerManifest(value: unknown): ResearchLedgerManifest {
  if (!isObject(value) || value.schema !== "gotra.public_research_ledger.v1") {
    throw new Error("research_ledger_schema_unavailable");
  }
  const entries = Array.isArray(value.entries) ? value.entries.map(normalizeEntry).filter((entry): entry is ResearchLedgerEntry => entry !== null) : [];
  return {
    schema: "gotra.public_research_ledger.v1",
    generated_at: typeof value.generated_at === "string" ? value.generated_at : "",
    entry_count: typeof value.entry_count === "number" ? value.entry_count : entries.length,
    appended_count: typeof value.appended_count === "number" ? value.appended_count : 0,
    integrity: isObject(value.integrity)
      ? {
          ok: value.integrity.ok === true,
          entry_count: typeof value.integrity.entry_count === "number" ? value.integrity.entry_count : entries.length,
          latest_hash: typeof value.integrity.latest_hash === "string" ? value.integrity.latest_hash : "",
          reason: typeof value.integrity.reason === "string" ? value.integrity.reason : "",
        }
      : { ok: false, entry_count: entries.length, reason: "integrity_missing" },
    query_fields: Array.isArray(value.query_fields) ? value.query_fields.filter((field): field is string => typeof field === "string") : [],
    boundary: typeof value.boundary === "string" ? value.boundary : "",
    entries,
  };
}

export async function loadResearchLedgerManifest(): Promise<ResearchLedgerManifest> {
  const response = await fetch(reportsAssetPath("research_ledger.json"), { cache: "no-store" });
  if (response.status === 404) {
    throw new Error("research_ledger_unavailable");
  }
  if (!response.ok) {
    throw new Error(`research_ledger_http_${response.status}`);
  }
  return normalizeResearchLedgerManifest(await response.json());
}

export function researchLedgerSymbols(entries: ResearchLedgerEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => `${entry.exchange}:${entry.symbol}`))).sort();
}

export function researchLedgerWindows(entries: ResearchLedgerEntry[]): number[] {
  return Array.from(new Set(entries.map((entry) => entry.window_days))).sort((a, b) => a - b);
}

export function researchLedgerStatuses(entries: ResearchLedgerEntry[]): string[] {
  return Array.from(new Set(entries.map((entry) => entry.status))).sort();
}
