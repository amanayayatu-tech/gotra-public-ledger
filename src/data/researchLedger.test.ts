import { describe, expect, it } from "vitest";
import {
  normalizeResearchLedgerManifest,
  researchLedgerReviewResult,
  researchLedgerReviewStatus,
  researchLedgerReviewUnavailable,
  researchLedgerStatuses,
  researchLedgerSymbols,
  researchLedgerWindows,
} from "./researchLedger";

const entry = {
  schema: "gotra.ledger_entry.v1",
  entry_id: "gotra:ledger:HKEX:0700:2026-06-29:30:v1",
  base_entry_id: "gotra:ledger:HKEX:0700:2026-06-29:30",
  version: 1,
  signal_id: "run:HKEX:0700:symbol:research_signal",
  published_at: "2026-06-29T10:00:00+00:00",
  as_of_date: "2026-06-29",
  window_days: 30,
  review_due_at: "2026-07-29",
  status: "publish",
  symbol: "0700",
  exchange: "HKEX",
  research_signal_hash: "signal-hash",
  publication_decision_hash: "decision-hash",
  evidence_packet_hash: "evidence-hash",
  previous_hash: "0".repeat(64),
  hash: "a".repeat(64),
};

describe("research ledger normalizer", () => {
  it("keeps valid ledger entries and exposes filters", () => {
    const manifest = normalizeResearchLedgerManifest({
      schema: "gotra.public_research_ledger.v1",
      generated_at: "2026-06-29T10:00:00+00:00",
      entry_count: 1,
      integrity: { ok: true, latest_hash: "a".repeat(64) },
      review_results: [
        {
          schema: "gotra.review_result.v1",
          entry_id: entry.entry_id,
          window_days: 30,
          reviewed_at: "2026-07-30T10:00:00+00:00",
          raw_return: 4,
          benchmark_return: 3,
          attribution: {
            classification: "above_benchmark",
            relative_return_pp: 1,
            quality_flags: ["fixture_public_price_observation"],
            explanation: "Arithmetic review only; not performance proof.",
          },
        },
      ],
      review_coverage: {
        supported_windows_days: [1, 7, 30, 90],
        total_count: 1,
        due_count: 1,
        reviewed_count: 1,
        not_due_count: 0,
        unavailable_count: 0,
        missing_due_entry_ids: [],
        by_window_days: [{ window_days: 30, total_count: 1, reviewed_count: 1, unavailable_count: 0, not_due_count: 0 }],
      },
      entries: [entry, { schema: "gotra.ledger_entry.v1" }],
    });

    expect(manifest.entries).toHaveLength(1);
    expect(researchLedgerSymbols(manifest.entries)).toEqual(["HKEX:0700"]);
    expect(researchLedgerStatuses(manifest.entries)).toEqual(["publish"]);
    expect(researchLedgerWindows(manifest.entries)).toEqual([30]);
    expect(manifest.review_coverage.reviewed_count).toBe(1);
    expect(researchLedgerReviewStatus(manifest, entry.entry_id)).toBe("reviewed");
    expect(researchLedgerReviewResult(manifest, entry.entry_id)?.raw_return).toBe(4);
  });

  it("normalizes unavailable review reasons without fabricating result fields", () => {
    const manifest = normalizeResearchLedgerManifest({
      schema: "gotra.public_research_ledger.v1",
      generated_at: "2026-07-30T10:00:00+00:00",
      entry_count: 1,
      integrity: { ok: true, latest_hash: "a".repeat(64) },
      review_unavailable: [
        {
          schema: "gotra.review_unavailable_reason.v1",
          entry_id: entry.entry_id,
          window_days: 30,
          reviewed_at: "2026-07-30T10:00:00+00:00",
          review_unavailable_reason: "public_review_price_or_benchmark_data_unavailable",
          missing_fields: ["start_price", "benchmark_end_price"],
        },
      ],
      entries: [entry],
    });

    expect(researchLedgerReviewStatus(manifest, entry.entry_id)).toBe("review_unavailable");
    expect(researchLedgerReviewUnavailable(manifest, entry.entry_id)?.missing_fields).toEqual(["start_price", "benchmark_end_price"]);
    expect(researchLedgerReviewResult(manifest, entry.entry_id)).toBeNull();
    expect(manifest.review_coverage.unavailable_count).toBe(1);
  });

  it("rejects non-ledger manifests", () => {
    expect(() => normalizeResearchLedgerManifest({ schema: "raw" })).toThrow("research_ledger_schema_unavailable");
  });
});
