import { describe, expect, it } from "vitest";
import {
  normalizeHashPath,
  noteRouteHref,
  parseBrowserRoute,
  parseHashRoute,
  predictionRouteHref,
  routeHref,
} from "./hashRouter";

describe("hash router", () => {
  it("normalizes empty and core hash paths", () => {
    expect(normalizeHashPath("")).toBe("/");
    expect(normalizeHashPath("#/ledger/")).toBe("/ledger");
    expect(routeHref("/performance")).toBe("#/performance");
    expect(routeHref("/today")).toBe("#/today");
    expect(parseHashRoute("#/today").name).toBe("today");
    expect(parseHashRoute("#/system").name).toBe("system");
    expect(parseHashRoute("#/reports").name).toBe("reports");
  });

  it("parses prediction detail routes", () => {
    const route = parseHashRoute("#/ledger/PRED-20260203-TSM-0054");
    expect(route.name).toBe("prediction");
    expect(route.name === "prediction" ? route.predictionId : "").toBe("PRED-20260203-TSM-0054");
    expect(predictionRouteHref("PRED 1")).toBe("#/ledger/PRED%201");
  });

  it("parses note detail routes", () => {
    const route = parseHashRoute("#/notes/weekly-ledger-update-2026-06-25");
    expect(route.name).toBe("note");
    expect(route.name === "note" ? route.slug : "").toBe("weekly-ledger-update-2026-06-25");
    const eveningRoute = parseHashRoute("#/notes/error-review-first-public-snapshot");
    expect(eveningRoute.name === "note" ? eveningRoute.slug : "").toBe("error-review-first-public-snapshot");
    expect(noteRouteHref("alpha note")).toBe("#/notes/alpha%20note");
  });

  it("falls unknown paths back to home", () => {
    expect(parseHashRoute("#/unknown").name).toBe("home");
  });

  it("parses browser reports route and keeps hash routes authoritative", () => {
    expect(parseBrowserRoute("/reports", "").name).toBe("reports");
    expect(parseBrowserRoute("/reports", "#/notes").name).toBe("notes");
  });
});
