import { describe, expect, it } from "vitest";
import {
  monthlyReportFileForMonth,
  normalizeMonthlyTransparencyReport,
  normalizeMonthlyTransparencyReportIndex,
} from "./monthlyReports";

describe("monthly transparency report contract", () => {
  it("normalizes the public monthly report index", () => {
    const index = normalizeMonthlyTransparencyReportIndex({
      schema: "gotra.monthly_transparency_report_index.v1",
      generated_at: "2026-07-30T10:00:00+00:00",
      report_count: 1,
      latest_month: "2026-07",
      reports: [
        {
          month: "2026-07",
          file: "monthly_transparency_report_2026-07.json",
          published_count: 3,
          needs_review_count: 1,
          blocked_count: 0,
          review_coverage: { total_count: 3, due_count: 2, reviewed_count: 1, unavailable_count: 1, not_due_count: 1 },
          error_case_count: 1,
          data_gap_count: 1,
          improvement_item_count: 2,
          report_hash: "hash",
        },
      ],
    });

    expect(index.reports).toHaveLength(1);
    expect(index.reports[0].review_coverage.reviewed_count).toBe(1);
    expect(index.latest_month).toBe("2026-07");
  });

  it("normalizes a monthly report with errors, gaps, and improvements", () => {
    const report = normalizeMonthlyTransparencyReport({
      schema: "gotra.monthly_transparency_report.v1",
      month: "2026-07",
      generated_at: "2026-07-30T10:00:00+00:00",
      published_count: 3,
      needs_review_count: 1,
      blocked_count: 0,
      review_coverage: { total_count: 3, due_count: 2, reviewed_count: 1, unavailable_count: 1, not_due_count: 1 },
      error_cases: [{ entry_id: "entry-1", attribution: "below_benchmark", raw_return: -2, benchmark_return: 1 }],
      data_gaps: [{ entry_id: "entry-2", reason: "public_review_price_or_benchmark_data_unavailable", missing_fields: ["end_price"] }],
      improvement_items: ["Add public review observations."],
    });

    expect(report.error_cases[0].attribution).toBe("below_benchmark");
    expect(report.data_gaps[0].missing_fields).toEqual(["end_price"]);
    expect(report.improvement_items[0]).toContain("public review");
  });

  it("rejects raw or unexpected monthly report shapes", () => {
    expect(() => normalizeMonthlyTransparencyReportIndex({ schema: "raw" })).toThrow("monthly_report_index_schema_unavailable");
    expect(() => normalizeMonthlyTransparencyReport({ schema: "raw" })).toThrow("monthly_report_schema_unavailable");
    expect(monthlyReportFileForMonth("2026-07")).toBe("monthly_transparency_report_2026-07.json");
  });
});
