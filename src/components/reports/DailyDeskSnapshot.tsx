import { ArrowRight } from "lucide-react";
import { copy, type Language } from "../../i18n/language";
import {
  formatCoveragePct,
  formatShanghaiTimestamp,
  type NormalizedReportStatus,
  type ReportStatusFileResult,
} from "./ReportStatusModel";

export type DailyDeskSnapshotState =
  | { kind: "loading" }
  | { kind: "ready"; status: NormalizedReportStatus; lastFetchedAt: string; marketStatuses?: ReportStatusFileResult[] }
  | { kind: "error"; message: string };

export type DailyDeskSnapshotProps = {
  language: Language;
  reportStatus: DailyDeskSnapshotState;
  todayHref: string;
  reportsHref: string;
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

function statusSentence(status: NormalizedReportStatus, language: Language): string {
  if (status.statusLabel === "Completed") {
    return copy(language, "覆盖已完成，公开产物可用。", "Full coverage completed. Public artifacts are available.");
  }
  if (status.statusLabel === "Data gap, artifact published") {
    return copy(
      language,
      `报告已发布，但存在 ${status.allowedMissingCount || status.failedCount} 个已知数据源覆盖缺口。`,
      `Report published with ${status.allowedMissingCount || status.failedCount} known provider coverage gap(s).`,
    );
  }
  if (status.statusLabel === "Artifact write failed") {
    return copy(language, "产物写入失败。请勿把 latest.md 视为就绪。", "Artifact write failed. Do not treat latest.md as ready.");
  }
  if (status.statusLabel === "Stale") {
    return copy(language, "报告可能已过期；分享前请先查看 /reports。", "Report appears stale; check /reports before sharing.");
  }
  return copy(language, "报告部分完成，意外失败保持可见并需要复核。", "Partial report needs review. Unexpected failures remain visible.");
}

function primaryExceptionText(status: NormalizedReportStatus, language: Language): string {
  if (!status.primaryException) {
    return copy(language, "无主要异常", "No primary exception");
  }
  return status.primaryException;
}

function exceptionKindText(severity: string, language: Language): string {
  return severity === "allowed_gap"
    ? copy(language, "已知数据缺口", "Allowed data gap")
    : copy(language, "意外失败", "Unexpected failure");
}

export function DailyDeskSnapshot({ language, reportStatus, todayHref, reportsHref }: DailyDeskSnapshotProps) {
  const locale = localeFor(language);
  const status = reportStatus.kind === "ready" ? reportStatus.status : null;
  const marketStatuses = reportStatus.kind === "ready" ? reportStatus.marketStatuses ?? [] : [];
  const tone = status?.statusTone ?? (reportStatus.kind === "loading" ? "neutral" : "critical");
  const exceptions = status?.failedSymbols.slice(0, 3) ?? [];

  return (
    <section className={`home-report-ops daily-desk-snapshot tone-${tone}`} aria-labelledby="daily-desk-snapshot-title">
      <div className="daily-desk-topline" aria-hidden="true" />
      <div className="daily-desk-header">
        <div>
          <span className="section-index">{copy(language, "运行状态", "Operations")}</span>
          <div className="daily-desk-title-row">
            <h2 id="daily-desk-snapshot-title">{copy(language, "每日分析台快照", "Daily Desk Snapshot")}</h2>
            <span className={`desk-status-badge tone-${tone}`}>
              {status ? statusLabelText(status.statusLabel, language) : reportStatus.kind === "loading" ? copy(language, "加载中", "Loading") : statusLabelText(null, language)}
            </span>
          </div>
          <p>
            {status
              ? statusSentence(status, language)
              : reportStatus.kind === "loading"
                ? copy(language, "正在读取 /reports/status.json。", "Reading /reports/status.json.")
                : copy(language, "状态产物不可用；请打开今日简报或生产日报审计页复核。", "Status artifact unavailable; open today's brief or the production reports audit page.")}
          </p>
        </div>
        <div className="daily-desk-actions">
          <a className="primary-action daily-desk-link" href={todayHref}>
            {copy(language, "今日简报", "Today")}
            <ArrowRight aria-hidden="true" size={15} />
          </a>
          <a className="secondary-action daily-desk-link" href={reportsHref}>
            {copy(language, "生产日报", "Reports")}
            <ArrowRight aria-hidden="true" size={15} />
          </a>
        </div>
      </div>

      <div className="daily-desk-summary-grid">
        <article>
          <span>{copy(language, "报告模式", "Mode")}</span>
          <strong>{status ? modeLabel(status.mode, language) : "n/a"}</strong>
          <p>{status ? `${copy(language, "统计日期", "As-of date")} ${status.asOfDate ?? "n/a"} · ${copy(language, "交易日", "Trading date")} ${status.tradingDate ?? "n/a"}` : "status.json"}</p>
        </article>
        <article>
          <span>{copy(language, "覆盖率", "Coverage")}</span>
          <strong>{status ? `${status.successCount}/${status.universeCount}` : "n/a"}</strong>
          <p>{status ? `${formatCoveragePct(status.coveragePct)} · ${copy(language, "失败", "Failed")} ${status.failedCount}` : copy(language, "已覆盖 / 股票池", "success / universe")}</p>
        </article>
        <article>
          <span>{copy(language, "异常", "Exceptions")}</span>
          <strong>
            {status
              ? copy(
                  language,
                  `${status.allowedMissingCount} 已知 · ${status.unexpectedFailedCount} 意外`,
                  `${status.allowedMissingCount} allowed · ${status.unexpectedFailedCount} unexpected`,
                )
              : "n/a"}
          </strong>
          <p>{status ? primaryExceptionText(status, language) : copy(language, "无主要异常", "No primary exception")}</p>
        </article>
        <article>
          <span>{copy(language, "下次运行", "Next expected run")}</span>
          <strong>{status ? formatNextRun(status, language, locale) : "n/a"}</strong>
          <p>{status ? `${copy(language, "生成时间", "Generated")} ${formatShanghaiTimestamp(status.generatedAtUtc, locale)}` : copy(language, "预期排程", "Expected schedule")}</p>
        </article>
      </div>

      {status ? (
        <div className="daily-desk-coverage-mini" aria-label={copy(language, "覆盖率迷你矩阵", "Coverage mini matrix")}>
          {status.byExchange.slice(0, 4).map((row) => (
            <span key={row.exchange}>
              {row.exchange} <strong>{row.success}/{row.universe || "n/a"}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {marketStatuses.length > 0 ? (
        <div className="daily-market-report-grid" aria-label={copy(language, "分市场报告状态", "Market report status")}>
          {marketStatuses.map((item) => {
            const itemStatus = item.status;
            const itemTone = itemStatus?.statusTone ?? "neutral";
            return (
              <a className={`daily-market-report-card tone-${itemTone}`} href={reportsHref} key={item.mode}>
                <span>{modeLabel(item.mode, language)}</span>
                <strong>{itemStatus ? `${itemStatus.successCount}/${itemStatus.universeCount}` : copy(language, "待产物", "Pending")}</strong>
                <p>
                  {itemStatus
                    ? `${statusLabelText(itemStatus.statusLabel, language)} · ${formatCoveragePct(itemStatus.coveragePct)}`
                    : item.error
                      ? copy(language, "状态文件未读取", "Status file unavailable")
                      : copy(language, "等待首次运行", "Awaiting first run")}
                </p>
              </a>
            );
          })}
        </div>
      ) : null}

      <div className="daily-desk-exceptions">
        <span>{copy(language, "主要异常", "Main exceptions")}</span>
        {reportStatus.kind === "error" ? (
          <p className="mono">{reportStatus.message}</p>
        ) : exceptions.length > 0 ? (
          <ul>
            {exceptions.map((item) => (
              <li key={`${item.exchange}-${item.symbol}-${item.reason}`}>
                <strong>{item.exchange}:{item.symbol}</strong> {exceptionKindText(item.severity, language)} · {item.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>{copy(language, "未报告异常", "No exceptions reported")}</p>
        )}
      </div>

      <p className="daily-desk-boundary">
        {copy(
          language,
          "仅为运行和状态证据 · 不是投资建议 · 不是交易信号 · 不是业绩证明 · 不是科学或公开证明",
          "runtime/status evidence only · not investment advice · not trading signal · not performance proof · not science/public proof",
        )}
      </p>
    </section>
  );
}
