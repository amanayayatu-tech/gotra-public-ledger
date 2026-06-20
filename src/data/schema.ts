import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const evidenceSchema = z.object({
  source: z.string(),
  date: isoDateSchema,
});

const provenanceSchema = z.object({
  dataset_id: z.string(),
  source: z.literal("zip_demo_rebuilt_public_safe_dataset"),
  source_record_index: z.number().int().nonnegative(),
  immutable_demo_snapshot: z.literal(true),
});

export const ledgerRecordSchema = z.object({
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
  actual_change_pct: z.number().nullable(),
  error: z.number().nullable(),
  direction_correct: z.union([z.boolean(), z.literal("pending")]),
  style_window: z.string(),
  provenance: provenanceSchema,
});

const metadataSchema = z.object({
  dataset_id: z.string(),
  dataset_type: z.literal("frozen_demo_snapshot/public_safe_demo"),
  snapshot_date: isoDateSchema,
  source: z.object({
    type: z.literal("zip_demo_rebuilt_public_safe_dataset"),
    description: z.string(),
    source_zip_basename: z.string(),
    extracted_bundle_basename: z.string(),
  }),
  current_date_for_boundary_review: isoDateSchema,
  record_count: z.number().int().positive(),
  pending_outcome_boundary: z.object({
    source_pending_count: z.number().int().nonnegative(),
    note: z.string(),
  }),
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
