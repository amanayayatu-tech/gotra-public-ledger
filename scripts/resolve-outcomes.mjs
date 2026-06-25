/* global console, process */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { outcomeRecordSchema } from "./data-contract-core.mjs";

export const RESOLVER_VERSION = "outcome_resolver_v1";
export const DEFAULT_NEUTRAL_THRESHOLD = 0.5;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const fixtureRoot = "public/data/fixtures/outcome-resolver";

const defaultPaths = {
  predictions: path.join(fixtureRoot, "predictions.latest.json"),
  prices: path.join(fixtureRoot, "price-source.fixture.json"),
  existingOutcomes: path.join(fixtureRoot, "outcomes.latest.json"),
  expectedOutcomes: path.join(fixtureRoot, "expected-outcomes.latest.json"),
  expectedReport: path.join(fixtureRoot, "expected-report.json"),
};

const claimBoundary = ["research_information_only", "not_investment_advice", "not_trading_signal"];

function repoPath(relativePath) {
  return path.resolve(repoRoot, relativePath);
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

export function sha256Json(value) {
  return `sha256:${crypto.createHash("sha256").update(`${stableStringify(value)}\n`).digest("hex")}`;
}

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(repoPath(relativePath), "utf8"));
}

function parseArgs(argv) {
  const args = {
    predictions: defaultPaths.predictions,
    prices: defaultPaths.prices,
    existingOutcomes: defaultPaths.existingOutcomes,
    expectedOutcomes: defaultPaths.expectedOutcomes,
    expectedReport: defaultPaths.expectedReport,
    asOfDate: null,
    check: false,
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
      case "--prices":
        args.prices = next();
        break;
      case "--existing-outcomes":
        args.existingOutcomes = next();
        break;
      case "--expected-outcomes":
        args.expectedOutcomes = next();
        break;
      case "--expected-report":
        args.expectedReport = next();
        break;
      case "--as-of-date":
        args.asOfDate = next();
        break;
      case "--check":
        args.check = true;
        break;
      default:
        throw new Error(`Unknown resolver argument: ${arg}`);
    }
  }

  return args;
}

function compareIsoDate(left, right) {
  return left.localeCompare(right);
}

function conflictForPrediction(priceSource, predictionId) {
  return (priceSource.conflicts ?? []).find((conflict) => conflict.prediction_id === predictionId);
}

function outcomeForPrediction(existingOutcomes, predictionId) {
  return existingOutcomes.outcomes.find((outcome) => outcome.prediction_id === predictionId);
}

function priceRowsForAsset(priceSource, assetId) {
  return priceSource.prices
    .filter((price) => price.asset_id === assetId && price.tradable !== false)
    .sort((left, right) => compareIsoDate(left.date, right.date));
}

function priceValue(price) {
  if (typeof price.adjusted_close === "number") {
    return price.adjusted_close;
  }
  return price.close;
}

function firstPriceAfter(rows, date) {
  return rows.find((row) => compareIsoDate(row.date, date) > 0 && typeof priceValue(row) === "number");
}

function firstPriceOnOrAfter(rows, date) {
  return rows.find((row) => compareIsoDate(row.date, date) >= 0 && typeof priceValue(row) === "number");
}

function round4(value) {
  return Number(value.toFixed(4));
}

function directionCorrect(direction, actualChangePct, neutralThreshold) {
  if (direction === "up") {
    return actualChangePct > neutralThreshold;
  }
  if (direction === "down") {
    return actualChangePct < -neutralThreshold;
  }
  return Math.abs(actualChangePct) <= neutralThreshold;
}

function baseOutcome(prediction, status, asOfDate, notes) {
  const resolutionDate = status === "pending" || status === "frozen_pending" ? null : asOfDate;
  return {
    prediction_id: prediction.prediction_id,
    schema_version: "1.0",
    resolution_status: status,
    resolution_date: resolutionDate,
    window_start: prediction.decision_date,
    window_end: prediction.outcome_availability_date,
    resolver_version: RESOLVER_VERSION,
    resolution_notes: notes,
    claim_boundary: claimBoundary,
  };
}

function blockedOutcome(prediction, status, asOfDate, notes) {
  return baseOutcome(prediction, status, asOfDate, notes);
}

function resolvedOutcome(prediction, startPrice, endPrice, priceSource, asOfDate, neutralThreshold) {
  const actualChangePct = round4((priceValue(endPrice) / priceValue(startPrice) - 1) * 100);
  const expectedChangePct = prediction.expected_change_pct;
  const errorPp = typeof expectedChangePct === "number" ? round4(actualChangePct - expectedChangePct) : null;
  const outcome = {
    prediction_id: prediction.prediction_id,
    schema_version: "1.0",
    resolution_status: "resolved",
    resolution_date: asOfDate,
    window_start: startPrice.date,
    window_end: endPrice.date,
    start_price: priceValue(startPrice),
    end_price: priceValue(endPrice),
    price_source_id: priceSource.source_id,
    actual_change_pct: actualChangePct,
    direction_correct: directionCorrect(prediction.direction, actualChangePct, neutralThreshold),
    error_pp: errorPp,
    abs_error_pp: errorPp === null ? null : round4(Math.abs(errorPp)),
    resolver_version: RESOLVER_VERSION,
    resolution_notes: "Resolved from synthetic public-safe adjusted-close fixture prices.",
    claim_boundary: claimBoundary,
  };
  return outcomeRecordSchema.parse(outcome);
}

function skipOutcome(prediction, existingOutcome, asOfDate) {
  const status = existingOutcome?.resolution_status ?? "pending";
  return baseOutcome(
    prediction,
    status,
    asOfDate,
    "Not eligible as of as_of_date; no public-safe outcome fields are emitted.",
  );
}

function settlePrediction(prediction, existingOutcome, priceSource, asOfDate, neutralThreshold) {
  const currentStatus = existingOutcome?.resolution_status ?? "pending";
  if (!["pending", "frozen_pending"].includes(currentStatus)) {
    return {
      outcome: existingOutcome,
      action: "skipped_existing_non_pending",
    };
  }

  if (compareIsoDate(prediction.outcome_availability_date, asOfDate) > 0) {
    return {
      outcome: skipOutcome(prediction, existingOutcome, asOfDate),
      action: "skipped_not_yet_eligible",
    };
  }

  const conflict = conflictForPrediction(priceSource, prediction.prediction_id);
  if (conflict) {
    return {
      outcome: blockedOutcome(prediction, conflict.resolution_status, asOfDate, conflict.note),
      action: conflict.resolution_status,
    };
  }

  const rows = priceRowsForAsset(priceSource, prediction.asset_id);
  const startPrice = firstPriceAfter(rows, prediction.decision_date);
  const endPrice = firstPriceOnOrAfter(rows, prediction.outcome_availability_date);
  if (!startPrice || !endPrice) {
    return {
      outcome: blockedOutcome(
        prediction,
        "blocked_missing_price",
        asOfDate,
        "Required public-safe start or end price is missing; no result fields are emitted.",
      ),
      action: "blocked_missing_price",
    };
  }

  return {
    outcome: resolvedOutcome(prediction, startPrice, endPrice, priceSource, asOfDate, neutralThreshold),
    action: "resolved",
  };
}

function countByAction(results, predicate) {
  return results.filter(predicate).reduce((counts, result) => {
    counts[result.action] = (counts[result.action] ?? 0) + 1;
    return counts;
  }, {});
}

export function resolveOutcomes({ predictions, priceSource, existingOutcomes, asOfDate }) {
  const neutralThreshold = priceSource.neutral_threshold ?? DEFAULT_NEUTRAL_THRESHOLD;
  const results = predictions.predictions.map((prediction) =>
    settlePrediction(
      prediction,
      outcomeForPrediction(existingOutcomes, prediction.prediction_id),
      priceSource,
      asOfDate,
      neutralThreshold,
    ),
  );
  const outcomes = results.map((result) => outcomeRecordSchema.parse(result.outcome));
  const blockedCountByReason = countByAction(results, (result) => result.action.startsWith("blocked_"));
  const skippedCountByReason = countByAction(results, (result) => result.action.startsWith("skipped_"));
  const reviewItems = results
    .filter((result) => result.action === "needs_review")
    .map((result) => result.outcome.prediction_id);

  return {
    outcomes: {
      schema_version: "1.0",
      dataset_id: `${predictions.dataset_id}_resolved_fixture`,
      as_of_date: asOfDate,
      resolver_version: RESOLVER_VERSION,
      outcomes,
    },
    report: {
      schema_version: "1.0",
      resolver_version: RESOLVER_VERSION,
      policy_version: priceSource.policy_version ?? RESOLVER_VERSION,
      as_of_date: asOfDate,
      neutral_threshold: neutralThreshold,
      input_hashes: {
        predictions: sha256Json(predictions),
        price_source: sha256Json(priceSource),
        existing_outcomes: sha256Json(existingOutcomes),
      },
      output_hash: null,
      processed_count: results.length,
      resolved_count: results.filter((result) => result.action === "resolved").length,
      blocked_count_by_reason: blockedCountByReason,
      skipped_count_by_reason: skippedCountByReason,
      price_source_ids: [priceSource.source_id],
      warnings: [],
      review_items: reviewItems,
    },
  };
}

function assertEqual(actual, expected, label) {
  const actualText = stableStringify(actual);
  const expectedText = stableStringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${label} mismatch`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const predictions = readJson(args.predictions);
  const priceSource = readJson(args.prices);
  const existingOutcomes = readJson(args.existingOutcomes);
  const asOfDate = args.asOfDate ?? priceSource.as_of_date;
  const resolved = resolveOutcomes({ predictions, priceSource, existingOutcomes, asOfDate });
  resolved.report.output_hash = sha256Json(resolved.outcomes);

  if (args.check) {
    assertEqual(resolved.outcomes, readJson(args.expectedOutcomes), "resolved outcomes");
    assertEqual(resolved.report, readJson(args.expectedReport), "resolver report");
  }

  console.log(
    JSON.stringify(
      {
        status: "pass",
        resolver_version: RESOLVER_VERSION,
        as_of_date: asOfDate,
        processed_count: resolved.report.processed_count,
        resolved_count: resolved.report.resolved_count,
        blocked_count_by_reason: resolved.report.blocked_count_by_reason,
        skipped_count_by_reason: resolved.report.skipped_count_by_reason,
        golden_check: args.check,
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
