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

export type DailyReaderBriefDailyReportStatus = {
  status: "reports_updated" | "reports_updated_with_gaps" | "needs_review" | "unavailable";
  reports_updated_count: number;
  reports_with_data_gaps_count: number;
  known_gap_count: number;
  summary: string;
};

export type DailyReaderBriefFullAnalyst = {
  run_id: string;
  run_status: string;
  report_markdown: string;
  status_json: string;
  evidence_layer: string;
  publish_count: number;
  needs_review_count: number;
  blocked_count: number;
  failed_count: number;
  data_gap_count: number;
  canary_status: "healthy" | "degraded" | "unavailable";
  summary: string;
};

export type DailyReaderBriefAgentAnalysisItem = {
  symbol: string;
  research_summary: string;
  key_updates: string[];
  positive_case: string[];
  negative_case: string[];
  red_team_review: string[];
  risk_factors: string[];
  watch_items: string[];
  source_notes: string[];
};

export type DailyReaderBriefPromptFrameworkSummary = {
  prompt_template_version: string | null;
  runner: string | null;
  model: string | null;
  max_concurrency: number | null;
  task_structure: string[];
  judge_gate: string;
  public_safety_scan: string;
  raw_io_policy: string;
};

export type DailyReaderBriefInternalAlaya = {
  mode: string;
  synced_count: number;
  failed_count: number;
  readback_verified_count: number;
  readback_failed_count: number;
  sync_status: string | null;
  readback_status: string | null;
  interpretation: string;
};

export type DailyReaderBriefResearchWatchItem = {
  symbol: string;
  question: string;
  reason: string;
  next_check: string;
  source: "daily_gap" | "full_analyst" | "canary";
};

export type DailyReaderBrief = {
  schema: "gotra.daily_reader_brief.v1";
  brief_date: string;
  generated_at: string;
  evidence_layer: string;
  title: string;
  subtitle: string;
  tldr: string;
  daily_report_status: DailyReaderBriefDailyReportStatus;
  full_analyst: DailyReaderBriefFullAnalyst;
  agent_analysis_items: DailyReaderBriefAgentAnalysisItem[];
  prompt_framework_summary: DailyReaderBriefPromptFrameworkSummary;
  internal_alaya: DailyReaderBriefInternalAlaya;
  research_watchlist: DailyReaderBriefResearchWatchItem[];
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
    full_analyst_report: string;
    reports_page: string;
    status_json: string;
    full_analyst_status: string;
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
    typeof value.evidence_layer === "string" &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.tldr === "string" &&
    isRecord(value.daily_report_status) &&
    isRecord(value.full_analyst) &&
    Array.isArray(value.agent_analysis_items) &&
    isRecord(value.prompt_framework_summary) &&
    isRecord(value.internal_alaya) &&
    Array.isArray(value.research_watchlist) &&
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

function fullAnalystReportHref(snapshot: LiveReportsSnapshot): string {
  return (
    snapshot.fullAnalystMonitor?.links.reportMarkdown ??
    snapshot.fullAnalyst?.reportHref ??
    (snapshot.fullAnalystPilot?.latestPublicReportFile ? `/reports/${snapshot.fullAnalystPilot.latestPublicReportFile}` : "/reports/full_analyst_evening_hk_YYYY-MM-DD.md")
  );
}

function fullAnalystStatusHref(snapshot: LiveReportsSnapshot): string {
  return snapshot.fullAnalystMonitor?.links.statusJson ?? snapshot.fullAnalyst?.statusHref ?? "/reports/status_full_analyst_evening_hk.json";
}

function fullAnalystSummary(
  snapshot: LiveReportsSnapshot,
  canary: "healthy" | "degraded" | "unavailable",
): DailyReaderBriefFullAnalyst {
  const pilot = snapshot.fullAnalystPilot;
  const reportMarkdown = fullAnalystReportHref(snapshot);
  const statusJson = fullAnalystStatusHref(snapshot);
  const publishCount = pilot?.publishCount ?? snapshot.fullAnalyst?.successCount ?? 0;
  const universeCount = pilot?.universeCount ?? snapshot.fullAnalyst?.universeCount ?? 0;
  const runStatus = pilot?.runStatus ?? snapshot.fullAnalystMonitor?.latestRun.status ?? snapshot.fullAnalyst?.runStatus ?? "unavailable";
  const summary =
    pilot || snapshot.fullAnalystMonitor
      ? `Full Analyst candidate/canary 当前为 ${canaryText(canary)}，公开状态显示 ${publishCount}/${universeCount || publishCount} 个标的进入发布闸门；这是候选链路可读性摘要，不是正式结论升级。`
      : "Full Analyst rich brief unavailable；当前只能读取普通日报状态，不能展示每标的 agent 分析。";

  return {
    run_id: pilot?.runId ?? snapshot.fullAnalystMonitor?.latestRun.runId ?? "unavailable",
    run_status: runStatus,
    report_markdown: reportMarkdown,
    status_json: statusJson,
    evidence_layer: pilot?.evidenceLayer ?? "runtime/status evidence only",
    publish_count: publishCount,
    needs_review_count: pilot?.needsReviewCount ?? 0,
    blocked_count: pilot?.blockedCount ?? 0,
    failed_count: pilot?.failedCount ?? 0,
    data_gap_count: pilot?.dataGapCount ?? 0,
    canary_status: canary,
    summary,
  };
}

function promptFrameworkSummary(snapshot: LiveReportsSnapshot): DailyReaderBriefPromptFrameworkSummary {
  const pilot = snapshot.fullAnalystPilot;
  const stageStatuses = pilot?.stageStatuses ?? {};
  const judgeStatus = stageStatuses.judge_gate ?? (pilot ? "reported in status artifact" : "unavailable");
  const publicScan = stageStatuses.public_safety_scan ?? pilot?.publicScanStatus ?? "unavailable";

  return {
    prompt_template_version: null,
    runner: pilot?.llmRunner ?? null,
    model: pilot?.llmModel ?? null,
    max_concurrency: pilot?.maxConcurrency ?? null,
    task_structure: [
      "full-pool candidate/canary run over the public-safe GOTRA stock universe",
      "per-symbol analyst summary, positive case, negative case, red-team review, risk factors, watch items, and source notes",
      "judge gate before public artifact publishing",
      "public safety scan before exposing reader-facing artifacts",
    ],
    judge_gate: `judge_gate=${judgeStatus}`,
    public_safety_scan: `public_safety_scan=${publicScan}`,
    raw_io_policy: "No raw prompt, provider/model I/O, or credential material is embedded in this reader brief.",
  };
}

function internalAlayaSummary(snapshot: LiveReportsSnapshot): DailyReaderBriefInternalAlaya {
  const pilot = snapshot.fullAnalystPilot;
  const monitorReadback = snapshot.fullAnalystMonitor?.checks.alaya_readback ?? null;
  const readbackStatus = pilot?.alayaReadbackStatus ?? monitorReadback;
  const syncedCount = pilot?.alayaSyncedCount ?? 0;
  const readbackVerifiedCount = pilot?.alayaReadbackVerifiedCount ?? 0;
  const failedCount = pilot?.alayaFailedCount ?? 0;
  const readbackFailedCount = pilot?.alayaReadbackFailedCount ?? 0;
  const mode = pilot?.alayaMode ?? (monitorReadback ? "internal_readback" : "unavailable");
  const interpretation =
    mode === "unavailable"
      ? "Full Analyst rich brief unavailable；当前没有足够公开状态描述 GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state。"
      : `GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state 记录 ${syncedCount} 个同步事件，${readbackVerifiedCount} 个回读验证，失败 ${failedCount + readbackFailedCount} 个；这不是外部 Alaya 服务证据。`;

  return {
    mode,
    synced_count: syncedCount,
    failed_count: failedCount,
    readback_verified_count: readbackVerifiedCount,
    readback_failed_count: readbackFailedCount,
    sync_status: pilot?.alayaSyncStatus ?? null,
    readback_status: readbackStatus,
    interpretation,
  };
}

function buildResearchWatchlist(
  gaps: DailyReaderBriefKnownGap[],
  canary: "healthy" | "degraded" | "unavailable",
): DailyReaderBriefResearchWatchItem[] {
  const gapItems = gaps.slice(0, 6).map((gap) => ({
    symbol: gap.symbol,
    question: `${gap.symbol} 的公开价格覆盖是否恢复？`,
    reason: `${gap.affected_report} 标记 ${gap.reason}。`,
    next_check: `等待下一次${gap.affected_report}或 Full Analyst 状态确认。`,
    source: "daily_gap" as const,
  }));

  const canaryItem =
    canary === "degraded"
      ? [
          {
            symbol: "Full Analyst Canary",
            question: "金丝雀心跳、产物新鲜度、公开安全扫描是否恢复健康？",
            reason: "Full Analyst monitor 当前不是 healthy。",
            next_check: "复查 status_full_analyst_monitor.json 与最新 Full Analyst status artifact。",
            source: "canary" as const,
          },
        ]
      : [];

  return [...gapItems, ...canaryItem];
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
  const fullAnalyst = fullAnalystSummary(snapshot, canary);
  const dailyReportStatus: DailyReaderBriefDailyReportStatus = {
    status: effectivenessStatus,
    reports_updated_count: reportsUpdatedCount,
    reports_with_data_gaps_count: reportsWithDataGapsCount,
    known_gap_count: gaps.length,
    summary:
      reportsHealth === "unavailable"
        ? "普通日报公开状态暂不可完整读取。"
        : `${reportsUpdatedCount} 份普通日报有公开状态，${gaps.length > 0 ? `${gaps.length} 个已知数据缺口被标记` : "暂无公开标记的数据缺口"}。`,
  };

  return {
    schema: "gotra.daily_reader_brief.v1",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    evidence_layer: "local checks + runtime/status evidence + public-safe artifact smoke",
    title: zhBriefTitle(briefDate),
    subtitle,
    tldr: `${fullAnalyst.summary} ${subtitle} 本简报只解释公开研究过程状态，不构成投资建议或交易信号。`,
    daily_report_status: dailyReportStatus,
    full_analyst: fullAnalyst,
    agent_analysis_items: [],
    prompt_framework_summary: promptFrameworkSummary(snapshot),
    internal_alaya: internalAlayaSummary(snapshot),
    research_watchlist: buildResearchWatchlist(gaps, canary),
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
      full_analyst_report: fullAnalyst.report_markdown,
      reports_page: "#/reports",
      status_json: "/reports/status.json",
      full_analyst_status: fullAnalyst.status_json,
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
