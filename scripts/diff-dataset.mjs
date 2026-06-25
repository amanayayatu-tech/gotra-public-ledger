/* global console, process */
import { manifestSchema, readJson, summarizeManifest, validateManifestHashes } from "./data-contract-core.mjs";

function fail(message, details = undefined) {
  console.error(message);
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function loadManifest(relativePath) {
  const parsed = manifestSchema.safeParse(readJson(relativePath));
  if (!parsed.success) {
    fail(`manifest schema failed for ${relativePath}`, parsed.error.issues);
  }
  return parsed.data;
}

function fileMap(manifest) {
  return new Map(manifest.files.map((file) => [file.path, file]));
}

function diffManifests(base, target) {
  const baseFiles = fileMap(base);
  const targetFiles = fileMap(target);
  const paths = [...new Set([...baseFiles.keys(), ...targetFiles.keys()])].sort();

  return paths.map((path) => {
    const before = baseFiles.get(path);
    const after = targetFiles.get(path);
    if (!before) {
      return { path, status: "added", after };
    }
    if (!after) {
      return { path, status: "removed", before };
    }
    if (before.sha256 !== after.sha256 || before.record_count !== after.record_count || before.bytes !== after.bytes) {
      return { path, status: "changed", before, after };
    }
    return { path, status: "unchanged", sha256: after.sha256, record_count: after.record_count ?? null };
  });
}

const [baseArg, targetArg] = process.argv.slice(2);

if (!baseArg && !targetArg) {
  const manifest = loadManifest("public/data/manifest.json");
  const hashResults = validateManifestHashes(manifest);
  const failedHashes = hashResults.filter((result) => !result.sha256 || !result.bytes || !result.record_count);
  if (failedHashes.length > 0) {
    fail("current manifest does not match public files", failedHashes);
  }
  console.log(JSON.stringify({ status: "pass", mode: "current", manifest: summarizeManifest(manifest) }, null, 2));
  process.exit(0);
}

if (!baseArg || !targetArg) {
  fail("Usage: node scripts/diff-dataset.mjs [base-manifest.json target-manifest.json]");
}

const baseManifest = loadManifest(baseArg);
const targetManifest = loadManifest(targetArg);
console.log(
  JSON.stringify(
    {
      status: "pass",
      mode: "compare",
      base_dataset_id: baseManifest.dataset_id,
      target_dataset_id: targetManifest.dataset_id,
      file_diff: diffManifests(baseManifest, targetManifest),
      record_count_diff: {
        predictions: targetManifest.record_counts.predictions - baseManifest.record_counts.predictions,
        outcomes: targetManifest.record_counts.outcomes - baseManifest.record_counts.outcomes,
        portfolio_snapshots:
          targetManifest.record_counts.portfolio_snapshots - baseManifest.record_counts.portfolio_snapshots,
        content_items: targetManifest.record_counts.content_items - baseManifest.record_counts.content_items,
      },
    },
    null,
    2,
  ),
);
