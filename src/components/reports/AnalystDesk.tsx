import { Clipboard, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  copy,
  fullAnalystLabelText,
  fullAnalystStageText,
  runtimeStatusText,
  type Language,
} from "../../i18n/language";
import {
  createEvidenceSummary,
  formatCoveragePct,
  formatShanghaiTimestamp,
  type ExceptionSeverity,
  type FullAnalystMonitorStatus,
  type FullAnalystPilotStatus,
  type NormalizedReportStatus,
  type ReportExceptionRow,
  type ReportStatusFileResult,
} from "./ReportStatusModel";

type ExceptionStatusFilter = "all" | ExceptionSeverity;

export type AnalystDeskProps = {
  language: Language;
  status: NormalizedReportStatus | null;
  statusError: string | null;
  markdown: string | null;
  markdownError: string | null;
  lastFetchedAt: string | null;
  marketStatuses?: ReportStatusFileResult[];
  fullAnalystMonitor: FullAnalystMonitorStatus | null;
  fullAnalystMonitorError: string | null;
  fullAnalystPilot: FullAnalystPilotStatus | null;
  fullAnalystPilotError: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  assetHref: (fileName: string) => string;
};

function localeFor(language: Language): string {
  return language === "zh" ? "zh-CN" : "en-US";
}

function modeLabel(mode: string, language: Language): string {
  if (mode === "morning-hk") {
    return copy(language, "港股早报", "HK Morning");
  }
  if (mode === "evening-hk") {
    return copy(language, "港股晚报", "HK Evening");
  }
  if (mode === "morning-us") {
    return copy(language, "美股早报", "US Morning");
  }
  if (mode === "evening-us") {
    return copy(language, "美股晚报", "US Evening");
  }
  if (mode === "morning-global") {
    return copy(language, "全局汇总", "Global Summary");
  }
  return mode === "unknown" ? copy(language, "未知模式", "Unknown mode") : mode;
}

function marketStatusNote(mode: string, status: NormalizedReportStatus | null, language: Language): string | null {
  if (mode === "morning-us") {
    return copy(
      language,
      "美股开盘前简报使用上一个已完成美股交易日。",
      "US morning is a pre-market brief and may use the previous completed US session.",
    );
  }
  if (mode === "evening-us" && status?.statusLabel === "Data gap, artifact published") {
    const firstAllowed = status.failedSymbols.find((row) => row.severity === "allowed_gap");
    return firstAllowed
      ? copy(
          language,
          `允许的数据缺口：${firstAllowed.exchange}:${firstAllowed.symbol} · ${firstAllowed.reason}`,
          `Allowed data gap: ${firstAllowed.exchange}:${firstAllowed.symbol} · ${firstAllowed.reason}`,
        )
      : copy(language, "美股晚报仅报告允许的数据源覆盖缺口。", "US evening only reports allowed provider coverage gaps.");
  }
  if (status?.statusLabel === "Partial, needs review") {
    return copy(language, "partial 不是成功状态；需要复核运行和公开产物。", "partial is not a success state; review runtime and public artifacts.");
  }
  return null;
}

function severityLabel(severity: ExceptionSeverity, language: Language): string {
  return severity === "allowed_gap"
    ? copy(language, "已知数据缺口", "Allowed data gap")
    : copy(language, "意外失败", "Unexpected failure");
}

function statusFilterLabel(filter: ExceptionStatusFilter, language: Language): string {
  if (filter === "allowed_gap") {
    return copy(language, "已知数据缺口", "Allowed data gaps");
  }
  if (filter === "unexpected_failure") {
    return copy(language, "意外失败", "Unexpected failures");
  }
  return copy(language, "全部状态", "All statuses");
}

function statusLabelText(status: NormalizedReportStatus["statusLabel"] | null, language: Language): string {
  if (status === "Completed") {
    return copy(language, "已完成", "Completed");
  }
  if (status === "Data gap, artifact published") {
    return copy(language, "已发布，存在已知数据缺口", "Data gap, artifact published");
  }
  if (status === "Partial, needs review") {
    return copy(language, "部分完成，需复核", "Partial, needs review");
  }
  if (status === "Artifact write failed") {
    return copy(language, "产物写入失败", "Artifact write failed");
  }
  if (status === "Stale") {
    return copy(language, "已过期", "Stale");
  }
  return copy(language, "产物不可用", "Artifact unavailable");
}

function fullAnalystPilotLabel(status: FullAnalystPilotStatus["statusLabel"] | null, language: Language): string {
  if (status === "Running") {
    return copy(language, "运行中", "Running");
  }
  if (status === "Stale") {
    return copy(language, "心跳过期", "Heartbeat stale");
  }
  if (status === "Completed") {
    return copy(language, "已完成", "Completed");
  }
  if (status === "Review items") {
    return copy(language, "有复核项", "Review items");
  }
  if (status === "Blocked") {
    return copy(language, "已阻断", "Blocked");
  }
  if (status === "Artifact write failed") {
    return copy(language, "产物写入失败", "Artifact write failed");
  }
  return copy(language, "等待产物", "Artifact pending");
}

function fullAnalystMonitorLabel(status: FullAnalystMonitorStatus["statusLabel"] | null, language: Language): string {
  if (status === "Healthy") {
    return copy(language, "监控健康", "Monitor healthy");
  }
  if (status === "Degraded") {
    return copy(language, "监控降级", "Monitor degraded");
  }
  if (status === "Failed") {
    return copy(language, "监控失败", "Monitor failed");
  }
  return copy(language, "监控未知", "Monitor unknown");
}

function formatAgeSeconds(value: number | null, language: Language): string {
  if (value === null) {
    return copy(language, "未知", "unknown");
  }
  if (value < 90) {
    return `${value}s`;
  }
  if (value < 7200) {
    return language === "zh" ? `${Math.round(value / 60)} 分钟` : `${Math.round(value / 60)} min`;
  }
  return language === "zh" ? `${Math.round(value / 3600)} 小时` : `${Math.round(value / 3600)} h`;
}

function fullAnalystPilotHeadline(status: FullAnalystPilotStatus | null, language: Language): string {
  if (!status) {
    return copy(
      language,
      "Full Analyst 先行试跑状态产物尚未发布；不会影响五个日报定时器。",
      "Full Analyst Canary status is not published yet; the five daily timers are unaffected.",
    );
  }
  if (status.statusLabel === "Running") {
    return copy(
      language,
      `先行试跑运行中：阶段 ${fullAnalystStageText(language, status.phase)}，最新心跳 ${status.lastHeartbeatUtc ?? "n/a"}。`,
      `Canary running: phase=${status.phase}, last heartbeat ${status.lastHeartbeatUtc ?? "n/a"}.`,
    );
  }
  if (status.statusLabel === "Stale") {
    return copy(
      language,
      `先行试跑心跳超过 10 分钟未更新；当前不能显示为健康运行。最近心跳 ${status.lastHeartbeatUtc ?? "n/a"}。`,
      `Canary heartbeat is more than 10 minutes stale; it is not a healthy running state. Last heartbeat ${status.lastHeartbeatUtc ?? "n/a"}.`,
    );
  }
  if (status.statusLabel === "Completed") {
    return copy(
      language,
      `${status.publishCount}/${status.universeCount} 个全量股票池标的完成发布闸门，${status.alayaSyncedCount} 个内部 Alaya 同步事件。`,
      `${status.publishCount}/${status.universeCount} full-pool symbols passed publish gate with ${status.alayaSyncedCount} internal Alaya ${status.alayaMode ?? "sync"} events.`,
    );
  }
  if (status.statusLabel === "Review items") {
    return copy(
      language,
      `先行试跑产物已写出，但保留 ${status.needsReviewCount} 个复核项和 ${status.dataGapCount} 个数据缺口。`,
      `Canary artifact was written with ${status.needsReviewCount} review item(s) and ${status.dataGapCount} data gap(s).`,
    );
  }
  if (status.statusLabel === "Artifact write failed") {
    return copy(language, "先行试跑产物写入失败；需要先复核运行目录和 web root 权限。", "Canary artifact write failed; review runtime and web-root ownership first.");
  }
  return copy(
    language,
    `先行试跑被阻断：${status.blockedCount} 个已阻断，${status.failedCount} 个失败，${status.alayaFailedCount} 个内部 Alaya 同步失败，${status.alayaReadbackFailedCount} 个回读失败。`,
    `Canary blocked: ${status.blockedCount} blocked, ${status.failedCount} failed, ${status.alayaFailedCount} Alaya sync failed, ${status.alayaReadbackFailedCount} readback failed.`,
  );
}

function formatExchangeCounts(counts: Record<string, number>, language: Language): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return copy(language, "未上报", "not reported");
  }
  return entries.map(([exchange, count]) => `${exchange} ${count}`).join(" · ");
}

function formatStageLabel(stage: string, language: Language): string {
  return fullAnalystStageText(language, stage);
}

function compactSymbolSummary(status: FullAnalystPilotStatus | null, language: Language): string {
  if (!status) {
    return "n/a";
  }
  if (status.symbolHash) {
    return `${status.symbolCount || status.sampleSymbols.length || status.universeCount} ${copy(language, "个标的", "symbols")} · ${status.symbolHash.slice(0, 12)}`;
  }
  return status.sampleSymbols.length > 8
    ? `${status.sampleSymbols.length} ${copy(language, "个标的", "symbols")}`
    : status.sampleSymbols.join(" · ") || copy(language, "未上报", "not reported");
}

function statusHeadline(status: NormalizedReportStatus | null, language: Language): string {
  if (!status) {
    return copy(language, "状态产物不可用；当前仅显示公开审计外壳。", "Status artifact unavailable; public desk is showing the audit shell only.");
  }
  if (status.statusLabel === "Completed") {
    return copy(
      language,
      `${status.universeCount} 个公开股票池标的已完成覆盖。`,
      `Full coverage completed for ${status.universeCount} public-universe symbols.`,
    );
  }
  if (status.statusLabel === "Data gap, artifact published") {
    return copy(
      language,
      `报告已发布，但保留 ${status.failedCount} 个已知数据缺口。`,
      `Report published with ${status.failedCount} known provider coverage gap${status.failedCount === 1 ? "" : "s"}.`,
    );
  }
  if (status.statusLabel === "Artifact write failed") {
    return copy(language, "产物写入失败；请先复核运行产物归属。", "Artifact write failed; review runtime ownership before relying on the report artifact.");
  }
  if (status.statusLabel === "Stale") {
    return copy(language, "生成时间超出新鲜度窗口；仅可作为过期运行证据。", "Report may be stale: generated time is older than the freshness window.");
  }
  return copy(
    language,
    `部分完成，仍有 ${status.unexpectedFailedCount} 个意外失败需要复核。`,
    `Partial report needs review: ${status.unexpectedFailedCount} unexpected symbol failure${status.unexpectedFailedCount === 1 ? "" : "s"}.`,
  );
}

function formatNextRun(status: NormalizedReportStatus, language: Language, locale: string): string {
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: status.nextExpectedRun.timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(status.nextExpectedRun.date);
  return `${modeLabel(status.nextExpectedRun.mode, language)} · ${time}`;
}

function evidenceBoundaryItems(language: Language): string[] {
  return [
    copy(language, "仅作研究信息", "Research information only"),
    copy(language, "不是投资建议", "Not investment advice"),
    copy(language, "不是交易信号", "Not a trading signal"),
    copy(language, "不是业绩证明", "Not performance proof"),
    copy(language, "不是科学或公开证明", "Not science/public proof"),
    copy(language, "仅为运行和状态证据", "Runtime/status evidence only"),
  ];
}

function conclusionBullets(status: NormalizedReportStatus | null, language: Language): string[] {
  if (!status) {
    return [
      copy(language, "状态产物不可用，本页无法核验当期覆盖率。", "Status artifact is unavailable, so this desk cannot verify today's coverage."),
      copy(language, "公开产物链接仍保留，用于审计和重试。", "Raw public artifact links remain visible for audit and retry."),
      copy(language, "本页仅属于运行和状态证据层。", "This page remains runtime/status evidence only."),
    ];
  }

  const coverage = formatCoveragePct(status.coveragePct);
  const bullets = [
    statusHeadline(status, language),
    copy(
      language,
      `${status.successCount}/${status.universeCount} 个公开股票池标的具备收盘数据覆盖，覆盖率 ${coverage}。`,
      `${status.successCount}/${status.universeCount} public-universe symbols have available close-data coverage (${coverage}).`,
    ),
  ];

  if (status.failedCount > 0) {
    bullets.push(
      copy(
        language,
        `${status.failedCount} 个失败标的保持可见：${status.allowedMissingCount} 个已知数据缺口，${status.unexpectedFailedCount} 个意外失败。`,
        `${status.failedCount} failed symbols remain visible: ${status.allowedMissingCount} allowed provider gaps and ${status.unexpectedFailedCount} unexpected failures.`,
      ),
    );
  } else {
    bullets.push(copy(language, "公开状态产物未报告异常。", "No exceptions reported in public status.json."));
  }

  if (status.isStale) {
    bullets.push(copy(language, "生成时间超出新鲜度窗口；请按过期运行证据处理。", "Generated time is outside the freshness window; treat the report as stale runtime evidence."));
  }

  bullets.push(
    copy(
      language,
      "本分析台仅展示公开安全的运行和状态证据，不构成投资建议、交易信号、业绩证明或科学证明。",
      "This desk is public-safe runtime/status evidence only, not investment advice, not a trading signal, and not proof of performance or science claims.",
    ),
  );
  return bullets.slice(0, 5);
}

function coverageNotes(status: NormalizedReportStatus, language: Language): string[] {
  const rowsWithFailures = status.byExchange.filter((row) => row.failed > 0);
  if (status.byExchange.length === 0) {
    return [
      copy(language, "状态产物未报告交易所矩阵；此处仅展示汇总计数。", "No exchange matrix was reported in status.json; summary counts are shown instead."),
    ];
  }
  if (rowsWithFailures.length === 0) {
    return [
      copy(language, "公开状态产物中，各交易所均显示完整覆盖。", "All reported exchanges show full coverage in the public status artifact."),
      copy(language, "覆盖率仅表示运行时可用性，不证明后续数据质量或研究有效性。", "Coverage is runtime availability only; it does not prove future data quality or research validity."),
    ];
  }
  return [
    copy(
      language,
      `${rowsWithFailures.map((row) => `${row.exchange} ${row.success}/${row.universe}`).join(" · ")} 报告覆盖缺口。`,
      `${rowsWithFailures.map((row) => `${row.exchange} ${row.success}/${row.universe}`).join(" · ")} reported coverage gaps.`,
    ),
    status.unexpectedFailedCount > 0
      ? copy(language, "意外失败需要复核后，才可依赖公开产物。", "Unexpected failures require review before relying on the public artifact.")
      : copy(language, "已报告失败均归类为允许的数据源覆盖缺口。", "Reported failures are classified as allowed provider coverage gaps."),
  ];
}

function exceptionTreatment(row: ReportExceptionRow, language: Language): string {
  return row.severity === "allowed_gap"
    ? copy(language, "允许的数据源覆盖缺口", "Allowlisted provider gap")
    : copy(language, "意外失败", "Unexpected failure");
}

function exceptionAction(row: ReportExceptionRow, language: Language): string {
  return row.severity === "allowed_gap"
    ? copy(language, "继续监控数据源覆盖", "Monitor provider coverage")
    : copy(language, "复核运行状态", "Review runtime status");
}

function exceptionKey(row: ReportExceptionRow): string {
  return `${row.severity}-${row.exchange}-${row.symbol}-${row.providerTicker}-${row.reason}`;
}

export function AnalystDesk({
  language,
  status,
  statusError,
  markdown,
  markdownError,
  lastFetchedAt,
  marketStatuses = [],
  fullAnalystMonitor,
  fullAnalystMonitorError,
  fullAnalystPilot,
  fullAnalystPilotError,
  isRefreshing,
  onRefresh,
  assetHref,
}: AnalystDeskProps) {
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ExceptionStatusFilter>("all");
  const [copyResult, setCopyResult] = useState<string | null>(null);
  const locale = localeFor(language);
  const exceptions = status?.failedSymbols ?? [];
  const exchangeOptions = useMemo(
    () => Array.from(new Set(exceptions.map((row) => row.exchange))).sort((left, right) => left.localeCompare(right, "en")),
    [exceptions],
  );
  const filteredExceptions = exceptions.filter((row) => {
    const exchangeMatches = exchangeFilter === "all" || row.exchange === exchangeFilter;
    const statusMatches = statusFilter === "all" || row.severity === statusFilter;
    return exchangeMatches && statusMatches;
  });
  const lastFetched = lastFetchedAt ? formatShanghaiTimestamp(lastFetchedAt, locale) : copy(language, "未读取", "Not fetched");
  const statusLabel = statusLabelText(status?.statusLabel ?? null, language);
  const statusTone = status?.statusTone ?? "critical";
  const canaryTone = fullAnalystMonitor?.statusTone ?? fullAnalystPilot?.statusTone ?? "neutral";

  async function handleCopyEvidence() {
    if (!status) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createEvidenceSummary(status));
      setCopyResult(copy(language, "证据已复制", "Evidence copied"));
    } catch (reason) {
      setCopyResult(reason instanceof Error ? reason.message : copy(language, "复制失败", "Copy failed"));
    }
  }

  const kpis = status
    ? [
        { label: copy(language, "股票池", "Universe"), value: status.universeCount },
        { label: copy(language, "已覆盖", "Covered"), value: status.successCount },
        { label: copy(language, "失败", "Failed"), value: status.failedCount },
        { label: copy(language, "已知缺口", "Allowed gaps"), value: status.allowedMissingCount },
        { label: copy(language, "意外失败", "Unexpected"), value: status.unexpectedFailedCount },
        { label: copy(language, "退出状态", "Exit status"), value: status.exitStatus ?? "n/a" },
      ]
    : [
        { label: copy(language, "股票池", "Universe"), value: "n/a" },
        { label: copy(language, "已覆盖", "Covered"), value: "n/a" },
        { label: copy(language, "失败", "Failed"), value: "n/a" },
        { label: copy(language, "已知缺口", "Allowed gaps"), value: "n/a" },
        { label: copy(language, "意外失败", "Unexpected"), value: "n/a" },
        { label: copy(language, "退出状态", "Exit status"), value: "n/a" },
      ];

  return (
    <section className="route-panel reports-shell analyst-desk-shell" aria-labelledby="reports-title">
      <div className="desk-top-rule" aria-hidden="true" />
      <div className="desk-boundary-strip">
        {evidenceBoundaryItems(language).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <header className={`desk-header tone-${statusTone}`}>
        <div className="desk-header-main">
          <span className="desk-eyebrow">{status ? modeLabel(status.mode, language) : copy(language, "公开产物不可用", "Public artifact unavailable")}</span>
          <div className="desk-title-row">
            <div>
              <h2 id="reports-title">{copy(language, "生产日报", "Production Daily Reports")}</h2>
              <p>{statusHeadline(status, language)}</p>
            </div>
            <span className={`desk-status-badge tone-${statusTone}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="desk-meta-grid" aria-label={copy(language, "分析台元数据", "Desk metadata")}>
          <div>
            <span>{copy(language, "报告模式", "Mode")}</span>
            <strong>{status ? modeLabel(status.mode, language) : "n/a"}</strong>
          </div>
          <div>
            <span>{copy(language, "统计日期", "As-of date")}</span>
            <strong>{status?.asOfDate ?? "n/a"}</strong>
          </div>
          <div>
            <span>{copy(language, "交易日", "Trading date")}</span>
            <strong>{status?.tradingDate ?? "n/a"}</strong>
          </div>
          <div>
            <span>{copy(language, "覆盖率", "Coverage")}</span>
            <strong>{status ? `${status.successCount}/${status.universeCount} · ${formatCoveragePct(status.coveragePct)}` : "n/a"}</strong>
          </div>
          <div>
            <span>{copy(language, "生成时间", "Generated time")}</span>
            <strong>{status ? formatShanghaiTimestamp(status.generatedAtUtc, locale) : "n/a"}</strong>
          </div>
          <div>
            <span>{copy(language, "下次运行", "Next expected run")}</span>
            <strong>{status ? formatNextRun(status, language, locale) : "n/a"}</strong>
          </div>
        </div>
      </header>

      {marketStatuses.length > 0 ? (
        <section className="desk-market-status-strip" aria-labelledby="desk-market-status-title">
          <div className="desk-section-head compact">
            <span>00</span>
            <h3 id="desk-market-status-title">{copy(language, "分市场报告状态", "Market Report Status")}</h3>
          </div>
          <div className="desk-market-status-grid">
            {marketStatuses.map((item) => {
              const itemStatus = item.status;
              const itemTone = itemStatus?.statusTone ?? "neutral";
              return (
                <article className={`desk-market-status-card tone-${itemTone}`} key={item.mode}>
                  <div>
                    <span>{modeLabel(item.mode, language)}</span>
                    <strong>{itemStatus ? statusLabelText(itemStatus.statusLabel, language) : copy(language, "待产物", "Pending")}</strong>
                  </div>
                  <p>
                    {itemStatus
                      ? `${itemStatus.successCount}/${itemStatus.universeCount} · ${formatCoveragePct(itemStatus.coveragePct)} · ${copy(language, "失败", "Failed")} ${itemStatus.failedCount}`
                      : item.error
                        ? copy(language, "状态文件未读取，等待下一次运行或发布。", "Status file unavailable; awaiting the next run or publish.")
                        : copy(language, "等待首次运行。", "Awaiting first run.")}
                  </p>
                  {marketStatusNote(item.mode, itemStatus, language) ? <p>{marketStatusNote(item.mode, itemStatus, language)}</p> : null}
                  <a href={assetHref(itemStatus?.statusFile ?? item.statusFile)}>{item.statusFile}</a>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={`full-analyst-pilot-card tone-${canaryTone}`} aria-labelledby="full-analyst-pilot-title">
        <div className="desk-section-head compact">
          <span>00A</span>
          <h3 id="full-analyst-pilot-title">{fullAnalystLabelText(language, "canary_full_chain")}</h3>
        </div>
        <div className="full-analyst-pilot-layout">
          <div className="full-analyst-pilot-summary">
            <div className="full-analyst-status-badges">
              <span className={`desk-status-badge tone-${fullAnalystPilot?.statusTone ?? "neutral"}`}>
                {fullAnalystPilotLabel(fullAnalystPilot?.statusLabel ?? null, language)}
              </span>
              <span className={`desk-status-badge tone-${fullAnalystMonitor?.statusTone ?? "neutral"}`}>
                {fullAnalystMonitorLabel(fullAnalystMonitor?.statusLabel ?? null, language)}
              </span>
            </div>
            <p>{fullAnalystPilotHeadline(fullAnalystPilot, language)}</p>
            <p className="desk-source-note">
              {copy(
                language,
                `生产先行试跑证据层级：${fullAnalystPilot?.evidenceLayer ?? "local checks + status artifact"}；不是正式验收、科学证明、业绩证明、交易信号或投资建议。`,
                `Production canary evidence layer: ${fullAnalystPilot?.evidenceLayer ?? "local checks + status artifact"}; not formal acceptance, science proof, performance proof, a trading signal, or investment advice.`,
              )}
            </p>
            {fullAnalystPilot?.heartbeatStale ? (
              <p className="desk-source-note warning">
                {copy(language, "心跳过期：不要把当前状态展示为健康运行。", "Heartbeat stale: do not present the loop as healthy running.")}
              </p>
            ) : null}
            {fullAnalystPilot?.isMockAlaya ? (
              <p className="desk-source-note warning">
                {copy(language, `内部 Alaya 模式为 ${fullAnalystPilot.alayaMode}；这不是外部服务或真实同步验收证据。`, `Alaya mode is ${fullAnalystPilot.alayaMode}; this is not real sync evidence.`)}
              </p>
            ) : null}
            {fullAnalystPilotError ? (
              <p className="desk-source-note warning">
                {copy(language, "状态文件未读取：", "Status file unavailable:")} <span className="mono">{fullAnalystPilotError}</span>
              </p>
            ) : null}
            {fullAnalystMonitorError ? (
              <p className="desk-source-note warning">
                {copy(language, "monitor 文件未读取：", "Monitor file unavailable:")} <span className="mono">{fullAnalystMonitorError}</span>
              </p>
            ) : null}
          </div>
          <div className="full-analyst-pilot-grid" aria-label={copy(language, "完整分析链路指标", "Full analyst pilot metrics")}>
            <div>
              <span>{fullAnalystLabelText(language, "service_timer")}</span>
              <strong className="mono">{fullAnalystPilot ? `${fullAnalystPilot.candidateService ?? "not_reported"} · ${fullAnalystPilot.candidateTimer ?? "not_reported"}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "timer_state")}</span>
              <strong>
                {fullAnalystMonitor
                  ? `${runtimeStatusText(language, fullAnalystMonitor.candidate.timerState)} · ${fullAnalystMonitor.candidate.timerEnabled ? runtimeStatusText(language, "enabled") : runtimeStatusText(language, "disabled")} · ${copy(language, "下次运行", "next")} ${fullAnalystMonitor.candidate.nextRunAt ?? "n/a"}`
                  : copy(language, "活跃状态、启用状态和下次运行未由监控上报", "active/enabled/next run not reported by monitor")}
              </strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "run_id")}</span>
              <strong className="mono">{fullAnalystPilot?.runId ?? "pending"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "phase")}</span>
              <strong>{fullAnalystPilot?.phase ? fullAnalystStageText(language, fullAnalystPilot.phase) : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "heartbeat")}</span>
              <strong>{fullAnalystPilot?.lastHeartbeatUtc ? formatShanghaiTimestamp(fullAnalystPilot.lastHeartbeatUtc, locale) : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "elapsed")}</span>
              <strong>{fullAnalystPilot ? (language === "zh" ? `${Math.round(fullAnalystPilot.elapsedSeconds / 60)} 分钟` : `${Math.round(fullAnalystPilot.elapsedSeconds / 60)} min`) : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "cycle")}</span>
              <strong>{fullAnalystPilot ? `${copy(language, "当前", "current")} ${fullAnalystPilot.currentCycle} · ${copy(language, "最近成功", "success")} ${fullAnalystPilot.lastSuccessfulCycle}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "universe")}</span>
              <strong>{compactSymbolSummary(fullAnalystPilot, language)}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "exchange_split")}</span>
              <strong>{fullAnalystPilot ? formatExchangeCounts(fullAnalystPilot.exchangeCounts, language) : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "publish")}</span>
              <strong>{fullAnalystPilot?.publishCount ?? "n/a"}/{fullAnalystPilot?.universeCount ?? "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "review_blocked_gap")}</span>
              <strong>{fullAnalystPilot ? `${fullAnalystPilot.needsReviewCount} / ${fullAnalystPilot.blockedCount} / ${fullAnalystPilot.dataGapCount}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "alaya_sync")}</span>
              <strong>{fullAnalystPilot ? `${fullAnalystPilot.alayaSyncedCount} ${copy(language, "已同步", "synced")} · ${fullAnalystPilot.alayaFailedCount} ${copy(language, "失败", "failed")} · ${fullAnalystPilot.alayaMode ?? "n/a"}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "alaya_readback")}</span>
              <strong>{fullAnalystPilot ? `${fullAnalystPilot.alayaReadbackVerifiedCount} ${copy(language, "已验证", "verified")} · ${fullAnalystPilot.alayaReadbackFailedCount} ${copy(language, "失败", "failed")}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "runner")}</span>
              <strong className="mono">{fullAnalystPilot ? `${fullAnalystPilot.llmRunner ?? "n/a"} · ${fullAnalystPilot.llmModel ?? "n/a"} · c=${fullAnalystPilot.maxConcurrency ?? "n/a"}` : "n/a"}</strong>
            </div>
            <div>
              <span>{fullAnalystLabelText(language, "status_files")}</span>
              <strong className="mono">{fullAnalystPilot?.statusFile ?? "status_full_analyst_evening_hk.json"}</strong>
            </div>
          </div>
        </div>
        <div className="full-analyst-monitor-grid" aria-label={copy(language, "monitor 健康检查", "Monitor health checks")}>
          <div>
            <span>{fullAnalystLabelText(language, "overall_health")}</span>
            <strong>{fullAnalystMonitor ? `${runtimeStatusText(language, fullAnalystMonitor.overallStatus)} · ${fullAnalystMonitor.verdict}` : "n/a"}</strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "service_state")}</span>
            <strong>
              {fullAnalystMonitor
                ? `${runtimeStatusText(language, fullAnalystMonitor.candidate.serviceState)} · ${runtimeStatusText(language, fullAnalystMonitor.candidate.serviceResult)}`
                : "n/a"}
            </strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "heartbeat_freshness")}</span>
            <strong>
              {fullAnalystMonitor
                ? `${runtimeStatusText(language, fullAnalystMonitor.checks.heartbeat)} · ${copy(language, "年龄", "age")} ${formatAgeSeconds(fullAnalystMonitor.latestRun.heartbeatAgeSeconds, language)}`
                : "n/a"}
            </strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "artifact_freshness")}</span>
            <strong>
              {fullAnalystMonitor
                ? `${runtimeStatusText(language, fullAnalystMonitor.checks.artifact)} · ${copy(language, "年龄", "age")} ${formatAgeSeconds(fullAnalystMonitor.latestRun.artifactAgeSeconds, language)}`
                : "n/a"}
            </strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "public_scan")}</span>
            <strong>{runtimeStatusText(language, fullAnalystMonitor?.checks.public_scan ?? fullAnalystPilot?.publicScanStatus ?? "unknown")}</strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "alaya_readback")}</span>
            <strong>{runtimeStatusText(language, fullAnalystMonitor?.checks.alaya_readback ?? fullAnalystPilot?.alayaReadbackStatus ?? "unknown")}</strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "latest_run")}</span>
            <strong className="mono">{fullAnalystMonitor?.latestRun.runId ?? fullAnalystPilot?.runId ?? "pending"}</strong>
          </div>
          <div>
            <span>{fullAnalystLabelText(language, "rollback_mode")}</span>
            <strong>
              {fullAnalystMonitor
                ? `${runtimeStatusText(language, fullAnalystMonitor.rollback.mode)} · ${copy(language, "仅候选服务", "candidate_only")}=${fullAnalystMonitor.rollback.candidateOnly ? "true" : "false"}`
                : runtimeStatusText(language, "manual_ssh_runbook")}
            </strong>
          </div>
        </div>
        {fullAnalystMonitor?.statusCodes.length ? (
          <div className="full-analyst-stage-strip" aria-label={copy(language, "monitor status taxonomy", "Monitor status taxonomy")}>
            {fullAnalystMonitor.statusCodes.map((code) => (
              <span key={code}>
                {copy(language, "状态", "status")} <strong>{runtimeStatusText(language, code)}</strong>
              </span>
            ))}
          </div>
        ) : null}
        <div className="full-analyst-stage-strip" aria-label={copy(language, "完整链路阶段状态", "Full-chain stage statuses")}>
          {Object.entries(fullAnalystPilot?.stageStatuses ?? {}).length > 0 ? (
            Object.entries(fullAnalystPilot?.stageStatuses ?? {}).map(([stage, value]) => (
              <span key={stage}>
                {formatStageLabel(stage, language)} <strong>{runtimeStatusText(language, value)}</strong>
              </span>
            ))
          ) : (
            <span>{copy(language, "阶段状态未由公开状态上报", "stage_statuses not reported by public status")}</span>
          )}
        </div>
        {fullAnalystPilot?.rollbackHint ? (
          <p className="desk-source-note">
            {copy(language, "回滚", "Rollback")}: {fullAnalystPilot.rollbackHint}
          </p>
        ) : (
          <p className="desk-source-note">
            {copy(language, "回滚：停用候选定时器/服务，或将 max_concurrency 降到 1。", "Rollback: disable the candidate timer/service, or lower max_concurrency to 1.")}
          </p>
        )}
        {fullAnalystPilot?.issues.length ? (
          <div className="full-analyst-pilot-issues">
            {fullAnalystPilot.issues.slice(0, 4).map((issue) => (
              <span key={`${issue.stage}-${issue.exchange}-${issue.symbol}-${issue.reason}`}>
                {issue.stage}: {issue.exchange}:{issue.symbol} · {issue.reason}
              </span>
            ))}
          </div>
        ) : null}
        <div className="public-artifact-links compact">
          <a href={assetHref(fullAnalystPilot?.statusFile ?? "status_full_analyst_evening_hk.json")}>
            /reports/{fullAnalystPilot?.statusFile ?? "status_full_analyst_evening_hk.json"}
          </a>
          <a href={assetHref("status_full_analyst_monitor.json")}>/reports/status_full_analyst_monitor.json</a>
          <a href={assetHref(fullAnalystPilot?.latestPublicReportFile ?? "full_analyst_evening_hk_2026-06-30.md")}>
            {fullAnalystPilot?.latestPublicReportFile ?? "full_analyst_evening_hk_2026-06-30.md"}
          </a>
          {fullAnalystMonitor?.links.rollbackRunbook ? (
            <a href={fullAnalystMonitor.links.rollbackRunbook} target="_blank" rel="noreferrer">
              {fullAnalystLabelText(language, "rollback_runbook")}
            </a>
          ) : null}
        </div>
      </section>

      <div className="desk-controls" aria-label={copy(language, "报告操作", "Report controls")}>
        <button className="desk-button" type="button" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw aria-hidden="true" size={16} />
          {isRefreshing ? copy(language, "刷新中", "Refreshing") : copy(language, "刷新", "Refresh")}
        </button>
        <button className="desk-button" type="button" onClick={handleCopyEvidence} disabled={!status}>
          <Clipboard aria-hidden="true" size={16} />
          {copy(language, "复制证据", "Copy Evidence")}
        </button>
        <span className="desk-last-fetched">{copy(language, "上次读取", "Last fetched")}: {lastFetched}</span>
        {copyResult ? <span className="desk-copy-result" role="status">{copyResult}</span> : null}
      </div>

      {statusError ? (
        <div className="edge-state-note warning" role="alert">
          {copy(language, "status.json 读取失败：", "status.json load failed:")} <span className="mono">{statusError}</span>
        </div>
      ) : null}

      {status ? (
        <>
          <section className="desk-section desk-executive" aria-labelledby="desk-executive-title">
            <div className="desk-section-head">
              <span>01</span>
              <h3 id="desk-executive-title">{copy(language, "执行摘要", "Executive Conclusion")}</h3>
            </div>
            <div className="desk-two-column">
              <ul className="desk-conclusion-list">
                {conclusionBullets(status, language).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="desk-kpi-matrix" aria-label={copy(language, "关键报告数字", "Key report numbers")}>
                {kpis.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="desk-section" aria-labelledby="desk-coverage-title">
            <div className="desk-section-head">
              <span>02</span>
              <h3 id="desk-coverage-title">{copy(language, "覆盖率矩阵", "Coverage Matrix")}</h3>
            </div>
            <div className="desk-two-column">
              <div className="table-scroll">
                <table className="desk-table">
                  <thead>
                    <tr>
                      <th>{copy(language, "交易所", "Exchange")}</th>
                      <th>{copy(language, "交易日", "Trading date")}</th>
                      <th>{copy(language, "股票池", "Universe")}</th>
                      <th>{copy(language, "已覆盖", "Covered")}</th>
                      <th>{copy(language, "失败", "Failed")}</th>
                      <th>{copy(language, "覆盖率", "Coverage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.byExchange.length > 0 ? (
                      status.byExchange.map((row) => (
                        <tr key={row.exchange}>
                          <td>{row.exchange}</td>
                          <td className="mono">{row.tradingDate ?? "n/a"}</td>
                          <td>{row.universe}</td>
                          <td>{row.success}</td>
                          <td className={row.failed > 0 ? "desk-risk-cell" : undefined}>{row.failed}</td>
                          <td>{formatCoveragePct(row.coveragePct)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>{copy(language, "未报告交易所矩阵", "No exchange matrix reported")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <aside className="desk-side-notes">
                {coverageNotes(status, language).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </aside>
            </div>
          </section>

          <section className="desk-section" aria-labelledby="desk-exceptions-title">
            <div className="desk-section-head">
              <span>03</span>
              <h3 id="desk-exceptions-title">{copy(language, "异常清单", "Exception Tape")}</h3>
            </div>
            <div className="exception-controls">
              <label>
                {copy(language, "交易所", "Exchange")}
                <select className="desk-select" value={exchangeFilter} onChange={(event) => setExchangeFilter(event.target.value)}>
                  <option value="all">{copy(language, "全部交易所", "All exchanges")}</option>
                  {exchangeOptions.map((exchange) => (
                    <option key={exchange} value={exchange}>
                      {exchange}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy(language, "状态", "Status")}
                <select className="desk-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExceptionStatusFilter)}>
                  <option value="all">{statusFilterLabel("all", language)}</option>
                  <option value="allowed_gap">{statusFilterLabel("allowed_gap", language)}</option>
                  <option value="unexpected_failure">{statusFilterLabel("unexpected_failure", language)}</option>
                </select>
              </label>
            </div>
            <div className="table-scroll">
              <table className="desk-table exception-table">
                <thead>
                  <tr>
                    <th>{copy(language, "级别", "Severity")}</th>
                    <th>{copy(language, "交易所", "Exchange")}</th>
                    <th>{copy(language, "代码", "Symbol")}</th>
                    <th>{copy(language, "数据源代码", "Provider ticker")}</th>
                    <th>{copy(language, "原因", "Reason")}</th>
                    <th>{copy(language, "处理", "Treatment")}</th>
                    <th>{copy(language, "动作", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.length > 0 ? (
                    filteredExceptions.map((row) => (
                      <tr key={exceptionKey(row)}>
                        <td>
                          <span className={`exception-pill ${row.severity}`}>{severityLabel(row.severity, language)}</span>
                        </td>
                        <td>{row.exchange}</td>
                        <td className="mono">{row.symbol}</td>
                        <td className="mono">{row.providerTicker}</td>
                        <td>{row.reason}</td>
                        <td>{exceptionTreatment(row, language)}</td>
                        <td>{exceptionAction(row, language)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>{copy(language, "未报告异常", "No exceptions reported")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="desk-section desk-executive" aria-labelledby="desk-unavailable-title">
          <div className="desk-section-head">
            <span>01</span>
            <h3 id="desk-unavailable-title">{copy(language, "产物不可用", "Artifact unavailable")}</h3>
          </div>
          <ul className="desk-conclusion-list">
            {conclusionBullets(null, language).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="desk-section" aria-labelledby="desk-preview-title">
        <div className="desk-section-head">
          <span>04</span>
          <h3 id="desk-preview-title">{copy(language, "公开产物预览", "Public Artifact Preview")}</h3>
        </div>
        {markdown ? (
          <pre className="report-markdown-reader artifact-preview">{markdown}</pre>
        ) : (
          <div className="edge-state-note" role="status">
            {copy(language, "latest.md 预览不可用。", "latest.md preview unavailable.")}
            {markdownError ? <> <span className="mono">{markdownError}</span></> : null}
          </div>
        )}
      </section>

      <section className="desk-section" aria-labelledby="desk-artifacts-title">
        <div className="desk-section-head">
          <span>05</span>
          <h3 id="desk-artifacts-title">{copy(language, "公开产物链接", "Public Artifact Links")}</h3>
        </div>
        <div className="public-artifact-links">
          <a href={assetHref(status?.statusFile ?? "status.json")}>/reports/status.json</a>
          <a href={assetHref(status?.latestFile ?? "latest.md")}>/reports/latest.md</a>
          {status?.reportFile ? <a href={assetHref(status.reportFile)}>{status.reportFile}</a> : null}
        </div>
        <p className="desk-source-note">
          {copy(
            language,
            "仅公开产物。本页不暴露私有运行日志、环境文件、数据库文件或原始数据源/模型输入输出。",
            "Public artifacts only. No private runtime logs, environment files, database files, or raw provider/model I/O are exposed here.",
          )}
        </p>
        {status?.source ? <p className="desk-source-note">{copy(language, "来源", "Source")}: {status.source}</p> : null}
      </section>

      <section className="desk-section evidence-boundary" aria-labelledby="desk-boundary-title">
        <div className="desk-section-head">
          <span>06</span>
          <h3 id="desk-boundary-title">{copy(language, "证据边界", "Boundary & Evidence Layer")}</h3>
        </div>
        <div className="evidence-boundary-grid">
          {evidenceBoundaryItems(language).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    </section>
  );
}
