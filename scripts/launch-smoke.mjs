/* global Buffer, URL, WebSocket, clearTimeout, console, fetch, process, setTimeout */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const defaultChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:4178/gotra-public-ledger/",
    outDir: "docs/launch-validation",
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

async function fetchJson(url) {
  const response = await fetch(url);
  assert(response.ok, `HTTP check failed: ${url}`, { status: response.status });
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/json"), `HTTP check did not return JSON: ${url}`, { contentType });
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  assert(response.ok, `HTTP check failed: ${url}`, { status: response.status });
  return response.text();
}

async function fetchJsonFromCandidates(paths, baseUrl) {
  const failures = [];
  for (const candidatePath of paths) {
    const url = new URL(candidatePath, baseUrl);
    try {
      const payload = await fetchJson(url);
      return { url: url.href, payload, failures };
    } catch (error) {
      failures.push({ url: url.href, message: error.message, details: error.details });
    }
  }
  throw new Error(`No JSON candidate passed: ${paths.join(", ")}`);
}

async function waitForDevTools(processHandle) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for Chrome DevTools endpoint"));
    }, 10_000);

    const handleOutput = (chunk) => {
      buffer += String(chunk);
      const match = buffer.match(/DevTools listening on ws:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)\//);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    };

    processHandle.stdout.on("data", handleOutput);
    processHandle.stderr.on("data", handleOutput);

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
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const port = await waitForDevTools(chrome);
  return { chrome, port, userDataDir };
}

async function stopChrome(chromeState) {
  if (!chromeState) {
    return;
  }
  chromeState.chrome.kill("SIGTERM");
  await sleep(500);
  fs.rmSync(chromeState.userDataDir, { recursive: true, force: true });
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
          reject(new Error(message.error.message));
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
  while (Date.now() - started < 8_000) {
    const ready = await evaluate(client, `Boolean(document.body?.innerText) && !document.body.innerText.includes("Loading ledger.demo.json")`);
    if (ready) {
      return;
    }
    await sleep(100);
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

async function inspectPage(client, requiredText) {
  return evaluate(client, `(() => {
    const text = document.body.innerText;
    const missing = ${JSON.stringify(requiredText)}.filter((fragment) => !text.includes(fragment));
    const horizontalOverflow = Math.max(
      0,
      document.documentElement.scrollWidth - window.innerWidth,
      document.body.scrollWidth - window.innerWidth,
    );
    return {
      title: document.title,
      missing,
      horizontalOverflow,
      bodyLength: text.length,
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

async function runBrowserSmoke(args, ledger, contentIndex) {
  const screenshotsDir = path.join(args.outDir, "screenshots");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const chromeState = await startChrome(args.chromePath);
  const consoleEvents = [];
  const results = [];
  let client;

  try {
    client = await createPage(chromeState.port);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    client.on("Runtime.exceptionThrown", (params) => {
      consoleEvents.push({ type: "exception", text: params.exceptionDetails?.text ?? "exception" });
    });
    client.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") {
        consoleEvents.push({
          type: "console_error",
          text: params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" "),
        });
      }
    });
    client.on("Log.entryAdded", (params) => {
      if (["error", "severe"].includes(params.entry?.level)) {
        consoleEvents.push({ type: "log_error", text: params.entry.text });
      }
    });

    const firstPredictionId = ledger.records[0].prediction_id;
    const firstNoteSlug = contentIndex.items[0].slug;
    const desktop = { width: 1440, height: 900, mobile: false };
    const mobile = { width: 390, height: 844, mobile: true };
    const routes = [
      { label: "home", hash: "#/", viewport: desktop, requiredText: ["GOTRA", "Public Ledger"] },
      { label: "ledger", hash: "#/ledger", viewport: desktop, requiredText: ["Complete public prediction ledger", "完整公开账本"] },
      { label: "prediction_detail", hash: `#/ledger/${firstPredictionId}`, viewport: desktop, requiredText: [firstPredictionId] },
      { label: "performance", hash: "#/performance", viewport: desktop, requiredText: ["Hypothetical paper tracking", "portfolio_policy_v1", "settled paper trade"] },
      { label: "methodology", hash: "#/methodology", viewport: desktop, requiredText: ["Methodology", "public-safe"] },
      { label: "sources", hash: "#/sources", viewport: desktop, requiredText: ["Sources", "manifest"] },
      { label: "notes", hash: "#/notes", viewport: mobile, requiredText: ["Research notes and transparency reports", "Initial public-safe articles"] },
      { label: "note_detail", hash: `#/notes/${firstNoteSlug}`, viewport: mobile, requiredText: ["Structured article metadata", firstNoteSlug] },
    ];

    for (const route of routes) {
      await navigate(client, `${args.baseUrl}${route.hash}`, route.viewport);
      const inspection = await inspectPage(client, route.requiredText);
      results.push({ route: route.label, hash: route.hash, viewport: route.viewport, ...inspection });
      assert(inspection.missing.length === 0, `Route missing required text: ${route.label}`, inspection);
      assert(inspection.horizontalOverflow <= 2, `Route has horizontal overflow: ${route.label}`, inspection);

      if (route.label === "home") {
        await captureScreenshot(client, path.join(screenshotsDir, "desktop-home.png"));
      }
      if (route.label === "notes") {
        await captureScreenshot(client, path.join(screenshotsDir, "mobile-notes.png"));
      }
    }

    await navigate(client, `${args.baseUrl}#/ledger`, desktop);
    const ledgerExercise = await exerciseLedger(client);
    assert(ledgerExercise.ok && ledgerExercise.containsCountLine, "Ledger search/filter interaction failed", ledgerExercise);

    return {
      status: "pass",
      routes: results,
      ledger_interaction: ledgerExercise,
      console_errors: consoleEvents,
      screenshots: [
        path.join(screenshotsDir, "desktop-home.png"),
        path.join(screenshotsDir, "mobile-notes.png"),
      ],
    };
  } finally {
    client?.close();
    await stopChrome(chromeState);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const report = {
    status: "started",
    base_url: args.baseUrl,
    started_at: new Date().toISOString(),
    http_checks: {},
    browser_smoke: null,
  };

  try {
    const indexHtml = await fetchText(args.baseUrl);
    report.http_checks.index_html = {
      ok: indexHtml.includes("/gotra-public-ledger/assets/"),
      has_root_asset_reference: /(?:href|src)="\/assets\//.test(indexHtml),
    };
    assert(report.http_checks.index_html.ok, "Index HTML does not include GitHub Pages asset base");
    assert(!report.http_checks.index_html.has_root_asset_reference, "Index HTML contains root asset reference");

    const ledgerCandidate = await fetchJsonFromCandidates(["data/ledger.demo.json", "/data/ledger.demo.json"], args.baseUrl);
    const manifestCandidate = await fetchJsonFromCandidates(["data/manifest.json", "/data/manifest.json"], args.baseUrl);
    const portfolioCandidate = await fetchJsonFromCandidates(["data/paper-portfolio.latest.json", "/data/paper-portfolio.latest.json"], args.baseUrl);
    const contentCandidate = await fetchJsonFromCandidates(["content/articles/index.json", "/content/articles/index.json"], args.baseUrl);
    const ledger = ledgerCandidate.payload;
    const manifest = manifestCandidate.payload;
    const portfolio = portfolioCandidate.payload;
    const contentIndex = contentCandidate.payload;
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
      content_items: contentIndex.items.length,
    };

    report.browser_smoke = await runBrowserSmoke(args, ledger, contentIndex);
    assert(report.browser_smoke.console_errors.length === 0, "Browser console produced blocking errors", {
      console_errors: report.browser_smoke.console_errors,
    });

    report.status = "pass";
    report.completed_at = new Date().toISOString();
  } catch (error) {
    report.status = "fail";
    report.error = {
      message: error.message,
      details: error.details,
    };
    report.completed_at = new Date().toISOString();
  }

  const reportPath = path.join(args.outDir, "launch-smoke-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (report.status !== "pass") {
    process.exit(1);
  }
}

main();
