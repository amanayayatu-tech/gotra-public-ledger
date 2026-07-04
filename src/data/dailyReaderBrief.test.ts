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

  it("normalizes v4 cognition flywheel artifacts with K dossier and knowledge gates", () => {
    const built = buildDailyReaderBrief(snapshot(), { now });
    const v4Artifact = {
      ...built,
      schema_version: "gotra.daily_reader_brief.v4",
      schema: "gotra.daily_reader_brief.v4",
      full_analyst: {
        ...built.full_analyst,
        prompt_template_version: "gotra.full_analyst.prompt.v4.ksana_cognition_flywheel",
        methodology_version: "ksana_cognition_flywheel_v4",
        execution_model: "deep_research_dossier_then_parallel_perspectives",
        symbol_schema: "gotra.full_analyst.symbol.v4",
        alaya_event_schema: "gotra.cognition_flywheel.full_analyst_memory.v4",
        agent_parallelism: 3,
      },
      agent_analysis_items: [
        {
          symbol: "HKEX:0700",
          title: { zh: "HKEX:0700 v4 研究摘要", en: "HKEX:0700 v4 research summary" },
          execution_model: "deep_research_dossier_then_parallel_perspectives",
          research_status: "needs_review",
          research_task: [{ zh: "selection_reason: 今日研究原因", en: "selection_reason: reason for today's research" }],
          evidence_packet: [{ zh: "data_gaps: 需要复核公开来源", en: "data_gaps: public sources need review" }],
          missing_required_sources: [{ zh: "issuer filing refresh", en: "issuer filing refresh" }],
          research_summary: { zh: "Chairman 综合 K+F/W/G 后维持 needs_review。", en: "Chairman keeps needs_review after synthesizing K+F/W/G." },
          key_updates: [],
          research_context: [],
          k_deep_research_dossier: [{ zh: "dossier_summary: K 先行生成 dossier", en: "dossier_summary: K produced the dossier first" }],
          k_deep_research: [],
          f_partner_view: [{ zh: "F 基于 K 的建设性视角", en: "F constructive view from K" }],
          w_partner_view: [{ zh: "W 基于 K 的反证视角", en: "W counter view from K" }],
          g_partner_view: [{ zh: "G 基于 K 的结构视角", en: "G structure view from K" }],
          chairman_synthesis: [{ zh: "Chairman synthesized K+F/W/G", en: "Chairman synthesized K+F/W/G" }],
          red_team_audit: [{ zh: "Red Team 是审计不是 Judge", en: "Red Team is audit, not Judge" }],
          research_quality_gate: [{ zh: "quality_verdict: pass_with_review_items", en: "quality_verdict: pass_with_review_items" }],
          knowledge_gate: [{ zh: "knowledge_persistence: persist_with_limitations", en: "knowledge_persistence: persist_with_limitations" }],
          knowledge_items_to_persist: [{ zh: "evidence_gap_memory", en: "evidence_gap_memory" }],
          unresolved_questions: [{ zh: "下一次公开来源如何补齐？", en: "Which public source should be refreshed next?" }],
          future_research_tasks: [{ zh: "刷新公告后重跑", en: "Rerun after disclosure refresh" }],
          evidence_gap_memory: [{ zh: "缺少最新公告复核", en: "Latest disclosure needs review" }],
          reader_boundary_gate: [{ zh: "does_not_hide_research_content: true", en: "does_not_hide_research_content: true" }],
          research_signal: {
            schema: "gotra.research_signal.v1",
            signal_id: "run:HKEX:0700:symbol:research_signal",
            signal_hash: "rs1234567890abcdef",
            source_id: "symbol",
            hypothesis: { zh: "研究状态需要保留复核项。", en: "Research state should keep review items visible." },
            confidence: "needs_review",
            evidence_ids: ["market_data_snapshot", "price_context"],
            counter_evidence: [{ zh: "发行人公告仍需复核。", en: "Issuer disclosure still needs review." }],
            uncertainty: [{ zh: "公开来源新鲜度有限。", en: "Public-source freshness is limited." }],
            window_days: 30,
            review_due_at: "2026-07-29",
            evidence_packet_id: "run:HKEX:0700:evidence_packet",
            evidence_packet_hash: "ep1234567890abcdef",
            market_data_snapshot_hash: "md1234567890abcdef",
            research_status: "needs_review",
          },
          publication_decision: {
            schema: "gotra.publication_decision.v1",
            decision_id: "run:HKEX:0700:publication_decision",
            decision_hash: "pd1234567890abcdef",
            signal_id: "run:HKEX:0700:symbol:research_signal",
            research_signal_hash: "rs1234567890abcdef",
            decision: "needs_review",
            reader_safe_reasons: ["v4 research quality gate requires visible review items"],
            blocker_type: "",
            gates: {
              public_safety_scan: {
                gate: "public_safety_scan",
                status: "pass",
                reader_safe_reason: "public safety scan passed",
              },
              data_completeness_gate: {
                gate: "data_completeness_gate",
                status: "needs_review",
                reader_safe_reason: "evidence gaps remain visible",
              },
            },
            publish_with_boundary: true,
            evidence_layer: "local checks + smoke evidence",
          },
          evidence_gaps: [],
          watch_conditions: [],
          confidence_boundary: { zh: "研究内容，不是交易信号。", en: "Research content, not a trading signal." },
          agent_statuses: { k_deep_research_dossier: "ok", f_partner_view: "ok", w_partner_view: "ok", g_partner_view: "ok" },
          agent_hashes: { f_partner_view: "abc123def456abc123def456" },
          agent_timings: { k_dossier_seconds: 0.11, total_wall_clock_seconds: 0.36 },
          parallelism: { symbol_parallelism: 3, fwg_ran_in_parallel: true, k_dossier_first: true },
          k_dossier_hash: "k1234567890abcdef",
          research_quality_gate_hash: "rq1234567890abcdef",
          knowledge_gate_hash: "kg1234567890abcdef",
          reader_boundary_gate_hash: "rb1234567890abcdef",
          research_signal_hash: "rs1234567890abcdef",
          agent_research_signal_hashes: { f_partner_view: "frs1234567890abcdef" },
          publication_decision_hash: "pd1234567890abcdef",
          public_payload_hash: "pp1234567890abcdef",
          positive_case: [],
          negative_case: [],
          red_team_review: [],
          risk_factors: [],
          watch_items: [],
          source_notes: [],
        },
      ],
    };

    const normalized = normalizeDailyReaderBriefArtifact(v4Artifact);

    expect(normalized?.schema).toBe("gotra.daily_reader_brief.v4");
    expect(normalized?.full_analyst.execution_model).toBe("deep_research_dossier_then_parallel_perspectives");
    expect(normalized?.agent_analysis_items[0]?.k_deep_research_dossier[0]?.en).toContain("K produced");
    expect(normalized?.agent_analysis_items[0]?.research_quality_gate[0]?.en).toContain("pass_with_review_items");
    expect(normalized?.agent_analysis_items[0]?.knowledge_gate[0]?.en).toContain("persist_with_limitations");
    expect(normalized?.agent_analysis_items[0]?.unresolved_questions[0]?.en).toContain("public source");
    expect(normalized?.agent_analysis_items[0]?.reader_boundary_gate[0]?.en).toContain("does_not_hide");
    expect(normalized?.agent_analysis_items[0]?.k_dossier_hash).toBe("k1234567890abcdef");
    expect(normalized?.agent_analysis_items[0]?.research_signal?.schema).toBe("gotra.research_signal.v1");
    expect(normalized?.agent_analysis_items[0]?.research_signal?.evidence_ids).toContain("market_data_snapshot");
    expect(normalized?.agent_analysis_items[0]?.research_signal_hash).toBe("rs1234567890abcdef");
    expect(normalized?.agent_analysis_items[0]?.agent_research_signal_hashes?.f_partner_view).toBe("frs1234567890abcdef");
    expect(normalized?.agent_analysis_items[0]?.publication_decision?.decision).toBe("needs_review");
    expect(normalized?.agent_analysis_items[0]?.publication_decision_hash).toBe("pd1234567890abcdef");
    expect(normalized?.agent_analysis_items[0]?.publication_decision?.gates.data_completeness_gate.status).toBe("needs_review");
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
