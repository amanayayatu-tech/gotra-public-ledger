import { describe, expect, it } from "vitest";
import { buildDailyReaderBrief, normalizeDailyReaderBriefArtifact, publicBriefSafetyIssues } from "./dailyReaderBrief";
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

    expect(brief.schema_version).toBe("gotra.daily_reader_brief.v2");
    expect(brief.schema).toBe("gotra.daily_reader_brief.v2");
    expect(brief.brief_date).toBe("2026-07-01");
    expect(brief.title.zh).toBe("7月1日市场研究简报");
    expect(brief.title.en).toBe("Market research brief for 2026-07-01");
    expect(brief.evidence_layer).toContain("public-safe artifact smoke");
    expect(brief.daily_report_status.status).toBe("reports_updated");
    expect(brief.full_analyst.report_markdown).toBe("/reports/full_analyst_evening_hk_2026-06-30.md");
    expect(brief.full_analyst.summary.en).toContain("Canary");
    expect(brief.prompt_framework_summary.raw_io_policy).toContain("No raw prompt");
    expect(brief.internal_alaya.interpretation.zh).toContain("GOTRA 内部 Alaya cognition flywheel");
    expect(brief.agent_analysis_items).toEqual([]);
    expect(brief.top_items[0]?.label.zh).toContain("覆盖完整");
    expect(brief.known_gaps).toEqual([]);
    expect(brief.research_effectiveness.daily_update_status).toBe("reports_updated");
    expect(brief.system_health.full_analyst_canary).toBe("healthy");
    expect(brief.tldr.zh).toContain("不构成投资建议或交易信号");
    expect(brief.tldr.en).toContain("not investment advice");
    expect(brief.boundary.every((item) => item.zh && item.en)).toBe(true);
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
    expect(brief.research_watchlist[0]).toMatchObject({
      symbol: "NYSE:CWAN",
      source: "daily_gap",
    });
    expect(brief.known_gaps[0]?.affected_report).toBe("美股晚报");
    expect(brief.next_watch.map((item) => `${item.zh}\n${item.en}`).join("\n")).toContain("NYSE:CWAN");
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
    expect(brief.top_items.some((item) => item.label.zh.includes("需要复核"))).toBe(true);
    expect(JSON.stringify(brief)).not.toMatch(/\bstrong buy\b|\bshould buy\b|\bshould sell\b/i);
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
    expect(brief.top_items[0]?.label.zh).toContain("暂不可完整读取");
  });

  it("surfaces healthy and degraded Full Analyst canary states", () => {
    const healthyBrief = buildDailyReaderBrief(snapshot({ fullAnalystMonitor: monitor("healthy") }), { now });
    const degradedBrief = buildDailyReaderBrief(snapshot({ fullAnalystMonitor: monitor("degraded") }), { now });

    expect(healthyBrief.top_items.some((item) => item.summary.zh.includes("内部 Alaya 回读正常"))).toBe(true);
    expect(degradedBrief.system_health.full_analyst_canary).toBe("degraded");
    expect(degradedBrief.next_watch.map((item) => item.zh).join("\n")).toContain("先行试跑");
  });

  it("normalizes v1 artifacts into the v2 localized contract", () => {
    const built = buildDailyReaderBrief(snapshot(), { now });
    const v1Artifact = {
      schema: "gotra.daily_reader_brief.v1",
      brief_date: built.brief_date,
      generated_at: built.generated_at,
      evidence_layer: built.evidence_layer,
      title: "旧版标题",
      subtitle: "旧版副标题",
      tldr: "旧版摘要",
      daily_report_status: { ...built.daily_report_status, summary: "旧版日报摘要" },
      full_analyst: { ...built.full_analyst, summary: "旧版 Full Analyst 摘要" },
      agent_analysis_items: [],
      prompt_framework_summary: { ...built.prompt_framework_summary, task_structure: ["旧版任务结构"] },
      internal_alaya: { ...built.internal_alaya, interpretation: "旧版内部 Alaya 摘要" },
      research_watchlist: [],
      top_items: [{ label: "旧版重点", summary: "旧版重点摘要", why_it_matters: "旧版原因" }],
      watchlist: [],
      changes_since_last_brief: ["旧版变化"],
      known_gaps: [],
      research_effectiveness: { ...built.research_effectiveness, reader_summary: "旧版读者摘要" },
      system_health: built.system_health,
      next_watch: ["旧版下一步"],
      boundary: ["旧版边界"],
      links: built.links,
    };

    const normalized = normalizeDailyReaderBriefArtifact(v1Artifact);

    expect(normalized?.schema_version).toBe("gotra.daily_reader_brief.v2");
    expect(normalized?.title.zh).toBe("旧版标题");
    expect(normalized?.title.en).toBe("GOTRA Daily Research Brief");
    expect(normalized?.top_items[0]?.summary.en).toBe("旧版重点摘要");
    expect(normalized?.technical_status.schema).toBe("gotra.daily_reader_brief.v1");
  });

  it("normalizes v3 independent-agent artifacts with audit metadata", () => {
    const built = buildDailyReaderBrief(snapshot(), { now });
    const v3Artifact = {
      ...built,
      schema_version: "gotra.daily_reader_brief.v3",
      schema: "gotra.daily_reader_brief.v3",
      full_analyst: {
        ...built.full_analyst,
        prompt_template_version: "gotra.full_analyst.prompt.v3.independent_agents",
        methodology_version: "ksana_4_1_independent_agents",
        execution_model: "independent_agent_calls",
        symbol_schema: "gotra.full_analyst.symbol.v3",
        alaya_event_schema: "gotra.cognition_flywheel.full_analyst_memory.v3",
        agent_parallelism: 4,
      },
      agent_analysis_items: [
        {
          symbol: "HKEX:0700",
          title: { zh: "HKEX:0700 研究摘要", en: "HKEX:0700 research summary" },
          execution_model: "independent_agent_calls",
          research_status: "watch",
          research_summary: { zh: "独立 agent 研究摘要", en: "Independent-agent research summary" },
          key_updates: [],
          research_context: [],
          k_deep_research: [{ zh: "K 证据边界", en: "K evidence boundary" }],
          f_partner_view: [{ zh: "F 正向条件", en: "F constructive conditions" }],
          w_partner_view: [{ zh: "W 反向条件", en: "W bear-case conditions" }],
          g_partner_view: [{ zh: "G 结构视角", en: "G structure view" }],
          chairman_synthesis: [{ zh: "主席冲突总结", en: "Chairman conflict synthesis" }],
          red_team_audit: [{ zh: "红队质疑", en: "Red-team challenge" }],
          evidence_gaps: [{ zh: "缺少最新公告复核", en: "Latest disclosure needs verification" }],
          watch_conditions: [{ zh: "等待下一次公开更新", en: "Wait for next public update" }],
          agent_statuses: {
            k_deep_research: "ok",
            f_partner_view: "ok",
            w_partner_view: "ok",
            g_partner_view: "ok",
            chairman_synthesis: "ok",
            red_team_audit: "ok",
          },
          agent_hashes: { k_deep_research: "abc123def456abc123def456" },
          agent_timings: { k_deep_research_seconds: 0.12, total_wall_clock_seconds: 0.44 },
          agent_retry_counts: { red_team_audit: 1, k_deep_research: 0 },
          agent_public_safety_triggers: { red_team_audit: ["raw_io_or_secret_wording"], k_deep_research: [] },
          parallelism: { symbol_parallelism: 3, agent_parallelism: 4, kfwg_ran_in_parallel: true },
          positive_case: [],
          negative_case: [],
          red_team_review: [],
          risk_factors: [],
          watch_items: [],
          source_notes: [],
        },
      ],
    };

    const normalized = normalizeDailyReaderBriefArtifact(v3Artifact);

    expect(normalized?.schema).toBe("gotra.daily_reader_brief.v3");
    expect(normalized?.full_analyst.execution_model).toBe("independent_agent_calls");
    expect(normalized?.full_analyst.agent_parallelism).toBe(4);
    expect(normalized?.agent_analysis_items[0]?.agent_statuses?.red_team_audit).toBe("ok");
    expect(normalized?.agent_analysis_items[0]?.agent_timings?.total_wall_clock_seconds).toBe(0.44);
    expect(normalized?.agent_analysis_items[0]?.agent_retry_counts?.red_team_audit).toBe(1);
    expect(normalized?.agent_analysis_items[0]?.agent_public_safety_triggers?.red_team_audit).toBe("raw_io_or_secret_wording");
    expect(JSON.stringify(normalized)).not.toContain("[object Object]");
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
      "ALAYA" + "_BASE_URL",
      "ALAYA" + "_WRITE_PATH",
    ];

    expect(publicBriefSafetyIssues(brief, forbidden)).toEqual([]);
  });
});
