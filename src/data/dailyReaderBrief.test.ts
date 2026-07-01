import { describe, expect, it } from "vitest";
import { buildDailyReaderBrief, publicBriefSafetyIssues } from "./dailyReaderBrief";
import type { LiveReportEntry, LiveReportsSnapshot } from "./liveReports";
import type { FullAnalystMonitorStatus } from "../components/reports/ReportStatusModel";

function dailyEntry(overrides: Partial<LiveReportEntry> = {}): LiveReportEntry {
  return {
    id: "morning-hk",
    kind: "daily",
    labelZh: "港股早报",
    labelEn: "HK morning report",
    mode: "morning-hk",
    asOfDate: "2026-07-01",
    tradingDate: "2026-06-30",
    generatedAtUtc: "2026-07-01T01:00:03Z",
    runStatus: "completed",
    ok: true,
    reportFile: "public_stock_pool_morning_hk_2026-06-30.md",
    latestFile: "latest_morning_hk.md",
    statusFile: "status_morning_hk.json",
    reportHref: "/reports/public_stock_pool_morning_hk_2026-06-30.md",
    latestHref: "/reports/latest_morning_hk.md",
    statusHref: "/reports/status_morning_hk.json",
    universeCount: 38,
    successCount: 38,
    failedCount: 0,
    dataGapCount: 0,
    allowedMissingCount: 0,
    unexpectedFailedCount: 0,
    exceptions: [],
    artifactWriteStatus: "ok",
    monitorHealth: null,
    error: null,
    ...overrides,
  };
}

function monitor(overallStatus: "healthy" | "degraded"): FullAnalystMonitorStatus {
  return {
    overallStatus,
    verdict: overallStatus === "healthy" ? "PRODUCTION_CANARY_MONITOR_HEALTHY" : "PRODUCTION_CANARY_MONITOR_DEGRADED",
    generatedAt: "2026-07-01T02:25:02Z",
    statusTone: overallStatus === "healthy" ? "good" : "warning",
    statusLabel: overallStatus === "healthy" ? "Healthy" : "Degraded",
    statusCodes: [],
    candidate: {
      timer: "gotra-full-analyst-evening-hk.timer",
      service: "gotra-full-analyst-evening-hk.service",
      timerActive: true,
      timerEnabled: true,
      timerState: "active",
      serviceState: "inactive",
      serviceResult: "success",
      lastRunAt: "2026-06-30T12:13:44Z",
      nextRunAt: null,
      rollbackMode: "candidate_only",
    },
    latestRun: {
      runId: "full_analyst_evening_hk_candidate_20260630T193009+0800",
      status: "completed",
      heartbeatAt: "2026-06-30T12:13:44Z",
      heartbeatAgeSeconds: 120,
      heartbeatStale: false,
      artifactUpdatedAt: "2026-06-30T12:13:44Z",
      artifactAgeSeconds: 120,
      artifactStale: false,
    },
    checks: {
      alaya_readback: "ok",
      artifact: "ok",
      heartbeat: "not_required",
      public_scan: "ok",
    },
    links: {
      statusJson: "/reports/status_full_analyst_monitor.json",
      reportMarkdown: "/reports/full_analyst_evening_hk_2026-06-30.md",
      rollbackRunbook: null,
    },
    rollback: {
      mode: "candidate_only",
      runbookPath: null,
      runbookUrl: null,
      candidateOnly: true,
      affectsDailyTimers: false,
      deletesHistoricalReports: false,
    },
    limitations: ["production canary", "not investment advice", "not trading signal"],
  };
}

function snapshot(overrides: Partial<LiveReportsSnapshot> = {}): LiveReportsSnapshot {
  return {
    daily: [
      dailyEntry(),
      dailyEntry({ id: "evening-hk", labelZh: "港股晚报", labelEn: "HK evening report", mode: "evening-hk", statusFile: "status_evening_hk.json" }),
      dailyEntry({ id: "morning-us", labelZh: "美股早报", labelEn: "US morning report", mode: "morning-us", statusFile: "status_morning_us.json" }),
    ],
    fullAnalyst: null,
    fullAnalystPilot: null,
    fullAnalystMonitor: monitor("healthy"),
    artifacts: [],
    lastFetchedAt: "2026-07-01T02:30:00Z",
    ...overrides,
  };
}

describe("daily reader brief builder", () => {
  const now = new Date("2026-07-01T13:05:00Z");

  it("summarizes completed reports as reader-first top items", () => {
    const brief = buildDailyReaderBrief(snapshot(), { now });

    expect(brief.schema).toBe("gotra.daily_reader_brief.v1");
    expect(brief.brief_date).toBe("2026-07-01");
    expect(brief.title).toBe("7月1日市场研究简报");
    expect(brief.top_items[0]?.label).toContain("覆盖完整");
    expect(brief.known_gaps).toEqual([]);
    expect(brief.research_effectiveness.daily_update_status).toBe("reports_updated");
    expect(brief.system_health.full_analyst_canary).toBe("healthy");
    expect(brief.tldr).toContain("不构成投资建议或交易信号");
  });

  it("keeps completed_with_allowed_data_gaps visible in watchlist and known gaps", () => {
    const brief = buildDailyReaderBrief(
      snapshot({
        daily: [
          dailyEntry(),
          dailyEntry({
            id: "evening-us",
            labelZh: "美股晚报",
            labelEn: "US evening report",
            mode: "evening-us",
            runStatus: "completed_with_allowed_data_gaps",
            ok: false,
            universeCount: 100,
            successCount: 99,
            failedCount: 1,
            dataGapCount: 1,
            allowedMissingCount: 1,
            exceptions: [
              {
                exchange: "NYSE",
                symbol: "CWAN",
                providerTicker: "CWAN",
                reason: "trading_date_close_missing",
                severity: "allowed_gap",
                treatment: "allowlisted provider gap",
                action: "monitor provider coverage",
              },
            ],
          }),
        ],
      }),
      { now },
    );

    expect(brief.research_effectiveness.daily_update_status).toBe("reports_updated_with_gaps");
    expect(brief.watchlist[0]).toMatchObject({
      symbol: "NYSE:CWAN",
      status: "data_gap",
    });
    expect(brief.known_gaps[0]?.affected_report).toBe("美股晚报");
    expect(brief.next_watch.join("\n")).toContain("NYSE:CWAN");
  });

  it("marks partial or failed public reports as needs_review without inventing advice", () => {
    const brief = buildDailyReaderBrief(
      snapshot({
        daily: [
          dailyEntry({
            id: "morning-global",
            labelZh: "全局汇总",
            labelEn: "Global summary",
            mode: "morning-global",
            runStatus: "partial",
            ok: false,
            unexpectedFailedCount: 1,
            exceptions: [
              {
                exchange: "HKEX",
                symbol: "0501",
                providerTicker: "0501.HK",
                reason: "empty_price_frame",
                severity: "unexpected_failure",
                treatment: "unexpected failure",
                action: "review runtime status",
              },
            ],
          }),
        ],
      }),
      { now },
    );

    expect(brief.system_health.daily_reports).toBe("needs_review");
    expect(brief.top_items.some((item) => item.label.includes("需要复核"))).toBe(true);
    expect(JSON.stringify(brief)).not.toMatch(/buy|sell|position size/i);
  });

  it("falls back safely when status artifacts are missing", () => {
    const brief = buildDailyReaderBrief(
      snapshot({
        daily: [dailyEntry({ runStatus: "unavailable", asOfDate: null, tradingDate: null, reportFile: null })],
        fullAnalystMonitor: null,
      }),
      { now },
    );

    expect(brief.system_health.daily_reports).toBe("unavailable");
    expect(brief.research_effectiveness.canary_status).toBe("unavailable");
    expect(brief.top_items[0]?.label).toContain("暂不可完整读取");
  });

  it("surfaces healthy and degraded Full Analyst canary states", () => {
    const healthyBrief = buildDailyReaderBrief(snapshot({ fullAnalystMonitor: monitor("healthy") }), { now });
    const degradedBrief = buildDailyReaderBrief(snapshot({ fullAnalystMonitor: monitor("degraded") }), { now });

    expect(healthyBrief.top_items.some((item) => item.summary.includes("内部 Alaya 回读正常"))).toBe(true);
    expect(degradedBrief.system_health.full_analyst_canary).toBe("degraded");
    expect(degradedBrief.next_watch.join("\n")).toContain("金丝雀");
  });

  it("keeps generated brief free of raw-provider and secret-bearing terms", () => {
    const brief = buildDailyReaderBrief(snapshot(), { now });
    const forbidden = [
      "OPENAI_API_KEY",
      "sk-",
      "Bearer",
      "Authorization",
      "prompt_text",
      "raw_provider_response",
      "messages",
      "provider response",
      "stdout",
      "stderr",
      "secret",
      "token",
      "ALAYA_BASE_URL",
      "ALAYA_WRITE_PATH",
    ];

    expect(publicBriefSafetyIssues(brief, forbidden)).toEqual([]);
  });
});
