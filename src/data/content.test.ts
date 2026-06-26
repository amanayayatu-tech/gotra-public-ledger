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
    expect(contentItems.every((item) => item.schema_version === "1.1")).toBe(true);
    expect(contentItems).toHaveLength(4);
    expect(contentItems.map((item) => item.type).sort()).toEqual([
      "daily_evening_review",
      "daily_morning_brief",
      "method_note",
      "monthly_transparency",
    ]);
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

  it("loads morning and evening reports with the four required report answers", () => {
    const morning = findContentItem("weekly-ledger-update-2026-06-25");
    const evening = findContentItem("error-review-first-public-snapshot");

    [morning, evening].forEach((item) => {
      expect(item?.report?.watched_scope.length).toBeGreaterThan(0);
      expect(item?.report?.conclusion_change.status).toMatch(
        /unchanged|strengthened|weakened|conflict_found|needs_review|no_new_evidence/,
      );
      expect(item?.report?.why_or_why_not.length).toBeGreaterThan(0);
      expect(item?.report?.next_watch_queue.length).toBeGreaterThan(0);
      expect(item?.report?.boundary_note).toContain("Market move alone cannot be prediction correctness evidence");
    });
  });
});
