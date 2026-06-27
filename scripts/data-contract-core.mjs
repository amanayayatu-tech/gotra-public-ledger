import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
export const publicRoot = path.join(repoRoot, "public");

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/);
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const publicClaimBoundarySchema = z.enum([
  "research_information_only",
  "not_investment_advice",
  "hypothetical_paper_performance",
  "not_live_trading",
  "not_trading_signal",
  "not_personalized_recommendation",
  "no_guarantee_of_future_performance",
  "demo_public_safe_dataset",
  "not_oos",
  "not_science_public_proof",
]);

const evidenceRefSchema = z
  .object({
    source_id: z.string().min(1),
    label: z.string().min(1),
    date: isoDateSchema,
    public_url: z.string().url().optional(),
  })
  .strict();

const publicProvenanceSchema = z
  .object({
    source_repo: z.string().min(1).optional(),
    source_commit: z.string().min(1).nullable().optional(),
    source_dataset_id: z.string().min(1).optional(),
    source_record_index: z.number().int().nonnegative().optional(),
    exporter_version: z.string().min(1),
    exported_at: isoDateTimeSchema,
    source_artifact_hash: sha256Schema.optional(),
    source_url_or_id: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const predictionRecordSchema = z
  .object({
    prediction_id: z.string().min(1),
    schema_version: z.literal("1.0"),
    ticker: z.string().min(1),
    asset_id: z.string().min(1),
    market: z.enum(["US", "HK", "OTHER"]),
    company: z.string().min(1),
    decision_at: isoDateTimeSchema,
    decision_date: isoDateSchema,
    view: z.enum(["bullish", "bearish", "neutral"]),
    direction: z.enum(["up", "down", "neutral"]),
    confidence: z.number().min(0).max(1),
    horizon: z.string().min(1),
    horizon_days: z.number().int().positive(),
    expected_change_pct: z.number().nullable(),
    scenario_summary: z.string().min(1),
    risk_factors: z.array(z.string()),
    evidence_refs: z.array(evidenceRefSchema),
    model_or_method: z.string().min(1),
    provenance: publicProvenanceSchema,
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict();

export const outcomeRecordSchema = z
  .object({
    prediction_id: z.string().min(1),
    schema_version: z.literal("1.0"),
    resolution_status: z.enum([
      "pending",
      "frozen_pending",
      "resolved",
      "blocked_missing_price",
      "blocked_market_holiday_conflict",
      "blocked_symbol_change",
      "blocked_corporate_action_conflict",
      "needs_review",
      "superseded",
    ]),
    resolution_date: isoDateSchema.nullable().optional(),
    window_start: isoDateSchema.optional(),
    window_end: isoDateSchema.optional(),
    start_price: z.number().positive().nullable().optional(),
    end_price: z.number().positive().nullable().optional(),
    price_source_id: z.string().min(1).optional(),
    actual_change_pct: z.number().nullable().optional(),
    direction_correct: z.boolean().nullable().optional(),
    error_pp: z.number().nullable().optional(),
    abs_error_pp: z.number().nonnegative().nullable().optional(),
    resolver_version: z.string().min(1),
    resolution_notes: z.string().min(1).optional(),
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.resolution_status !== "resolved") {
      const outcomeFields = [
        "actual_change_pct",
        "direction_correct",
        "error_pp",
        "abs_error_pp",
        "start_price",
        "end_price",
        "price_source_id",
      ];

      outcomeFields.forEach((field) => {
        if (record[field] !== null && record[field] !== undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "non-resolved outcomes must not carry result or price fields",
            path: [field],
          });
        }
      });
      return;
    }
    if (record.actual_change_pct === null || record.actual_change_pct === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resolved outcomes require actual_change_pct",
        path: ["actual_change_pct"],
      });
    }
    if (typeof record.direction_correct !== "boolean") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resolved outcomes require boolean direction_correct",
        path: ["direction_correct"],
      });
    }
    if (
      record.error_pp !== null &&
      record.error_pp !== undefined &&
      (record.abs_error_pp === null || record.abs_error_pp === undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resolved outcomes with error_pp require abs_error_pp",
        path: ["abs_error_pp"],
      });
    }
    if (
      (record.error_pp === null || record.error_pp === undefined) &&
      record.abs_error_pp !== null &&
      record.abs_error_pp !== undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "resolved outcomes without error_pp must not carry abs_error_pp",
        path: ["abs_error_pp"],
      });
    }
    if (record.error_pp === null || record.error_pp === undefined) {
      ["start_price", "end_price", "price_source_id"].forEach((field) => {
        if (record[field] === null || record[field] === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "resolved direction-only outcomes require price/source fields",
            path: [field],
          });
        }
      });
    }
  });

export const paperPortfolioSnapshotSchema = z
  .object({
    portfolio_id: z.string().min(1),
    schema_version: z.literal("1.0"),
    policy_version: z.literal("portfolio_policy_v1"),
    policy_id: z.string().min(1).optional(),
    as_of_date: isoDateSchema,
    currency: z.string().min(3),
    initial_capital: z.number().positive(),
    cost_assumptions: z
      .object({
        commission_bps: z.number().min(0),
        slippage_bps: z.number().min(0),
        fx_cost_bps: z.number().min(0),
      })
      .strict(),
    benchmark_ids: z.array(z.enum(["SPY", "QQQ", "HSTECH", "HSI"])).min(1),
    policy_boundary: z
      .object({
        shorting: z.literal("disabled"),
        live_trading: z.literal(false),
        personalized_advice: z.literal(false),
        post_hoc_rule_change_allowed: z.literal(false),
      })
      .strict(),
    metrics: z
      .object({
        cumulative_return_pct: z.number(),
        benchmark_return_pct: z.number(),
        excess_return_pct: z.number(),
        max_drawdown_pct: z.number(),
        volatility_pct: z.number(),
        win_rate: z.number().min(0).max(1).nullable(),
        turnover: z.number().min(0),
        average_exposure: z.number().min(0).max(1),
        concentration: z.number().min(0).max(1).optional(),
        transaction_cost_adjusted_return_pct: z.number().optional(),
        average_win_pct: z.number().nullable().optional(),
        average_loss_pct: z.number().nullable().optional(),
        sample_size: z.number().int().nonnegative(),
      })
      .strict(),
    equity_curve: z.array(
      z
        .object({
          date: isoDateSchema,
          equity: z.number().positive(),
          benchmark_equity: z.number().positive(),
          drawdown_pct: z.number(),
        })
        .strict(),
    ),
    positions: z.array(
      z
        .object({
          prediction_id: z.string().min(1),
          ticker: z.string().min(1),
          market: z.enum(["US", "HK", "OTHER"]),
          side: z.literal("long"),
          status: z.enum(["open", "closed"]),
          entry_date: isoDateSchema,
          exit_date: isoDateSchema.nullable(),
          entry_price: z.number().positive(),
          exit_price: z.number().positive().nullable(),
          quantity: z.number().positive(),
          notional: z.number().positive(),
          weight: z.number().min(0).max(1),
          currency: z.string().min(3),
        })
        .strict(),
    ),
    trades: z.array(
      z
        .object({
          trade_id: z.string().min(1),
          prediction_id: z.string().min(1),
          ticker: z.string().min(1),
          market: z.enum(["US", "HK", "OTHER"]),
          entry_date: isoDateSchema,
          exit_date: isoDateSchema,
          entry_price: z.number().positive(),
          exit_price: z.number().positive(),
          weight: z.number().min(0).max(1),
          gross_return_pct: z.number(),
          net_return_pct: z.number(),
          transaction_cost_pct: z.number().min(0),
          benchmark_id: z.enum(["SPY", "QQQ", "HSTECH", "HSI"]),
        })
        .strict(),
    ),
    small_sample_warning: z.string().min(1).optional(),
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict();

export const contentItemSchema = z
  .object({
    slug: z.string().min(1),
    schema_version: z.enum(["1.0", "1.1"]),
    title: z.string().min(1),
    published_at: isoDateTimeSchema,
    type: z.enum([
      "method_note",
      "weekly_review",
      "monthly_transparency",
      "error_review",
      "daily_morning_brief",
      "daily_evening_review",
      "research_recap",
    ]),
    tags: z.array(z.string()),
    summary: z.string().min(1),
    body_source: z.string().min(1),
    related_prediction_ids: z.array(z.string()),
    report: z
      .object({
        report_kind: z.enum(["daily_morning_brief", "daily_evening_review", "research_recap"]),
        report_date: isoDateSchema,
        status: z.enum(["demo_format", "draft_public_safe", "published_public_safe"]),
        tldr: z.string().min(1),
        reading_time_minutes: z.number().int().positive(),
        targets: z.array(z.string().min(1)).min(1),
        today_change: z.string().min(1),
        evidence_status: z.string().min(1),
        main_risks: z.array(z.string().min(1)).min(1),
        why_today_matters: z.string().min(1),
        background_context: z.array(z.string().min(1)).min(1),
        recent_changes: z.array(z.string().min(1)).min(1),
        positive_view: z.array(z.string().min(1)).min(1),
        opposing_view: z.array(z.string().min(1)).min(1),
        observation_triggers: z.array(z.string().min(1)).min(1),
        risks_uncertainty: z.array(z.string().min(1)).min(1),
        reader_takeaways: z.array(z.string().min(1)).min(1),
        comparability: z.array(z.string().min(1)).min(1),
        error_attribution: z.array(z.string().min(1)).min(1),
        system_learning: z.array(z.string().min(1)).min(1),
        tomorrow_watch: z.array(z.string().min(1)).min(1),
        watched_scope: z
          .array(
            z
              .object({
                label: z.string().min(1),
                ticker: z.string().min(1).optional(),
                company: z.string().min(1).optional(),
                prediction_id: z.string().min(1).optional(),
                why_watched: z.string().min(1),
                layer: z.enum(["background", "evidence", "background_and_evidence"]),
                resolution_status: z
                  .enum(["pending", "frozen_pending", "resolved", "needs_review", "blocked", "not_applicable"])
                  .optional(),
              })
              .strict(),
          )
          .min(1),
        ledger_changes: z.array(z.string().min(1)).min(1),
        evidence_updates: z
          .array(
            z
              .object({
                topic: z.string().min(1),
                update: z.string().min(1),
                evidence_layer: z.enum(["background", "public_safe_demo", "local_checks", "no_new_evidence"]),
              })
              .strict(),
          )
          .min(1),
        conclusion_change: z
          .object({
            status: z.enum([
              "unchanged",
              "strengthened",
              "weakened",
              "conflict_found",
              "needs_review",
              "no_new_evidence",
            ]),
            summary: z.string().min(1),
          })
          .strict(),
        why_or_why_not: z.array(z.string().min(1)).min(1),
        next_watch_queue: z
          .array(
            z
              .object({
                item: z.string().min(1),
                next_check: z.string().min(1),
                reason: z.string().min(1),
              })
              .strict(),
          )
          .min(1),
        boundary_note: z.string().min(1),
      })
      .strict()
      .optional(),
    provenance: publicProvenanceSchema,
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict()
  .superRefine((item, context) => {
    const reportKindByType = {
      daily_morning_brief: "daily_morning_brief",
      daily_evening_review: "daily_evening_review",
      research_recap: "research_recap",
    };
    const expectedReportKind = reportKindByType[item.type];

    if (item.schema_version === "1.0" && (expectedReportKind || item.report)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "content report items require schema_version 1.1",
        path: ["schema_version"],
      });
    }

    if (expectedReportKind && !item.report) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "daily report and research recap items require report payloads",
        path: ["report"],
      });
      return;
    }

    if (!expectedReportKind && item.report) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "report payloads are only valid for report content types",
        path: ["report"],
      });
      return;
    }

    if (item.report && item.report.report_kind !== expectedReportKind) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "content report kind must match report content type",
        path: ["report", "report_kind"],
      });
    }
  });

export const contentIndexSchema = z
  .object({
    schema_version: z.enum(["1.0", "1.1"]),
    dataset_id: z.string().min(1),
    snapshot_date: isoDateSchema,
    items: z.array(contentItemSchema).length(4),
  })
  .strict()
  .superRefine((index, context) => {
    const requiresSchemaV11 = index.items.some((item) => item.schema_version === "1.1" || item.report);

    if (requiresSchemaV11 && index.schema_version !== "1.1") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "content index with report-aware items requires schema_version 1.1",
        path: ["schema_version"],
      });
    }
  });

export const publicContractFixtureSchema = z
  .object({
    schema_version: z.literal("1.0"),
    dataset_id: z.string().min(1),
    snapshot_date: isoDateSchema,
    predictions: z.array(predictionRecordSchema),
    outcomes: z.array(outcomeRecordSchema),
    portfolio_snapshots: z.array(paperPortfolioSnapshotSchema),
    content_items: z.array(contentItemSchema),
  })
  .strict();

export const manifestSchema = z
  .object({
    schema_version: z.literal("1.0"),
    dataset_id: z.string().min(1),
    dataset_type: z.string().min(1),
    snapshot_date: isoDateSchema,
    generated_at: isoDateTimeSchema,
    exporter_version: z.literal("public_export_v1"),
    source_commit: z.string().min(1).nullable(),
    record_counts: z
      .object({
        predictions: z.number().int().nonnegative(),
        outcomes: z.number().int().nonnegative(),
        portfolio_snapshots: z.number().int().nonnegative(),
        content_items: z.number().int().nonnegative(),
      })
      .strict(),
    files: z
      .array(
        z
          .object({
            path: z.string().min(1),
            sha256: sha256Schema,
            bytes: z.number().int().positive(),
            record_count: z.number().int().nonnegative().optional(),
            category: z.enum([
              "legacy_ledger",
              "evidence_index",
              "contract_fixture",
              "predictions",
              "outcomes",
              "portfolio",
              "content",
              "source_manifest",
              "redaction_report",
            ]),
          })
          .strict(),
      )
      .min(1),
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
    data_boundary: z.array(z.string().min(1)).min(1),
    redaction: z
      .object({
        status: z.enum(["pass", "not_applicable_for_demo_fixture"]),
        report_required_for_private_export: z.literal(true),
        forbidden_fields_dropped: z.array(z.string()),
      })
      .strict(),
    public_pr_gate: z
      .object({
        schema_validation: z.literal("required"),
        manifest_hash_validation: z.literal("required"),
        forbidden_source_scan: z.literal("required"),
        secret_scan: z.literal("required"),
        claim_boundary_scan: z.literal("required"),
        reviewer_signoff: z.literal("required"),
      })
      .strict(),
  })
  .strict();

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

export function publicFileAbsolutePath(publicRelativePath) {
  if (path.isAbsolute(publicRelativePath) || publicRelativePath.includes("..")) {
    throw new Error(`Unsafe public manifest path: ${publicRelativePath}`);
  }
  return path.join(publicRoot, publicRelativePath);
}

export function sha256File(absolutePath) {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
  return `sha256:${digest}`;
}

export function fileBytes(absolutePath) {
  return fs.statSync(absolutePath).size;
}

export function countManifestFileRecords(entry, payload) {
  switch (entry.category) {
    case "legacy_ledger":
      return Array.isArray(payload.records) ? payload.records.length : 0;
    case "evidence_index":
      return Array.isArray(payload.sources) ? payload.sources.length : 0;
    case "contract_fixture":
      return (
        payload.predictions.length +
        payload.outcomes.length +
        payload.portfolio_snapshots.length +
        payload.content_items.length
      );
    case "content":
      return Array.isArray(payload.items) ? payload.items.length : 0;
    default:
      if (Array.isArray(payload)) {
        return payload.length;
      }
      return 1;
  }
}

export function validateManifestHashes(manifest) {
  return manifest.files.map((entry) => {
    const absolutePath = publicFileAbsolutePath(entry.path);
    const payload = readJson(path.relative(repoRoot, absolutePath));
    const actualSha256 = sha256File(absolutePath);
    const actualBytes = fileBytes(absolutePath);
    const actualRecordCount = countManifestFileRecords(entry, payload);

    return {
      path: entry.path,
      sha256: actualSha256 === entry.sha256,
      bytes: actualBytes === entry.bytes,
      record_count: entry.record_count === undefined || actualRecordCount === entry.record_count,
      actual_sha256: actualSha256,
      expected_sha256: entry.sha256,
      actual_bytes: actualBytes,
      expected_bytes: entry.bytes,
      actual_record_count: actualRecordCount,
      expected_record_count: entry.record_count,
    };
  });
}

export function summarizeManifest(manifest) {
  return {
    dataset_id: manifest.dataset_id,
    snapshot_date: manifest.snapshot_date,
    files: manifest.files.map((file) => ({
      path: file.path,
      category: file.category,
      sha256: file.sha256,
      record_count: file.record_count ?? null,
    })),
    record_counts: manifest.record_counts,
  };
}
