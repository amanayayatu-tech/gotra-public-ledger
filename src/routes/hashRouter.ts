export type AppRoute =
  | { name: "home"; path: "/" }
  | { name: "today"; path: "/today" }
  | { name: "whyGotra"; path: "/why-gotra" }
  | { name: "guide"; path: "/guide" }
  | { name: "fullAnalystReport"; path: "/reports/full-analyst" }
  | { name: "evidencePacketAudit"; path: "/audit/evidence/:id"; evidenceId: string }
  | { name: "ledger"; path: "/ledger" }
  | { name: "prediction"; path: "/ledger/:id"; predictionId: string }
  | { name: "performance"; path: "/performance" }
  | { name: "system"; path: "/system" }
  | { name: "methodology"; path: "/methodology" }
  | { name: "sources"; path: "/sources" }
  | { name: "reports"; path: "/reports" }
  | { name: "notes"; path: "/notes" }
  | { name: "note"; path: "/notes/:slug"; slug: string };

const corePaths = new Set(["/", "/today", "/why-gotra", "/guide", "/ledger", "/performance", "/system", "/methodology", "/sources", "/reports", "/reports/full-analyst", "/notes"]);

export function normalizeHashPath(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/";
  return cleanPath;
}

export function parseHashRoute(hash: string): AppRoute {
  const path = normalizeHashPath(hash);
  if (corePaths.has(path)) {
    switch (path) {
      case "/ledger":
        return { name: "ledger", path };
      case "/today":
        return { name: "today", path };
      case "/why-gotra":
        return { name: "whyGotra", path };
      case "/guide":
        return { name: "guide", path };
      case "/performance":
        return { name: "performance", path };
      case "/system":
        return { name: "system", path };
      case "/methodology":
        return { name: "methodology", path };
      case "/sources":
        return { name: "sources", path };
      case "/reports":
        return { name: "reports", path };
      case "/reports/full-analyst":
        return { name: "fullAnalystReport", path };
      case "/notes":
        return { name: "notes", path };
      default:
        return { name: "home", path: "/" };
    }
  }

  const detailMatch = path.match(/^\/ledger\/([^/]+)$/);
  if (detailMatch?.[1]) {
    return {
      name: "prediction",
      path: "/ledger/:id",
      predictionId: decodeURIComponent(detailMatch[1]),
    };
  }

  const noteMatch = path.match(/^\/notes\/([^/]+)$/);
  if (noteMatch?.[1]) {
    return {
      name: "note",
      path: "/notes/:slug",
      slug: decodeURIComponent(noteMatch[1]),
    };
  }

  const evidenceMatch = path.match(/^\/audit\/evidence\/([^/]+)$/);
  if (evidenceMatch?.[1]) {
    return {
      name: "evidencePacketAudit",
      path: "/audit/evidence/:id",
      evidenceId: decodeURIComponent(evidenceMatch[1]),
    };
  }

  return { name: "home", path: "/" };
}

export function parseBrowserRoute(pathname: string, hash: string): AppRoute {
  const hashPath = normalizeHashPath(hash);
  if (hashPath !== "/") {
    return parseHashRoute(hash);
  }
  return parseHashRoute(pathname);
}

export function routeHref(path: string): string {
  return `/#${path}`;
}

export function predictionRouteHref(predictionId: string): string {
  return routeHref(`/ledger/${encodeURIComponent(predictionId)}`);
}

export function noteRouteHref(slug: string): string {
  return routeHref(`/notes/${encodeURIComponent(slug)}`);
}

export function evidencePacketRouteHref(evidenceId: string): string {
  return routeHref(`/audit/evidence/${encodeURIComponent(evidenceId)}`);
}
