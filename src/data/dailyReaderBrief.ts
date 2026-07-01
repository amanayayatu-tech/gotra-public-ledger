import { loadLiveReportsSnapshot, type LiveReportEntry, type LiveReportsSnapshot } from "./liveReports";

export type DailyReaderBriefTopItem = {
  label: string;
  summary: string;
  why_it_matters: string;
};

export type DailyReaderBriefWatchItem = {
  symbol: string;
  reason: string;
  status: "data_gap" | "needs_review" | "unavailable";
  reader_takeaway: string;
};

export type DailyReaderBriefKnownGap = {
  symbol: string;
  reason: string;
  affected_report: string;
};

export type DailyReaderBrief = {
  schema: "gotra.daily_reader_brief.v1";
  brief_date: string;
  generated_at: string;
  title: string;
  subtitle: string;
  tldr: string;
  top_items: DailyReaderBriefTopItem[];
  watchlist: DailyReaderBriefWatchItem[];
  changes_since_last_brief: string[];
  known_gaps: DailyReaderBriefKnownGap[];
  research_effectiveness: {
    daily_update_status: "reports_updated" | "reports_updated_with_gaps" | "needs_review" | "unavailable";
    reports_updated_count: number;
    reports_with_data_gaps_count: number;
    canary_status: "healthy" | "degraded" | "unavailable";
    reader_summary: string;
  };
  system_health: {
    daily_reports: "ok" | "ok_with_data_gaps" | "needs_review" | "unavailable";
    full_analyst_canary: "healthy" | "degraded" | "unavailable";
  };
  next_watch: string[];
  boundary: string[];
  links: {
    latest_report: string;
    reports_page: string;
    status_json: string;
    full_analyst_monitor: string;
    daily_reader_brief: string;
  };
};

type BuildOptions = {
  now?: Date;
};

type BriefArtifactLoadState =
  | { kind: "artifact"; brief: DailyReaderBrief }
  | { kind: "fallback"; brief: DailyReaderBrief; reason: string };

const BOUNDARY_TEXT = [
  "研究信息，不是投资建议。",
  "不是交易信号。",
  "不是业绩证明。",
  "不是科学或公开证明。",
  "Full Analyst 仍是金丝雀，不是正式结论升级。",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function isDailyReaderBrief(value: unknown): value is DailyReaderBrief {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schema === "gotra.daily_reader_brief.v1" &&
    typeof value.brief_date === "string" &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.tldr === "string" &&
    Array.isArray(value.top_items) &&
    Array.isArray(value.watchlist) &&
    Array.isArray(value.changes_since_last_brief) &&
    Array.isArray(value.known_gaps) &&
    isRecord(value.research_effectiveness) &&
    isRecord(value.system_health) &&
    Array.isArray(value.next_watch) &&
    Array.isArray(value.boundary) &&
    isRecord(value.links)
  );
}

function reportsAssetPath(fileName: string): string {
  const normalized = fileName.replace(/^\/+/, "").replace(/^reports\//, "");
  return `${import.meta.env.BASE_URL}reports/${normalized}`;
}

async function fetchPublicJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

function formatShanghaiIso(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function fallbackDate(now: Date): string {
  return formatShanghaiIso(now).slice(0, 10);
}

function maxDate(values: Array<string | null>, now: Date): string {
  const dates = values.filter((value): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)));
  return dates.sort((left, right) => right.localeCompare(left, "en"))[0] ?? fallbackDate(now);
}

function zhBriefTitle(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日市场研究简报`;
}

function reportLabel(entry: LiveReportEntry): string {
  return entry.labelZh || entry.labelEn || entry.id;
}

function coverageSummary(entry: LiveReportEntry): string {
  if (entry.universeCount <= 0) {
    return `${reportLabel(entry)} 已生成公开状态，但覆盖统计暂不可用。`;
  }
  return `${reportLabel(entry)} ${entry.successCount}/${entry.universeCount} 完成。`;
}

function statusLooksUpdated(entry: LiveReportEntry): boolean {
  return entry.runStatus !== "unavailable" && Boolean(entry.asOfDate || entry.generatedAtUtc || entry.reportFile);
}

function statusNeedsReview(entry: LiveReportEntry): boolean {
  return /partial|failed|blocked|error/i.test(entry.runStatus) || entry.unexpectedFailedCount > 0 || Boolean(entry.error);
}

function hasDataGap(entry: LiveReportEntry): boolean {
  return entry.dataGapCount > 0 || /data_gap|allowed_data_gap/i.test(entry.runStatus);
}

function canaryStatus(snapshot: LiveReportsSnapshot): "healthy" | "degraded" | "unavailable" {
  const status = snapshot.fullAnalystMonitor?.overallStatus ?? snapshot.fullAnalyst?.monitorHealth ?? null;
  if (!status) {
    return "unavailable";
  }
  return status === "healthy" ? "healthy" : "degraded";
}

function canaryText(status: "healthy" | "degraded" | "unavailable"): string {
  if (status === "healthy") {
    return "健康";
  }
  if (status === "degraded") {
    return "需关注";
  }
  return "暂不可用";
}

function symbolName(symbol: string, exchange: string): string {
  if (symbol.includes(":")) {
    return symbol;
  }
  if (exchange && exchange !== "UNKNOWN") {
    return `${exchange}:${symbol}`;
  }
  return symbol;
}

function knownGapsFromEntries(entries: LiveReportEntry[]): DailyReaderBriefKnownGap[] {
  const seen = new Set<string>();
  const gaps: DailyReaderBriefKnownGap[] = [];

  for (const entry of entries) {
    for (const issue of entry.exceptions) {
      const symbol = symbolName(issue.symbol, issue.exchange);
      const key = `${reportLabel(entry)}:${symbol}:${issue.reason}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      gaps.push({
        symbol,
        reason: issue.reason,
        affected_report: reportLabel(entry),
      });
    }
  }

  return gaps;
}

function buildWatchlist(gaps: DailyReaderBriefKnownGap[]): DailyReaderBriefWatchItem[] {
  return gaps.slice(0, 8).map((gap) => ({
    symbol: gap.symbol,
    reason: `${gap.affected_report} 仍有 ${gap.reason}。`,
    status: "data_gap",
    reader_takeaway: "这个标的今天不适合被当成完整覆盖样本。",
  }));
}

function buildTopItems(
  daily: LiveReportEntry[],
  gaps: DailyReaderBriefKnownGap[],
  canary: "healthy" | "degraded" | "unavailable",
  snapshot: LiveReportsSnapshot,
): DailyReaderBriefTopItem[] {
  const items: DailyReaderBriefTopItem[] = [];
  const completeReports = daily.filter((entry) => statusLooksUpdated(entry) && !hasDataGap(entry) && !statusNeedsReview(entry));
  const gapReports = daily.filter(hasDataGap);
  const reviewReports = daily.filter(statusNeedsReview);

  if (completeReports.length > 0) {
    const entry = completeReports[0];
    items.push({
      label: `${reportLabel(entry)}覆盖完整`,
      summary: `${coverageSummary(entry)} 暂无需要读者优先处理的数据缺口。`,
      why_it_matters: "覆盖完整意味着这份公开日报的阅读完整性较高。",
    });
  }

  if (gapReports.length > 0) {
    const entry = gapReports[0];
    items.push({
      label: `${reportLabel(entry)}存在已知数据缺口`,
      summary: `${coverageSummary(entry)} 已知缺口 ${Math.max(entry.dataGapCount, 1)} 个，已在公开状态中标记。`,
      why_it_matters: "缺口被公开标记后，读者可以把它从完整覆盖样本中排除。",
    });
  }

  if (reviewReports.length > 0) {
    const entry = reviewReports[0];
    items.push({
      label: `${reportLabel(entry)}需要复核`,
      summary: `${reportLabel(entry)} 当前状态为 ${entry.runStatus}，不应被读成完整完成。`,
      why_it_matters: "复核项会影响当天报告的可读边界，但不自动变成系统结论。",
    });
  }

  if (canary === "healthy") {
    const readback = snapshotAlayaReadbackText(snapshot);
    items.push({
      label: "Full Analyst 金丝雀健康",
      summary: `Full Analyst 金丝雀监控健康${readback ? `，${readback}` : ""}。`,
      why_it_matters: "金丝雀健康只说明候选链路当前可观察，不等于正式上线或研究结论升级。",
    });
  } else if (canary === "degraded") {
    items.push({
      label: "Full Analyst 金丝雀需要关注",
      summary: "Full Analyst 金丝雀不是健康状态，需要查看监控页确认心跳、产物新鲜度和公开扫描。",
      why_it_matters: "金丝雀异常会降低当天高级分析链路的可读信心。",
    });
  }

  if (items.length === 0) {
    items.push({
      label: "公开产物暂不可完整读取",
      summary: "今日简报没有足够公开状态合成完整重点。",
      why_it_matters: "缺少公开状态时，本页面不会从私有或 raw 产物推断结论。",
    });
  }

  if (gaps.length > 0 && items.length < 5) {
    items.push({
      label: "观察清单已更新",
      summary: `今日观察清单包含 ${gaps.length} 个公开标记的数据缺口。`,
      why_it_matters: "观察清单告诉读者哪些标的需要等下一次报告确认。",
    });
  }

  return items.slice(0, 5);
}

function snapshotAlayaReadbackText(snapshot: LiveReportsSnapshot): string | null {
  const readback = snapshot.fullAnalystMonitor?.checks.alaya_readback;
  if (!readback) {
    return null;
  }
  return readback === "ok" ? "内部 Alaya 回读正常" : `内部 Alaya 回读状态为 ${readback}`;
}

function buildChanges(daily: LiveReportEntry[], canary: "healthy" | "degraded" | "unavailable"): string[] {
  const changes = daily
    .filter(statusLooksUpdated)
    .map((entry) => {
      const dateText = entry.asOfDate ? `更新到 ${entry.asOfDate}` : "已有公开状态更新";
      if (hasDataGap(entry)) {
        return `${reportLabel(entry)}${dateText}，但存在已知数据缺口。`;
      }
      if (statusNeedsReview(entry)) {
        return `${reportLabel(entry)}${dateText}，当前需要复核。`;
      }
      return `${reportLabel(entry)}${dateText}。`;
    });

  if (canary !== "unavailable") {
    changes.push(`Full Analyst 金丝雀为 ${canaryText(canary)}。`);
  }

  return changes.length > 0 ? changes : ["暂无足够公开状态生成昨日以来变化。"];
}

function buildNextWatch(gaps: DailyReaderBriefKnownGap[], canary: "healthy" | "degraded" | "unavailable"): string[] {
  const next = gaps.slice(0, 4).map((gap) => `等待下一次${gap.affected_report}确认 ${gap.symbol} 是否恢复完整覆盖。`);

  if (canary === "degraded") {
    next.push("复查 Full Analyst 金丝雀的心跳新鲜度、产物新鲜度和公开安全扫描。");
  } else if (canary === "healthy") {
    next.push("继续观察 Full Analyst 金丝雀是否保持健康，但不把金丝雀当成正式结论升级。");
  }

  next.push("下一次生产日报继续核对覆盖率、数据缺口和公开产物链接。");
  return Array.from(new Set(next)).slice(0, 6);
}

function dailyHealth(daily: LiveReportEntry[]): "ok" | "ok_with_data_gaps" | "needs_review" | "unavailable" {
  const updated = daily.filter(statusLooksUpdated);
  if (updated.length === 0) {
    return "unavailable";
  }
  if (updated.some(statusNeedsReview)) {
    return "needs_review";
  }
  if (updated.some(hasDataGap)) {
    return "ok_with_data_gaps";
  }
  return "ok";
}

function updateStatus(
  dailyReports: "ok" | "ok_with_data_gaps" | "needs_review" | "unavailable",
): DailyReaderBrief["research_effectiveness"]["daily_update_status"] {
  if (dailyReports === "ok") {
    return "reports_updated";
  }
  if (dailyReports === "ok_with_data_gaps") {
    return "reports_updated_with_gaps";
  }
  if (dailyReports === "needs_review") {
    return "needs_review";
  }
  return "unavailable";
}

function buildSubtitle(dailyReports: string, reportsUpdated: number, gapCount: number, canary: string): string {
  if (dailyReports === "unavailable") {
    return "今日公开日报状态暂不可完整读取。";
  }
  const gapText = gapCount > 0 ? `存在 ${gapCount} 个已知数据缺口` : "暂无公开标记的数据缺口";
  return `${reportsUpdated} 份日报已更新，${gapText}，Full Analyst 金丝雀状态为${canaryText(canary as "healthy" | "degraded" | "unavailable")}。`;
}

export function buildDailyReaderBrief(snapshot: LiveReportsSnapshot, options: BuildOptions = {}): DailyReaderBrief {
  const now = options.now ?? new Date();
  const daily = snapshot.daily;
  const briefDate = maxDate(daily.map((entry) => entry.asOfDate), now);
  const gaps = knownGapsFromEntries(daily);
  const watchlist = buildWatchlist(gaps);
  const reportsUpdatedCount = daily.filter(statusLooksUpdated).length;
  const reportsWithDataGapsCount = daily.filter(hasDataGap).length;
  const canary = canaryStatus(snapshot);
  const reportsHealth = dailyHealth(daily);
  const subtitle = buildSubtitle(reportsHealth, reportsUpdatedCount, gaps.length, canary);
  const effectivenessStatus = updateStatus(reportsHealth);

  return {
    schema: "gotra.daily_reader_brief.v1",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    title: zhBriefTitle(briefDate),
    subtitle,
    tldr: `${subtitle} 本简报只解释公开研究过程状态，不构成投资建议或交易信号。`,
    top_items: buildTopItems(daily, gaps, canary, snapshot),
    watchlist,
    changes_since_last_brief: buildChanges(daily, canary),
    known_gaps: gaps,
    research_effectiveness: {
      daily_update_status: effectivenessStatus,
      reports_updated_count: reportsUpdatedCount,
      reports_with_data_gaps_count: reportsWithDataGapsCount,
      canary_status: canary,
      reader_summary:
        reportsHealth === "unavailable"
          ? "公开状态不足，今日不从私有或 raw 产物推断研究过程效果。"
          : `日报按公开状态更新；${gaps.length > 0 ? "已知数据缺口被公开标记" : "暂无公开标记的数据缺口"}；Full Analyst 金丝雀状态为${canaryText(canary)}。`,
    },
    system_health: {
      daily_reports: reportsHealth,
      full_analyst_canary: canary,
    },
    next_watch: buildNextWatch(gaps, canary),
    boundary: BOUNDARY_TEXT,
    links: {
      latest_report: "/reports/latest.md",
      reports_page: "#/reports",
      status_json: "/reports/status.json",
      full_analyst_monitor: "/reports/status_full_analyst_monitor.json",
      daily_reader_brief: "/reports/daily_reader_brief.json",
    },
  };
}

export async function loadDailyReaderBrief(): Promise<BriefArtifactLoadState> {
  try {
    const artifact = await fetchPublicJson(reportsAssetPath("daily_reader_brief.json"));
    if (isDailyReaderBrief(artifact)) {
      return { kind: "artifact", brief: artifact };
    }
    throw new Error("daily_reader_brief.json schema mismatch");
  } catch (error) {
    const snapshot = await loadLiveReportsSnapshot();
    return {
      kind: "fallback",
      brief: buildDailyReaderBrief(snapshot),
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function publicBriefSafetyIssues(brief: DailyReaderBrief, forbiddenTerms: string[]): string[] {
  const text = JSON.stringify(brief);
  return forbiddenTerms.filter((term) => text.includes(term));
}

export function briefBoundaryText(brief: DailyReaderBrief): string[] {
  return stringArray(brief.boundary);
}

export function briefLinkValue(brief: DailyReaderBrief, key: keyof DailyReaderBrief["links"]): string | null {
  return stringValue(brief.links[key]);
}
