/* global console, process */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paperPortfolioSnapshotSchema, readJson, repoRoot } from "./data-contract-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSnapshotPath = "public/data/paper-portfolio.latest.json";
const defaultPredictionsPath = "public/data/fixtures/outcome-resolver/predictions.latest.json";
const defaultOutcomesPath = "public/data/fixtures/outcome-resolver/expected-outcomes.latest.json";

export const SMALL_SAMPLE_WARNING =
  "Sample size is small. This hypothetical paper performance is early-stage tracking and should not be interpreted as statistically reliable or investment advice.";

const policy = {
  portfolio_id: "gotra_shadow_long_only_equal_weight_fixture_v1",
  policy_id: "gotra_shadow_long_only_equal_weight_v1",
  policy_version: "portfolio_policy_v1",
  initial_capital: 100000,
  max_single_ticker_weight: 0.1,
  benchmark_return_pct: 0.8,
  benchmark_ids: ["SPY", "QQQ", "HSTECH"],
  cost_assumptions: {
    commission_bps: 0,
    slippage_bps: 5,
    fx_cost_bps: 10,
  },
  policy_boundary: {
    shorting: "disabled",
    live_trading: false,
    personalized_advice: false,
    post_hoc_rule_change_allowed: false,
  },
  claim_boundary: [
    "research_information_only",
    "not_investment_advice",
    "hypothetical_paper_performance",
    "not_live_trading",
    "not_trading_signal",
    "no_guarantee_of_future_performance",
  ],
};

function repoPath(relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function parseArgs(argv) {
  const args = {
    predictions: defaultPredictionsPath,
    outcomes: defaultOutcomesPath,
    snapshot: defaultSnapshotPath,
    check: false,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      return argv[index];
    };
    switch (arg) {
      case "--predictions":
        args.predictions = next();
        break;
      case "--outcomes":
        args.outcomes = next();
        break;
      case "--snapshot":
        args.snapshot = next();
        break;
      case "--check":
        args.check = true;
        break;
      case "--write":
        args.write = true;
        break;
      default:
        throw new Error(`Unknown portfolio builder argument: ${arg}`);
    }
  }

  return args;
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function round4(value) {
  return Number(value.toFixed(4));
}

function benchmarkForPrediction(prediction) {
  if (prediction.market === "HK") {
    return "HSTECH";
  }
  return prediction.direction === "up" ? "SPY" : "QQQ";
}

function currencyForPrediction(prediction) {
  return prediction.market === "HK" ? "HKD" : "USD";
}

function transactionCostPct(prediction) {
  const roundTripBps = policy.cost_assumptions.commission_bps * 2 + policy.cost_assumptions.slippage_bps * 2;
  const fxBps = prediction.market === "HK" ? policy.cost_assumptions.fx_cost_bps * 2 : 0;
  return round4((roundTripBps + fxBps) / 100);
}

function buildEligibleRows(predictions, outcomes) {
  const predictionById = new Map(predictions.predictions.map((prediction) => [prediction.prediction_id, prediction]));
  return outcomes.outcomes
    .filter((outcome) => outcome.resolution_status === "resolved")
    .map((outcome) => ({ outcome, prediction: predictionById.get(outcome.prediction_id) }))
    .filter(({ outcome, prediction }) => {
      return (
        prediction &&
        prediction.direction === "up" &&
        typeof outcome.start_price === "number" &&
        typeof outcome.end_price === "number" &&
        typeof outcome.actual_change_pct === "number"
      );
    });
}

function buildTradesAndPositions(rows) {
  const weight = Math.min(policy.max_single_ticker_weight, rows.length > 0 ? 1 / rows.length : 0);
  return rows.map(({ prediction, outcome }) => {
    const notional = round4(policy.initial_capital * weight);
    const costPct = transactionCostPct(prediction);
    const grossReturnPct = round4(outcome.actual_change_pct);
    const netReturnPct = round4(grossReturnPct - costPct);
    const quantity = round4(notional / outcome.start_price);
    const benchmarkId = benchmarkForPrediction(prediction);
    const base = {
      prediction_id: prediction.prediction_id,
      ticker: prediction.ticker,
      market: prediction.market,
      entry_date: outcome.window_start,
      exit_date: outcome.window_end,
      entry_price: outcome.start_price,
      exit_price: outcome.end_price,
      weight,
    };

    return {
      position: {
        ...base,
        side: "long",
        status: "closed",
        quantity,
        notional,
        currency: currencyForPrediction(prediction),
      },
      trade: {
        trade_id: `trade_${prediction.prediction_id}`,
        ...base,
        gross_return_pct: grossReturnPct,
        net_return_pct: netReturnPct,
        transaction_cost_pct: costPct,
        benchmark_id: benchmarkId,
      },
    };
  });
}

function maxDrawdownPct(equityCurve) {
  let peak = equityCurve[0]?.equity ?? policy.initial_capital;
  let maxDrawdown = 0;
  equityCurve.forEach((point) => {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.min(maxDrawdown, ((point.equity / peak) - 1) * 100);
  });
  return round4(maxDrawdown);
}

export function buildPaperPortfolioSnapshot({ predictions, outcomes }) {
  const rows = buildEligibleRows(predictions, outcomes);
  const built = buildTradesAndPositions(rows);
  const positions = built.map((item) => item.position);
  const trades = built.map((item) => item.trade);
  const sampleSize = trades.length;
  const portfolioReturnPct = round4(trades.reduce((sum, trade) => sum + trade.weight * trade.net_return_pct, 0));
  const finalEquity = round4(policy.initial_capital * (1 + portfolioReturnPct / 100));
  const benchmarkEquity = round4(policy.initial_capital * (1 + policy.benchmark_return_pct / 100));
  const firstEntryDate = positions[0]?.entry_date ?? outcomes.as_of_date;
  const equityCurve = [
    {
      date: predictions.snapshot_date,
      equity: policy.initial_capital,
      benchmark_equity: policy.initial_capital,
      drawdown_pct: 0,
    },
    {
      date: firstEntryDate,
      equity: policy.initial_capital,
      benchmark_equity: policy.initial_capital,
      drawdown_pct: 0,
    },
    {
      date: outcomes.as_of_date,
      equity: finalEquity,
      benchmark_equity: benchmarkEquity,
      drawdown_pct: maxDrawdownPct([{ equity: policy.initial_capital }, { equity: finalEquity }]),
    },
  ];
  const wins = trades.filter((trade) => trade.net_return_pct > 0);
  const losses = trades.filter((trade) => trade.net_return_pct < 0);

  return paperPortfolioSnapshotSchema.parse({
    portfolio_id: policy.portfolio_id,
    schema_version: "1.0",
    policy_version: policy.policy_version,
    policy_id: policy.policy_id,
    as_of_date: outcomes.as_of_date,
    currency: "USD",
    initial_capital: policy.initial_capital,
    cost_assumptions: policy.cost_assumptions,
    benchmark_ids: policy.benchmark_ids,
    policy_boundary: policy.policy_boundary,
    metrics: {
      cumulative_return_pct: portfolioReturnPct,
      benchmark_return_pct: policy.benchmark_return_pct,
      excess_return_pct: round4(portfolioReturnPct - policy.benchmark_return_pct),
      max_drawdown_pct: maxDrawdownPct(equityCurve),
      volatility_pct: 0,
      win_rate: sampleSize > 0 ? round4(wins.length / sampleSize) : null,
      turnover: round4(trades.reduce((sum, trade) => sum + trade.weight * 2, 0)),
      average_exposure: round4(positions.reduce((sum, position) => sum + position.weight, 0)),
      concentration: round4(Math.max(0, ...positions.map((position) => position.weight))),
      transaction_cost_adjusted_return_pct: portfolioReturnPct,
      average_win_pct: wins.length > 0 ? round4(wins.reduce((sum, trade) => sum + trade.net_return_pct, 0) / wins.length) : null,
      average_loss_pct:
        losses.length > 0 ? round4(losses.reduce((sum, trade) => sum + trade.net_return_pct, 0) / losses.length) : null,
      sample_size: sampleSize,
    },
    equity_curve: equityCurve,
    positions,
    trades,
    small_sample_warning: sampleSize < 30 ? SMALL_SAMPLE_WARNING : undefined,
    claim_boundary: policy.claim_boundary,
  });
}

function assertEqual(actual, expected, label) {
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new Error(`${label} mismatch`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const predictions = readJson(args.predictions);
  const outcomes = readJson(args.outcomes);
  const snapshot = buildPaperPortfolioSnapshot({ predictions, outcomes });

  if (args.write) {
    fs.writeFileSync(repoPath(args.snapshot), canonicalJson(snapshot));
  }
  if (args.check) {
    const expected = paperPortfolioSnapshotSchema.parse(readJson(args.snapshot));
    assertEqual(snapshot, expected, "paper portfolio snapshot");
  }

  console.log(
    JSON.stringify(
      {
        status: "pass",
        portfolio_id: snapshot.portfolio_id,
        policy_version: snapshot.policy_version,
        as_of_date: snapshot.as_of_date,
        sample_size: snapshot.metrics.sample_size,
        cumulative_return_pct: snapshot.metrics.cumulative_return_pct,
        benchmark_return_pct: snapshot.metrics.benchmark_return_pct,
        small_sample_warning: Boolean(snapshot.small_sample_warning),
        check: args.check,
        write: args.write,
        script_dir: path.relative(repoRoot, scriptDir),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
