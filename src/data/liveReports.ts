import {
  REPORT_SCHEDULES,
  normalizeFullAnalystMonitorStatus,
  normalizeFullAnalystPilotStatus,
  normalizeReportStatus,
  type ReportExceptionRow,
  type FullAnalystMonitorStatus,
  type FullAnalystPilotStatus,
  type NormalizedReportStatus,
  type ReportRawStatus,
  type ReportScheduleKey,
} from "../components/reports/ReportStatusModel";

export type LiveReportKind = "daily" | "full-analyst";

export type LiveReportEntry = {
  id: string;
  kind: LiveReportKind;
  labelZh: string;
  labelEn: string;
  mode: string;
  asOfDate: string | null;
  tradingDate: string | null;
  generatedAtUtc: string | null;
  runStatus: string;
  ok: boolean;
  reportFile: string | null;
  latestFile: string | null;
  statusFile: string;
  reportHref: string | null;
  latestHref: string | null;
  statusHref: string;
  universeCount: number;
  successCount: number;
  failedCount: number;
  dataGapCount: number;
  allowedMissingCount: number;
  unexpectedFailedCount: number;
  exceptions: ReportExceptionRow[];
  artifactWriteStatus: string | null;
  monitorHealth: string | null;
  error: string | null;
};

export type LiveArtifactEntry = {
  label: string;
  href: string;
  status: string;
  asOfDate: string | null;
  tradingDate: string | null;
  generatedAtUtc: string | null;
};

export type LiveReportsSnapshot = {
  daily: LiveReportEntry[];
  fullAnalyst: LiveReportEntry | null;
  fullAnalystPilot: FullAnalystPilotStatus | null;
  fullAnalystMonitor: FullAnalystMonitorStatus | null;
  artifacts: LiveArtifactEntry[];
  lastFetchedAt: string;
};

const DAILY_LABELS: Record<ReportScheduleKey, { zh: string; en: string }> = {
  "morning-hk": { zh: "港股早报", en: "HK morning report" },
  "evening-hk": { zh: "港股晚报", en: "HK evening report" },
  "morning-us": { zh: "美股早报", en: "US morning report" },
  "evening-us": { zh: "美股晚报", en: "US evening report" },
  "morning-global": { zh: "全局汇总", en: "Global summary" },
};

function reportsAssetPath(fileName: string): string {
  if (/^https?:\/\//i.test(fileName)) {
    return fileName;
  }
  const normalized = fileName.replace(/^\/+/, "").replace(/^reports\//, "");
  return `${import.meta.env.BASE_URL}reports/${normalized}`;
}

function reportsHref(fileName: string | null): string | null {
  if (!fileName) {
    return null;
  }
  return `/reports/${fileName.replace(/^\/+/, "").replace(/^reports\//, "")}`;
}

async function fetchPublicJson(url: string): Promise<ReportRawStatus> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return (await response.json()) as ReportRawStatus;
}

function dailyEntryFromStatus(status: NormalizedReportStatus, schedule: (typeof REPORT_SCHEDULES)[number]): LiveReportEntry {
  const labels = DAILY_LABELS[schedule.key];
  return {
    id: schedule.key,
    kind: "daily",
    labelZh: labels.zh,
    labelEn: labels.en,
    mode: status.mode,
    asOfDate: status.asOfDate,
    tradingDate: status.tradingDate,
    generatedAtUtc: status.generatedAtUtc,
    runStatus: status.runStatus,
    ok: status.ok,
    reportFile: status.reportFile,
    latestFile: status.latestFile,
    statusFile: status.statusFile,
    reportHref: reportsHref(status.reportFile ?? status.latestFile),
    latestHref: reportsHref(status.latestFile),
    statusHref: reportsHref(status.statusFile) ?? `/reports/${schedule.statusFile}`,
    universeCount: status.universeCount,
    successCount: status.successCount,
    failedCount: status.failedCount,
    dataGapCount: status.allowedMissingCount + status.unexpectedFailedCount,
    allowedMissingCount: status.allowedMissingCount,
    unexpectedFailedCount: status.unexpectedFailedCount,
    exceptions: status.failedSymbols,
    artifactWriteStatus: status.artifactWriteStatus,
    monitorHealth: null,
    error: null,
  };
}

function failedDailyEntry(schedule: (typeof REPORT_SCHEDULES)[number], error: unknown): LiveReportEntry {
  const labels = DAILY_LABELS[schedule.key];
  return {
    id: schedule.key,
    kind: "daily",
    labelZh: labels.zh,
    labelEn: labels.en,
    mode: schedule.key,
    asOfDate: null,
    tradingDate: null,
    generatedAtUtc: null,
    runStatus: "unavailable",
    ok: false,
    reportFile: null,
    latestFile: schedule.latestFile,
    statusFile: schedule.statusFile,
    reportHref: null,
    latestHref: reportsHref(schedule.latestFile),
    statusHref: reportsHref(schedule.statusFile) ?? `/reports/${schedule.statusFile}`,
    universeCount: 0,
    successCount: 0,
    failedCount: 0,
    dataGapCount: 0,
    allowedMissingCount: 0,
    unexpectedFailedCount: 0,
    exceptions: [],
    artifactWriteStatus: null,
    monitorHealth: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

function fullAnalystEntry(
  pilot: FullAnalystPilotStatus | null,
  monitor: FullAnalystMonitorStatus | null,
  error: string | null,
): LiveReportEntry {
  return {
    id: "full-analyst-canary",
    kind: "full-analyst",
    labelZh: "Full Analyst 先行试跑",
    labelEn: "Full Analyst Canary",
    mode: pilot?.mode ?? "full_analyst_evening_hk",
    asOfDate: pilot?.asOfDate ?? null,
    tradingDate: pilot?.tradingDate ?? null,
    generatedAtUtc: pilot?.finishedAtUtc ?? pilot?.lastHeartbeatUtc ?? monitor?.generatedAt ?? null,
    runStatus: pilot?.runStatus ?? monitor?.latestRun.status ?? "unavailable",
    ok: pilot?.ok ?? monitor?.overallStatus === "healthy",
    reportFile: pilot?.latestPublicReportFile ?? null,
    latestFile: pilot?.latestPublicReportFile ?? null,
    statusFile: "status_full_analyst_evening_hk.json",
    reportHref: reportsHref(pilot?.latestPublicReportFile ?? monitor?.links.reportMarkdown ?? null),
    latestHref: reportsHref(pilot?.latestPublicReportFile ?? monitor?.links.reportMarkdown ?? null),
    statusHref: "/reports/status_full_analyst_evening_hk.json",
    universeCount: pilot?.symbolCount ?? pilot?.universeCount ?? 0,
    successCount: pilot?.publishCount ?? pilot?.successCount ?? 0,
    failedCount: pilot?.failedCount ?? 0,
    dataGapCount: pilot?.dataGapCount ?? 0,
    allowedMissingCount: 0,
    unexpectedFailedCount: pilot?.failedCount ?? 0,
    exceptions: [],
    artifactWriteStatus: pilot?.artifactWriteStatus ?? null,
    monitorHealth: monitor?.overallStatus ?? null,
    error,
  };
}

async function loadDailyEntry(schedule: (typeof REPORT_SCHEDULES)[number]): Promise<LiveReportEntry> {
  try {
    const raw = await fetchPublicJson(reportsAssetPath(schedule.statusFile));
    return dailyEntryFromStatus(normalizeReportStatus(raw), schedule);
  } catch (error) {
    return failedDailyEntry(schedule, error);
  }
}

function artifactsFromEntries(
  daily: LiveReportEntry[],
  fullAnalyst: LiveReportEntry | null,
  monitor: FullAnalystMonitorStatus | null,
): LiveArtifactEntry[] {
  const entries: LiveArtifactEntry[] = [
    {
      label: "latest.md",
      href: "/reports/latest.md",
      status: "ordinary daily latest",
      asOfDate: daily.find((entry) => entry.id === "morning-us")?.asOfDate ?? null,
      tradingDate: daily.find((entry) => entry.id === "morning-us")?.tradingDate ?? null,
      generatedAtUtc: daily.find((entry) => entry.id === "morning-us")?.generatedAtUtc ?? null,
    },
    {
      label: "status.json",
      href: "/reports/status.json",
      status: "ordinary daily alias",
      asOfDate: daily.find((entry) => entry.id === "morning-us")?.asOfDate ?? null,
      tradingDate: daily.find((entry) => entry.id === "morning-us")?.tradingDate ?? null,
      generatedAtUtc: daily.find((entry) => entry.id === "morning-us")?.generatedAtUtc ?? null,
    },
    ...daily.map((entry) => ({
      label: entry.statusFile,
      href: entry.statusHref,
      status: entry.runStatus,
      asOfDate: entry.asOfDate,
      tradingDate: entry.tradingDate,
      generatedAtUtc: entry.generatedAtUtc,
    })),
  ];

  if (monitor) {
    entries.push({
      label: "status_full_analyst_monitor.json",
      href: "/reports/status_full_analyst_monitor.json",
      status: monitor.overallStatus,
      asOfDate: fullAnalyst?.asOfDate ?? null,
      tradingDate: fullAnalyst?.tradingDate ?? null,
      generatedAtUtc: monitor.generatedAt,
    });
  }

  if (fullAnalyst) {
    entries.push(
      {
        label: "status_full_analyst_evening_hk.json",
        href: fullAnalyst.statusHref,
        status: fullAnalyst.runStatus,
        asOfDate: fullAnalyst.asOfDate,
        tradingDate: fullAnalyst.tradingDate,
        generatedAtUtc: fullAnalyst.generatedAtUtc,
      },
      {
        label: fullAnalyst.reportFile ?? "full_analyst_evening_hk_YYYY-MM-DD.md",
        href: fullAnalyst.reportHref ?? "/reports/full_analyst_evening_hk_YYYY-MM-DD.md",
        status: "full analyst canary markdown",
        asOfDate: fullAnalyst.asOfDate,
        tradingDate: fullAnalyst.tradingDate,
        generatedAtUtc: fullAnalyst.generatedAtUtc,
      },
    );
  }

  return entries;
}

export async function loadLiveReportsSnapshot(): Promise<LiveReportsSnapshot> {
  const daily = await Promise.all(REPORT_SCHEDULES.map(loadDailyEntry));
  const [pilotResult, monitorResult] = await Promise.allSettled([
    fetchPublicJson(reportsAssetPath("status_full_analyst_evening_hk.json")),
    fetchPublicJson(reportsAssetPath("status_full_analyst_monitor.json")),
  ]);
  const pilot =
    pilotResult.status === "fulfilled" ? normalizeFullAnalystPilotStatus(pilotResult.value) : null;
  const monitor =
    monitorResult.status === "fulfilled" ? normalizeFullAnalystMonitorStatus(monitorResult.value) : null;
  const fullAnalystError =
    pilotResult.status === "rejected"
      ? pilotResult.reason instanceof Error
        ? pilotResult.reason.message
        : String(pilotResult.reason)
      : null;
  const fullAnalyst = pilot || monitor ? fullAnalystEntry(pilot, monitor, fullAnalystError) : null;

  return {
    daily,
    fullAnalyst,
    fullAnalystPilot: pilot,
    fullAnalystMonitor: monitor,
    artifacts: artifactsFromEntries(daily, fullAnalyst, monitor),
    lastFetchedAt: new Date().toISOString(),
  };
}

export function fixtureIsFutureDated(asOfDate: string, now = new Date()): boolean {
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) {
    return false;
  }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return asOf.getTime() > today.getTime();
}
