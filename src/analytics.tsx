import { useEffect } from "react";

export type AnalyticsEventName =
  | "page_view"
  | "section_view"
  | "cta_click"
  | "ledger_detail_open"
  | "subscribe_submit";

export type AnalyticsPayload = Record<string, string | number | boolean | null>;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  timestamp: string;
  sessionId: string;
  sequence: number;
  payload: AnalyticsPayload;
};

declare global {
  interface Window {
    __gotraAnalyticsEvents?: AnalyticsEvent[];
    __gotraAnalyticsFail?: boolean;
  }
}

const sessionStorageKey = "gotra_public_ledger_session";
let sequence = 0;

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(sessionStorageKey);
    if (existing) {
      return existing;
    }
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(sessionStorageKey, next);
    return next;
  } catch {
    return `session-${Date.now()}`;
  }
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  try {
    if (window.__gotraAnalyticsFail) {
      throw new Error("analytics disabled for failure smoke");
    }

    const event: AnalyticsEvent = {
      name,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      sequence: (sequence += 1),
      payload,
    };

    window.__gotraAnalyticsEvents = [...(window.__gotraAnalyticsEvents ?? []), event];
    window.dispatchEvent(new CustomEvent("gotra_analytics_event", { detail: event }));
  } catch {
    // Analytics must never block rendering or user interaction.
  }
}

const trackedSections = [
  { id: "S1", section_id: "hero", selector: "#hero" },
  { id: "S2", section_id: "how-it-works", selector: "#how-it-works" },
  { id: "S3", section_id: "trust-strip", selector: "#trust-strip" },
  { id: "S4", section_id: "ledger-proof", selector: "#ledger-proof" },
  { id: "S5", section_id: "full-ledger", selector: "#full-ledger" },
  { id: "S5.5", section_id: "credibility-dashboard", selector: "#credibility-dashboard" },
  { id: "S6", section_id: "method-boundary", selector: "#method-boundary" },
  { id: "S6.5", section_id: "subscribe", selector: "#subscribe" },
  { id: "S7", section_id: "site-footer", selector: "#site-footer" },
];

export function AnalyticsProvider() {
  useEffect(() => {
    trackEvent("page_view", { referrer: document.referrer });
  }, []);

  useEffect(() => {
    const handleCtaClick = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsPayload>).detail ?? {};
      trackEvent("cta_click", detail);
    };
    const handleSubscribeSubmit = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsPayload>).detail ?? {};
      trackEvent("subscribe_submit", detail);
    };

    window.addEventListener("cta_click", handleCtaClick);
    window.addEventListener("subscribe_submit", handleSubscribeSubmit);
    return () => {
      window.removeEventListener("cta_click", handleCtaClick);
      window.removeEventListener("subscribe_submit", handleSubscribeSubmit);
    };
  }, []);

  useEffect(() => {
    const seen = new Set<string>();
    const trackSection = (section: (typeof trackedSections)[number]) => {
      if (seen.has(section.id)) {
        return;
      }

      seen.add(section.id);
      trackEvent("section_view", { id: section.id, section_id: section.section_id });
    };
    const trackVisibleSections = () => {
      trackedSections.forEach((section) => {
        const element = document.querySelector(section.selector);
        if (!element) {
          return;
        }

        const rect = element.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.72 && rect.bottom >= 88) {
          trackSection(section);
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const section = trackedSections.find((item) => item.selector === `#${entry.target.id}`);
          if (!section) {
            return;
          }

          trackSection(section);
        });
      },
      { rootMargin: "-80px 0px -45% 0px", threshold: 0.12 },
    );

    trackedSections.forEach((section) => {
      const element = document.querySelector(section.selector);
      if (element) {
        observer.observe(element);
      }
    });

    trackVisibleSections();
    window.addEventListener("scroll", trackVisibleSections, { passive: true });
    window.addEventListener("resize", trackVisibleSections);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", trackVisibleSections);
      window.removeEventListener("resize", trackVisibleSections);
    };
  }, []);

  return null;
}
