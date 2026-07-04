import { describe, expect, it } from "vitest";
import { normalizeResearchLedgerManifest, researchLedgerStatuses, researchLedgerSymbols, researchLedgerWindows } from "./researchLedger";

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
      entries: [entry, { schema: "gotra.ledger_entry.v1" }],
    });

    expect(manifest.entries).toHaveLength(1);
    expect(researchLedgerSymbols(manifest.entries)).toEqual(["HKEX:0700"]);
    expect(researchLedgerStatuses(manifest.entries)).toEqual(["publish"]);
    expect(researchLedgerWindows(manifest.entries)).toEqual([30]);
  });

  it("rejects non-ledger manifests", () => {
    expect(() => normalizeResearchLedgerManifest({ schema: "raw" })).toThrow("research_ledger_schema_unavailable");
  });
});
