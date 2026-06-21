import { afterEach, describe, expect, it, vi } from "vitest";
import { computeSummary, getLedgerStatus, toRecordView } from "./metrics";
import { loadLedgerDataset, type LedgerDataset, type LedgerRecord } from "./schema";

const boundaryDate = "2026-02-01";

type RecordBaseOverrides = Partial<
  Omit<LedgerRecord, "direction_correct" | "actual_change_pct" | "error">
>;

type ResolvedOverrides = RecordBaseOverrides & {
  direction_correct?: boolean;
  actual_change_pct?: number;
  error?: number;
};

function baseRecord(overrides: ResolvedOverrides = {}): LedgerRecord {
  return {
    prediction_id: "PRED-BASE",
    ticker: "AAA",
    company: "A Corp",
    sector: "Demo",
    decision_date: "2026-01-01",
    direction: "up",
    expected_change_pct: 2,
    confidence: 0.7,
    reasoning: "public-safe demo fixture",
    evidence: [{ source: "fixture", date: "2026-01-01" }],
    prediction_window: "30天",
    outcome_availability_date: "2026-01-31",
    style_window: "fixture",
    provenance: { dataset_id: "metrics-fixture", source: "unit_test" },
    direction_correct: true,
    actual_change_pct: 3,
    error: 1,
    ...overrides,
  };
}

function dataset(records: LedgerRecord[]): LedgerDataset {
  return {
    metadata: {
      dataset_id: "metrics-fixture",
      dataset_type: "public_safe_demo",
      snapshot_date: "2026-01-01",
      source: { type: "fixture", description: "metrics unit test fixture" },
      current_date_for_boundary_review: boundaryDate,
      record_count: records.length,
      claim_boundary: ["Research information only", "Not investment advice"],
    },
    records,
  };
}

function pendingRecord(overrides: RecordBaseOverrides = {}): LedgerRecord {
  return {
    prediction_id: "PRED-BASE",
    ticker: "AAA",
    company: "A Corp",
    sector: "Demo",
    decision_date: "2026-01-01",
    direction: "up",
    expected_change_pct: 2,
    confidence: 0.7,
    reasoning: "public-safe demo fixture",
    evidence: [{ source: "fixture", date: "2026-01-01" }],
    prediction_window: "30天",
    outcome_availability_date: "2026-01-31",
    style_window: "fixture",
    provenance: { dataset_id: "metrics-fixture", source: "unit_test" },
    direction_correct: "pending",
    actual_change_pct: null,
    error: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ledger status derivation", () => {
  it("marks any non-pending direction_correct record as resolved", () => {
    expect(getLedgerStatus(baseRecord({ direction_correct: false }), boundaryDate)).toBe("resolved");
  });

  it("marks pending records with due outcome windows as frozen_pending", () => {
    expect(getLedgerStatus(pendingRecord({ outcome_availability_date: boundaryDate }), boundaryDate)).toBe(
      "frozen_pending",
    );
  });

  it("marks pending records with future outcome windows as pending", () => {
    expect(getLedgerStatus(pendingRecord({ outcome_availability_date: "2026-02-02" }), boundaryDate)).toBe("pending");
  });
});

describe("summary metrics", () => {
  it("uses only resolved records for direction hit rate and absolute error", () => {
    const summary = computeSummary(
      dataset([
        baseRecord({
          prediction_id: "hit",
          direction_correct: true,
          actual_change_pct: 3,
          error: 1,
        }),
        baseRecord({
          prediction_id: "miss",
          direction_correct: false,
          actual_change_pct: -8,
          error: -10,
        }),
        pendingRecord({
          prediction_id: "frozen",
          outcome_availability_date: "2026-01-15",
        }),
        pendingRecord({
          prediction_id: "pending",
          outcome_availability_date: "2026-03-01",
        }),
      ]),
    );

    expect(summary.total).toBe(4);
    expect(summary.resolved).toBe(2);
    expect(summary.frozenPending).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.directionHitRate).toBe(0.5);
    expect(summary.averageAbsoluteError).toBe(5.5);
  });

  it("returns null hit rate and average absolute error when no records are resolved", () => {
    const summary = computeSummary(
      dataset([
        pendingRecord({ prediction_id: "frozen", outcome_availability_date: "2026-01-15" }),
        pendingRecord({ prediction_id: "pending", outcome_availability_date: "2026-03-01" }),
      ]),
    );

    expect(summary.resolved).toBe(0);
    expect(summary.directionHitRate).toBeNull();
    expect(summary.averageAbsoluteError).toBeNull();
  });

  it("keeps all pending and frozen_pending records out of metric denominators", () => {
    const summary = computeSummary(
      dataset([
        pendingRecord({ prediction_id: "frozen-a", outcome_availability_date: "2026-01-15" }),
        pendingRecord({ prediction_id: "frozen-b", outcome_availability_date: "2026-02-01" }),
        pendingRecord({ prediction_id: "pending-a", outcome_availability_date: "2026-02-02" }),
      ]),
    );

    expect(summary.total).toBe(3);
    expect(summary.resolved).toBe(0);
    expect(summary.frozenPending).toBe(2);
    expect(summary.pending).toBe(1);
    expect(summary.directionHitRate).toBeNull();
    expect(summary.averageAbsoluteError).toBeNull();
  });
});

describe("schema recovery and metrics integration", () => {
  it("does not treat recoverable missing actual/error records as zero or resolved", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            metadata: {
              dataset_id: "dirty-public-safe-demo",
              dataset_type: "public_safe_demo",
              snapshot_date: "2026-01-01",
              source: { type: "fixture", description: "dirty schema fixture" },
              current_date_for_boundary_review: boundaryDate,
              record_count: 1,
              claim_boundary: ["Research information only", "Not investment advice"],
            },
            records: [
              {
                prediction_id: "missing-outcome",
                ticker: "AAA",
                company: "A Corp",
                sector: "Demo",
                decision_date: "2026-01-01",
                direction: "up",
                expected_change_pct: 2,
                confidence: 0.7,
                reasoning: "missing actual/error should be pending",
                evidence: [],
                prediction_window: "30天",
                outcome_availability_date: "2026-01-15",
                direction_correct: true,
                style_window: "fixture",
                provenance: { dataset_id: "dirty-public-safe-demo", source: "fixture" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const recovered = await loadLedgerDataset();
    const [view] = recovered.records.map((record) => toRecordView(record, recovered));
    const summary = computeSummary(recovered);

    expect(warnSpy).toHaveBeenCalled();
    expect(view.actual_change_pct).toBeNull();
    expect(view.error).toBeNull();
    expect(view.status).toBe("frozen_pending");
    expect(summary.resolved).toBe(0);
    expect(summary.directionHitRate).toBeNull();
    expect(summary.averageAbsoluteError).toBeNull();
  });
});
