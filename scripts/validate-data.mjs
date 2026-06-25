/* global console, process */
import fs from "node:fs";
import path from "node:path";
import {
  contentIndexSchema,
  manifestSchema,
  paperPortfolioSnapshotSchema,
  publicContractFixtureSchema,
  readJson,
  repoRoot,
  validateManifestHashes,
} from "./data-contract-core.mjs";

const forbiddenKeys = new Set([
  "raw_prompt",
  "raw_completion",
  "provider_response",
  "scorer_transcript",
  "scorer_rationale",
  "api_key",
  "secret",
  "db_path",
]);

function fail(message, details = undefined) {
  console.error(message);
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function assertNoForbiddenKeys(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }

  Object.entries(value).forEach(([key, child]) => {
    if (forbiddenKeys.has(key)) {
      fail(`Forbidden private/export key in public data: ${path}.${key}`);
    }
    assertNoForbiddenKeys(child, `${path}.${key}`);
  });
}

function validateCurrentLedger(ledger) {
  if (!Array.isArray(ledger.records)) {
    fail("ledger.demo.json must contain records[]");
  }
  if (ledger.metadata.record_count !== ledger.records.length) {
    fail("ledger.demo.json metadata.record_count mismatch", {
      metadata_record_count: ledger.metadata.record_count,
      records_length: ledger.records.length,
    });
  }

  const resolved = ledger.records.filter((record) => record.direction_correct !== "pending");
  const pending = ledger.records.filter((record) => record.direction_correct === "pending");
  const malformedPending = pending.filter(
    (record) => record.actual_change_pct !== null || record.error !== null,
  );
  const malformedResolved = resolved.filter(
    (record) =>
      typeof record.actual_change_pct !== "number" ||
      typeof record.error !== "number" ||
      typeof record.direction_correct !== "boolean",
  );

  if (malformedPending.length > 0) {
    fail("pending records must not contain fabricated outcome fields", {
      count: malformedPending.length,
      ids: malformedPending.slice(0, 5).map((record) => record.prediction_id),
    });
  }
  if (malformedResolved.length > 0) {
    fail("resolved records require numeric outcome fields", {
      count: malformedResolved.length,
      ids: malformedResolved.slice(0, 5).map((record) => record.prediction_id),
    });
  }

  return {
    records: ledger.records.length,
    resolved: resolved.length,
    pending: pending.length,
  };
}

function validateFixture(fixture) {
  const parsed = publicContractFixtureSchema.safeParse(fixture);
  if (!parsed.success) {
    fail("public contract fixture schema failed", parsed.error.issues);
  }

  const predictionIds = new Set(parsed.data.predictions.map((prediction) => prediction.prediction_id));
  const orphanOutcomes = parsed.data.outcomes.filter((outcome) => !predictionIds.has(outcome.prediction_id));
  if (orphanOutcomes.length > 0) {
    fail("outcome records must reference predictions by id", {
      ids: orphanOutcomes.map((outcome) => outcome.prediction_id),
    });
  }

  const predictionWithOutcomeFields = parsed.data.predictions.filter(
    (prediction) =>
      Object.hasOwn(prediction, "resolution_status") ||
      Object.hasOwn(prediction, "actual_change_pct") ||
      Object.hasOwn(prediction, "error_pp"),
  );
  if (predictionWithOutcomeFields.length > 0) {
    fail("prediction records must not carry outcome fields", {
      ids: predictionWithOutcomeFields.map((prediction) => prediction.prediction_id),
    });
  }

  return {
    predictions: parsed.data.predictions.length,
    outcomes: parsed.data.outcomes.length,
    portfolio_snapshots: parsed.data.portfolio_snapshots.length,
    content_items: parsed.data.content_items.length,
  };
}

function validatePortfolioSnapshot(snapshot) {
  const parsed = paperPortfolioSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    fail("paper portfolio latest schema failed", parsed.error.issues);
  }

  if (parsed.data.policy_boundary.shorting !== "disabled" || parsed.data.policy_boundary.live_trading !== false) {
    fail("paper portfolio v1 must remain long-only and not live trading");
  }
  if (parsed.data.metrics.sample_size < 30 && !parsed.data.small_sample_warning) {
    fail("paper portfolio small sample warning is required when sample_size < 30");
  }
  if (parsed.data.trades.length > 0 && parsed.data.trades.length !== parsed.data.positions.length) {
    fail("paper portfolio trades and positions should remain aligned for the v1 round-trip fixture", {
      trades: parsed.data.trades.length,
      positions: parsed.data.positions.length,
    });
  }

  return {
    portfolio_id: parsed.data.portfolio_id,
    sample_size: parsed.data.metrics.sample_size,
    trades: parsed.data.trades.length,
    positions: parsed.data.positions.length,
    small_sample_warning: Boolean(parsed.data.small_sample_warning),
  };
}

function assertSafeRepoRelativePath(relativePath, prefix) {
  if (
    typeof relativePath !== "string" ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("..") ||
    !relativePath.startsWith(prefix)
  ) {
    fail("Unsafe public content body_source path", { body_source: relativePath });
  }
  return path.join(repoRoot, relativePath);
}

function validateContentIndex(contentIndex, ledger, resolverPredictions) {
  const parsed = contentIndexSchema.safeParse(contentIndex);
  if (!parsed.success) {
    fail("content index schema failed", parsed.error.issues);
  }

  const slugs = new Set();
  const ledgerIds = new Set(ledger.records.map((record) => record.prediction_id));
  const resolverIds = new Set(resolverPredictions.predictions.map((prediction) => prediction.prediction_id));
  const requiredBoundaries = [
    "Research information only",
    "Not investment advice",
    "Not a trading signal",
    "No performance proof",
  ];

  parsed.data.items.forEach((item) => {
    if (slugs.has(item.slug)) {
      fail("content item slugs must be unique", { slug: item.slug });
    }
    slugs.add(item.slug);

    const bodyPath = assertSafeRepoRelativePath(item.body_source, "public/content/articles/");
    if (!fs.existsSync(bodyPath)) {
      fail("content item body_source does not exist", { slug: item.slug, body_source: item.body_source });
    }
    const body = fs.readFileSync(bodyPath, "utf8");
    requiredBoundaries.forEach((boundary) => {
      if (!body.includes(boundary)) {
        fail("content article missing required boundary text", { slug: item.slug, boundary });
      }
    });
    if (!/#\/(?:ledger|methodology|performance|sources|notes)/.test(body)) {
      fail("content article must include at least one internal route reference", { slug: item.slug });
    }
    item.related_prediction_ids.forEach((predictionId) => {
      if (!ledgerIds.has(predictionId) && !resolverIds.has(predictionId)) {
        fail("related_prediction_ids must reference public ledger or resolver fixture predictions", {
          slug: item.slug,
          prediction_id: predictionId,
        });
      }
    });
  });

  return {
    items: parsed.data.items.length,
    body_sources: parsed.data.items.length,
    empty_related_prediction_items: parsed.data.items.filter((item) => item.related_prediction_ids.length === 0).length,
  };
}

const manifest = manifestSchema.safeParse(readJson("public/data/manifest.json"));
if (!manifest.success) {
  fail("manifest schema failed", manifest.error.issues);
}

const ledger = readJson("public/data/ledger.demo.json");
const evidenceIndex = readJson("public/data/evidence-index.json");
const fixture = readJson("public/data/fixtures/public-contract.fixture.json");
const portfolioSnapshot = readJson("public/data/paper-portfolio.latest.json");
const contentIndex = readJson("public/content/articles/index.json");
const resolverPredictions = readJson("public/data/fixtures/outcome-resolver/predictions.latest.json");

assertNoForbiddenKeys(ledger);
assertNoForbiddenKeys(evidenceIndex);
assertNoForbiddenKeys(fixture);
assertNoForbiddenKeys(portfolioSnapshot);
assertNoForbiddenKeys(contentIndex);

const ledgerSummary = validateCurrentLedger(ledger);
const fixtureSummary = validateFixture(fixture);
const portfolioSummary = validatePortfolioSnapshot(portfolioSnapshot);
const contentSummary = validateContentIndex(contentIndex, ledger, resolverPredictions);

if (manifest.data.record_counts.predictions !== ledgerSummary.records) {
  fail("manifest prediction count must match current public ledger records", {
    manifest: manifest.data.record_counts.predictions,
    ledger: ledgerSummary.records,
  });
}
if (manifest.data.record_counts.outcomes !== ledgerSummary.resolved) {
  fail("manifest outcome count must match resolved current public ledger records", {
    manifest: manifest.data.record_counts.outcomes,
    resolved: ledgerSummary.resolved,
  });
}
if (manifest.data.record_counts.portfolio_snapshots !== fixtureSummary.portfolio_snapshots) {
  fail("manifest portfolio snapshot count must match public contract fixture", {
    manifest: manifest.data.record_counts.portfolio_snapshots,
    fixture: fixtureSummary.portfolio_snapshots,
  });
}
if (manifest.data.record_counts.content_items !== contentSummary.items) {
  fail("manifest content item count must match standalone content index", {
    manifest: manifest.data.record_counts.content_items,
    content_index: contentSummary.items,
  });
}

const hashResults = validateManifestHashes(manifest.data);
const failedHashes = hashResults.filter((result) => !result.sha256 || !result.bytes || !result.record_count);
if (failedHashes.length > 0) {
  fail("manifest hash/bytes/record_count validation failed", failedHashes);
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      ledger: ledgerSummary,
      fixture: fixtureSummary,
      portfolio: portfolioSummary,
      content: contentSummary,
      manifest_files: hashResults.length,
      pending_excluded_from_resolved: ledgerSummary.pending > 0 && manifest.data.record_counts.outcomes === ledgerSummary.resolved,
      outcome_records_separate: true,
    },
    null,
    2,
  ),
);
