/* global Buffer, URL, WebSocket, clearTimeout, console, fetch, process, setTimeout */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const defaultChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FORBIDDEN_PHRASES = [
  "this demo format",
  "demo report format",
  "演示格式",
  "demo morning brief format",
  "demo evening review format",
];

function parseArgs(argv) {
  const args = {
    baseUrl: "https://gotra.me/",
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

class SmokeAssertionError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = "SmokeAssertionError";
    this.details = details;
    this.smokeFailureKind = "assertion";
  }
}

class BrowserToolingError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = "BrowserToolingError";
    this.details = details;
    this.smokeFailureKind = "browser_tooling";
  }
}

function assert(condition, message, details = undefined) {
  if (!condition) {
    throw new SmokeAssertionError(message, details);
  }
}

function browserToolingError(message, details = undefined) {
  return new BrowserToolingError(message, details);
}

function isBrowserToolingFailure(error) {
  return error?.smokeFailureKind === "browser_tooling";
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function expectedAssetBasePath(baseUrl) {
  const pathname = new URL(baseUrl).pathname;
  return pathname === "/" ? "/assets/" : `${pathname.replace(/\/$/, "")}/assets/`;
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
      reject(browserToolingError("Timed out waiting for Chrome DevTools endpoint"));
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
      reject(browserToolingError(`Chrome exited before DevTools endpoint was ready: ${code}`));
    });
  });
}

async function startChrome(chromePath) {
  if (!fs.existsSync(chromePath)) {
    throw browserToolingError("Chrome binary not found", { chromePath });
  }
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
  if (!response.ok) {
    throw browserToolingError("Failed to create Chrome target", { status: response.status });
  }
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  try {
    await client.connect();
  } catch (error) {
    throw browserToolingError("Failed to connect to Chrome DevTools target", { message: error.message });
  }
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

async function waitForAppReady(client, expectedUrl) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    let ready = false;
    try {
      ready = await evaluate(
        client,
        `(() => {
          const bodyText = document.body?.innerText || "";
          const expected = ${JSON.stringify(expectedUrl)};
          const current = window.location.href;
          return Boolean(
            document.readyState !== "loading"
            && current === expected
            && document.querySelector("#root")?.children.length
            && bodyText.trim().length > 80
            && !bodyText.includes("Loading ledger.demo.json")
            && !bodyText.includes("Ledger data failed to load")
          );
        })()`,
      );
    } catch (error) {
      if (!String(error.message).includes("Execution context was destroyed")) {
        throw error;
      }
    }
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
  const expectedUrl = url;
  await client.send("Page.navigate", { url: expectedUrl });
  await waitForAppReady(client, expectedUrl);
  await sleep(250);
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

async function inspectPageWhenRequiredTextSettles(client, requiredText = [], timeoutMs = 10000) {
  const started = Date.now();
  let latest = await inspectPage(client, requiredText);
  while (latest.missing.length > 0 && Date.now() - started < timeoutMs) {
    await sleep(180);
    latest = await inspectPage(client, requiredText);
  }
  return latest;
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

async function inspectLedgerSearchLayout(client) {
  return evaluate(client, `(() => {
    const box = document.querySelector(".search-box");
    const input = document.querySelector(".search-box input");
    const icon = document.querySelector(".search-box svg");
    if (!box || !input || !icon) {
      return { ok: false, reason: "search_box_not_found" };
    }
    const inputRect = input.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;
    const inputCenterY = inputRect.top + inputRect.height / 2;
    const centerDeltaY = Math.abs(iconCenterY - inputCenterY);
    const yInsideInput = iconCenterY >= inputRect.top + 2 && iconCenterY <= inputRect.bottom - 2;
    const yCenteredInInput = centerDeltaY <= 2;
    const xInsideLeadingPadding = iconCenterX >= inputRect.left + 8 && iconCenterX <= inputRect.left + 28;
    return {
      ok: yInsideInput && yCenteredInInput && xInsideLeadingPadding,
      yInsideInput,
      yCenteredInInput,
      xInsideLeadingPadding,
      inputRect: {
        left: Math.round(inputRect.left),
        top: Math.round(inputRect.top),
        right: Math.round(inputRect.right),
        bottom: Math.round(inputRect.bottom),
      },
      iconRect: {
        left: Math.round(iconRect.left),
        top: Math.round(iconRect.top),
        right: Math.round(iconRect.right),
        bottom: Math.round(iconRect.bottom),
      },
      iconCenterX: Math.round(iconCenterX),
      iconCenterY: Math.round(iconCenterY),
      inputCenterY: Math.round(inputCenterY),
      centerDeltaY: Math.round(centerDeltaY * 10) / 10,
    };
  })()`);
}

async function inspectDesktopNavHover(client) {
  const triggerRect = await evaluate(client, `(() => {
    const group = document.querySelector(".nav-group");
    const trigger = group?.querySelector(".nav-group-trigger");
    if (!group || !trigger) {
      return null;
    }
    const rect = trigger.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  })()`);
  if (!triggerRect) {
    return { ok: false, reason: "nav_group_not_found" };
  }

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: triggerRect.left + triggerRect.width / 2,
    y: triggerRect.top + triggerRect.height / 2,
  });
  await sleep(180);

  const openRect = await evaluate(client, `(() => {
    const group = document.querySelector(".nav-group");
    const menu = group?.querySelector(".nav-group-menu");
    if (!group || !menu) {
      return null;
    }
    const menuRect = menu.getBoundingClientRect();
    const trigger = group.querySelector(".nav-group-trigger");
    const triggerRect = trigger.getBoundingClientRect();
    const visible = window.getComputedStyle(menu).display !== "none" && menuRect.width > 0 && menuRect.height > 0;
    return {
      visible,
      triggerBottom: triggerRect.bottom,
      menuTop: menuRect.top,
      menuLeft: menuRect.left,
      menuRight: menuRect.right,
      menuBottom: menuRect.bottom,
      menuWidth: menuRect.width,
      menuHeight: menuRect.height,
    };
  })()`);
  if (!openRect?.visible) {
    return { ok: false, reason: "menu_did_not_open", openRect };
  }

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: triggerRect.left + triggerRect.width / 2,
    y: triggerRect.bottom + Math.max(1, Math.min(4, (openRect.menuTop - triggerRect.bottom) / 2)),
  });
  await sleep(180);

  const bridgeState = await evaluate(client, `(() => {
    const menu = document.querySelector(".nav-group-menu");
    const rect = menu?.getBoundingClientRect();
    return {
      visible: Boolean(menu && window.getComputedStyle(menu).display !== "none" && rect.width > 0 && rect.height > 0),
      rect: rect ? {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      } : null,
    };
  })()`);

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: openRect.menuLeft + openRect.menuWidth / 2,
    y: openRect.menuTop + Math.min(20, openRect.menuHeight / 2),
  });
  await sleep(180);

  const menuState = await evaluate(client, `(() => {
    const menu = document.querySelector(".nav-group-menu");
    const rect = menu?.getBoundingClientRect();
    return {
      visible: Boolean(menu && window.getComputedStyle(menu).display !== "none" && rect.width > 0 && rect.height > 0),
      rect: rect ? {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      } : null,
    };
  })()`);

  return {
    ok: Boolean(bridgeState.visible && menuState.visible),
    triggerRect: {
      left: Math.round(triggerRect.left),
      top: Math.round(triggerRect.top),
      right: Math.round(triggerRect.right),
      bottom: Math.round(triggerRect.bottom),
    },
    openRect: {
      triggerBottom: Math.round(openRect.triggerBottom),
      menuTop: Math.round(openRect.menuTop),
      menuBottom: Math.round(openRect.menuBottom),
    },
    bridgeState,
    menuState,
  };
}

function detectForbiddenPhrases(text) {
  const normalized = normalizeText(text);
  return FORBIDDEN_PHRASES.filter((phrase) => normalized.includes(phrase));
}

function runChromeScreenshotFallback(args) {
  const routes = [
    {
      label: "home",
      route: "#/",
      file: "desktop-home-1440x900.png",
      viewport: { width: 1440, height: 900 },
    },
    {
      label: "ledger",
      route: "#/ledger",
      file: "desktop-ledger-1440x900.png",
      viewport: { width: 1440, height: 900 },
    },
    {
      label: "system",
      route: "#/system",
      file: "desktop-system-1440x900.png",
      viewport: { width: 1440, height: 900 },
    },
    {
      label: "notes",
      route: "#/notes",
      file: "mobile-notes-390x844.png",
      viewport: { width: 390, height: 844 },
    },
    {
      label: "system_mobile",
      route: "#/system",
      file: "mobile-system-390x844.png",
      viewport: { width: 390, height: 844 },
    },
  ];

  if (!fs.existsSync(args.chromePath)) {
    return { status: "unavailable", reason: `Chrome binary unavailable for screenshot fallback: ${args.chromePath}` };
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
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gotra-launch-smoke-fallback-"));
      const result = spawnSync(args.chromePath, [
        "--headless=new",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        `--user-data-dir=${userDataDir}`,
        `--window-size=${route.viewport.width},${route.viewport.height}`,
        "--virtual-time-budget=15000",
        `--screenshot=${output}`,
        `${args.baseUrl}${route.route}`,
      ], { encoding: "utf8", stdio: "pipe", timeout: 30000 });
      fs.rmSync(userDataDir, { recursive: true, force: true });
      if (result.status === 0 && fs.existsSync(output) && fs.statSync(output).size > 0) {
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
    status: limitations.length === 0 ? "captured_with_limitations" : "needs_review",
    screenshots,
    routeResults,
    limitations,
    attempts: maxAttempts,
    method: "chrome_screenshot_fallback",
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
      visualLayoutChecked: false,
      desktopNavHoverChecked: false,
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
    const morningItem = contentIndex.items?.find((item) => {
      return item.type === "daily_morning_brief" || item.report?.report_kind === "daily_morning_brief";
    });
    const eveningItem = contentIndex.items?.find((item) => {
      return item.type === "daily_evening_review" || item.report?.report_kind === "daily_evening_review";
    });
    assert(morningItem?.slug, "Morning brief content item not found");
    assert(eveningItem?.slug, "Evening review content item not found");
    const desktop = { width: 1440, height: 900, mobile: false };
    const mobile = { width: 390, height: 844, mobile: true };
    const routes = [
      { label: "home", hash: "#/", viewport: desktop, requiredText: ["GOTRA", "Public Ledger"] },
      { label: "track_record", hash: "#/track-record", viewport: desktop, requiredText: ["公开研究账本", "research_ledger.json", "PublicationDecision=publish"] },
      { label: "ledger", hash: "#/ledger", viewport: desktop, requiredText: ["冻结 Demo 账本", "不是最新生产日报"] },
      { label: "prediction_detail", hash: `#/ledger/${firstPredictionId ?? ""}`, viewport: desktop, requiredText: [firstPredictionId ?? "prediction"] },
      { label: "performance", hash: "#/performance", viewport: desktop, requiredText: ["暂无生产表现跟踪", "生产表现状态", "非业绩证明"] },
      { label: "system", hash: "#/system", viewport: desktop, requiredText: ["Weekly Research Cognition System", "DRAFT_PRD", "Gate-Judge"] },
      { label: "system_mobile", hash: "#/system", viewport: mobile, requiredText: ["Weekly Research Cognition System", "DRAFT_PRD", "Gate-Judge"] },
      { label: "methodology", hash: "#/methodology", viewport: desktop, requiredText: ["先固定规则", "数据边界", "证据边界"] },
      { label: "sources", hash: "#/sources", viewport: desktop, requiredText: ["来源与产物", "生产公开产物", "账本快照"] },
      { label: "notes", hash: "#/notes", viewport: mobile, requiredText: ["透明度文章", "静态文章归档"] },
      {
        label: "morning",
        hash: `#/notes/${morningItem.slug}`,
        viewport: mobile,
        requiredText: ["晨间简报", "今天看了什么", "结论变了吗", "接下来看什么"],
      },
      {
        label: "evening",
        hash: `#/notes/${eveningItem.slug}`,
        viewport: mobile,
        requiredText: ["晚间复盘", "今天看了什么", "结论变了吗", "本日账本无状态变更"],
      },
    ];
    report.checks.routeCheckRequired = routes.length;

    for (const route of routes) {
      await navigate(client, `${args.baseUrl}${route.hash}`, route.viewport);
      const inspection = await inspectPageWhenRequiredTextSettles(client, route.requiredText);
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
      if (route.label === "track_record") {
        const shot = path.join(args.outDir, "desktop-track-record-1440x900.png");
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

    const searchLayout = await inspectLedgerSearchLayout(client);
    report.searchLayout = searchLayout;
    report.checks.visualLayoutChecked = true;
    assert(searchLayout.ok, "Ledger search icon is not aligned inside the input", searchLayout);

    await navigate(client, `${args.baseUrl}#/`, desktop);
    const navHover = await inspectDesktopNavHover(client);
    report.desktopNavHover = navHover;
    report.checks.desktopNavHoverChecked = navHover.reason === "nav_group_not_found" ? "not_applicable" : true;
    if (navHover.reason !== "nav_group_not_found") {
      assert(navHover.ok, "Desktop nav dropdown does not stay open while pointer moves into the menu", navHover);
    }

    const auditRouteLabels = new Set(["system", "system_mobile", "sources", "morning", "evening"]);
    report.auditDetailRoutes = report.routeResults
      .filter((item) => auditRouteLabels.has(item.route))
      .map((item) => ({
        route: item.route,
        hash: item.hash,
        details_count: item.auditDetails.length,
        open_count: item.auditDetails.filter((detail) => detail.open).length,
        summaries: item.auditDetails.map((detail) => detail.summaryText).filter(Boolean),
      }));
    const routesWithAuditDetails = report.auditDetailRoutes.filter((item) => item.details_count > 0);
    report.audit_defaults_collapsed = routesWithAuditDetails.length > 0
      && routesWithAuditDetails.every((item) => item.open_count === 0);
    assert(report.audit_defaults_collapsed, "Audit details are not collapsed by default on reader-facing routes", {
      auditDetailRoutes: report.auditDetailRoutes,
    });

    report.checks.domConsoleOverflowChecked = report.routeResults.every((item) => item.missing.length === 0 && item.overflow <= 2);
    report.checks.auditDetailsChecked = report.audit_defaults_collapsed;

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
    method: "cdp_with_chrome_screenshot_fallback",
    started_at: new Date().toISOString(),
    limitations: [],
    http_checks: {},
    browser_smoke: null,
    notes: {},
  };

  try {
    const indexHtml = await fetchText(args.baseUrl);
    const expectedAssetPath = expectedAssetBasePath(args.baseUrl);
    const expectsRootAssets = expectedAssetPath === "/assets/";
    report.http_checks.index_html = {
      ok: indexHtml.includes(expectedAssetPath),
      expected_asset_path: expectedAssetPath,
      asset_mode: expectsRootAssets ? "root" : "path_base",
      has_root_asset_reference: /(?:href|src)="\/assets\//.test(indexHtml),
      has_github_pages_base: indexHtml.includes('href="/gotra-public-ledger/'),
    };
    assert(report.http_checks.index_html.ok, `Index HTML does not include expected asset base path: ${expectedAssetPath}`);
    if (!expectsRootAssets) {
      assert(!report.http_checks.index_html.has_root_asset_reference, "Index HTML contains root-absolute asset reference");
    }

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
      if (!isBrowserToolingFailure(error)) {
        throw error;
      }
      report.status = "pass_with_limitation";
      report.limitations.push({
        phase: "cdp_primary",
        message: String(error.message),
        details: error.details,
      });
      const fallback = runChromeScreenshotFallback(args);
      if (fallback.status === "captured_with_limitations" || fallback.status === "needs_review") {
        report.browser_smoke = {
          routeResults: fallback.screenshots,
          consoleErrors: "not_checked_in_fallback",
          limitations: "cdp_path_timed_out_or_failed; chrome screenshot fallback does not perform DOM/console/overflow assertions",
          screenshots: fallback.screenshots,
          screenshotRouteResults: fallback.routeResults,
          attempts: fallback.attempts,
          method: fallback.method,
        };
        report.status = "pass_with_limitation";
        report.limitations.push({
          phase: "chrome_screenshot_fallback",
          message: "Used Chrome screenshot fallback; DOM/console/overflow checks were not completed in this mode.",
        });
        if (fallback.limitations?.length > 0) {
          report.limitations.push(...fallback.limitations.map((item) => ({
            phase: "chrome_screenshot_fallback_route_capture",
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
          details: { phase: "chrome_screenshot_fallback" },
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

  if (report.status === "fail" || report.status === "needs_review") {
    process.exitCode = 1;
  }
}

main();
