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

export type ResearchReviewResult = {
  schema: "gotra.review_result.v1";
  entry_id: string;
  base_entry_id?: string;
  symbol?: string;
  exchange?: string;
  window_days: number;
  review_due_at?: string;
  reviewed_at: string;
  raw_return: number;
  benchmark_return: number;
  attribution: {
    classification?: string;
    relative_return_pp?: number;
    quality_flags?: string[];
    explanation?: string;
  };
  price_source_id?: string;
  benchmark_source_id?: string;
  currency?: string;
  boundary?: string;
  review_result_hash?: string;
};

export type ResearchReviewUnavailableReason = {
  schema: "gotra.review_unavailable_reason.v1";
  entry_id: string;
  base_entry_id?: string;
  symbol?: string;
  exchange?: string;
  window_days: number;
  review_due_at?: string;
  reviewed_at: string;
  review_unavailable_reason: string;
  missing_fields?: string[];
  boundary?: string;
  review_unavailable_hash?: string;
};

export type ResearchReviewCoverageWindow = {
  window_days: number;
  total_count: number;
  reviewed_count: number;
  unavailable_count: number;
  not_due_count: number;
};

export type ResearchReviewCoverage = {
  supported_windows_days: number[];
  total_count: number;
  due_count: number;
  reviewed_count: number;
  not_due_count: number;
  unavailable_count: number;
  missing_due_entry_ids: string[];
  by_window_days: ResearchReviewCoverageWindow[];
  boundary?: string;
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
  review_results: ResearchReviewResult[];
  review_unavailable: ResearchReviewUnavailableReason[];
  review_coverage: ResearchReviewCoverage;
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

function normalizeReviewResult(value: unknown): ResearchReviewResult | null {
  if (!isObject(value) || value.schema !== "gotra.review_result.v1") {
    return null;
  }
  if (
    typeof value.entry_id !== "string" ||
    typeof value.reviewed_at !== "string" ||
    typeof value.window_days !== "number" ||
    typeof value.raw_return !== "number" ||
    typeof value.benchmark_return !== "number" ||
    !isObject(value.attribution)
  ) {
    return null;
  }
  const attribution = value.attribution;
  return {
    ...(value as unknown as ResearchReviewResult),
    attribution: {
      classification: typeof attribution.classification === "string" ? attribution.classification : "",
      relative_return_pp: typeof attribution.relative_return_pp === "number" ? attribution.relative_return_pp : undefined,
      quality_flags: Array.isArray(attribution.quality_flags)
        ? attribution.quality_flags.filter((flag): flag is string => typeof flag === "string")
        : [],
      explanation: typeof attribution.explanation === "string" ? attribution.explanation : "",
    },
  };
}

function normalizeReviewUnavailable(value: unknown): ResearchReviewUnavailableReason | null {
  if (!isObject(value) || value.schema !== "gotra.review_unavailable_reason.v1") {
    return null;
  }
  if (
    typeof value.entry_id !== "string" ||
    typeof value.reviewed_at !== "string" ||
    typeof value.window_days !== "number" ||
    typeof value.review_unavailable_reason !== "string"
  ) {
    return null;
  }
  return {
    ...(value as unknown as ResearchReviewUnavailableReason),
    missing_fields: Array.isArray(value.missing_fields) ? value.missing_fields.filter((field): field is string => typeof field === "string") : [],
  };
}

function normalizeReviewCoverage(value: unknown, entries: ResearchLedgerEntry[], reviewedCount: number, unavailableCount: number): ResearchReviewCoverage {
  if (!isObject(value)) {
    return {
      supported_windows_days: [1, 7, 30, 90],
      total_count: entries.length,
      due_count: reviewedCount + unavailableCount,
      reviewed_count: reviewedCount,
      not_due_count: Math.max(0, entries.length - reviewedCount - unavailableCount),
      unavailable_count: unavailableCount,
      missing_due_entry_ids: [],
      by_window_days: [],
      boundary: "review coverage unavailable in legacy manifest; not performance proof",
    };
  }
  return {
    supported_windows_days: Array.isArray(value.supported_windows_days)
      ? value.supported_windows_days.filter((item): item is number => typeof item === "number")
      : [1, 7, 30, 90],
    total_count: typeof value.total_count === "number" ? value.total_count : entries.length,
    due_count: typeof value.due_count === "number" ? value.due_count : reviewedCount + unavailableCount,
    reviewed_count: typeof value.reviewed_count === "number" ? value.reviewed_count : reviewedCount,
    not_due_count: typeof value.not_due_count === "number" ? value.not_due_count : Math.max(0, entries.length - reviewedCount - unavailableCount),
    unavailable_count: typeof value.unavailable_count === "number" ? value.unavailable_count : unavailableCount,
    missing_due_entry_ids: Array.isArray(value.missing_due_entry_ids)
      ? value.missing_due_entry_ids.filter((item): item is string => typeof item === "string")
      : [],
    by_window_days: Array.isArray(value.by_window_days)
      ? value.by_window_days
          .filter(isObject)
          .map((row) => ({
            window_days: typeof row.window_days === "number" ? row.window_days : 0,
            total_count: typeof row.total_count === "number" ? row.total_count : 0,
            reviewed_count: typeof row.reviewed_count === "number" ? row.reviewed_count : 0,
            unavailable_count: typeof row.unavailable_count === "number" ? row.unavailable_count : 0,
            not_due_count: typeof row.not_due_count === "number" ? row.not_due_count : 0,
          }))
      : [],
    boundary: typeof value.boundary === "string" ? value.boundary : "",
  };
}

export function normalizeResearchLedgerManifest(value: unknown): ResearchLedgerManifest {
  if (!isObject(value) || value.schema !== "gotra.public_research_ledger.v1") {
    throw new Error("research_ledger_schema_unavailable");
  }
  const entries = Array.isArray(value.entries) ? value.entries.map(normalizeEntry).filter((entry): entry is ResearchLedgerEntry => entry !== null) : [];
  const reviewResults = Array.isArray(value.review_results)
    ? value.review_results.map(normalizeReviewResult).filter((result): result is ResearchReviewResult => result !== null)
    : [];
  const reviewUnavailable = Array.isArray(value.review_unavailable)
    ? value.review_unavailable
        .map(normalizeReviewUnavailable)
        .filter((reason): reason is ResearchReviewUnavailableReason => reason !== null)
    : [];
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
    review_results: reviewResults,
    review_unavailable: reviewUnavailable,
    review_coverage: normalizeReviewCoverage(value.review_coverage, entries, reviewResults.length, reviewUnavailable.length),
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

export function researchLedgerReviewResult(manifest: ResearchLedgerManifest, entryId: string): ResearchReviewResult | null {
  return manifest.review_results.find((result) => result.entry_id === entryId) ?? null;
}

export function researchLedgerReviewUnavailable(manifest: ResearchLedgerManifest, entryId: string): ResearchReviewUnavailableReason | null {
  return manifest.review_unavailable.find((reason) => reason.entry_id === entryId) ?? null;
}

export function researchLedgerReviewStatus(manifest: ResearchLedgerManifest, entryId: string): "reviewed" | "review_unavailable" | "not_due" {
  if (researchLedgerReviewResult(manifest, entryId)) {
    return "reviewed";
  }
  if (researchLedgerReviewUnavailable(manifest, entryId)) {
    return "review_unavailable";
  }
  return "not_due";
}
