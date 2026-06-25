import { describe, expect, it } from "vitest";
import {
  adaptLedgerDatasetToPublicContract,
  outcomeRecordSchema,
  predictionRecordSchema,
  publicContractFixtureSchema,
  type OutcomeRecord,
} from "./publicContract";
import type { LedgerDataset, LedgerRecord } from "./schema";

const resolvedRecord: LedgerRecord = {
  prediction_id: "PRED-FIXTURE-RESOLVED",
  ticker: "NVDA",
  company: "NVIDIA",
  sector: "Semiconductors",
  decision_date: "2026-06-25",
  direction: "up",
  expected_change_pct: 2,
  confidence: 0.62,
  reasoning: "public-safe fixture record",
  evidence: [{ source: "fixture source", date: "2026-06-25" }],
  prediction_window: "7天",
  outcome_availability_date: "2026-07-02",
  style_window: "fixture",
  provenance: {
    dataset_id: "fixture-dataset",
    source: "unit_test_public_safe_fixture",
    source_record_index: 0,
  },
  direction_correct: true,
  actual_change_pct: 3,
  error: 1,
};

const pendingRecord: LedgerRecord = {
  ...resolvedRecord,
  prediction_id: "PRED-FIXTURE-PENDING",
  outcome_availability_date: "2026-07-10",
  direction_correct: "pending",
  actual_change_pct: null,
  error: null,
};

const dataset: LedgerDataset = {
  metadata: {
    dataset_id: "fixture-dataset",
    dataset_type: "public_safe_demo",
    snapshot_date: "2026-06-25",
    source: { type: "fixture", description: "public contract unit fixture" },
    current_date_for_boundary_review: "2026-07-03",
    record_count: 2,
    claim_boundary: [
      "Research information only",
      "Not investment advice",
      "Demo/public-safe dataset",
      "Not OOS",
      "Not science/public proof",
      "Not trading signal",
    ],
  },
  records: [resolvedRecord, pendingRecord],
};

describe("public contract adapter", () => {
  it("maps legacy ledger records into strict public prediction records", () => {
    const contract = adaptLedgerDatasetToPublicContract(dataset);
    const [prediction] = contract.predictions;

    expect(predictionRecordSchema.safeParse(prediction).success).toBe(true);
    expect(prediction.asset_id).toBe("US:NVDA");
    expect(prediction.horizon).toBe("7D");
    expect(prediction.claim_boundary).toContain("not_investment_advice");
    expect(JSON.stringify(prediction)).not.toMatch(/raw_prompt|raw_completion|provider_response|scorer_transcript/);
  });

  it("keeps outcomes as a separate surface without mutating predictions", () => {
    const contract = adaptLedgerDatasetToPublicContract(dataset);
    const resolved = contract.outcomes.find((record) => record.prediction_id === "PRED-FIXTURE-RESOLVED");
    const pending = contract.outcomes.find((record) => record.prediction_id === "PRED-FIXTURE-PENDING");
    const prediction = contract.predictions.find((record) => record.prediction_id === "PRED-FIXTURE-RESOLVED");

    expect(outcomeRecordSchema.safeParse(resolved).success).toBe(true);
    expect(resolved?.resolution_status).toBe("resolved");
    expect(resolved?.actual_change_pct).toBe(3);
    expect(pending?.resolution_status).toBe("pending");
    expect(pending?.actual_change_pct).toBeNull();
    expect(prediction).not.toHaveProperty("resolution_status");
    expect(prediction).not.toHaveProperty("actual_change_pct");
  });
});

describe("public contract schemas", () => {
  it("rejects resolved outcomes without an actual result", () => {
    const invalidOutcome: OutcomeRecord = {
      prediction_id: "PRED-FIXTURE-BAD",
      schema_version: "1.0",
      resolution_status: "resolved",
      actual_change_pct: null,
      direction_correct: null,
      error_pp: null,
      abs_error_pp: null,
      resolver_version: "outcome_resolver_v1",
      claim_boundary: ["research_information_only", "not_investment_advice"],
    };

    expect(outcomeRecordSchema.safeParse(invalidOutcome).success).toBe(false);
  });

  it("accepts direction-only resolved outcomes without fabricating numeric error fields", () => {
    const directionOnlyOutcome: OutcomeRecord = {
      prediction_id: "PRED-FIXTURE-DIRECTION-ONLY",
      schema_version: "1.0",
      resolution_status: "resolved",
      resolution_date: "2026-07-02",
      window_start: "2026-06-26",
      window_end: "2026-07-02",
      start_price: 100,
      end_price: 100.3,
      price_source_id: "fixture_adjusted_close_v1",
      actual_change_pct: 0.3,
      direction_correct: true,
      error_pp: null,
      abs_error_pp: null,
      resolver_version: "outcome_resolver_v1",
      claim_boundary: ["research_information_only", "not_investment_advice"],
    };

    expect(outcomeRecordSchema.safeParse(directionOnlyOutcome).success).toBe(true);
  });

  it("rejects direction-only resolved outcomes without traceable price/source fields", () => {
    const invalidOutcome: OutcomeRecord = {
      prediction_id: "PRED-FIXTURE-DIRECTION-ONLY-BAD",
      schema_version: "1.0",
      resolution_status: "resolved",
      resolution_date: "2026-07-02",
      actual_change_pct: 0.3,
      direction_correct: true,
      error_pp: null,
      abs_error_pp: null,
      resolver_version: "outcome_resolver_v1",
      claim_boundary: ["research_information_only", "not_investment_advice"],
    };

    expect(outcomeRecordSchema.safeParse(invalidOutcome).success).toBe(false);
  });

  it("rejects pending outcomes that carry fabricated result fields", () => {
    const invalidOutcome: OutcomeRecord = {
      prediction_id: "PRED-FIXTURE-PENDING-BAD",
      schema_version: "1.0",
      resolution_status: "pending",
      start_price: 100,
      end_price: 103,
      price_source_id: "fixture_adjusted_close_v1",
      actual_change_pct: 3,
      direction_correct: true,
      error_pp: 0.5,
      abs_error_pp: 0.5,
      resolver_version: "outcome_resolver_v1",
      claim_boundary: ["research_information_only", "not_investment_advice"],
    };

    expect(outcomeRecordSchema.safeParse(invalidOutcome).success).toBe(false);
  });

  it("rejects blocked outcomes that carry fabricated result fields", () => {
    const invalidOutcome: OutcomeRecord = {
      prediction_id: "PRED-FIXTURE-BLOCKED-BAD",
      schema_version: "1.0",
      resolution_status: "blocked_missing_price",
      start_price: 100,
      actual_change_pct: 3,
      direction_correct: true,
      error_pp: 0.5,
      abs_error_pp: 0.5,
      resolver_version: "outcome_resolver_v1",
      claim_boundary: ["research_information_only", "not_investment_advice"],
    };

    expect(outcomeRecordSchema.safeParse(invalidOutcome).success).toBe(false);
  });

  it("rejects fixtures containing non-resolved outcomes with result fields", () => {
    const prediction = adaptLedgerDatasetToPublicContract(dataset).predictions[0];
    const parsed = publicContractFixtureSchema.safeParse({
      schema_version: "1.0",
      dataset_id: "gotra_public_alpha_fixture_bad_pending",
      snapshot_date: "2026-06-25",
      predictions: [prediction],
      outcomes: [
        {
          prediction_id: prediction.prediction_id,
          schema_version: "1.0",
          resolution_status: "pending",
          actual_change_pct: 3,
          direction_correct: true,
          error_pp: 0.5,
          abs_error_pp: 0.5,
          resolver_version: "outcome_resolver_v1",
          claim_boundary: ["research_information_only", "not_investment_advice"],
        },
      ],
      portfolio_snapshots: [],
      content_items: [],
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a complete public-safe contract fixture shape", () => {
    const parsed = publicContractFixtureSchema.safeParse({
      schema_version: "1.0",
      dataset_id: "gotra_public_alpha_fixture_2026_06_25",
      snapshot_date: "2026-06-25",
      predictions: [adaptLedgerDatasetToPublicContract(dataset).predictions[0]],
      outcomes: [adaptLedgerDatasetToPublicContract(dataset).outcomes[0]],
      portfolio_snapshots: [
        {
          portfolio_id: "gotra_shadow_long_only_fixture_v1",
          schema_version: "1.0",
          policy_version: "portfolio_policy_v1",
          as_of_date: "2026-07-02",
          currency: "USD",
          initial_capital: 100000,
          cost_assumptions: { commission_bps: 0, slippage_bps: 5, fx_cost_bps: 10 },
          benchmark_ids: ["SPY", "QQQ", "HSTECH"],
          policy_boundary: {
            shorting: "disabled",
            live_trading: false,
            personalized_advice: false,
            post_hoc_rule_change_allowed: false,
          },
          metrics: {
            cumulative_return_pct: 0,
            benchmark_return_pct: 0,
            excess_return_pct: 0,
            max_drawdown_pct: 0,
            volatility_pct: 0,
            win_rate: null,
            turnover: 0,
            average_exposure: 0,
            sample_size: 0,
          },
          equity_curve: [{ date: "2026-06-25", equity: 100000, benchmark_equity: 100000, drawdown_pct: 0 }],
          positions: [],
          trades: [],
          claim_boundary: [
            "research_information_only",
            "not_investment_advice",
            "hypothetical_paper_performance",
            "not_live_trading",
            "not_trading_signal",
          ],
        },
      ],
      content_items: [
        {
          slug: "method-note-fixture",
          schema_version: "1.0",
          title: "Fixture Method Note",
          published_at: "2026-06-25T10:00:00+08:00",
          type: "method_note",
          tags: ["method"],
          summary: "Synthetic public-safe content fixture.",
          body_source: "public/content/articles/method-note-fixture.md",
          related_prediction_ids: ["PRED-FIXTURE-RESOLVED"],
          provenance: {
            source_repo: "gotra-public-ledger",
            exporter_version: "public_export_v1",
            exported_at: "2026-06-25T10:00:00+08:00",
          },
          claim_boundary: ["research_information_only", "not_investment_advice"],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
