import { describe, expect, it } from "vitest";
import {
  REPORT_SCHEDULES,
  buildReportDeskArtifacts,
  normalizeFullAnalystMonitorStatus,
  normalizeFullAnalystPilotStatus,
  normalizeReportStatus,
  type ReportRawStatus,
} from "./ReportStatusModel";

const now = new Date("2026-06-29T03:00:00.000Z");

function baseStatus(overrides: ReportRawStatus = {}): ReportRawStatus {
  return {
    schema: "gotra.public_stock_pool_report.v1",
    ok: true,
    run_status: "completed",
    mode: "morning-global",
    as_of_date: "2026-06-29",
    trading_date: "2026-06-26",
    exchange_trading_dates: {
      HKEX: "2026-06-26",
      NASDAQ: "2026-06-26",
      NYSE: "2026-06-26",
    },
    universe_count: 138,
    success_count: 138,
    failed_count: 0,
    allowed_missing_symbols: [],
    allowed_missing_count: 0,
    unexpected_failed_count: 0,
    exit_status: 0,
    artifact_write_status: "ok",
    by_exchange: {
      HKEX: {
        universe: 38,
        success: 38,
        failed: 0,
        trading_date: "2026-06-26",
      },
      NASDAQ: {
        universe: 74,
        success: 74,
        failed: 0,
        trading_date: "2026-06-26",
      },
      NYSE: {
        universe: 26,
        success: 26,
        failed: 0,
        trading_date: "2026-06-26",
      },
    },
    failed_symbols: [],
    generated_at_utc: "2026-06-29T02:06:00+00:00",
    source: "public-safe fixture",
    latest_file: "latest.md",
    status_file: "status.json",
    ...overrides,
  };
}

describe("normalizeReportStatus", () => {
  it("derives a completed status for full success", () => {
    const status = normalizeReportStatus(baseStatus(), { now });

    expect(status.statusLabel).toBe("Completed");
    expect(status.statusTone).toBe("good");
    expect(status.coveragePct).toBe(100);
    expect(status.failedSymbols).toEqual([]);
    expect(status.headline).toContain("Full coverage completed");
  });

  it("keeps allowlisted provider gaps visible without promoting them to success", () => {
    const status = normalizeReportStatus(
      baseStatus({
        ok: false,
        run_status: "completed_with_allowed_data_gaps",
        universe_count: 138,
        success_count: 137,
        failed_count: 1,
        allowed_missing_symbols: ["HKEX:0501"],
        allowed_missing_count: 1,
        unexpected_failed_count: 0,
        by_exchange: {
          HKEX: {
            universe: 38,
            success: 37,
            failed: 1,
            trading_date: "2026-06-26",
          },
        },
        failed_symbols: [
          {
            exchange: "HKEX",
            symbol: "0501",
            provider_ticker: "0501.HK",
            reason: "empty_price_frame",
          },
        ],
      }),
      { now },
    );

    expect(status.statusLabel).toBe("Data gap, artifact published");
    expect(status.statusTone).toBe("warning");
    expect(status.ok).toBe(false);
    expect(status.failedSymbols).toHaveLength(1);
    expect(status.failedSymbols[0]?.severity).toBe("allowed_gap");
    expect(status.allowedMissingCount).toBe(1);
    expect(status.unexpectedFailedCount).toBe(0);
  });

  it("marks unexpected failures as critical", () => {
    const status = normalizeReportStatus(
      baseStatus({
        ok: false,
        run_status: "partial",
        success_count: 137,
        failed_count: 1,
        allowed_missing_symbols: [],
        allowed_missing_count: 0,
        unexpected_failed_count: 1,
        failed_symbols: [
          {
            exchange: "NASDAQ",
            symbol: "MSFT",
            provider_ticker: "MSFT",
            reason: "provider_timeout",
          },
        ],
      }),
      { now },
    );

    expect(status.statusLabel).toBe("Partial, needs review");
    expect(status.statusTone).toBe("critical");
    expect(status.failedSymbols[0]?.severity).toBe("unexpected_failure");
    expect(status.primaryException).toContain("NASDAQ:MSFT");
  });

  it("gives artifact write failure priority over coverage counts", () => {
    const status = normalizeReportStatus(
      baseStatus({
        artifact_write_status: "failed",
        artifact_write_failure_reason: "permission_denied",
      }),
      { now },
    );

    expect(status.statusLabel).toBe("Artifact write failed");
    expect(status.statusTone).toBe("critical");
    expect(status.primaryException).toBe("permission_denied");
  });

  it("handles missing and legacy fields without hiding legacy missing symbols", () => {
    const status = normalizeReportStatus(
      {
        ok: false,
        mode: "evening-hk",
        as_of_date: "2026-06-29",
        universe_count: 2,
        success_count: 1,
        missing_symbols: [
          {
            exchange: "HKEX",
            symbol: "0005",
            provider_ticker: "0005.HK",
            reason: "legacy_missing_symbol",
          },
        ],
        generated_at_utc: "2026-06-29T02:06:00+00:00",
      },
      { now },
    );

    expect(status.failedCount).toBe(1);
    expect(status.statusLabel).toBe("Partial, needs review");
    expect(status.failedSymbols[0]).toMatchObject({
      exchange: "HKEX",
      symbol: "0005",
      severity: "unexpected_failure",
    });
    expect(status.latestFile).toBe("latest.md");
    expect(status.statusFile).toBe("status.json");
  });

  it("recognizes every scheduled market report mode", () => {
    const modes = REPORT_SCHEDULES.map((schedule) => schedule.key);

    expect(modes).toEqual(["morning-hk", "evening-hk", "morning-us", "evening-us", "morning-global"]);

    for (const schedule of REPORT_SCHEDULES) {
      const status = normalizeReportStatus(
        baseStatus({
          mode: schedule.key,
          status_file: schedule.statusFile,
          latest_file: schedule.latestFile,
        }),
        { now },
      );

      expect(status.mode).toBe(schedule.key);
      expect(status.statusFile).toBe(schedule.statusFile);
      expect(status.latestFile).toBe(schedule.latestFile);
      expect(status.nextExpectedRun.mode).toBe(schedule.key);
    }
  });

  it("calculates next US evening run by Shanghai weekday rather than UTC weekday", () => {
    const status = normalizeReportStatus(baseStatus({ mode: "evening-us" }), { now });

    expect(status.nextExpectedRun.mode).toBe("evening-us");
    expect(status.nextExpectedRun.date.toISOString()).toBe("2026-06-29T22:30:00.000Z");
  });
});

describe("buildReportDeskArtifacts", () => {
  it("keeps status ready when latest.md fetch fails", () => {
    const artifacts = buildReportDeskArtifacts(
      { status: "fulfilled", value: baseStatus() },
      { status: "rejected", reason: new Error("latest.md returned HTTP 404") },
      { now },
    );

    expect(artifacts.status?.statusLabel).toBe("Completed");
    expect(artifacts.statusError).toBeNull();
    expect(artifacts.markdown).toBeNull();
    expect(artifacts.markdownError).toContain("latest.md returned HTTP 404");
  });
});

describe("normalizeFullAnalystPilotStatus", () => {
  function fullAnalystStatus(overrides: ReportRawStatus = {}): ReportRawStatus {
    return {
      schema: "gotra.full_analyst.status.v1",
      ok: true,
      run_status: "completed",
      status: "completed",
      mode: "full-analyst-evening-hk-test",
      run_id: "full_analyst_evening_hk_20260629_v1",
      phase: "completed",
      current_cycle: 1,
      last_successful_cycle: 1,
      as_of_date: "2026-06-29",
      trading_date: "2026-06-29",
      sample_symbols: ["HKEX:0700", "HKEX:1810", "HKEX:9688", "HKEX:9969", "HKEX:0501"],
      universe_count: 5,
      symbol_count: 5,
      exchange_counts: { HKEX: 5 },
      symbol_hash: "abc123def456",
      success_count: 5,
      failed_count: 0,
      publish_count: 5,
      needs_review_count: 0,
      blocked_count: 0,
      data_gap_count: 0,
      alaya_synced_count: 5,
      alaya_failed_count: 0,
      alaya_readback_verified_count: 0,
      alaya_readback_failed_count: 0,
      alaya_sync_status: "ok",
      alaya_readback_status: "not_applicable",
      artifact_write_status: "ok",
      public_scan_status: "ok",
      evidence_layer: "local checks + one-shot runtime smoke + public-safe artifact smoke",
      limitations: ["not 10h evidence", "not formal acceptance", "not a trading signal"],
      llm_runner: "fixture",
      llm_model: "fixture",
      max_concurrency: 3,
      alaya_mode: "mock",
      candidate_service: "gotra-full-analyst-evening-hk-candidate.service",
      candidate_timer: "gotra-full-analyst-evening-hk-candidate.timer",
      rollback_hint: "disable candidate timer/service",
      stage_statuses: {
        data_fetch: "ok",
        llm_analyst: "ok",
        judge_gate: "ok",
        alaya_sync: "ok",
        alaya_readback: "not_applicable",
        public_safety_scan: "ok",
        artifact_write: "ok",
        public_publish: "published",
      },
      provider_model_io_embedded: false,
      exit_status: 0,
      report_file: "full_analyst_loop_latest.md",
      latest_public_report_file: "full_analyst_loop_latest.md",
      status_file: "status_full_analyst_loop.json",
      started_at_utc: "2026-06-29T02:00:00Z",
      finished_at_utc: "2026-06-29T02:05:00Z",
      last_heartbeat_utc: "2026-06-29T02:05:00Z",
      elapsed_seconds: 300,
      remaining_seconds: 0,
      heartbeat_stale: false,
      ...overrides,
    };
  }

  it("normalizes completed pilot status without promoting the evidence layer", () => {
    const status = normalizeFullAnalystPilotStatus(fullAnalystStatus());

    expect(status.statusLabel).toBe("Completed");
    expect(status.statusTone).toBe("good");
    expect(status.publishCount).toBe(5);
    expect(status.alayaSyncedCount).toBe(5);
    expect(status.symbolCount).toBe(5);
    expect(status.exchangeCounts).toEqual({ HKEX: 5 });
    expect(status.symbolHash).toBe("abc123def456");
    expect(status.maxConcurrency).toBe(3);
    expect(status.candidateService).toBe("gotra-full-analyst-evening-hk-candidate.service");
    expect(status.candidateTimer).toBe("gotra-full-analyst-evening-hk-candidate.timer");
    expect(status.rollbackHint).toBe("disable candidate timer/service");
    expect(status.stageStatuses.judge_gate).toBe("ok");
    expect(status.evidenceLayer).toContain("one-shot runtime smoke");
    expect(status.providerModelIoEmbedded).toBe(false);
    expect(status.statusFile).toBe("status_full_analyst_loop.json");
    expect(status.latestPublicReportFile).toBe("full_analyst_loop_latest.md");
    expect(status.isMockAlaya).toBe(true);
  });

  it("keeps review items visible as warning status", () => {
    const status = normalizeFullAnalystPilotStatus(
      fullAnalystStatus({
        ok: true,
        run_status: "completed_with_review_items",
        publish_count: 4,
        needs_review_count: 1,
        data_gap_count: 1,
        needs_review_symbols: [
          {
            exchange: "HKEX",
            symbol: "0501",
            provider_ticker: "0501.HK",
            reason: "price coverage is data_gap",
          },
        ],
      }),
    );

    expect(status.statusLabel).toBe("Review items");
    expect(status.statusTone).toBe("warning");
    expect(status.issues).toHaveLength(1);
    expect(status.issues[0]).toMatchObject({ exchange: "HKEX", symbol: "0501", stage: "needs_review" });
  });

  it("marks blocked or failed pilot status as critical", () => {
    const status = normalizeFullAnalystPilotStatus(
      fullAnalystStatus({
        ok: false,
        run_status: "completed_with_blockers",
        failed_count: 1,
        blocked_count: 1,
        blocked_symbols: [
          {
            exchange: "HKEX",
            symbol: "0700",
            provider_ticker: "0700.HK",
            reason: "forbidden_raw_io_keys_detected",
          },
        ],
        exit_status: 2,
      }),
    );

    expect(status.statusLabel).toBe("Blocked");
    expect(status.statusTone).toBe("critical");
    expect(status.issues[0]?.reason).toBe("forbidden_raw_io_keys_detected");
    expect(status.exitStatus).toBe(2);
  });

  it("shows running loop state without promoting it to completed", () => {
    const status = normalizeFullAnalystPilotStatus(
      fullAnalystStatus({
        ok: false,
        run_status: "running_with_warnings",
        status: "running",
        phase: "alaya_sync",
        current_cycle: 3,
        last_successful_cycle: 2,
        last_heartbeat_utc: "2026-06-29T02:59:00Z",
        elapsed_seconds: 7140,
        remaining_seconds: 28860,
      }),
      { now },
    );

    expect(status.statusLabel).toBe("Running");
    expect(status.statusTone).toBe("warning");
    expect(status.phase).toBe("alaya_sync");
    expect(status.currentCycle).toBe(3);
    expect(status.lastSuccessfulCycle).toBe(2);
    expect(status.isRunning).toBe(true);
  });

  it("marks stale loop heartbeat as critical", () => {
    const status = normalizeFullAnalystPilotStatus(
      fullAnalystStatus({
        ok: false,
        run_status: "running",
        status: "running",
        phase: "sleep",
        last_heartbeat_utc: "2026-06-29T02:40:00Z",
      }),
      { now },
    );

    expect(status.statusLabel).toBe("Stale");
    expect(status.statusTone).toBe("critical");
    expect(status.heartbeatStale).toBe(true);
  });

  it("does not display mock Alaya as real sync evidence", () => {
    const mockStatus = normalizeFullAnalystPilotStatus(fullAnalystStatus({ alaya_mode: "mock" }), { now });
    const realStatus = normalizeFullAnalystPilotStatus(
      fullAnalystStatus({
        alaya_mode: "real",
        alaya_readback_verified_count: 5,
        alaya_readback_status: "verified",
      }),
      { now },
    );

    expect(mockStatus.isMockAlaya).toBe(true);
    expect(mockStatus.alayaMode).toBe("mock");
    expect(realStatus.isMockAlaya).toBe(false);
    expect(realStatus.alayaReadbackVerifiedCount).toBe(5);
  });
});

describe("normalizeFullAnalystMonitorStatus", () => {
  function monitorStatus(overrides: ReportRawStatus = {}): ReportRawStatus {
    return {
      schema: "gotra.full_analyst.candidate_monitor.v1",
      generated_at: "2026-06-30T08:15:00Z",
      overall_status: "degraded",
      verdict: "PRODUCTION_CANARY_MONITOR_DEGRADED",
      candidate: {
        timer: "gotra-full-analyst-evening-hk-candidate.timer",
        service: "gotra-full-analyst-evening-hk-candidate.service",
        timer_active: true,
        timer_enabled: true,
        timer_state: "active",
        service_state: "activating",
        service_result: "success",
        last_run_at: "Tue 2026-06-30 15:25:55 CST",
        next_run_at: "Tue 2026-06-30 19:30:00 CST",
        rollback_mode: "manual_ssh_runbook",
      },
      latest_run: {
        run_id: "full_analyst_evening_hk_candidate_20260630T152555+0800",
        status: "running",
        heartbeat_at: "2026-06-30T08:04:45Z",
        heartbeat_age_seconds: 615,
        heartbeat_stale: true,
        artifact_updated_at: "2026-06-30T08:00:00Z",
        artifact_age_seconds: 900,
        artifact_stale: false,
      },
      checks: {
        timer: "ok",
        service: "ok",
        heartbeat: "stale",
        artifact: "ok",
        public_scan: "ok",
        alaya_readback: "ok",
      },
      status_codes: ["running", "heartbeat_stale"],
      links: {
        status_json: "/reports/status_full_analyst_evening_hk.json",
        report_markdown: "/reports/full_analyst_evening_hk_2026-06-30.md",
        rollback_runbook: "https://github.com/amanayayatu-tech/gotra/blob/main/ops/runbooks/full_analyst_candidate_rollback.md",
      },
      rollback: {
        mode: "manual_ssh_runbook",
        runbook_path: "ops/runbooks/full_analyst_candidate_rollback.md",
        runbook_url: "https://github.com/amanayayatu-tech/gotra/blob/main/ops/runbooks/full_analyst_candidate_rollback.md",
        candidate_only: true,
        affects_daily_timers: false,
        deletes_historical_reports: false,
      },
      limitations: ["production canary", "not investment advice", "not trading signal"],
      ...overrides,
    };
  }

  it("normalizes public-safe monitor health and rollback metadata", () => {
    const status = normalizeFullAnalystMonitorStatus(monitorStatus());

    expect(status.statusLabel).toBe("Degraded");
    expect(status.statusTone).toBe("warning");
    expect(status.candidate.timerActive).toBe(true);
    expect(status.candidate.timerEnabled).toBe(true);
    expect(status.latestRun.heartbeatStale).toBe(true);
    expect(status.checks.public_scan).toBe("ok");
    expect(status.statusCodes).toContain("heartbeat_stale");
    expect(status.rollback.mode).toBe("manual_ssh_runbook");
    expect(status.rollback.candidateOnly).toBe(true);
    expect(status.rollback.affectsDailyTimers).toBe(false);
    expect(status.links.statusJson).toBe("/reports/status_full_analyst_evening_hk.json");
  });

  it("marks failed monitor status as critical without hiding public scan failures", () => {
    const status = normalizeFullAnalystMonitorStatus(
      monitorStatus({
        overall_status: "failed",
        verdict: "PRODUCTION_CANARY_MONITOR_FAILED",
        checks: {
          timer: "ok",
          service: "ok",
          heartbeat: "ok",
          artifact: "ok",
          public_scan: "fail",
          alaya_readback: "ok",
        },
        status_codes: ["running", "public_scan_failed"],
      }),
    );

    expect(status.statusLabel).toBe("Failed");
    expect(status.statusTone).toBe("critical");
    expect(status.checks.public_scan).toBe("fail");
    expect(status.statusCodes).toContain("public_scan_failed");
  });
});
