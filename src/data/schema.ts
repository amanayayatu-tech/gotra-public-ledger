import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const evidenceSchema = z.object({
  source: z.string(),
  date: isoDateSchema,
});

const provenanceSchema = z.object({
  dataset_id: z.string(),
  source: z.string().min(1),
  source_record_index: z.number().int().nonnegative().optional(),
  immutable_demo_snapshot: z.boolean().optional(),
  source_url_or_id: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const ledgerRecordBaseSchema = z.object({
  prediction_id: z.string(),
  ticker: z.string(),
  company: z.string(),
  sector: z.string(),
  decision_date: isoDateSchema,
  direction: z.enum(["up", "down", "neutral"]),
  expected_change_pct: z.number(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  evidence: z.array(evidenceSchema),
  prediction_window: z.string(),
  outcome_availability_date: isoDateSchema,
  style_window: z.string(),
  provenance: provenanceSchema,
});

const resolvedOutcomeSchema = z.object({
  direction_correct: z.boolean(),
  actual_change_pct: z.number(),
  error: z.number(),
});

const pendingOutcomeSchema = z.object({
  direction_correct: z.literal("pending"),
  actual_change_pct: z.null().optional().default(null),
  error: z.null().optional().default(null),
});

export const ledgerRecordSchema = z.union([
  ledgerRecordBaseSchema.extend(resolvedOutcomeSchema.shape),
  ledgerRecordBaseSchema.extend(pendingOutcomeSchema.shape),
]);

const metadataSchema = z.object({
  dataset_id: z.string(),
  dataset_type: z.string().min(1),
  snapshot_date: isoDateSchema,
  source: z.object({
    type: z.string().min(1),
    description: z.string(),
    source_zip_basename: z.string().optional(),
    extracted_bundle_basename: z.string().optional(),
    source_url_or_id: z.string().optional(),
    notes: z.string().optional(),
  }).passthrough(),
  current_date_for_boundary_review: isoDateSchema,
  record_count: z.number().int().positive(),
  pending_outcome_boundary: z.object({
    source_pending_count: z.number().int().nonnegative(),
    note: z.string(),
  }).optional(),
  claim_boundary: z.array(z.string()),
});

export const ledgerDatasetSchema = z.object({
  metadata: metadataSchema,
  records: z.array(ledgerRecordSchema),
});

export type LedgerRecord = z.infer<typeof ledgerRecordSchema>;
export type LedgerDataset = z.infer<typeof ledgerDatasetSchema>;
export type LedgerMetadata = LedgerDataset["metadata"];

export async function loadLedgerDataset(): Promise<LedgerDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/ledger.demo.json`);
  if (!response.ok) {
    throw new Error(`Unable to load ledger.demo.json: ${response.status}`);
  }

  const payload: unknown = await response.json();
  const parsed = ledgerDatasetSchema.parse(payload);

  if (parsed.metadata.record_count !== parsed.records.length) {
    throw new Error("ledger.demo.json record_count does not match records.length");
  }

  return parsed;
}
