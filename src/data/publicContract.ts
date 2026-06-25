import { z } from "zod";
import type { LedgerDataset, LedgerRecord } from "./schema";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/);
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const publicClaimBoundarySchema = z.enum([
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

export const resolutionStatusSchema = z.enum([
  "pending",
  "frozen_pending",
  "resolved",
  "blocked_missing_price",
  "blocked_market_holiday_conflict",
  "blocked_symbol_change",
  "blocked_corporate_action_conflict",
  "needs_review",
  "superseded",
]);

export const outcomeRecordSchema = z
  .object({
    prediction_id: z.string().min(1),
    schema_version: z.literal("1.0"),
    resolution_status: resolutionStatusSchema,
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
      const outcomeFields: Array<keyof typeof record> = [
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
      (["start_price", "end_price", "price_source_id"] as const).forEach((field) => {
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

const portfolioCostAssumptionsSchema = z
  .object({
    commission_bps: z.number().min(0),
    slippage_bps: z.number().min(0),
    fx_cost_bps: z.number().min(0),
  })
  .strict();

const portfolioPositionSchema = z
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
  .strict();

const portfolioTradeSchema = z
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
  .strict();

export const paperPortfolioSnapshotSchema = z
  .object({
    portfolio_id: z.string().min(1),
    schema_version: z.literal("1.0"),
    policy_version: z.literal("portfolio_policy_v1"),
    policy_id: z.string().min(1).optional(),
    as_of_date: isoDateSchema,
    currency: z.string().min(3),
    initial_capital: z.number().positive(),
    cost_assumptions: portfolioCostAssumptionsSchema,
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
    positions: z.array(portfolioPositionSchema),
    trades: z.array(portfolioTradeSchema),
    small_sample_warning: z.string().min(1).optional(),
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict();

export const contentItemSchema = z
  .object({
    slug: z.string().min(1),
    schema_version: z.literal("1.0"),
    title: z.string().min(1),
    published_at: isoDateTimeSchema,
    type: z.enum(["method_note", "weekly_review", "monthly_transparency", "error_review"]),
    tags: z.array(z.string()),
    summary: z.string().min(1),
    body_source: z.string().min(1),
    related_prediction_ids: z.array(z.string()),
    provenance: publicProvenanceSchema,
    claim_boundary: z.array(publicClaimBoundarySchema).min(1),
  })
  .strict();

export const contentIndexSchema = z
  .object({
    schema_version: z.literal("1.0"),
    dataset_id: z.string().min(1),
    snapshot_date: isoDateSchema,
    items: z.array(contentItemSchema).length(4),
  })
  .strict();

export const manifestFileSchema = z
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
  .strict();

export const publicManifestSchema = z
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
    files: z.array(manifestFileSchema).min(1),
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

export type PredictionRecord = z.infer<typeof predictionRecordSchema>;
export type OutcomeRecord = z.infer<typeof outcomeRecordSchema>;
export type PaperPortfolioSnapshot = z.infer<typeof paperPortfolioSnapshotSchema>;
export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentIndex = z.infer<typeof contentIndexSchema>;
export type PublicManifest = z.infer<typeof publicManifestSchema>;
export type PublicContractFixture = z.infer<typeof publicContractFixtureSchema>;

function marketForTicker(ticker: string): PredictionRecord["market"] {
  return ticker.endsWith(".HK") ? "HK" : "US";
}

function viewForDirection(direction: LedgerRecord["direction"]): PredictionRecord["view"] {
  switch (direction) {
    case "up":
      return "bullish";
    case "down":
      return "bearish";
    case "neutral":
      return "neutral";
  }
}

function horizonDays(window: string): number {
  const [days] = window.match(/\d+/) ?? [];
  return days ? Number.parseInt(days, 10) : 30;
}

function normalizedHorizon(window: string): string {
  return `${horizonDays(window)}D`;
}

function sourceId(label: string, date: string): string {
  return `${date}-${label}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function defaultClaimBoundary(dataset: LedgerDataset): PredictionRecord["claim_boundary"] {
  const mapped = dataset.metadata.claim_boundary.flatMap((label) => {
    switch (label) {
      case "Research information only":
        return ["research_information_only" as const];
      case "Not investment advice":
        return ["not_investment_advice" as const];
      case "Demo/public-safe dataset":
        return ["demo_public_safe_dataset" as const];
      case "Not OOS":
        return ["not_oos" as const];
      case "Not science/public proof":
        return ["not_science_public_proof" as const];
      case "Not trading signal":
        return ["not_trading_signal" as const];
      default:
        return [];
    }
  });

  return mapped.length > 0
    ? mapped
    : ["research_information_only", "not_investment_advice", "demo_public_safe_dataset"];
}

function statusForLegacyRecord(record: LedgerRecord, boundaryDate: string): OutcomeRecord["resolution_status"] {
  if (record.direction_correct !== "pending") {
    return "resolved";
  }

  const due = new Date(`${record.outcome_availability_date}T00:00:00Z`).getTime();
  const boundary = new Date(`${boundaryDate}T00:00:00Z`).getTime();
  return due <= boundary ? "frozen_pending" : "pending";
}

export function ledgerRecordToPredictionRecord(record: LedgerRecord, dataset: LedgerDataset): PredictionRecord {
  const market = marketForTicker(record.ticker);
  return predictionRecordSchema.parse({
    prediction_id: record.prediction_id,
    schema_version: "1.0",
    ticker: record.ticker,
    asset_id: `${market}:${record.ticker}`,
    market,
    company: record.company,
    decision_at: `${record.decision_date}T00:00:00+08:00`,
    decision_date: record.decision_date,
    view: viewForDirection(record.direction),
    direction: record.direction,
    confidence: record.confidence,
    horizon: normalizedHorizon(record.prediction_window),
    horizon_days: horizonDays(record.prediction_window),
    expected_change_pct: record.expected_change_pct,
    scenario_summary: record.reasoning,
    risk_factors: [],
    evidence_refs: record.evidence.map((evidence) => ({
      source_id: sourceId(evidence.source, evidence.date),
      label: evidence.source,
      date: evidence.date,
    })),
    model_or_method: record.provenance.source,
    provenance: {
      source_repo: "gotra-public-ledger",
      source_dataset_id: dataset.metadata.dataset_id,
      source_record_index: record.provenance.source_record_index,
      exporter_version: "legacy_demo_adapter_v1",
      exported_at: `${dataset.metadata.snapshot_date}T00:00:00+08:00`,
      source_url_or_id: record.provenance.source_url_or_id,
      notes: record.provenance.notes,
    },
    claim_boundary: defaultClaimBoundary(dataset),
  });
}

export function ledgerRecordToOutcomeRecord(record: LedgerRecord, dataset: LedgerDataset): OutcomeRecord {
  const status = statusForLegacyRecord(record, dataset.metadata.current_date_for_boundary_review);
  const isResolved = status === "resolved";

  return outcomeRecordSchema.parse({
    prediction_id: record.prediction_id,
    schema_version: "1.0",
    resolution_status: status,
    resolution_date: isResolved ? record.outcome_availability_date : null,
    window_start: record.decision_date,
    window_end: record.outcome_availability_date,
    actual_change_pct: isResolved ? record.actual_change_pct : null,
    direction_correct: isResolved ? record.direction_correct : null,
    error_pp: isResolved ? record.error : null,
    abs_error_pp: isResolved && typeof record.error === "number" ? Math.abs(record.error) : null,
    resolver_version: "legacy_public_safe_demo_adapter_v1",
    resolution_notes: isResolved
      ? "Legacy public-safe demo outcome. Start/end prices are not present in ledger.demo.json and are not fabricated by the adapter."
      : "No public-safe outcome is available; pending/frozen records remain outside resolved metrics.",
    claim_boundary: defaultClaimBoundary(dataset),
  });
}

export function adaptLedgerDatasetToPublicContract(dataset: LedgerDataset) {
  const predictions = dataset.records.map((record) => ledgerRecordToPredictionRecord(record, dataset));
  const outcomes = dataset.records.map((record) => ledgerRecordToOutcomeRecord(record, dataset));

  return {
    schema_version: "1.0" as const,
    dataset_id: dataset.metadata.dataset_id,
    snapshot_date: dataset.metadata.snapshot_date,
    predictions,
    outcomes,
  };
}
