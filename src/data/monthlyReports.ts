export type MonthlyReviewCoverageWindow = {
  window_days: number;
  total_count: number;
  reviewed_count: number;
  unavailable_count: number;
  not_due_count: number;
};

export type MonthlyReviewCoverage = {
  supported_windows_days: number[];
  total_count: number;
  due_count: number;
  reviewed_count: number;
  not_due_count: number;
  unavailable_count: number;
  missing_due_entry_ids: string[];
  by_window_days: MonthlyReviewCoverageWindow[];
  boundary?: string;
};

export type MonthlyTransparencyReportSummary = {
  month: string;
  file: string;
  published_count: number;
  needs_review_count: number;
  blocked_count: number;
  review_coverage: MonthlyReviewCoverage;
  error_case_count: number;
  data_gap_count: number;
  improvement_item_count: number;
  report_hash?: string;
};

export type MonthlyTransparencyReportIndex = {
  schema: "gotra.monthly_transparency_report_index.v1";
  generated_at: string;
  report_count: number;
  latest_month: string;
  reports: MonthlyTransparencyReportSummary[];
  boundary?: string;
};

export type MonthlyTransparencyErrorCase = {
  entry_id: string;
  symbol?: string;
  exchange?: string;
  window_days?: number;
  raw_return?: number;
  benchmark_return?: number;
  attribution?: string;
  reader_safe_summary?: string;
};

export type MonthlyTransparencyDataGap = {
  entry_id: string;
  symbol?: string;
  exchange?: string;
  window_days?: number;
  reason?: string;
  missing_fields?: string[];
  reader_safe_summary?: string;
};

export type MonthlyTransparencyReport = {
  schema: "gotra.monthly_transparency_report.v1";
  month: string;
  generated_at: string;
  source_ledger_schema?: string;
  source_ledger_generated_at?: string;
  published_count: number;
  needs_review_count: number;
  blocked_count: number;
  review_coverage: MonthlyReviewCoverage;
  error_cases: MonthlyTransparencyErrorCase[];
  error_case_note?: string;
  data_gaps: MonthlyTransparencyDataGap[];
  data_gap_note?: string;
  improvement_items: string[];
  reader_safe_summary?: string;
  boundary?: string;
  report_hash?: string;
};

export type MonthlyReportsLoadState =
  | { kind: "loading" }
  | { kind: "ready"; index: MonthlyTransparencyReportIndex }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

export type MonthlyReportDetailLoadState =
  | { kind: "loading" }
  | { kind: "ready"; report: MonthlyTransparencyReport }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

function reportsAssetPath(fileName: string): string {
  const normalized = fileName.replace(/^\/+/, "").replace(/^reports\//, "");
  return `${import.meta.env.BASE_URL}reports/${normalized}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCoverage(value: unknown): MonthlyReviewCoverage {
  if (!isObject(value)) {
    return {
      supported_windows_days: [1, 7, 30, 90],
      total_count: 0,
      due_count: 0,
      reviewed_count: 0,
      not_due_count: 0,
      unavailable_count: 0,
      missing_due_entry_ids: [],
      by_window_days: [],
      boundary: "review coverage unavailable",
    };
  }
  return {
    supported_windows_days: Array.isArray(value.supported_windows_days)
      ? value.supported_windows_days.filter((item): item is number => typeof item === "number")
      : [1, 7, 30, 90],
    total_count: typeof value.total_count === "number" ? value.total_count : 0,
    due_count: typeof value.due_count === "number" ? value.due_count : 0,
    reviewed_count: typeof value.reviewed_count === "number" ? value.reviewed_count : 0,
    not_due_count: typeof value.not_due_count === "number" ? value.not_due_count : 0,
    unavailable_count: typeof value.unavailable_count === "number" ? value.unavailable_count : 0,
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

function normalizeSummary(value: unknown): MonthlyTransparencyReportSummary | null {
  if (!isObject(value) || typeof value.month !== "string" || typeof value.file !== "string") {
    return null;
  }
  return {
    month: value.month,
    file: value.file,
    published_count: typeof value.published_count === "number" ? value.published_count : 0,
    needs_review_count: typeof value.needs_review_count === "number" ? value.needs_review_count : 0,
    blocked_count: typeof value.blocked_count === "number" ? value.blocked_count : 0,
    review_coverage: normalizeCoverage(value.review_coverage),
    error_case_count: typeof value.error_case_count === "number" ? value.error_case_count : 0,
    data_gap_count: typeof value.data_gap_count === "number" ? value.data_gap_count : 0,
    improvement_item_count: typeof value.improvement_item_count === "number" ? value.improvement_item_count : 0,
    report_hash: typeof value.report_hash === "string" ? value.report_hash : "",
  };
}

export function normalizeMonthlyTransparencyReportIndex(value: unknown): MonthlyTransparencyReportIndex {
  if (!isObject(value) || value.schema !== "gotra.monthly_transparency_report_index.v1") {
    throw new Error("monthly_report_index_schema_unavailable");
  }
  const reports = Array.isArray(value.reports) ? value.reports.map(normalizeSummary).filter((item): item is MonthlyTransparencyReportSummary => item !== null) : [];
  return {
    schema: "gotra.monthly_transparency_report_index.v1",
    generated_at: typeof value.generated_at === "string" ? value.generated_at : "",
    report_count: typeof value.report_count === "number" ? value.report_count : reports.length,
    latest_month: typeof value.latest_month === "string" ? value.latest_month : reports[reports.length - 1]?.month ?? "",
    reports,
    boundary: typeof value.boundary === "string" ? value.boundary : "",
  };
}

function normalizeErrorCase(value: unknown): MonthlyTransparencyErrorCase | null {
  if (!isObject(value) || typeof value.entry_id !== "string") {
    return null;
  }
  return {
    entry_id: value.entry_id,
    symbol: typeof value.symbol === "string" ? value.symbol : "",
    exchange: typeof value.exchange === "string" ? value.exchange : "",
    window_days: typeof value.window_days === "number" ? value.window_days : undefined,
    raw_return: typeof value.raw_return === "number" ? value.raw_return : undefined,
    benchmark_return: typeof value.benchmark_return === "number" ? value.benchmark_return : undefined,
    attribution: typeof value.attribution === "string" ? value.attribution : "",
    reader_safe_summary: typeof value.reader_safe_summary === "string" ? value.reader_safe_summary : "",
  };
}

function normalizeDataGap(value: unknown): MonthlyTransparencyDataGap | null {
  if (!isObject(value) || typeof value.entry_id !== "string") {
    return null;
  }
  return {
    entry_id: value.entry_id,
    symbol: typeof value.symbol === "string" ? value.symbol : "",
    exchange: typeof value.exchange === "string" ? value.exchange : "",
    window_days: typeof value.window_days === "number" ? value.window_days : undefined,
    reason: typeof value.reason === "string" ? value.reason : "",
    missing_fields: Array.isArray(value.missing_fields) ? value.missing_fields.filter((item): item is string => typeof item === "string") : [],
    reader_safe_summary: typeof value.reader_safe_summary === "string" ? value.reader_safe_summary : "",
  };
}

export function normalizeMonthlyTransparencyReport(value: unknown): MonthlyTransparencyReport {
  if (!isObject(value) || value.schema !== "gotra.monthly_transparency_report.v1" || typeof value.month !== "string") {
    throw new Error("monthly_report_schema_unavailable");
  }
  return {
    schema: "gotra.monthly_transparency_report.v1",
    month: value.month,
    generated_at: typeof value.generated_at === "string" ? value.generated_at : "",
    source_ledger_schema: typeof value.source_ledger_schema === "string" ? value.source_ledger_schema : "",
    source_ledger_generated_at: typeof value.source_ledger_generated_at === "string" ? value.source_ledger_generated_at : "",
    published_count: typeof value.published_count === "number" ? value.published_count : 0,
    needs_review_count: typeof value.needs_review_count === "number" ? value.needs_review_count : 0,
    blocked_count: typeof value.blocked_count === "number" ? value.blocked_count : 0,
    review_coverage: normalizeCoverage(value.review_coverage),
    error_cases: Array.isArray(value.error_cases) ? value.error_cases.map(normalizeErrorCase).filter((item): item is MonthlyTransparencyErrorCase => item !== null) : [],
    error_case_note: typeof value.error_case_note === "string" ? value.error_case_note : "",
    data_gaps: Array.isArray(value.data_gaps) ? value.data_gaps.map(normalizeDataGap).filter((item): item is MonthlyTransparencyDataGap => item !== null) : [],
    data_gap_note: typeof value.data_gap_note === "string" ? value.data_gap_note : "",
    improvement_items: Array.isArray(value.improvement_items) ? value.improvement_items.filter((item): item is string => typeof item === "string") : [],
    reader_safe_summary: typeof value.reader_safe_summary === "string" ? value.reader_safe_summary : "",
    boundary: typeof value.boundary === "string" ? value.boundary : "",
    report_hash: typeof value.report_hash === "string" ? value.report_hash : "",
  };
}

export async function loadMonthlyTransparencyReportIndex(): Promise<MonthlyTransparencyReportIndex> {
  const response = await fetch(reportsAssetPath("monthly_transparency_reports.json"), { cache: "no-store" });
  if (response.status === 404) {
    throw new Error("monthly_reports_unavailable");
  }
  if (!response.ok) {
    throw new Error(`monthly_reports_http_${response.status}`);
  }
  return normalizeMonthlyTransparencyReportIndex(await response.json());
}

export async function loadMonthlyTransparencyReport(fileName: string): Promise<MonthlyTransparencyReport> {
  const response = await fetch(reportsAssetPath(fileName), { cache: "no-store" });
  if (response.status === 404) {
    throw new Error("monthly_report_unavailable");
  }
  if (!response.ok) {
    throw new Error(`monthly_report_http_${response.status}`);
  }
  return normalizeMonthlyTransparencyReport(await response.json());
}

export function monthlyReportFileForMonth(month: string): string {
  return `monthly_transparency_report_${month}.json`;
}
