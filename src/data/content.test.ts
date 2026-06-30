import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentIndex, contentItems, findContentItem } from "./content";
import { contentIndexSchema } from "./publicContract";

const repoRoot = process.cwd();

describe("content index", () => {
  it("loads exactly four public-safe content items", () => {
    expect(contentIndexSchema.safeParse(contentIndex).success).toBe(true);
    expect(contentIndex.schema_version).toBe("1.1");
    expect(contentIndex.snapshot_date).toBe("2026-06-25");
    expect(contentIndex.dataset_id).toBe("gotra_public_alpha_content_2026_06_25");
    expect(contentItems.every((item) => item.schema_version === "1.1")).toBe(true);
    expect(contentItems).toHaveLength(4);
    expect(contentItems.map((item) => item.type).sort()).toEqual([
      "daily_evening_review",
      "daily_morning_brief",
      "method_note",
      "monthly_transparency",
    ]);
  });

  it("keeps transparency articles separate from the latest production daily reports", () => {
    expect(contentItems.every((item) => item.published_at.startsWith("2026-06-25"))).toBe(true);
    expect(contentItems.map((item) => item.slug)).not.toContain("public_stock_pool_morning_us_2026-06-29");
    expect(contentItems.map((item) => item.slug)).not.toContain("full_analyst_evening_hk_2026-06-30");
  });

  it("keeps article body sources public, present, and boundary-labeled", () => {
    contentItems.forEach((item) => {
      expect(item.body_source.startsWith("public/content/articles/")).toBe(true);
      expect(item.body_source.includes("..")).toBe(false);
      const body = fs.readFileSync(path.join(repoRoot, item.body_source), "utf8");

      expect(body).toContain("Research information only");
      expect(body).toContain("Not investment advice");
      expect(body).toContain("Not a trading signal");
      expect(body).toContain("No performance proof");
      expect(body).toMatch(/#\/(ledger|methodology|performance|sources|notes)/);
    });
  });

  it("finds note details by slug and preserves explicit empty related predictions", () => {
    const method = findContentItem("method-note-public-ledger-v1");
    const weekly = findContentItem("weekly-ledger-update-2026-06-25");

    expect(method?.related_prediction_ids).toEqual([]);
    expect(weekly?.related_prediction_ids).toContain("PRED-20260203-TSM-0054");
    expect(findContentItem("missing-note")).toBeNull();
  });

  it("loads morning and evening reports with the five required report answers", () => {
    const morning = findContentItem("weekly-ledger-update-2026-06-25");
    const evening = findContentItem("error-review-first-public-snapshot");
    expect(morning?.report).toBeDefined();
    expect(evening?.report).toBeDefined();

    [morning, evening].forEach((item) => {
      const itemReport = item?.report;
      expect(itemReport).toBeDefined();
      expect(itemReport?.watched_scope.length).toBeGreaterThan(0);
      expect(itemReport?.targets.length).toBeGreaterThan(0);
      expect(itemReport?.reading_time_minutes).toBeGreaterThan(0);
      expect(itemReport?.today_change).toMatch(/\S/);
      expect(itemReport?.evidence_status).toMatch(/\S/);
      expect(itemReport?.main_risks.length).toBeGreaterThan(0);
      expect(itemReport?.why_today_matters).toMatch(/\S/);
      expect(itemReport?.background_context.length).toBeGreaterThan(0);
      expect(itemReport?.recent_changes.length).toBeGreaterThan(0);
      expect(itemReport?.positive_view.length).toBeGreaterThan(0);
      expect(itemReport?.opposing_view.join(" ")).toMatch(/red-team|反方审查/i);
      expect(itemReport?.observation_triggers.length).toBeGreaterThan(0);
      expect(itemReport?.risks_uncertainty.length).toBeGreaterThan(0);
      expect(itemReport?.reader_takeaways.length).toBeGreaterThan(0);
      expect(itemReport?.comparability.length).toBeGreaterThan(0);
      expect(itemReport?.error_attribution.length).toBeGreaterThan(0);
      expect(itemReport?.system_learning.length).toBeGreaterThan(0);
      expect(itemReport?.tomorrow_watch.length).toBeGreaterThan(0);
      expect(itemReport?.conclusion_change.status).toMatch(
        /unchanged|strengthened|weakened|conflict_found|needs_review|no_new_evidence/,
      );
      expect(itemReport?.why_or_why_not.length).toBeGreaterThan(0);
      expect(itemReport?.next_watch_queue.length).toBeGreaterThan(0);
      expect(itemReport?.boundary_note).toContain("Market move alone cannot be prediction correctness evidence");
      expect(itemReport?.boundary_note).toContain("Not investment advice");
      expect(item?.summary.toLowerCase()).not.toContain("demo morning brief format");
      expect(item?.summary.toLowerCase()).not.toContain("demo evening review format");
    });
  });

  it("rejects report self-description phrases intended for internal templates", () => {
    const forbiddenDemoSelfExplanation = [
      /this demo format/i,
      /demo report format/i,
      /demo morning brief format/i,
      /demo evening review format/i,
      /report format demonstration/i,
      /演示格式/i,
      /用于展示/i,
    ];

    contentItems.forEach((item) => {
      const body = fs.readFileSync(path.join(repoRoot, item.body_source), "utf8");
      const report = item.report;
      const userVisible = [
        item.title,
        item.summary,
        report?.tldr ?? "",
        ...(report?.watched_scope ?? []).flatMap((scope) => [
          scope.label,
          scope.ticker,
          scope.company,
          scope.prediction_id ?? "",
          scope.why_watched,
        ]),
        ...(report?.ledger_changes ?? []),
        ...(report?.evidence_updates ?? []).flatMap((update) => [
          update.topic,
          update.update,
        ]),
        report?.conclusion_change?.summary ?? "",
        ...(report?.why_or_why_not ?? []),
        ...(report?.next_watch_queue ?? []).flatMap((queue) => [
          queue.item,
          queue.next_check,
          queue.reason,
        ]),
        report?.boundary_note ?? "",
        body,
      ]
        .filter((value): value is string => typeof value === "string")
        .join("\n");

      for (const pattern of forbiddenDemoSelfExplanation) {
        expect(userVisible).not.toMatch(pattern);
      }
    });
  });
});
