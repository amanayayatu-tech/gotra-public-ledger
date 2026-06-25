import { describe, expect, it } from "vitest";
import { outcomeRecordSchema } from "./data-contract-core.mjs";
import { readJson, resolveOutcomes, sha256Json, stableStringify } from "./resolve-outcomes.mjs";

const predictions = readJson("public/data/fixtures/outcome-resolver/predictions.latest.json");
const priceSource = readJson("public/data/fixtures/outcome-resolver/price-source.fixture.json");
const existingOutcomes = readJson("public/data/fixtures/outcome-resolver/outcomes.latest.json");
const expectedOutcomes = readJson("public/data/fixtures/outcome-resolver/expected-outcomes.latest.json");
const expectedReport = readJson("public/data/fixtures/outcome-resolver/expected-report.json");

function runResolver() {
  const resolved = resolveOutcomes({
    predictions,
    priceSource,
    existingOutcomes,
    asOfDate: priceSource.as_of_date,
  });
  resolved.report.output_hash = sha256Json(resolved.outcomes);
  return resolved;
}

function byId(outcomes, predictionId) {
  return outcomes.find((outcome) => outcome.prediction_id === predictionId);
}

const fabricatedOutcomeFields = [
  "start_price",
  "end_price",
  "price_source_id",
  "actual_change_pct",
  "direction_correct",
  "error_pp",
  "abs_error_pp",
];

describe("outcome resolver fixture", () => {
  it("matches the golden public-safe outcomes and report", () => {
    const resolved = runResolver();

    expect(resolved.outcomes).toEqual(expectedOutcomes);
    expect(resolved.report).toEqual(expectedReport);
  });

  it("resolves expired pending and frozen_pending records from traceable fixture prices", () => {
    const resolved = runResolver();
    const up = byId(resolved.outcomes.outcomes, "pred_resolve_up_001");
    const down = byId(resolved.outcomes.outcomes, "pred_resolve_down_002");

    expect(outcomeRecordSchema.safeParse(up).success).toBe(true);
    expect(outcomeRecordSchema.safeParse(down).success).toBe(true);
    expect(up).toMatchObject({
      resolution_status: "resolved",
      price_source_id: "fixture_adjusted_close_v1",
      window_start: "2026-06-26",
      window_end: "2026-07-02",
      start_price: 100,
      end_price: 103,
      actual_change_pct: 3,
      direction_correct: true,
      error_pp: 0.5,
      abs_error_pp: 0.5,
    });
    expect(down).toMatchObject({
      resolution_status: "resolved",
      start_price: 50,
      end_price: 48.5,
      actual_change_pct: -3,
      direction_correct: true,
      error_pp: -2,
      abs_error_pp: 2,
    });
  });

  it("resolves direction correctness without fabricating error fields when expected_change_pct is missing", () => {
    const directionOnly = byId(runResolver().outcomes.outcomes, "pred_resolve_direction_only_009");

    expect(outcomeRecordSchema.safeParse(directionOnly).success).toBe(true);
    expect(directionOnly).toMatchObject({
      resolution_status: "resolved",
      start_price: 200,
      end_price: 200.6,
      price_source_id: "fixture_adjusted_close_v1",
      actual_change_pct: 0.3,
      direction_correct: true,
      error_pp: null,
      abs_error_pp: null,
    });
  });

  it("leaves not-yet-eligible records pending without fabricated result fields", () => {
    const pending = byId(runResolver().outcomes.outcomes, "pred_not_eligible_003");

    expect(pending.resolution_status).toBe("pending");
    fabricatedOutcomeFields.forEach((field) => {
      expect(pending).not.toHaveProperty(field);
    });
  });

  it("emits blocked and needs_review statuses without fabricated outcome or price fields", () => {
    const outcomes = runResolver().outcomes.outcomes;
    const expectedStatuses = {
      pred_missing_price_004: "blocked_missing_price",
      pred_symbol_change_005: "blocked_symbol_change",
      pred_market_holiday_006: "blocked_market_holiday_conflict",
      pred_corporate_action_007: "blocked_corporate_action_conflict",
      pred_needs_review_008: "needs_review",
    };

    Object.entries(expectedStatuses).forEach(([predictionId, status]) => {
      const outcome = byId(outcomes, predictionId);
      expect(outcome.resolution_status).toBe(status);
      expect(outcomeRecordSchema.safeParse(outcome).success).toBe(true);
      fabricatedOutcomeFields.forEach((field) => {
        expect(outcome).not.toHaveProperty(field);
      });
    });
  });

  it("does not write outcome fields back into prediction records", () => {
    const before = stableStringify(predictions);
    runResolver();
    const after = stableStringify(predictions);

    expect(after).toBe(before);
    predictions.predictions.forEach((prediction) => {
      expect(prediction).not.toHaveProperty("resolution_status");
      expect(prediction).not.toHaveProperty("actual_change_pct");
      expect(prediction).not.toHaveProperty("error_pp");
    });
  });
});
