/* global console, process, fetch, URL */
import fs from "node:fs";
import path from "node:path";

const defaultEntrypoints = [
  "/",
  "/today/",
  "/track-record",
  "/monthly-reports",
  "/methodology",
  "/audit",
  "/reports/full-analyst/",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    baseUrl: "http://127.0.0.1:4177/",
    maxDepth: 4,
    output: "",
    entrypoints: [...defaultEntrypoints],
    maxPages: 120,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") args.baseUrl = argv[++index];
    else if (arg === "--max-depth") args.maxDepth = Number(argv[++index]);
    else if (arg === "--output") args.output = argv[++index];
    else if (arg === "--entrypoint") args.entrypoints.push(argv[++index]);
    else if (arg === "--max-pages") args.maxPages = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function normalizeBase(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function sameOriginUrl(baseUrl, href) {
  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function routeKey(url) {
  return `${url.pathname}${url.search}`;
}

function isRawArtifactPath(pathname) {
  return /\.(json|md|txt|tar|tgz|gz|zip|bundle)$/i.test(pathname);
}

function isAllowedRawArtifact(pathname, referrerPath) {
  if (pathname.startsWith("/reports/") && /\.(json|md)$/i.test(pathname)) {
    return true;
  }
  if (pathname.startsWith("/data/") && /\.(json)$/i.test(pathname)) {
    return referrerPath === "/ledger" || referrerPath === "/reports" || referrerPath === "/sources";
  }
  if (pathname.startsWith("/content/articles/") && /\.(json|md)$/i.test(pathname)) {
    return referrerPath === "/notes" || referrerPath === "/reports" || referrerPath === "/sources";
  }
  return false;
}

function extractAnchors(html, baseUrl) {
  const anchors = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1];
    const label = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    const url = sameOriginUrl(baseUrl, href);
    if (!url) continue;
    anchors.push({ href, url, label });
  }
  return anchors;
}

async function fetchPage(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  return { status: response.status, ok: response.ok, contentType, text };
}

async function crawl(args) {
  const baseUrl = normalizeBase(args.baseUrl);
  const queue = args.entrypoints.map((entrypoint) => ({ url: new URL(entrypoint, baseUrl), depth: 0, referrer: "" }));
  const visited = new Map();
  const brokenLinks = [];
  const rawLinkInventory = [];
  const allowedRawArtifacts = [];
  const forbiddenRawLandings = [];
  const objectObjectHits = [];
  const pythonDictHits = [];
  const unrenderedJsonOrMdHits = [];

  while (queue.length > 0 && visited.size < args.maxPages) {
    const item = queue.shift();
    const key = routeKey(item.url);
    if (visited.has(key)) continue;
    const referrerPath = item.referrer || "";
    const rawPath = isRawArtifactPath(item.url.pathname);
    if (rawPath) {
      const rawRecord = { path: key, depth: item.depth, referrer: referrerPath };
      rawLinkInventory.push(rawRecord);
      if (isAllowedRawArtifact(item.url.pathname, referrerPath)) {
        allowedRawArtifacts.push(rawRecord);
      } else {
        forbiddenRawLandings.push(rawRecord);
        visited.set(key, { ...rawRecord, skipped: true });
        continue;
      }
    }
    let page;
    try {
      page = await fetchPage(item.url);
    } catch (error) {
      brokenLinks.push({ path: key, depth: item.depth, referrer: referrerPath, error: String(error) });
      continue;
    }
    const record = {
      path: key,
      depth: item.depth,
      referrer: referrerPath,
      status: page.status,
      content_type: page.contentType,
      title: page.text.match(/<title>(.*?)<\/title>/i)?.[1] ?? "",
    };
    visited.set(key, record);
    if (!page.ok) {
      brokenLinks.push(record);
      continue;
    }
    if (page.text.includes("[object Object]")) objectObjectHits.push(record);
    if (/[{']schema['"]?\s*:/.test(page.text) && !rawPath) pythonDictHits.push(record);
    if (/^#\s|\{\s*"schema"/.test(page.text.trim()) && !rawPath) unrenderedJsonOrMdHits.push(record);
    if (!page.contentType.includes("html") || item.depth >= args.maxDepth) continue;

    for (const anchor of extractAnchors(page.text, item.url.href)) {
      const childKey = routeKey(anchor.url);
      if (visited.has(childKey)) continue;
      const childRaw = isRawArtifactPath(anchor.url.pathname);
      if (childRaw) {
        rawLinkInventory.push({ path: childKey, depth: item.depth + 1, referrer: key, label: anchor.label });
        if (isAllowedRawArtifact(anchor.url.pathname, key)) {
          allowedRawArtifacts.push({ path: childKey, depth: item.depth + 1, referrer: key, label: anchor.label });
        } else {
          forbiddenRawLandings.push({ path: childKey, depth: item.depth + 1, referrer: key, label: anchor.label });
        }
      }
      queue.push({ url: anchor.url, depth: item.depth + 1, referrer: key });
    }
  }

  return {
    event_type: "depth4_click_crawl",
    base_url: baseUrl,
    entrypoints: args.entrypoints,
    visited_pages: Array.from(visited.values()),
    max_depth: args.maxDepth,
    raw_link_inventory: rawLinkInventory,
    allowed_raw_artifacts: allowedRawArtifacts,
    forbidden_accidental_raw_landings: forbiddenRawLandings,
    broken_links: brokenLinks,
    object_object_count: objectObjectHits.length,
    python_dict_count: pythonDictHits.length,
    unrendered_json_or_md_count: unrenderedJsonOrMdHits.length,
    result:
      brokenLinks.length === 0 &&
      forbiddenRawLandings.length === 0 &&
      objectObjectHits.length === 0 &&
      pythonDictHits.length === 0 &&
      unrenderedJsonOrMdHits.length === 0
        ? "pass"
        : "needs_repair",
  };
}

async function main() {
  const args = parseArgs();
  const result = await crawl(args);
  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.result !== "pass") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
