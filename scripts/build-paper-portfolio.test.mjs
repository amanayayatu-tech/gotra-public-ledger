import { describe, expect, it } from "vitest";
import { paperPortfolioSnapshotSchema, readJson } from "./data-contract-core.mjs";
import { buildPaperPortfolioSnapshot, SMALL_SAMPLE_WARNING, stableStringify } from "./build-paper-portfolio.mjs";

const predictions = readJson("public/data/fixtures/outcome-resolver/predictions.latest.json");
const outcomes = readJson("public/data/fixtures/outcome-resolver/expected-outcomes.latest.json");
const expectedSnapshot = readJson("public/data/paper-portfolio.latest.json");

function buildSnapshot() {
  return buildPaperPortfolioSnapshot({ predictions, outcomes });
}

describe("paper portfolio builder", () => {
  it("matches the deterministic public-safe latest snapshot", () => {
    const snapshot = buildSnapshot();

    expect(paperPortfolioSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(stableStringify(snapshot)).toBe(stableStringify(expectedSnapshot));
  });

  it("keeps v1 long-only policy boundaries and cost assumptions fixed", () => {
    const snapshot = buildSnapshot();

    expect(snapshot.policy_version).toBe("portfolio_policy_v1");
    expect(snapshot.policy_boundary).toEqual({
      shorting: "disabled",
      live_trading: false,
      personalized_advice: false,
      post_hoc_rule_change_allowed: false,
    });
    expect(snapshot.cost_assumptions).toEqual({
      commission_bps: 0,
      slippage_bps: 5,
      fx_cost_bps: 10,
    });
    expect(snapshot.benchmark_ids).toEqual(["SPY", "QQQ", "HSTECH"]);
  });

  it("opens only resolved bullish/up rows as paper longs with prediction traceability", () => {
    const snapshot = buildSnapshot();

    expect(snapshot.positions).toHaveLength(1);
    expect(snapshot.trades).toHaveLength(1);
    expect(snapshot.positions[0]).toMatchObject({
      prediction_id: "pred_resolve_up_001",
      side: "long",
      status: "closed",
      weight: 0.1,
    });
    expect(snapshot.trades[0]).toMatchObject({
      prediction_id: "pred_resolve_up_001",
      gross_return_pct: 3,
      net_return_pct: 2.9,
      transaction_cost_pct: 0.1,
      benchmark_id: "SPY",
    });
  });

  it("emits the small-sample warning below 30 settled trades", () => {
    const snapshot = buildSnapshot();

    expect(snapshot.metrics.sample_size).toBe(1);
    expect(snapshot.small_sample_warning).toBe(SMALL_SAMPLE_WARNING);
  });

  it("does not introduce private or raw artifact fields", () => {
    const snapshotText = JSON.stringify(buildSnapshot());

    expect(snapshotText).not.toMatch(/raw_prompt|raw_completion|provider_response|scorer_transcript|secret|db_path/);
  });
});
