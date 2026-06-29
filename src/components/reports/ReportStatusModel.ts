export type ReportTone = "good" | "warning" | "critical" | "neutral";

export type ExceptionSeverity = "allowed_gap" | "unexpected_failure";

export type ReportRawStatus = Record<string, unknown>;

export type ReportExchangeRow = {
  exchange: string;
  tradingDate: string | null;
  universe: number;
  success: number;
  failed: number;
  coveragePct: number | null;
};

export type ReportExceptionRow = {
  exchange: string;
  symbol: string;
  providerTicker: string;
  reason: string;
  severity: ExceptionSeverity;
  treatment: string;
  action: string;
};

export type ReportScheduleKey = "morning-hk" | "evening-hk" | "morning-us" | "evening-us" | "morning-global";

export type ReportNextExpectedRun = {
  mode: ReportScheduleKey | "unknown";
  label: string;
  date: Date;
  timeZone: "Asia/Shanghai";
};

export type NormalizedReportStatus = {
  ok: boolean;
  runStatus: string;
  mode: string;
  asOfDate: string | null;
  tradingDate: string | null;
  exchangeTradingDates: Record<string, string>;
  universeCount: number;
  successCount: number;
  failedCount: number;
  allowedMissingSymbols: string[];
  allowedMissingCount: number;
  unexpectedFailedCount: number;
  artifactWriteStatus: string | null;
  artifactWriteFailureReason: string | null;
  exitStatus: number | null;
  byExchange: ReportExchangeRow[];
  failedSymbols: ReportExceptionRow[];
  generatedAtUtc: string | null;
  source: string | null;
  boundary: string[];
  reportFile: string | null;
  latestFile: string;
  statusFile: string;
  coveragePct: number | null;
  statusTone: ReportTone;
  statusLabel: "Artifact write failed" | "Completed" | "Data gap, artifact published" | "Partial, needs review" | "Stale" | "Artifact unavailable";
  statusExplanation: string;
  headline: string;
  nextExpectedRun: ReportNextExpectedRun;
  isStale: boolean;
  primaryException: string | null;
};

export type ReportDeskArtifacts = {
  status: NormalizedReportStatus | null;
  statusError: string | null;
  markdown: string | null;
  markdownError: string | null;
};

export type ReportStatusFileResult = {
  mode: ReportScheduleKey;
  statusFile: string;
  latestFile: string;
  status: NormalizedReportStatus | null;
  error: string | null;
};

export type FullAnalystPilotIssue = {
  exchange: string;
  symbol: string;
  providerTicker: string;
  reason: string;
  stage: "failed" | "blocked" | "needs_review";
};

export type FullAnalystPilotStatus = {
  ok: boolean;
  runStatus: string;
  mode: string;
  runId: string;
  asOfDate: string | null;
  tradingDate: string | null;
  sampleSymbols: string[];
  universeCount: number;
  successCount: number;
  failedCount: number;
  publishCount: number;
  needsReviewCount: number;
  blockedCount: number;
  dataGapCount: number;
  alayaSyncedCount: number;
  alayaFailedCount: number;
  artifactWriteStatus: string | null;
  evidenceLayer: string | null;
  llmRunner: string | null;
  alayaMode: string | null;
  providerModelIoEmbedded: boolean;
  exitStatus: number | null;
  reportFile: string | null;
  statusFile: string;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  statusTone: ReportTone;
  statusLabel: "Completed" | "Review items" | "Blocked" | "Artifact write failed" | "Artifact unavailable";
  headline: string;
  issues: FullAnalystPilotIssue[];
};

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const DEFAULT_STALE_AFTER_HOURS = 36;

export const REPORT_SCHEDULES: Array<{
  key: ReportScheduleKey;
  label: string;
  shortLabel: string;
  statusFile: string;
  latestFile: string;
  weekdays: number[];
  hour: number;
  minute: number;
}> = [
  {
    key: "morning-hk",
    label: "HK Morning",
    shortLabel: "HK AM",
    statusFile: "status_morning_hk.json",
    latestFile: "latest_morning_hk.md",
    weekdays: [1, 2, 3, 4, 5],
    hour: 9,
    minute: 0,
  },
  {
    key: "evening-hk",
    label: "HK Evening",
    shortLabel: "HK PM",
    statusFile: "status_evening_hk.json",
    latestFile: "latest_evening_hk.md",
    weekdays: [1, 2, 3, 4, 5],
    hour: 18,
    minute: 30,
  },
  {
    key: "morning-us",
    label: "US Morning",
    shortLabel: "US AM",
    statusFile: "status_morning_us.json",
    latestFile: "latest_morning_us.md",
    weekdays: [1, 2, 3, 4, 5],
    hour: 21,
    minute: 0,
  },
  {
    key: "evening-us",
    label: "US Evening",
    shortLabel: "US PM",
    statusFile: "status_evening_us.json",
    latestFile: "latest_evening_us.md",
    weekdays: [2, 3, 4, 5, 6],
    hour: 6,
    minute: 30,
  },
  {
    key: "morning-global",
    label: "Morning Global",
    shortLabel: "Global",
    statusFile: "status_morning_global.json",
    latestFile: "latest_morning_global.md",
    weekdays: [2, 3, 4, 5, 6],
    hour: 10,
    minute: 30,
  },
];

const DEFAULT_BOUNDARY = [
  "research information only",
  "not investment advice",
  "not trading signal",
  "not performance proof",
  "not science/public proof",
  "runtime/status evidence only",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringValue(value: unknown, fallback = ""): string {
  return optionalString(value) ?? fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function coveragePct(success: number, universe: number): number | null {
  return universe > 0 ? (success / universe) * 100 : null;
}

function plural(count: number, singular: string, pluralText = `${singular}s`): string {
  return count === 1 ? singular : pluralText;
}

function shanghaiDateParts(value: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
  };
}

function shanghaiScheduledDate(
  parts: { year: number; month: number; day: number },
  offsetDays: number,
  schedule: (typeof REPORT_SCHEDULES)[number],
): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays, schedule.hour - 8, schedule.minute));
}

function shanghaiCalendarWeekday(parts: { year: number; month: number; day: number }, offsetDays: number): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays)).getUTCDay();
}

function nextExpectedRun(mode: string, now: Date): ReportNextExpectedRun {
  const requested = REPORT_SCHEDULES.find((schedule) => schedule.key === mode);
  const schedules = requested ? [requested] : REPORT_SCHEDULES;
  const parts = shanghaiDateParts(now);
  let next: { date: Date; schedule: (typeof REPORT_SCHEDULES)[number] } | null = null;

  for (let offsetDays = 0; offsetDays < 14; offsetDays += 1) {
    const shanghaiWeekday = shanghaiCalendarWeekday(parts, offsetDays);
    for (const schedule of schedules) {
      const candidate = shanghaiScheduledDate(parts, offsetDays, schedule);
      if (!schedule.weekdays.includes(shanghaiWeekday) || candidate.getTime() <= now.getTime()) {
        continue;
      }
      if (!next || candidate.getTime() < next.date.getTime()) {
        next = { date: candidate, schedule };
      }
    }
  }

  const fallbackSchedule = requested ?? REPORT_SCHEDULES[0];
  const fallbackDate = shanghaiScheduledDate(parts, 1, fallbackSchedule);
  return {
    mode: requested?.key ?? "unknown",
    label: requested?.label ?? "Next report",
    date: next?.date ?? fallbackDate,
    timeZone: SHANGHAI_TIME_ZONE,
  };
}

function normalizeAllowedKey(value: string): string {
  return value.trim().toUpperCase();
}

function parseAllowedSymbols(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (isRecord(item)) {
        const exchange = optionalString(item.exchange);
        const symbol = optionalString(item.symbol);
        const providerTicker = optionalString(item.provider_ticker) ?? optionalString(item.providerTicker);
        if (exchange && symbol) {
          return `${exchange}:${symbol}`;
        }
        return providerTicker ?? symbol ?? "";
      }
      return "";
    })
    .filter(Boolean);
}

function exchangeFromAllowedSymbol(value: string): { exchange: string; symbol: string } {
  const [exchange, ...rest] = value.split(":");
  if (rest.length > 0) {
    return { exchange: exchange.trim() || "UNKNOWN", symbol: rest.join(":").trim() || value };
  }
  if (/\.HK$/i.test(value)) {
    return { exchange: "HKEX", symbol: value.replace(/\.HK$/i, "") };
  }
  return { exchange: "UNKNOWN", symbol: value };
}

function rowAllowedKeys(row: { exchange: string; symbol: string; providerTicker: string }): string[] {
  return [
    `${row.exchange}:${row.symbol}`,
    row.symbol,
    row.providerTicker,
    `${row.exchange}:${row.providerTicker}`,
  ]
    .filter(Boolean)
    .map(normalizeAllowedKey);
}

function normalizeFailedSymbols(
  raw: ReportRawStatus,
  allowedMissingSymbols: string[],
  allowedMissingCount: number,
  unexpectedFailedCount: number,
): ReportExceptionRow[] {
  const rawRows = Array.isArray(raw.failed_symbols)
    ? raw.failed_symbols
    : Array.isArray(raw.missing_symbols)
      ? raw.missing_symbols
      : [];
  const allowedKeys = new Set(allowedMissingSymbols.map(normalizeAllowedKey));

  const rows = rawRows
    .map((item): ReportExceptionRow | null => {
      if (typeof item === "string") {
        const parsed = exchangeFromAllowedSymbol(item);
        const base = {
          exchange: parsed.exchange,
          symbol: parsed.symbol,
          providerTicker: parsed.symbol,
          reason: "reported missing symbol",
        };
        const severity = allowedKeys.has(normalizeAllowedKey(item)) ? "allowed_gap" : "unexpected_failure";
        return {
          ...base,
          severity,
          treatment: severity === "allowed_gap" ? "allowlisted provider gap" : "unexpected failure",
          action: severity === "allowed_gap" ? "monitor provider coverage" : "review runtime status",
        };
      }
      if (!isRecord(item)) {
        return null;
      }
      const exchange = stringValue(item.exchange, "UNKNOWN");
      const symbol = stringValue(item.symbol, "UNKNOWN");
      const providerTicker = stringValue(item.provider_ticker ?? item.providerTicker, symbol);
      const reason = stringValue(item.reason, "not specified");
      const explicitSeverity = stringValue(item.severity ?? item.status).toLowerCase();
      const isAllowed =
        explicitSeverity.includes("allow") ||
        rowAllowedKeys({ exchange, symbol, providerTicker }).some((key) => allowedKeys.has(key)) ||
        (allowedMissingCount > 0 && unexpectedFailedCount === 0);
      const severity: ExceptionSeverity = isAllowed ? "allowed_gap" : "unexpected_failure";
      return {
        exchange,
        symbol,
        providerTicker,
        reason,
        severity,
        treatment: severity === "allowed_gap" ? "allowlisted provider gap" : "unexpected failure",
        action: severity === "allowed_gap" ? "monitor provider coverage" : "review runtime status",
      };
    })
    .filter((row): row is ReportExceptionRow => row !== null);

  if (rows.length > 0) {
    return rows;
  }

  return allowedMissingSymbols.map((value) => {
    const parsed = exchangeFromAllowedSymbol(value);
    return {
      exchange: parsed.exchange,
      symbol: parsed.symbol,
      providerTicker: parsed.symbol,
      reason: "allowlisted provider coverage gap",
      severity: "allowed_gap",
      treatment: "allowlisted provider gap",
      action: "monitor provider coverage",
    };
  });
}

function normalizeExchangeRows(
  raw: ReportRawStatus,
  exchangeTradingDates: Record<string, string>,
  universeCount: number,
  successCount: number,
  failedCount: number,
): ReportExchangeRow[] {
  const byExchange = isRecord(raw.by_exchange) ? raw.by_exchange : {};
  const rows = Object.entries(byExchange).map(([exchange, value]) => {
    const record = isRecord(value) ? value : {};
    const universe = numberValue(record.universe ?? record.universe_count, 0);
    const success = numberValue(record.success ?? record.success_count, 0);
    const failed = numberValue(record.failed ?? record.failed_count, Math.max(universe - success, 0));
    return {
      exchange,
      tradingDate: optionalString(record.trading_date) ?? exchangeTradingDates[exchange] ?? null,
      universe,
      success,
      failed,
      coveragePct: coveragePct(success, universe),
    };
  });

  if (rows.length > 0) {
    return rows.sort((left, right) => left.exchange.localeCompare(right.exchange, "en"));
  }

  const exchangesFromDates = Object.entries(exchangeTradingDates).map(([exchange, tradingDate]) => ({
    exchange,
    tradingDate,
    universe: 0,
    success: 0,
    failed: 0,
    coveragePct: null,
  }));

  if (exchangesFromDates.length > 0) {
    return exchangesFromDates.sort((left, right) => left.exchange.localeCompare(right.exchange, "en"));
  }

  if (universeCount > 0 || successCount > 0 || failedCount > 0) {
    return [
      {
        exchange: "ALL",
        tradingDate: optionalString(raw.trading_date),
        universe: universeCount,
        success: successCount,
        failed: failedCount,
        coveragePct: coveragePct(successCount, universeCount),
      },
    ];
  }

  return [];
}

function normalizeExchangeTradingDates(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .map(([exchange, date]) => [exchange, optionalString(date)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function normalizeFullAnalystIssues(raw: ReportRawStatus): FullAnalystPilotIssue[] {
  const sources: Array<{ stage: FullAnalystPilotIssue["stage"]; rows: unknown }> = [
    { stage: "failed", rows: raw.failed_symbols },
    { stage: "blocked", rows: raw.blocked_symbols },
    { stage: "needs_review", rows: raw.needs_review_symbols },
  ];
  const issues: FullAnalystPilotIssue[] = [];

  for (const source of sources) {
    if (!Array.isArray(source.rows)) {
      continue;
    }
    for (const item of source.rows) {
      if (typeof item === "string") {
        const parsed = exchangeFromAllowedSymbol(item);
        issues.push({
          exchange: parsed.exchange,
          symbol: parsed.symbol,
          providerTicker: parsed.symbol,
          reason: "reported by full analyst status",
          stage: source.stage,
        });
        continue;
      }
      if (!isRecord(item)) {
        continue;
      }
      const exchange = stringValue(item.exchange, "UNKNOWN");
      const symbol = stringValue(item.symbol, "UNKNOWN");
      issues.push({
        exchange,
        symbol,
        providerTicker: stringValue(item.provider_ticker ?? item.providerTicker, symbol),
        reason: stringValue(item.reason, stringValue(item.judge_status, "not specified")),
        stage: source.stage,
      });
    }
  }

  return issues;
}

export function normalizeFullAnalystPilotStatus(raw: ReportRawStatus): FullAnalystPilotStatus {
  const failedCount = numberValue(raw.failed_count, 0);
  const blockedCount = numberValue(raw.blocked_count, 0);
  const needsReviewCount = numberValue(raw.needs_review_count, 0);
  const alayaFailedCount = numberValue(raw.alaya_failed_count, 0);
  const dataGapCount = numberValue(raw.data_gap_count, 0);
  const artifactWriteStatus = optionalString(raw.artifact_write_status);
  const artifactFailed = artifactWriteStatus !== null && artifactWriteStatus.toLowerCase() !== "ok";
  const isBlocked = artifactFailed || failedCount > 0 || blockedCount > 0 || alayaFailedCount > 0;
  const isReview = needsReviewCount > 0 || dataGapCount > 0;
  const statusTone: ReportTone = isBlocked ? "critical" : isReview ? "warning" : raw.ok === true ? "good" : "neutral";
  const statusLabel: FullAnalystPilotStatus["statusLabel"] = artifactFailed
    ? "Artifact write failed"
    : isBlocked
      ? "Blocked"
      : isReview
        ? "Review items"
        : raw.ok === true
          ? "Completed"
          : "Artifact unavailable";
  const universeCount = numberValue(raw.universe_count, 0);
  const publishCount = numberValue(raw.publish_count, 0);
  const alayaSyncedCount = numberValue(raw.alaya_synced_count, 0);

  return {
    ok: raw.ok === true,
    runStatus: stringValue(raw.run_status ?? raw.session_status, "unknown"),
    mode: stringValue(raw.mode, "unknown"),
    runId: stringValue(raw.run_id, "unknown"),
    asOfDate: optionalString(raw.as_of_date),
    tradingDate: optionalString(raw.trading_date),
    sampleSymbols: stringArray(raw.sample_symbols),
    universeCount,
    successCount: numberValue(raw.success_count, 0),
    failedCount,
    publishCount,
    needsReviewCount,
    blockedCount,
    dataGapCount,
    alayaSyncedCount,
    alayaFailedCount,
    artifactWriteStatus,
    evidenceLayer: optionalString(raw.evidence_layer),
    llmRunner: optionalString(raw.llm_runner),
    alayaMode: optionalString(raw.alaya_mode),
    providerModelIoEmbedded: raw.provider_model_io_embedded === true,
    exitStatus: nullableNumber(raw.exit_status),
    reportFile: optionalString(raw.report_file),
    statusFile: stringValue(raw.status_file, "status_full_analyst_evening_hk.json"),
    startedAtUtc: optionalString(raw.started_at_utc),
    finishedAtUtc: optionalString(raw.finished_at_utc),
    statusTone,
    statusLabel,
    headline:
      statusLabel === "Completed"
        ? `Full analyst pilot completed for ${publishCount}/${universeCount} sample symbols with ${alayaSyncedCount} Alaya sync events.`
        : statusLabel === "Review items"
          ? `Full analyst pilot published with ${needsReviewCount} review item${needsReviewCount === 1 ? "" : "s"} and ${dataGapCount} data gap${dataGapCount === 1 ? "" : "s"}.`
          : statusLabel === "Artifact write failed"
            ? "Full analyst pilot artifact write failed; review runtime ownership."
            : statusLabel === "Blocked"
              ? `Full analyst pilot blocked: ${blockedCount} blocked, ${failedCount} failed, ${alayaFailedCount} Alaya sync failures.`
              : "Full analyst pilot status artifact is unavailable.",
    issues: normalizeFullAnalystIssues(raw),
  };
}

function deriveCounts(raw: ReportRawStatus): {
  universeCount: number;
  successCount: number;
  failedCount: number;
} {
  const byExchange = isRecord(raw.by_exchange) ? raw.by_exchange : {};
  const exchangeTotals: { universe: number; success: number; failed: number } = {
    universe: 0,
    success: 0,
    failed: 0,
  };
  for (const value of Object.values(byExchange)) {
    if (!isRecord(value)) {
      continue;
    }
    exchangeTotals.universe += numberValue(value.universe ?? value.universe_count, 0);
    exchangeTotals.success += numberValue(value.success ?? value.success_count, 0);
    exchangeTotals.failed += numberValue(value.failed ?? value.failed_count, 0);
  }
  const rawFailedRows = Array.isArray(raw.failed_symbols)
    ? raw.failed_symbols.length
    : Array.isArray(raw.missing_symbols)
      ? raw.missing_symbols.length
      : 0;
  const universeCount = numberValue(raw.universe_count, exchangeTotals.universe);
  const successCount = numberValue(raw.success_count, exchangeTotals.success);
  const failedFallback = exchangeTotals.failed || Math.max(universeCount - successCount, 0) || rawFailedRows;

  return {
    universeCount,
    successCount,
    failedCount: numberValue(raw.failed_count, failedFallback),
  };
}

function isStatusStale(generatedAtUtc: string | null, now: Date, staleAfterHours: number): boolean {
  if (!generatedAtUtc) {
    return false;
  }
  const generated = new Date(generatedAtUtc);
  if (Number.isNaN(generated.getTime())) {
    return false;
  }
  return now.getTime() - generated.getTime() > staleAfterHours * 60 * 60 * 1000;
}

function deriveStatusPresentation(params: {
  ok: boolean;
  failedCount: number;
  unexpectedFailedCount: number;
  artifactWriteStatus: string | null;
  artifactWriteFailureReason: string | null;
  isStale: boolean;
  universeCount: number;
  failedSymbols: ReportExceptionRow[];
}): Pick<NormalizedReportStatus, "statusTone" | "statusLabel" | "statusExplanation" | "headline" | "primaryException"> {
  const artifactStatus = params.artifactWriteStatus?.toLowerCase() ?? null;
  const artifactFailed = artifactStatus !== null && artifactStatus !== "ok";
  const firstUnexpected = params.failedSymbols.find((row) => row.severity === "unexpected_failure");
  const firstAllowed = params.failedSymbols.find((row) => row.severity === "allowed_gap");

  if (artifactFailed) {
    return {
      statusTone: "critical",
      statusLabel: "Artifact write failed",
      statusExplanation: "Artifact write failed. Review runtime ownership before relying on the report artifact.",
      headline: "Artifact write failed; public report artifact may be unavailable.",
      primaryException: params.artifactWriteFailureReason ?? params.artifactWriteStatus ?? "artifact write failure",
    };
  }

  if (params.unexpectedFailedCount > 0) {
    return {
      statusTone: "critical",
      statusLabel: "Partial, needs review",
      statusExplanation: "Partial report needs review. Unexpected symbol failures were recorded.",
      headline: `Partial report needs review: ${params.unexpectedFailedCount} unexpected ${plural(params.unexpectedFailedCount, "symbol failure")}.`,
      primaryException: firstUnexpected ? `${firstUnexpected.exchange}:${firstUnexpected.symbol} ${firstUnexpected.reason}` : `${params.unexpectedFailedCount} unexpected failures`,
    };
  }

  if (params.failedCount > 0) {
    return {
      statusTone: "warning",
      statusLabel: "Data gap, artifact published",
      statusExplanation: "Report published with known provider coverage gaps. Failed symbols remain visible for review.",
      headline: `Report published with ${params.failedCount} known provider coverage ${plural(params.failedCount, "gap")}.`,
      primaryException: firstAllowed ? `${firstAllowed.exchange}:${firstAllowed.symbol} ${firstAllowed.reason}` : `${params.failedCount} reported data gaps`,
    };
  }

  if (params.isStale) {
    return {
      statusTone: "warning",
      statusLabel: "Stale",
      statusExplanation: "Report is older than the expected freshness window. Treat it as stale runtime evidence.",
      headline: "Report may be stale: generated time is older than the freshness window.",
      primaryException: "generated timestamp exceeds freshness window",
    };
  }

  if (params.failedCount === 0 && params.ok === true) {
    return {
      statusTone: "good",
      statusLabel: "Completed",
      statusExplanation: "Full coverage completed. Public artifacts are available.",
      headline: `Full coverage completed for ${params.universeCount} public-universe ${plural(params.universeCount, "symbol")}.`,
      primaryException: null,
    };
  }

  return {
    statusTone: "critical",
    statusLabel: "Partial, needs review",
    statusExplanation: "Status is available but not marked ok. Review counts and public artifacts before relying on this page.",
    headline: "Report status is not marked ok and needs review.",
    primaryException: "status ok=false",
  };
}

export function normalizeReportStatus(
  raw: ReportRawStatus,
  options: { now?: Date; staleAfterHours?: number } = {},
): NormalizedReportStatus {
  const now = options.now ?? new Date();
  const staleAfterHours = options.staleAfterHours ?? DEFAULT_STALE_AFTER_HOURS;
  const exchangeTradingDates = normalizeExchangeTradingDates(raw.exchange_trading_dates);
  const { universeCount, successCount, failedCount } = deriveCounts(raw);
  const allowedMissingSymbols = parseAllowedSymbols(raw.allowed_missing_symbols);
  const allowedMissingCount = numberValue(raw.allowed_missing_count, allowedMissingSymbols.length);
  const explicitUnexpectedCount = nullableNumber(raw.unexpected_failed_count);
  const unexpectedFailedCount =
    explicitUnexpectedCount ??
    (allowedMissingSymbols.length > 0 || raw.allowed_missing_count !== undefined
      ? Math.max(failedCount - allowedMissingCount, 0)
      : failedCount > 0
        ? failedCount
        : 0);
  const failedSymbols = normalizeFailedSymbols(raw, allowedMissingSymbols, allowedMissingCount, unexpectedFailedCount);
  const generatedAtUtc = optionalString(raw.generated_at_utc);
  const mode = stringValue(raw.mode, "unknown");
  const artifactWriteStatus = optionalString(raw.artifact_write_status);
  const artifactWriteFailureReason = optionalString(raw.artifact_write_failure_reason);
  const isStale = isStatusStale(generatedAtUtc, now, staleAfterHours);
  const presentation = deriveStatusPresentation({
    ok: raw.ok === true,
    failedCount,
    unexpectedFailedCount,
    artifactWriteStatus,
    artifactWriteFailureReason,
    isStale,
    universeCount,
    failedSymbols,
  });

  return {
    ok: raw.ok === true,
    runStatus: stringValue(raw.run_status ?? raw.session_status, "unknown"),
    mode,
    asOfDate: optionalString(raw.as_of_date),
    tradingDate: optionalString(raw.trading_date),
    exchangeTradingDates,
    universeCount,
    successCount,
    failedCount,
    allowedMissingSymbols,
    allowedMissingCount,
    unexpectedFailedCount,
    artifactWriteStatus,
    artifactWriteFailureReason,
    exitStatus: nullableNumber(raw.exit_status),
    byExchange: normalizeExchangeRows(raw, exchangeTradingDates, universeCount, successCount, failedCount),
    failedSymbols,
    generatedAtUtc,
    source: optionalString(raw.source),
    boundary: stringArray(raw.boundary).length > 0 ? stringArray(raw.boundary) : DEFAULT_BOUNDARY,
    reportFile: optionalString(raw.report_file),
    latestFile: stringValue(raw.latest_file, "latest.md"),
    statusFile: stringValue(raw.status_file, "status.json"),
    coveragePct: coveragePct(successCount, universeCount),
    nextExpectedRun: nextExpectedRun(mode, now),
    isStale,
    ...presentation,
  };
}

export function formatCoveragePct(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

export function formatShanghaiTimestamp(value: string | null, locale = "en-US"): string {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(date);
}

export function formatNextExpectedRun(run: ReportNextExpectedRun, locale = "en-US"): string {
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: run.timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(run.date);
  return `${run.label} · ${time}`;
}

export function createEvidenceSummary(status: NormalizedReportStatus): string {
  return [
    `mode=${status.mode}`,
    `trading_date=${status.tradingDate ?? "n/a"}`,
    `coverage=${status.successCount}/${status.universeCount}`,
    `failed_count=${status.failedCount}`,
    `allowed_missing_count=${status.allowedMissingCount}`,
    `unexpected_failed_count=${status.unexpectedFailedCount}`,
    `run_status=${status.runStatus}`,
    `artifact_write_status=${status.artifactWriteStatus ?? "n/a"}`,
    "evidence_layer=runtime/status evidence only",
  ].join("\n");
}

export function buildReportDeskArtifacts(
  statusResult: PromiseSettledResult<ReportRawStatus>,
  markdownResult: PromiseSettledResult<string>,
  options: { now?: Date; staleAfterHours?: number } = {},
): ReportDeskArtifacts {
  let status: NormalizedReportStatus | null = null;
  let statusError: string | null = null;

  if (statusResult.status === "fulfilled") {
    try {
      status = normalizeReportStatus(statusResult.value, options);
    } catch (reason) {
      statusError = reason instanceof Error ? reason.message : "Unknown status normalization error";
    }
  } else {
    statusError = statusResult.reason instanceof Error ? statusResult.reason.message : String(statusResult.reason);
  }

  return {
    status,
    statusError,
    markdown: markdownResult.status === "fulfilled" ? markdownResult.value : null,
    markdownError:
      markdownResult.status === "rejected"
        ? markdownResult.reason instanceof Error
          ? markdownResult.reason.message
          : String(markdownResult.reason)
        : null,
  };
}
