import { loadLiveReportsSnapshot, type LiveReportEntry, type LiveReportsSnapshot } from "./liveReports";
import type { LocalizedText } from "../i18n/language";

export type DailyReaderBriefTopItem = {
  id: string;
  label: LocalizedText;
  summary: LocalizedText;
  why_it_matters: LocalizedText;
  raw_text?: string;
};

export type DailyReaderBriefWatchItem = {
  symbol: string;
  reason: LocalizedText;
  status: "data_gap" | "needs_review" | "unavailable";
  reader_takeaway: LocalizedText;
};

export type DailyReaderBriefKnownGap = {
  code: string;
  symbol?: string;
  label: LocalizedText;
  explanation: LocalizedText;
  affected_report?: string;
};

export type DailyReaderBriefDailyReportStatus = {
  status: "reports_updated" | "reports_updated_with_gaps" | "needs_review" | "unavailable";
  reports_updated_count: number;
  reports_with_data_gaps_count: number;
  known_gap_count: number;
  summary: LocalizedText;
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
  summary: LocalizedText;
};

export type DailyReaderBriefAgentAnalysisItem = {
  symbol: string;
  title: LocalizedText;
  research_summary: LocalizedText;
  key_updates: LocalizedText[];
  positive_case: LocalizedText[];
  negative_case: LocalizedText[];
  red_team_review: LocalizedText[];
  risk_factors: LocalizedText[];
  watch_items: LocalizedText[];
  source_notes: LocalizedText[];
  raw_markdown?: string;
};

export type DailyReaderBriefPromptFrameworkSummary = {
  prompt_template_version: string | null;
  runner: string | null;
  model: string | null;
  max_concurrency: number | null;
  task_structure: LocalizedText[];
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
  interpretation: LocalizedText;
};

export type DailyReaderBriefResearchWatchItem = {
  symbol: string;
  question: LocalizedText;
  reason: LocalizedText;
  next_check: LocalizedText;
  source: "daily_gap" | "full_analyst" | "canary";
};

export type DailyReaderBrief = {
  schema_version: "gotra.daily_reader_brief.v2";
  schema: "gotra.daily_reader_brief.v2";
  as_of_date: string;
  mode: string;
  brief_date: string;
  generated_at: string;
  evidence_layer: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  tldr: LocalizedText;
  reader_summary: LocalizedText;
  daily_report_status: DailyReaderBriefDailyReportStatus;
  full_analyst: DailyReaderBriefFullAnalyst;
  agent_analysis_items: DailyReaderBriefAgentAnalysisItem[];
  prompt_framework_summary: DailyReaderBriefPromptFrameworkSummary;
  internal_alaya: DailyReaderBriefInternalAlaya;
  research_watchlist: DailyReaderBriefResearchWatchItem[];
  top_items: DailyReaderBriefTopItem[];
  watchlist: DailyReaderBriefWatchItem[];
  changes_since_last_brief: LocalizedText[];
  known_gaps: DailyReaderBriefKnownGap[];
  research_effectiveness: {
    daily_update_status: "reports_updated" | "reports_updated_with_gaps" | "needs_review" | "unavailable";
    reports_updated_count: number;
    reports_with_data_gaps_count: number;
    canary_status: "healthy" | "degraded" | "unavailable";
    reader_summary: LocalizedText;
  };
  system_health: {
    daily_reports: "ok" | "ok_with_data_gaps" | "needs_review" | "unavailable";
    full_analyst_canary: "healthy" | "degraded" | "unavailable";
  };
  next_watch: LocalizedText[];
  boundary: LocalizedText[];
  technical_status: {
    run_id?: string;
    run_status?: string;
    judge_gate?: string;
    public_safety_scan?: string;
    alaya_readback?: string;
    schema?: string;
    artifact_path?: string;
  };
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

type DailyReaderBriefV1TopItem = {
  label: string;
  summary: string;
  why_it_matters: string;
};

type DailyReaderBriefV1KnownGap = {
  symbol: string;
  reason: string;
  affected_report: string;
};

type DailyReaderBriefV1 = {
  schema: "gotra.daily_reader_brief.v1";
  brief_date: string;
  generated_at: string;
  evidence_layer: string;
  title: string;
  subtitle: string;
  tldr: string;
  daily_report_status: Omit<DailyReaderBriefDailyReportStatus, "summary"> & { summary: string };
  full_analyst: Omit<DailyReaderBriefFullAnalyst, "summary"> & { summary: string };
  agent_analysis_items: Array<{
    symbol: string;
    research_summary: string;
    key_updates: string[];
    positive_case: string[];
    negative_case: string[];
    red_team_review: string[];
    risk_factors: string[];
    watch_items: string[];
    source_notes: string[];
  }>;
  prompt_framework_summary: Omit<DailyReaderBriefPromptFrameworkSummary, "task_structure"> & { task_structure: string[] };
  internal_alaya: Omit<DailyReaderBriefInternalAlaya, "interpretation"> & { interpretation: string };
  research_watchlist: Array<{
    symbol: string;
    question: string;
    reason: string;
    next_check: string;
    source: "daily_gap" | "full_analyst" | "canary";
  }>;
  top_items: DailyReaderBriefV1TopItem[];
  watchlist: Array<{
    symbol: string;
    reason: string;
    status: "data_gap" | "needs_review" | "unavailable";
    reader_takeaway: string;
  }>;
  changes_since_last_brief: string[];
  known_gaps: DailyReaderBriefV1KnownGap[];
  research_effectiveness: Omit<DailyReaderBrief["research_effectiveness"], "reader_summary"> & { reader_summary: string };
  system_health: DailyReaderBrief["system_health"];
  next_watch: string[];
  boundary: string[];
  links: DailyReaderBrief["links"];
};

type BuildOptions = {
  now?: Date;
};

type BriefArtifactLoadState =
  | { kind: "artifact"; brief: DailyReaderBrief }
  | { kind: "fallback"; brief: DailyReaderBrief; reason: string };

const BOUNDARY_TEXT: LocalizedText[] = [
  { zh: "研究信息，不是投资建议。", en: "Research information only, not investment advice." },
  { zh: "不是交易信号。", en: "Not a trading signal." },
  { zh: "不是业绩证明。", en: "Not performance proof." },
  { zh: "不是科学或公开证明。", en: "Not science/public proof." },
  { zh: "Full Analyst 仍是先行试跑，不是正式结论升级。", en: "Full Analyst remains a canary/candidate path, not a formal conclusion upgrade." },
  { zh: "不输出买/卖/持有。不提供仓位指令。不提供价格目标。不承诺回报。", en: "No buy/sell/hold, position sizing, target price, or return promise is provided." },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function localized(zh: string, en?: string): LocalizedText {
  const safeZh = zh.trim();
  const safeEn = (en ?? zh).trim();
  return {
    zh: safeZh || safeEn,
    en: safeEn || safeZh,
  };
}

function englishDailyLabel(label: string): string {
  const labels: Record<string, string> = {
    港股早报: "HK morning report",
    港股晚报: "HK evening report",
    美股早报: "US morning report",
    美股晚报: "US evening report",
    全局汇总: "Global summary",
  };
  return labels[label] ?? label;
}

function reportLabelEn(entry: LiveReportEntry): string {
  return entry.labelEn || englishDailyLabel(entry.labelZh || entry.id);
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && typeof value.zh === "string" && typeof value.en === "string" && value.zh.trim() !== "" && value.en.trim() !== "";
}

function isDailyReaderBriefV2(value: unknown): value is DailyReaderBrief {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schema_version === "gotra.daily_reader_brief.v2" &&
    value.schema === "gotra.daily_reader_brief.v2" &&
    typeof value.as_of_date === "string" &&
    typeof value.mode === "string" &&
    typeof value.brief_date === "string" &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.subtitle) &&
    isLocalizedText(value.tldr) &&
    isLocalizedText(value.reader_summary) &&
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
    isRecord(value.technical_status) &&
    isRecord(value.links)
  );
}

function isDailyReaderBriefV1(value: unknown): value is DailyReaderBriefV1 {
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

function normalizeKnownGapV1(gap: DailyReaderBriefV1KnownGap, index: number): DailyReaderBriefKnownGap {
  const label = `${gap.symbol} data gap`;
  return {
    code: `v1_gap_${index + 1}`,
    symbol: gap.symbol,
    affected_report: gap.affected_report,
    label: localized(`${gap.symbol} 数据缺口`, label),
    explanation: localized(`${gap.affected_report} 标记 ${gap.reason}。`, `${englishDailyLabel(gap.affected_report)} marked ${gap.reason}.`),
  };
}

function normalizeV1Brief(value: DailyReaderBriefV1): DailyReaderBrief {
  const knownGaps = value.known_gaps.map(normalizeKnownGapV1);
  return {
    schema_version: "gotra.daily_reader_brief.v2",
    schema: "gotra.daily_reader_brief.v2",
    as_of_date: value.brief_date,
    mode: "v1_compat",
    brief_date: value.brief_date,
    generated_at: value.generated_at,
    evidence_layer: value.evidence_layer,
    title: localized(value.title, "GOTRA Daily Research Brief"),
    subtitle: localized(value.subtitle, value.subtitle),
    tldr: localized(value.tldr, value.tldr),
    reader_summary: localized(value.research_effectiveness.reader_summary, value.research_effectiveness.reader_summary),
    daily_report_status: {
      ...value.daily_report_status,
      summary: localized(value.daily_report_status.summary, value.daily_report_status.summary),
    },
    full_analyst: {
      ...value.full_analyst,
      summary: localized(value.full_analyst.summary, value.full_analyst.summary),
    },
    agent_analysis_items: value.agent_analysis_items.map((item) => ({
      symbol: item.symbol,
      title: localized(`${item.symbol} 研究摘要`, `${item.symbol} research summary`),
      research_summary: localized(item.research_summary, item.research_summary),
      key_updates: item.key_updates.map((text) => localized(text, text)),
      positive_case: item.positive_case.map((text) => localized(text, text)),
      negative_case: item.negative_case.map((text) => localized(text, text)),
      red_team_review: item.red_team_review.map((text) => localized(text, text)),
      risk_factors: item.risk_factors.map((text) => localized(text, text)),
      watch_items: item.watch_items.map((text) => localized(text, text)),
      source_notes: item.source_notes.map((text) => localized(text, text)),
      raw_markdown: item.research_summary,
    })),
    prompt_framework_summary: {
      ...value.prompt_framework_summary,
      task_structure: value.prompt_framework_summary.task_structure.map((text) => localized(text, text)),
    },
    internal_alaya: {
      ...value.internal_alaya,
      interpretation: localized(value.internal_alaya.interpretation, value.internal_alaya.interpretation),
    },
    research_watchlist: value.research_watchlist.map((item) => ({
      ...item,
      question: localized(item.question, item.question),
      reason: localized(item.reason, item.reason),
      next_check: localized(item.next_check, item.next_check),
    })),
    top_items: value.top_items.map((item, index) => ({
      id: `v1_top_${index + 1}`,
      label: localized(item.label, item.label),
      summary: localized(item.summary, item.summary),
      why_it_matters: localized(item.why_it_matters, item.why_it_matters),
      raw_text: `${item.label} ${item.summary} ${item.why_it_matters}`,
    })),
    watchlist: value.watchlist.map((item) => ({
      ...item,
      reason: localized(item.reason, item.reason),
      reader_takeaway: localized(item.reader_takeaway, item.reader_takeaway),
    })),
    changes_since_last_brief: value.changes_since_last_brief.map((item) => localized(item, item)),
    known_gaps: knownGaps,
    research_effectiveness: {
      ...value.research_effectiveness,
      reader_summary: localized(value.research_effectiveness.reader_summary, value.research_effectiveness.reader_summary),
    },
    system_health: value.system_health,
    next_watch: value.next_watch.map((item) => localized(item, item)),
    boundary: value.boundary.map((item) => localized(item, item)),
    technical_status: {
      run_id: value.full_analyst.run_id,
      run_status: value.full_analyst.run_status,
      judge_gate: value.prompt_framework_summary.judge_gate,
      public_safety_scan: value.prompt_framework_summary.public_safety_scan,
      alaya_readback: value.internal_alaya.readback_status ?? undefined,
      schema: value.schema,
      artifact_path: value.links.daily_reader_brief,
    },
    links: value.links,
  };
}

export function normalizeDailyReaderBriefArtifact(value: unknown): DailyReaderBrief | null {
  if (isDailyReaderBriefV2(value)) {
    return value;
  }
  if (isDailyReaderBriefV1(value)) {
    return normalizeV1Brief(value);
  }
  return null;
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

function coverageSummaryEn(entry: LiveReportEntry): string {
  const label = reportLabelEn(entry);
  if (entry.universeCount <= 0) {
    return `${label} has public status, but coverage statistics are unavailable.`;
  }
  return `${label} completed ${entry.successCount}/${entry.universeCount}.`;
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

function canaryTextEn(status: "healthy" | "degraded" | "unavailable"): string {
  if (status === "healthy") {
    return "healthy";
  }
  if (status === "degraded") {
    return "needs attention";
  }
  return "unavailable";
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
        code: `gap_${gaps.length + 1}`,
        symbol,
        affected_report: reportLabel(entry),
        label: localized(`${symbol} 数据缺口`, `${symbol} data gap`),
        explanation: localized(`${reportLabel(entry)} 标记 ${issue.reason}。`, `${reportLabelEn(entry)} marked ${issue.reason}.`),
      });
    }
  }

  return gaps;
}

function buildWatchlist(gaps: DailyReaderBriefKnownGap[]): DailyReaderBriefWatchItem[] {
  return gaps.slice(0, 8).map((gap) => ({
    symbol: gap.symbol ?? gap.code,
    reason: localized(`${gap.affected_report ?? "公开状态"} 仍有 ${gap.symbol ?? gap.code} 数据缺口。`, `${gap.affected_report ?? "Public status"} still has a data gap for ${gap.symbol ?? gap.code}.`),
    status: "data_gap",
    reader_takeaway: localized("这个标的今天不适合被当成完整覆盖样本。", "This symbol should not be treated as a complete-coverage sample today."),
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
      id: "coverage-complete",
      label: localized(`${reportLabel(entry)}覆盖完整`, `${reportLabelEn(entry)} coverage complete`),
      summary: localized(`${coverageSummary(entry)} 暂无需要读者优先处理的数据缺口。`, `${coverageSummaryEn(entry)} No data gap needs reader priority.`),
      why_it_matters: localized("覆盖完整意味着这份公开日报的阅读完整性较高。", "Complete coverage means this public daily report is more readable for the day."),
    });
  }

  if (gapReports.length > 0) {
    const entry = gapReports[0];
    items.push({
      id: "coverage-data-gap",
      label: localized(`${reportLabel(entry)}存在已知数据缺口`, `${reportLabelEn(entry)} has known data gaps`),
      summary: localized(
        `${coverageSummary(entry)} 已知缺口 ${Math.max(entry.dataGapCount, 1)} 个，已在公开状态中标记。`,
        `${coverageSummaryEn(entry)} ${Math.max(entry.dataGapCount, 1)} known gap(s) are marked in public status.`,
      ),
      why_it_matters: localized("缺口被公开标记后，读者可以把它从完整覆盖样本中排除。", "Once a gap is public-marked, readers can exclude it from complete-coverage samples."),
    });
  }

  if (reviewReports.length > 0) {
    const entry = reviewReports[0];
    items.push({
      id: "coverage-needs-review",
      label: localized(`${reportLabel(entry)}需要复核`, `${reportLabelEn(entry)} needs review`),
      summary: localized(`${reportLabel(entry)} 当前状态为 ${entry.runStatus}，不应被读成完整完成。`, `${reportLabelEn(entry)} is currently ${entry.runStatus}; do not read it as complete.`),
      why_it_matters: localized("复核项会影响当天报告的可读边界，但不自动变成系统结论。", "Review items affect today's reading boundary, but they do not become system conclusions."),
    });
  }

  if (canary === "healthy") {
    const readback = snapshotAlayaReadbackText(snapshot);
    items.push({
      id: "full-analyst-canary-healthy",
      label: localized("Full Analyst 先行试跑健康", "Full Analyst Canary healthy"),
      summary: localized(`Full Analyst 先行试跑监控健康${readback ? `，${readback.zh}` : ""}。`, `Full Analyst Canary monitor is healthy${readback ? `; ${readback.en}` : ""}.`),
      why_it_matters: localized("先行试跑健康只说明候选链路当前可观察，不等于正式上线或研究结论升级。", "A healthy canary only means the candidate path is observable; it is not production graduation or a research conclusion upgrade."),
    });
  } else if (canary === "degraded") {
    items.push({
      id: "full-analyst-canary-degraded",
      label: localized("Full Analyst 先行试跑需要关注", "Full Analyst Canary needs attention"),
      summary: localized("Full Analyst 先行试跑不是健康状态，需要查看监控页确认心跳、产物新鲜度和公开扫描。", "Full Analyst Canary is not healthy; inspect heartbeat, artifact freshness, and public scan in the monitor."),
      why_it_matters: localized("先行试跑异常会降低当天高级分析链路的可读信心。", "A degraded canary lowers reader confidence in the advanced analysis path for the day."),
    });
  }

  if (items.length === 0) {
    items.push({
      id: "artifact-unavailable",
      label: localized("公开产物暂不可完整读取", "Public artifacts are not fully readable"),
      summary: localized("今日简报没有足够公开状态合成完整重点。", "Today's brief does not have enough public status to synthesize complete top items."),
      why_it_matters: localized("缺少公开状态时，本页面不会从私有或 raw 产物推断结论。", "When public status is missing, this page does not infer conclusions from private or raw artifacts."),
    });
  }

  if (gaps.length > 0 && items.length < 5) {
    items.push({
      id: "watchlist-updated",
      label: localized("观察清单已更新", "Watchlist updated"),
      summary: localized(`今日观察清单包含 ${gaps.length} 个公开标记的数据缺口。`, `Today's watchlist includes ${gaps.length} public-marked data gap(s).`),
      why_it_matters: localized("观察清单告诉读者哪些标的需要等下一次报告确认。", "The watchlist tells readers which symbols need confirmation in the next report."),
    });
  }

  return items.slice(0, 5);
}

function snapshotAlayaReadbackText(snapshot: LiveReportsSnapshot): LocalizedText | null {
  const readback = snapshot.fullAnalystMonitor?.checks.alaya_readback;
  if (!readback) {
    return null;
  }
  return readback === "ok" ? localized("内部 Alaya 回读正常", "internal Alaya readback is OK") : localized(`内部 Alaya 回读状态为 ${readback}`, `internal Alaya readback status is ${readback}`);
}

function buildChanges(daily: LiveReportEntry[], canary: "healthy" | "degraded" | "unavailable"): LocalizedText[] {
  const changes = daily
    .filter(statusLooksUpdated)
    .map((entry) => {
      const dateText = entry.asOfDate ? `更新到 ${entry.asOfDate}` : "已有公开状态更新";
      const enDateText = entry.asOfDate ? `updated to ${entry.asOfDate}` : "has a public status update";
      if (hasDataGap(entry)) {
        return localized(`${reportLabel(entry)}${dateText}，但存在已知数据缺口。`, `${reportLabelEn(entry)} ${enDateText}, with known data gaps.`);
      }
      if (statusNeedsReview(entry)) {
        return localized(`${reportLabel(entry)}${dateText}，当前需要复核。`, `${reportLabelEn(entry)} ${enDateText}, and currently needs review.`);
      }
      return localized(`${reportLabel(entry)}${dateText}。`, `${reportLabelEn(entry)} ${enDateText}.`);
    });

  if (canary !== "unavailable") {
    changes.push(localized(`Full Analyst 先行试跑为 ${canaryText(canary)}。`, `Full Analyst Canary is ${canaryTextEn(canary)}.`));
  }

  return changes.length > 0 ? changes : [localized("暂无足够公开状态生成昨日以来变化。", "There is not enough public status to generate changes since the last brief.")];
}

function buildNextWatch(gaps: DailyReaderBriefKnownGap[], canary: "healthy" | "degraded" | "unavailable"): LocalizedText[] {
  const next = gaps
    .slice(0, 4)
    .map((gap) =>
      localized(
        `等待下一次${gap.affected_report ?? "公开报告"}确认 ${gap.symbol ?? gap.code} 是否恢复完整覆盖。`,
        `Wait for the next ${gap.affected_report ?? "public report"} to confirm whether ${gap.symbol ?? gap.code} returns to complete coverage.`,
      ),
    );

  if (canary === "degraded") {
    next.push(localized("复查 Full Analyst 先行试跑的心跳新鲜度、产物新鲜度和公开安全扫描。", "Recheck Full Analyst Canary heartbeat freshness, artifact freshness, and public safety scan."));
  } else if (canary === "healthy") {
    next.push(localized("继续观察 Full Analyst 先行试跑是否保持健康，但不把先行试跑当成正式结论升级。", "Continue watching whether Full Analyst Canary stays healthy, without treating it as a formal conclusion upgrade."));
  }

  next.push(localized("下一次生产日报继续核对覆盖率、数据缺口和公开产物链接。", "In the next production daily report, keep checking coverage, data gaps, and public artifact links."));
  const seen = new Set<string>();
  return next.filter((item) => {
    const key = `${item.zh}::${item.en}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 6);
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
      ? localized(
          `Full Analyst 先行试跑当前为 ${canaryText(canary)}，公开状态显示 ${publishCount}/${universeCount || publishCount} 个标的进入发布闸门；这是候选链路可读性摘要，不是正式结论升级。`,
          `Full Analyst Canary is ${canaryTextEn(canary)}. Public status shows ${publishCount}/${universeCount || publishCount} symbols entered the publication gate; this is a candidate-path readability summary, not a formal conclusion upgrade.`,
        )
      : localized(
          "Full Analyst rich brief unavailable；当前只能读取普通日报状态，不能展示每标的 agent 分析。",
          "Full Analyst rich brief is unavailable; this page can only read ordinary daily report status and cannot show per-symbol agent analysis.",
        );

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
      localized("public-safe GOTRA 股票池上的 Full Analyst 先行试跑", "full-pool candidate/canary run over the public-safe GOTRA stock universe"),
      localized("per-symbol 分析摘要、正方、反方、red-team、风险因素、观察项和来源摘要", "per-symbol analyst summary, positive case, negative case, red-team review, risk factors, watch items, and source notes"),
      localized("公开产物发布前经过 judge gate", "judge gate before public artifact publishing"),
      localized("读者页面曝光前经过 public safety scan", "public safety scan before exposing reader-facing artifacts"),
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
      ? localized(
          "Full Analyst rich brief unavailable；当前没有足够公开状态描述 GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state。",
          "Full Analyst rich brief is unavailable; there is not enough public status to describe GOTRA internal Alaya cognition flywheel / knowledge memory / feedback state.",
        )
      : localized(
          `GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state 记录 ${syncedCount} 个同步事件，${readbackVerifiedCount} 个回读验证，失败 ${failedCount + readbackFailedCount} 个；这不是外部 Alaya 服务证据。`,
          `GOTRA internal Alaya cognition flywheel / knowledge memory / feedback state records ${syncedCount} sync event(s), ${readbackVerifiedCount} readback verification(s), and ${failedCount + readbackFailedCount} failure(s); this is not evidence of an external Alaya service.`,
        );

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
    symbol: gap.symbol ?? gap.code,
    question: localized(`${gap.symbol ?? gap.code} 的公开价格覆盖是否恢复？`, `Has public price coverage recovered for ${gap.symbol ?? gap.code}?`),
    reason: gap.explanation,
    next_check: localized(`等待下一次${gap.affected_report ?? "公开报告"}或 Full Analyst 状态确认。`, `Wait for the next ${gap.affected_report ?? "public report"} or Full Analyst status to confirm.`),
    source: "daily_gap" as const,
  }));

  const canaryItem =
    canary === "degraded"
      ? [
          {
            symbol: "Full Analyst Canary",
            question: localized("先行试跑心跳、产物新鲜度、公开安全扫描是否恢复健康？", "Have Canary heartbeat, artifact freshness, and public scan recovered to healthy?"),
            reason: localized("Full Analyst monitor 当前不是 healthy。", "Full Analyst monitor is not currently healthy."),
            next_check: localized("复查 status_full_analyst_monitor.json 与最新 Full Analyst status artifact。", "Recheck status_full_analyst_monitor.json and the latest Full Analyst status artifact."),
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

function buildSubtitle(dailyReports: string, reportsUpdated: number, gapCount: number, canary: string): LocalizedText {
  if (dailyReports === "unavailable") {
    return localized("今日公开日报状态暂不可完整读取。", "Today's public daily report status is not fully readable.");
  }
  const gapText = gapCount > 0 ? `存在 ${gapCount} 个已知数据缺口` : "暂无公开标记的数据缺口";
  const enGapText = gapCount > 0 ? `${gapCount} known data gap(s) are present` : "no public-marked data gaps";
  const canaryValue = canary as "healthy" | "degraded" | "unavailable";
  return localized(
    `${reportsUpdated} 份日报已更新，${gapText}，Full Analyst 先行试跑状态为${canaryText(canaryValue)}。`,
    `${reportsUpdated} daily report(s) updated, ${enGapText}, and Full Analyst Canary is ${canaryTextEn(canaryValue)}.`,
  );
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
        ? localized("普通日报公开状态暂不可完整读取。", "Ordinary daily report public status is not fully readable.")
        : localized(
            `${reportsUpdatedCount} 份普通日报有公开状态，${gaps.length > 0 ? `${gaps.length} 个已知数据缺口被标记` : "暂无公开标记的数据缺口"}。`,
            `${reportsUpdatedCount} ordinary daily report(s) have public status; ${gaps.length > 0 ? `${gaps.length} known data gap(s) are marked` : "no public-marked data gaps"}.`,
          ),
  };
  const readerSummary =
    reportsHealth === "unavailable"
      ? localized(
          "公开状态不足，今日不从私有或 raw 产物推断研究过程效果。",
          "Public status is insufficient, so today's page does not infer research-process effectiveness from private or raw artifacts.",
        )
      : localized(
          `日报按公开状态更新；${gaps.length > 0 ? "已知数据缺口被公开标记" : "暂无公开标记的数据缺口"}；Full Analyst 先行试跑状态为${canaryText(canary)}。`,
          `Daily reports updated according to public status; ${gaps.length > 0 ? "known data gaps are public-marked" : "no public-marked data gaps"}; Full Analyst Canary is ${canaryTextEn(canary)}.`,
        );

  return {
    schema_version: "gotra.daily_reader_brief.v2",
    schema: "gotra.daily_reader_brief.v2",
    as_of_date: briefDate,
    mode: "public_status_synthesis",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    evidence_layer: "local checks + runtime/status evidence + public-safe artifact smoke",
    title: localized(zhBriefTitle(briefDate), `Market research brief for ${briefDate}`),
    subtitle,
    tldr: localized(
      `${fullAnalyst.summary.zh} ${subtitle.zh} 本简报只解释公开研究过程状态，不构成投资建议或交易信号。`,
      `${fullAnalyst.summary.en} ${subtitle.en} This brief only explains public research-process status; it is not investment advice or a trading signal.`,
    ),
    reader_summary: readerSummary,
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
      reader_summary: readerSummary,
    },
    system_health: {
      daily_reports: reportsHealth,
      full_analyst_canary: canary,
    },
    next_watch: buildNextWatch(gaps, canary),
    boundary: BOUNDARY_TEXT,
    technical_status: {
      run_id: fullAnalyst.run_id,
      run_status: fullAnalyst.run_status,
      judge_gate: promptFrameworkSummary(snapshot).judge_gate,
      public_safety_scan: promptFrameworkSummary(snapshot).public_safety_scan,
      alaya_readback: snapshot.fullAnalystMonitor?.checks.alaya_readback ?? internalAlayaSummary(snapshot).readback_status ?? undefined,
      schema: "gotra.daily_reader_brief.v2",
      artifact_path: "/reports/daily_reader_brief.json",
    },
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
    const normalized = normalizeDailyReaderBriefArtifact(artifact);
    if (normalized) {
      return { kind: "artifact", brief: normalized };
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
  return brief.boundary.map((item) => item.zh || item.en);
}

export function briefLinkValue(brief: DailyReaderBrief, key: keyof DailyReaderBrief["links"]): string | null {
  return stringValue(brief.links[key]);
}
