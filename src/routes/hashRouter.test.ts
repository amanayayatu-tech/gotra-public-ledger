import { describe, expect, it } from "vitest";
import {
  normalizeHashPath,
  evidencePacketRouteHref,
  noteRouteHref,
  parseBrowserRoute,
  parseHashRoute,
  predictionRouteHref,
  routeHref,
  trackRecordEntryRouteHref,
} from "./hashRouter";

describe("hash router", () => {
  it("normalizes empty and core hash paths", () => {
    expect(normalizeHashPath("")).toBe("/");
    expect(normalizeHashPath("#/ledger/")).toBe("/ledger");
    expect(routeHref("/performance")).toBe("/#/performance");
    expect(routeHref("/today")).toBe("/#/today");
    expect(routeHref("/guide")).toBe("/#/guide");
    expect(routeHref("/track-record")).toBe("/#/track-record");
    expect(parseHashRoute("#/today").name).toBe("today");
    expect(parseHashRoute("#/guide").name).toBe("guide");
    expect(parseHashRoute("#/track-record").name).toBe("trackRecord");
    expect(parseHashRoute("#/system").name).toBe("system");
    expect(parseHashRoute("#/reports").name).toBe("reports");
  });

  it("parses prediction detail routes", () => {
    const route = parseHashRoute("#/ledger/PRED-20260203-TSM-0054");
    expect(route.name).toBe("prediction");
    expect(route.name === "prediction" ? route.predictionId : "").toBe("PRED-20260203-TSM-0054");
    expect(predictionRouteHref("PRED 1")).toBe("/#/ledger/PRED%201");
  });

  it("parses live track-record detail routes", () => {
    const route = parseHashRoute("#/track-record/gotra%3Aledger%3AHKEX%3A0700%3A2026-06-29%3A30%3Av1");
    expect(route.name).toBe("trackRecordEntry");
    expect(route.name === "trackRecordEntry" ? route.entryId : "").toBe("gotra:ledger:HKEX:0700:2026-06-29:30:v1");
    expect(trackRecordEntryRouteHref("entry 1")).toBe("/#/track-record/entry%201");
  });

  it("parses note detail routes", () => {
    const route = parseHashRoute("#/notes/weekly-ledger-update-2026-06-25");
    expect(route.name).toBe("note");
    expect(route.name === "note" ? route.slug : "").toBe("weekly-ledger-update-2026-06-25");
    const eveningRoute = parseHashRoute("#/notes/error-review-first-public-snapshot");
    expect(eveningRoute.name === "note" ? eveningRoute.slug : "").toBe("error-review-first-public-snapshot");
    expect(noteRouteHref("alpha note")).toBe("/#/notes/alpha%20note");
  });

  it("parses evidence packet audit routes", () => {
    const route = parseHashRoute("#/audit/evidence/HKEX%3A0700");
    expect(route.name).toBe("evidencePacketAudit");
    expect(route.name === "evidencePacketAudit" ? route.evidenceId : "").toBe("HKEX:0700");
    expect(evidencePacketRouteHref("HKEX:0700")).toBe("/#/audit/evidence/HKEX%3A0700");
  });

  it("falls unknown paths back to home", () => {
    expect(parseHashRoute("#/unknown").name).toBe("home");
  });

  it("parses browser reports route and keeps hash routes authoritative", () => {
    expect(parseBrowserRoute("/reports", "").name).toBe("reports");
    expect(parseBrowserRoute("/track-record", "").name).toBe("trackRecord");
    expect(parseBrowserRoute("/guide", "").name).toBe("guide");
    expect(parseBrowserRoute("/reports", "#/notes").name).toBe("notes");
  });
});
