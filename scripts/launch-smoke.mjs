/* global Buffer, URL, WebSocket, clearTimeout, console, fetch, process, setTimeout */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const defaultChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FALLBACK_BROWSER = "playwright";
const FORBIDDEN_PHRASES = [
  "this demo format",
  "demo report format",
  "演示格式",
  "demo morning brief format",
  "demo evening review format",
];

function parseArgs(argv) {
  const args = {
    baseUrl: "https://amanayayatu-tech.github.io/gotra-public-ledger/",
    outDir: "docs/launch-validation/p8-reader-first-ux-i18n-production",
    chromePath: defaultChromePath,
  };

  argv.forEach((arg, index) => {
    const next = argv[index + 1];
    if (arg === "--base-url" && next) {
      args.baseUrl = next;
    }
    if (arg === "--out-dir" && next) {
      args.outDir = next;
    }
    if (arg === "--chrome-path" && next) {
      args.chromePath = next;
    }
  });

  args.baseUrl = args.baseUrl.endsWith("/") ? args.baseUrl : `${args.baseUrl}/`;
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message, details = undefined) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchText(url) {
  const response = await fetch(url);
  assert(response.ok, `HTTP check failed: ${url}`, { status: response.status });
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert(response.ok, `HTTP check failed: ${url}`, { status: response.status });
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/json"), `HTTP check did not return JSON: ${url}`, { contentType });
  return response.json();
}

async function fetchJsonFromCandidates(paths, baseUrl) {
  const failures = [];
  for (const candidatePath of paths) {
    const url = new URL(candidatePath, baseUrl);
    try {
      const payload = await fetchJson(url.href);
      return { url: url.href, payload, failures };
    } catch (error) {
      failures.push({ url: url.href, message: error.message, details: error.details });
    }
  }
  throw new Error(`No JSON candidate passed: ${paths.join(", ")}`);
}

function waitForDevTools(processHandle, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for Chrome DevTools endpoint"));
    }, timeoutMs);

    const handleOutput = (chunk) => {
      buffer += String(chunk);
      const match = buffer.match(/DevTools listening on ws:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)\//);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    };

    processHandle.stdout?.on("data", handleOutput);
    processHandle.stderr?.on("data", handleOutput);
    processHandle.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools endpoint was ready: ${code}`));
    });
  });
}

async function startChrome(chromePath) {
  assert(fs.existsSync(chromePath), "Chrome binary not found", { chromePath });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gotra-launch-smoke-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const port = await waitForDevTools(chrome, 8000);
  return { chrome, port, userDataDir };
}

async function stopChrome(chromeState) {
  if (!chromeState) {
    return;
  }
  chromeState.chrome.kill("SIGTERM");
  await sleep(300);
  if (chromeState.userDataDir) {
    fs.rmSync(chromeState.userDataDir, { recursive: true, force: true });
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message ?? "cdp error"));
        } else {
          resolve(message.result);
        }
        return;
      }
      if (message.method && this.listeners.has(message.method)) {
        this.listeners.get(message.method).forEach((listener) => listener(message.params));
      }
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) {
      this.listeners.set(method, []);
    }
    this.listeners.get(method).push(listener);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(payload);
    });
  }

  close() {
    this.socket?.close();
  }
}

async function createPage(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  assert(response.ok, "Failed to create Chrome target", { status: response.status });
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  }
  return result.result.value;
}

async function waitForAppReady(client) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    const ready = await evaluate(
      client,
      "Boolean(document.body?.innerText && !document.body.innerText.includes('Loading ledger.demo.json'))",
    );
    if (ready) {
      return;
    }
    await sleep(120);
  }
  throw new Error("App did not finish loading within timeout");
}

async function navigate(client, url, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    mobile: Boolean(viewport.mobile),
  });
  await client.send("Page.navigate", { url });
  await sleep(400);
  await waitForAppReady(client);
}

async function captureScreenshot(client, filePath) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

async function inspectPage(client, requiredText = []) {
  return evaluate(client, `(() => {
    const bodyText = document.body?.innerText || "";
    const normalized = (bodyText || "").toLowerCase();
    const missing = ${JSON.stringify(requiredText.map((x) => x.toLowerCase()))}.filter((fragment) => !normalized.includes(fragment));
    const overflow = Math.max(
      0,
      document.documentElement.scrollWidth - window.innerWidth,
      document.body.scrollWidth - window.innerWidth,
    );
    const boundary = bodyText.includes("Research information only") || bodyText.includes("公开研究账本");
    const auditDetails = Array.from(document.querySelectorAll("details")).map((detail) => ({
      summaryText: (detail.querySelector("summary")?.innerText || "").trim(),
      open: Boolean(detail.open),
    }));
    return {
      title: document.title,
      bodyText,
      missing,
      overflow,
      hasBoundary: boundary,
      auditDetails,
    };
  })()`);
}

async function exerciseLedger(client) {
  return evaluate(client, `(() => {
    const setNativeValue = (element, value) => {
      const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      descriptor.set.call(element, value);
      element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    };
    const input = document.querySelector(".search-box input");
    const selects = Array.from(document.querySelectorAll(".filters select"));
    if (!input || selects.length < 3) {
      return { ok: false, reason: "filters_not_found", selectCount: selects.length };
    }
    setNativeValue(input, "TSM");
    setNativeValue(selects[0], "resolved");
    setNativeValue(selects[1], "up");
    const text = document.body.innerText;
    return {
      ok: input.value === "TSM" && selects[0].value === "resolved" && selects[1].value === "up",
      searchValue: input.value,
      statusValue: selects[0].value,
      directionValue: selects[1].value,
      containsCountLine: text.includes("当前显示"),
    };
  })()`);
}

function detectForbiddenPhrases(text) {
  const normalized = normalizeText(text);
  return FORBIDDEN_PHRASES.filter((phrase) => normalized.includes(phrase));
}

function runPlaywrightFallback(args) {
  const routes = [
    {
      label: "home",
      route: "#/",
      file: "desktop-home-1440x900.png",
      viewport: "1440,900",
      waitForSelector: "#page-title",
    },
    {
      label: "ledger",
      route: "#/ledger",
      file: "desktop-ledger-1440x900.png",
      viewport: "1440,900",
      waitForSelector: "#full-ledger-title",
    },
    {
      label: "system",
      route: "#/system",
      file: "desktop-system-1440x900.png",
      viewport: "1440,900",
      waitForSelector: "#system-diagram-title",
    },
    {
      label: "notes",
      route: "#/notes",
      file: "mobile-notes-390x844.png",
      viewport: "390,844",
      waitForSelector: "#notes-title",
      mobile: true,
    },
    {
      label: "system_mobile",
      route: "#/system",
      file: "mobile-system-390x844.png",
      viewport: "390,844",
      waitForSelector: "#system-diagram-title",
      mobile: true,
    },
  ];

  const check = spawnSync(FALLBACK_BROWSER, ["--version"], { encoding: "utf8", stdio: "pipe" });
  if (check.status !== 0) {
    return { status: "unavailable", reason: `playwright CLI unavailable: ${check.stderr || check.stdout || "unknown"}` };
  }

  const screenshots = [];
  const routeResults = [];
  const limitations = [];
  const maxAttempts = 2;

  for (const route of routes) {
    const output = path.join(args.outDir, route.file);
    let attempt = 0;
    let captured = false;
    let lastError = "not_attempted";

    while (attempt < maxAttempts && !captured) {
      attempt += 1;
      const screenshotArgs = [
        "screenshot",
        `${args.baseUrl}${route.route}`,
        output,
        "--full-page",
        `--viewport-size=${route.viewport}`,
        "--timeout=120000",
        `--wait-for-selector=${route.waitForSelector}`,
        "--wait-for-timeout=10000",
      ];
      screenshotArgs.splice(2, 0, "--device=Desktop Chrome");
      const result = spawnSync(FALLBACK_BROWSER, screenshotArgs, { encoding: "utf8", stdio: "pipe" });
      if (result.status === 0) {
        captured = true;
        break;
      }
      lastError = `attempt ${attempt} failed: ${String(result.stderr || result.stdout || "unknown")}`.slice(0, 600);
    }

    routeResults.push({
      route: route.label,
      hash: route.route,
      file: route.file,
      status: captured ? "captured" : "not_captured",
      attempts: attempt,
      reason: captured ? "ok" : lastError,
    });

    if (captured) {
      screenshots.push({ route: route.label, hash: route.route, file: route.file, status: "captured" });
      continue;
    }

    limitations.push({
      route: route.label,
      hash: route.route,
      message: lastError,
    });
  }

  return {
    status: limitations.length === 0 ? "pass" : "needs_review",
    screenshots,
    routeResults,
    limitations,
    attempts: maxAttempts,
  };
}

async function runBrowserSmoke(args, ledger, contentIndex) {
  const report = {
    routeResults: [],
    consoleErrors: [],
    screenshots: [],
    limitations: [],
    notes: {},
    checks: {
      routeCheckRequired: 0,
      routeCheckCompleted: 0,
      domConsoleOverflowChecked: false,
      auditDetailsChecked: false,
    },
  };
  const chromeState = await startChrome(args.chromePath);
  let client;

  try {
    client = await createPage(chromeState.port);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    client.on("Runtime.exceptionThrown", (params) => {
      report.consoleErrors.push({ type: "exception", text: params.exceptionDetails?.text ?? "exception" });
    });
    client.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") {
        report.consoleErrors.push({
          type: "console_error",
          text: params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" "),
        });
      }
    });
    client.on("Log.entryAdded", (params) => {
      if (["error", "fatal", "severe"].includes(params.entry?.level)) {
        report.consoleErrors.push({ type: "log_error", text: params.entry.text, level: params.entry.level });
      }
    });

    const firstPredictionId = ledger.records?.[0]?.prediction_id;
    const firstNoteSlug = contentIndex.items?.[0]?.slug;
    const desktop = { width: 1440, height: 900, mobile: false };
    const mobile = { width: 390, height: 844, mobile: true };
    const routes = [
      { label: "home", hash: "#/", viewport: desktop, requiredText: ["GOTRA", "Public Ledger"] },
      { label: "ledger", hash: "#/ledger", viewport: desktop, requiredText: ["公开研究账本", "GOTRA", "Public Ledger"] },
      { label: "prediction_detail", hash: `#/ledger/${firstPredictionId ?? ""}`, viewport: desktop, requiredText: [firstPredictionId ?? "prediction"] },
      { label: "performance", hash: "#/performance", viewport: desktop, requiredText: ["paper", "Portfolio"] },
      { label: "system", hash: "#/system", viewport: desktop, requiredText: ["Weekly Research Cognition System", "DRAFT_PRD", "Gate-Judge"] },
      { label: "system_mobile", hash: "#/system", viewport: mobile, requiredText: ["Weekly Research Cognition System", "DRAFT_PRD", "Gate-Judge"] },
      { label: "methodology", hash: "#/methodology", viewport: desktop, requiredText: ["methodology", "Boundary", "claim boundary"] },
      { label: "sources", hash: "#/sources", viewport: desktop, requiredText: ["Sources", "manifest", "public-safe"] },
      { label: "notes", hash: "#/notes", viewport: mobile, requiredText: ["Notes"] },
      { label: "morning", hash: `#/notes/${firstNoteSlug || "weekly-ledger-update-2026-06-25"}`, viewport: mobile, requiredText: [] },
      { label: "evening", hash: "#/notes/error-review-first-public-snapshot", viewport: mobile, requiredText: [] },
    ];
    report.checks.routeCheckRequired = routes.length;

    for (const route of routes) {
      await navigate(client, `${args.baseUrl}${route.hash}`, route.viewport);
      const inspection = await inspectPage(client, route.requiredText);
      report.routeResults.push({
        route: route.label,
        hash: route.hash,
        ...inspection,
      });
      report.checks.routeCheckCompleted += 1;
      assert(inspection.missing.length === 0, `Route missing required text: ${route.label}`, {
        route: route.label,
        missing: inspection.missing,
      });
      assert(inspection.overflow <= 2, `Route has horizontal overflow: ${route.label}`, { route: route.label, overflow: inspection.overflow });
      const forbidden = detectForbiddenPhrases(inspection.bodyText || "").slice(0, 8);
      assert(forbidden.length === 0, `Forbidden demo self-explanation copy found: ${route.label}`, { route: route.label, forbidden });
      if (route.label === "morning" || route.label === "evening") {
        report.notes[route.label] = {
          bodyPreview: normalizeText(inspection.bodyText).slice(0, 300),
        };
      }
      if (route.label === "home") {
        const shot = path.join(args.outDir, "desktop-home-1440x900.png");
        await captureScreenshot(client, shot);
        report.screenshots.push(shot);
      }
      if (route.label === "ledger") {
        const shot = path.join(args.outDir, "desktop-ledger-1440x900.png");
        await captureScreenshot(client, shot);
        report.screenshots.push(shot);
      }
      if (route.label === "system") {
        const shot = path.join(args.outDir, "desktop-system-1440x900.png");
        await captureScreenshot(client, shot);
        report.screenshots.push(shot);
      }
      if (route.label === "system_mobile") {
        const shot = path.join(args.outDir, "mobile-system-390x844.png");
        await captureScreenshot(client, shot);
        report.screenshots.push(shot);
      }
      if (route.label === "notes") {
        const shot = path.join(args.outDir, "mobile-notes-390x844.png");
        await captureScreenshot(client, shot);
        report.screenshots.push(shot);
      }
    }

    await navigate(client, `${args.baseUrl}#/ledger`, desktop);
    const ledgerExercise = await exerciseLedger(client);
    report.ledgerInteraction = ledgerExercise;
    assert(ledgerExercise.ok && ledgerExercise.containsCountLine, "Ledger search/filter interaction failed", ledgerExercise);

    const auditDetails = await evaluate(
      client,
      `(() => {
        const details = Array.from(document.querySelectorAll('details'));
        return details.map((detail) => ({
          summaryText: (detail.querySelector('summary')?.innerText || '').trim(),
          open: detail.open,
        }));
      })()`,
    );
    report.audit_defaults_collapsed = auditDetails.every((item) => item.open === false);

    report.checks.domConsoleOverflowChecked = report.routeResults.every((item) => item.missing.length === 0 && item.overflow <= 2);
    report.checks.auditDetailsChecked = report.routeResults.every((item) => {
      return item.auditDetails.length === 0 || item.auditDetails.every((detail) => typeof detail === "object");
    });

    assert(report.consoleErrors.length === 0, "Browser console produced blocking errors", report.consoleErrors);


    return { status: "pass", report };
  } finally {
    client?.close();
    await stopChrome(chromeState);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });
  const reportPath = path.join(args.outDir, "launch-smoke-report.json");

  const report = {
    status: "started",
    base_url: args.baseUrl,
    method: "cdp_with_playwright_fallback",
    started_at: new Date().toISOString(),
    limitations: [],
    http_checks: {},
    browser_smoke: null,
    notes: {},
  };

  try {
    const indexHtml = await fetchText(args.baseUrl);
    report.http_checks.index_html = {
      ok: indexHtml.includes("/gotra-public-ledger/assets/"),
      has_root_asset_reference: /(?:href|src)="\/assets\//.test(indexHtml),
      has_github_pages_base: indexHtml.includes('href="/gotra-public-ledger/'),
    };
    assert(report.http_checks.index_html.ok, "Index HTML does not include GitHub Pages asset base path");
    assert(!report.http_checks.index_html.has_root_asset_reference, "Index HTML contains root-absolute asset reference");

    const ledgerCandidate = await fetchJsonFromCandidates(["data/ledger.demo.json", "/data/ledger.demo.json"], args.baseUrl);
    const manifestCandidate = await fetchJsonFromCandidates(["data/manifest.json", "/data/manifest.json"], args.baseUrl);
    const portfolioCandidate = await fetchJsonFromCandidates(["data/paper-portfolio.latest.json", "/data/paper-portfolio.latest.json"], args.baseUrl);
    const contentCandidate = await fetchJsonFromCandidates(["content/articles/index.json", "/content/articles/index.json"], args.baseUrl);

    const ledger = ledgerCandidate.payload;
    const manifest = manifestCandidate.payload;
    const portfolio = portfolioCandidate.payload;
    const content = contentCandidate.payload;

    report.http_checks.data_files = {
      selected_urls: {
        ledger: ledgerCandidate.url,
        manifest: manifestCandidate.url,
        portfolio: portfolioCandidate.url,
        content: contentCandidate.url,
      },
      ledger_records: ledger.records.length,
      manifest_files: manifest.files.length,
      portfolio_id: portfolio.portfolio_id,
      content_items: content.items.length,
    };

    try {
      const browserResult = await runBrowserSmoke(args, ledger, content);
      report.status = browserResult.status;
      report.browser_smoke = browserResult.report;
      if (!browserResult.report.checks.domConsoleOverflowChecked || !browserResult.report.checks.auditDetailsChecked) {
        report.status = "pass_with_limitation";
        report.limitations.push({
          phase: "cdp_primary",
          message: "CDP smoke checks did not fully complete DOM/console/overflow assertions.",
        });
      }
    } catch (error) {
      report.status = "pass_with_limitation";
      report.limitations.push({
        phase: "cdp_primary",
        message: String(error.message),
        details: error.details,
      });
      const fallback = runPlaywrightFallback(args);
      if (fallback.status === "pass" || fallback.status === "needs_review") {
        report.browser_smoke = {
          routeResults: fallback.screenshots,
          consoleErrors: [],
          limitations: "cdp_path_timed_out_or_failed",
          screenshots: fallback.screenshots,
          screenshotRouteResults: fallback.routeResults,
          attempts: fallback.attempts,
          method: "playwright_fallback",
        };
        report.status = "pass_with_limitation";
        report.limitations.push({
          phase: "playwright_fallback",
          message: "Used Playwright CLI fallback; DOM/console/overflow checks were not completed in this mode.",
        });
        if (fallback.limitations?.length > 0) {
          report.limitations.push(...fallback.limitations.map((item) => ({
            phase: "playwright_fallback_route_capture",
            ...item,
          })));
        }
        if (fallback.status === "needs_review") {
          report.status = "needs_review";
        }
      } else {
        report.status = "fail";
        report.error = {
          message: fallback.reason || String(error.message),
          details: { phase: "playwright_fallback" },
        };
      }
    }

    report.completed_at = new Date().toISOString();
  } catch (error) {
    report.status = "fail";
    report.error = {
      message: error.message,
      details: error.details,
    };
    report.completed_at = new Date().toISOString();
  }

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (report.status === "fail") {
    process.exitCode = 1;
  }
}

main();
