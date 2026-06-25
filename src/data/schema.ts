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

const fallbackDate = "1970-01-01";

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function numberOrFallback(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateOrFallback(value: unknown, fallback = fallbackDate): string {
  const parsed = isoDateSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function directionOrFallback(value: unknown): LedgerRecord["direction"] {
  return value === "up" || value === "down" || value === "neutral" ? value : "neutral";
}

function evidenceOrFallback(value: unknown): LedgerRecord["evidence"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const parsed = evidenceSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function provenanceOrFallback(value: unknown, datasetId: string): LedgerRecord["provenance"] {
  const parsed = provenanceSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : {
        dataset_id: datasetId,
        source: "schema_degraded_record",
        notes: "Recovered by public ledger frontend schema fallback.",
      };
}

function recoverRecord(value: unknown, index: number, datasetId: string): LedgerRecord | null {
  if (!isRecordLike(value)) {
    console.warn("[GOTRA ledger] Dropping non-object ledger record", { index });
    return null;
  }

  const hasResolvedOutcome =
    typeof value.direction_correct === "boolean" &&
    typeof value.actual_change_pct === "number" &&
    typeof value.error === "number";
  const recovered = {
    prediction_id: stringOrFallback(value.prediction_id, `degraded-record-${index}`),
    ticker: stringOrFallback(value.ticker, "UNKNOWN"),
    company: stringOrFallback(value.company, "暂无"),
    sector: stringOrFallback(value.sector, "暂无"),
    decision_date: dateOrFallback(value.decision_date),
    direction: directionOrFallback(value.direction),
    expected_change_pct: numberOrFallback(value.expected_change_pct, 0),
    confidence: Math.min(1, Math.max(0, numberOrFallback(value.confidence, 0))),
    reasoning: stringOrFallback(value.reasoning, "暂无"),
    evidence: evidenceOrFallback(value.evidence),
    prediction_window: stringOrFallback(value.prediction_window, "暂无"),
    outcome_availability_date: dateOrFallback(value.outcome_availability_date),
    style_window: stringOrFallback(value.style_window, "暂无"),
    provenance: provenanceOrFallback(value.provenance, datasetId),
    direction_correct: hasResolvedOutcome ? value.direction_correct : "pending",
    actual_change_pct: hasResolvedOutcome ? value.actual_change_pct : null,
    error: hasResolvedOutcome ? value.error : null,
  };

  const parsed = ledgerRecordSchema.safeParse(recovered);
  if (!parsed.success) {
    console.warn("[GOTRA ledger] Dropping unrecoverable ledger record", {
      index,
      issues: parsed.error.issues,
    });
    return null;
  }

  console.warn("[GOTRA ledger] Recovered invalid ledger record with schema fallback", {
    index,
    prediction_id: parsed.data.prediction_id,
  });
  return parsed.data;
}

function recoverDataset(payload: unknown, reason: z.ZodError): LedgerDataset {
  console.warn("[GOTRA ledger] ledger.demo.json failed strict schema validation; rendering degraded dataset", {
    issues: reason.issues,
  });

  const source = isRecordLike(payload) ? payload : {};
  const metadataSource = isRecordLike(source.metadata) ? source.metadata : {};
  const datasetId = stringOrFallback(metadataSource.dataset_id, "degraded-public-safe-demo");
  const recordsSource = Array.isArray(source.records) ? source.records : [];
  const records = recordsSource.flatMap((record, index) => {
    const strictRecord = ledgerRecordSchema.safeParse(record);
    return strictRecord.success ? [strictRecord.data] : [recoverRecord(record, index, datasetId)].filter(Boolean);
  }) as LedgerRecord[];

  const metadata = {
    dataset_id: datasetId,
    dataset_type: stringOrFallback(metadataSource.dataset_type, "public_safe_demo_degraded"),
    snapshot_date: dateOrFallback(metadataSource.snapshot_date),
    source: {
      type: isRecordLike(metadataSource.source)
        ? stringOrFallback(metadataSource.source.type, "schema_degraded_source")
        : "schema_degraded_source",
      description: isRecordLike(metadataSource.source)
        ? stringOrFallback(metadataSource.source.description, "Recovered from invalid public-safe demo payload.")
        : "Recovered from invalid public-safe demo payload.",
    },
    current_date_for_boundary_review: dateOrFallback(metadataSource.current_date_for_boundary_review),
    record_count: records.length,
    pending_outcome_boundary: isRecordLike(metadataSource.pending_outcome_boundary)
      ? {
          source_pending_count: Math.max(
            0,
            Math.trunc(numberOrFallback(metadataSource.pending_outcome_boundary.source_pending_count, 0)),
          ),
          note: stringOrFallback(
            metadataSource.pending_outcome_boundary.note,
            "Invalid source payload was recovered without backfilling outcomes.",
          ),
        }
      : undefined,
    claim_boundary: Array.isArray(metadataSource.claim_boundary)
      ? metadataSource.claim_boundary.filter((item): item is string => typeof item === "string")
      : ["Research information only", "Not investment advice", "Demo/public-safe dataset"],
  };

  const parsed = ledgerDatasetSchema.parse({ metadata, records });
  if (records.length === 0) {
    console.warn("[GOTRA ledger] Degraded dataset contains no renderable records");
  }
  return parsed;
}

export async function loadLedgerDataset(): Promise<LedgerDataset> {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  const candidateUrls = [`${baseUrl}data/ledger.demo.json`];
  if (baseUrl !== "/") {
    candidateUrls.push("/data/ledger.demo.json");
  }

  let payload: unknown;
  const failures: string[] = [];
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        failures.push(`${url}: ${response.status}`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        failures.push(`${url}: non-json ${contentType || "unknown content-type"}`);
        continue;
      }
      payload = await response.json();
      break;
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (payload === undefined) {
    throw new Error(`Unable to load ledger.demo.json: ${failures.join("; ")}`);
  }

  const parsedResult = ledgerDatasetSchema.safeParse(payload);
  const parsed = parsedResult.success ? parsedResult.data : recoverDataset(payload, parsedResult.error);

  if (parsed.metadata.record_count !== parsed.records.length) {
    console.warn("[GOTRA ledger] ledger.demo.json record_count mismatch; using parsed records.length", {
      metadata_record_count: parsed.metadata.record_count,
      records_length: parsed.records.length,
    });
    return {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        record_count: parsed.records.length,
      },
    };
  }

  return parsed;
}
