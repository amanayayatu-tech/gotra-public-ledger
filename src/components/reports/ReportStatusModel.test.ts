import { describe, expect, it } from "vitest";
import { buildReportDeskArtifacts, normalizeReportStatus, type ReportRawStatus } from "./ReportStatusModel";

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
