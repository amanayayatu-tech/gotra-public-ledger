/* global console, process */
import fs from "node:fs";
import path from "node:path";

const reportSchedules = [
  { key: "morning-hk", label: "港股早报", labelEn: "HK morning report", statusFile: "status_morning_hk.json" },
  { key: "evening-hk", label: "港股晚报", labelEn: "HK evening report", statusFile: "status_evening_hk.json" },
  { key: "morning-us", label: "美股早报", labelEn: "US morning report", statusFile: "status_morning_us.json" },
  { key: "evening-us", label: "美股晚报", labelEn: "US evening report", statusFile: "status_evening_us.json" },
  { key: "morning-global", label: "全局汇总", labelEn: "Global summary", statusFile: "status_morning_global.json" },
];

const listFields = new Set([
  "key_updates",
  "positive_case",
  "negative_case",
  "red_team_review",
  "risk_factors",
  "watch_items",
  "source_notes",
  "research_context",
  "k_deep_research",
  "f_partner_view",
  "w_partner_view",
  "g_partner_view",
  "red_team_audit",
  "evidence_gaps",
  "watch_conditions",
  "agent_statuses",
  "agent_hashes",
  "agent_timings",
  "parallelism",
]);

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const reportsDir = path.resolve(argValue("--reports-dir", path.join(process.cwd(), "public/reports")));

function readJson(fileName) {
  const filePath = path.join(reportsDir, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(fileName) {
  const filePath = path.join(reportsDir, fileName.replace(/^\/+/, "").replace(/^reports\//, ""));
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function numberValue(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function localized(zh, en = zh) {
  const safeZh = String(zh ?? "").trim();
  const safeEn = String(en ?? zh ?? "").trim();
  return {
    zh: safeZh || safeEn,
    en: safeEn || safeZh,
  };
}

function localizedOriginal(text, zhPrefix = "英文原文摘要") {
  const safeText = sanitizePublicText(text);
  return localized(`${zhPrefix}：${safeText}`, safeText);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

const structuredTextKeys = [
  "summary",
  "detail",
  "finding",
  "gap",
  "impact",
  "handling",
  "reason",
  "title",
  "official_name",
  "provider_ticker",
  "overall_confidence",
];

function extractStructuredValues(text) {
  const values = [];
  for (const key of structuredTextKeys) {
    const doubleQuoted = new RegExp(`['"]${key}['"]\\s*:\\s*"([^"]{2,900})"`, "gi");
    const singleQuoted = new RegExp(`['"]${key}['"]\\s*:\\s*'([^']{2,900})'`, "gi");
    for (const pattern of [doubleQuoted, singleQuoted]) {
      for (const match of text.matchAll(pattern)) {
        const value = sanitizePlainText(match[1]);
        if (value && !values.includes(value)) {
          values.push(value);
        }
      }
    }
  }
  return values;
}

function sanitizePlainText(value) {
  return String(value ?? "")
    .replace(/\\[nrt]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeStructuredText(value) {
  const text = sanitizePlainText(value);
  if (!/[{[]/.test(text) || !/['"][a-z_]+['"]\s*:/.test(text)) {
    return text;
  }
  const withoutLeadLabel = text.replace(/^\s*(summary|detail|finding|gap|impact|reason|title)\s*:\s*/i, "");
  const extracted = extractStructuredValues(withoutLeadLabel);
  if (extracted.length > 0) {
    return extracted.join(" ");
  }
  return withoutLeadLabel
    .replace(/[{}[\]"]/g, " ")
    .replace(/'([a-z_]+)'\s*:/gi, "$1:")
    .replace(/'([^']*)'/g, "$1")
    .replace(/\s*[,;]\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatShanghaiIso(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

function normalizeReportHref(value, fallback) {
  const raw = stringValue(value) ?? fallback;
  if (!raw) {
    return null;
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    return raw;
  }
  return `/reports/${raw.replace(/^reports\//, "")}`;
}

function fileNameFromHref(value) {
  if (!value) {
    return null;
  }
  return String(value).replace(/^\/+/, "").replace(/^reports\//, "");
}

function sanitizePublicText(value, maxLength = 900) {
  const withoutUrls = String(value ?? "")
    .replace(/https?:\/\/([^\s/)]+)[^\s)]*/gi, "https://$1/...")
    .replace(/\s+/g, " ")
    .trim();
  const humanized = humanizeStructuredText(withoutUrls);
  const cleaned = humanized
    .replace(/\bstrong[-\s]buy\b/gi, "external rating label")
    .replace(/\bbuy[-\s]rating\b/gi, "external rating label")
    .replace(/\bsell[-\s]rating\b/gi, "external rating label")
    .replace(/\bhold[-\s]rating\b/gi, "external rating label");
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function sanitizeList(values, maxItems = 7, maxLength = 320) {
  return arrayValue(values)
    .map((value) => sanitizePublicText(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function symbolFromValue(value) {
  if (typeof value === "string") {
    return { symbol: value, reason: "allowlisted provider coverage gap" };
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const exchange = stringValue(value.exchange);
  const symbol = stringValue(value.symbol) ?? stringValue(value.provider_ticker) ?? stringValue(value.providerTicker);
  if (!symbol) {
    return null;
  }
  return {
    symbol: exchange && !symbol.includes(":") ? `${exchange}:${symbol}` : symbol,
    reason: stringValue(value.reason) ?? "reported data gap",
  };
}

function gapRows(raw) {
  if (!raw) {
    return [];
  }
  const failed = arrayValue(raw.failed_symbols);
  const dataGaps = arrayValue(raw.data_gap_symbols);
  const allowed = numberValue(raw.allowed_missing_count, 0) > 0 ? arrayValue(raw.allowed_missing_symbols) : [];
  return [...failed, ...dataGaps, ...allowed]
    .map(symbolFromValue)
    .filter(Boolean)
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.symbol === row.symbol) === index);
}

function normalizeEntry(schedule) {
  const raw = readJson(schedule.statusFile);
  if (!raw) {
    return {
      ...schedule,
      runStatus: "unavailable",
      asOfDate: null,
      tradingDate: null,
      universeCount: 0,
      successCount: 0,
      gapRows: [],
    };
  }
  const rows = gapRows(raw);
  return {
    ...schedule,
    runStatus: stringValue(raw.run_status) ?? "unavailable",
    asOfDate: stringValue(raw.as_of_date),
    tradingDate: stringValue(raw.trading_date),
    universeCount: numberValue(raw.universe_count, 0),
    successCount: numberValue(raw.success_count, 0),
    gapRows: rows,
  };
}

function statusLooksUpdated(entry) {
  return entry.runStatus !== "unavailable" && Boolean(entry.asOfDate || entry.tradingDate);
}

function hasDataGap(entry) {
  return entry.gapRows.length > 0 || /data_gap|allowed_data_gap/i.test(entry.runStatus);
}

function needsReview(entry) {
  return /partial|failed|blocked|error/i.test(entry.runStatus);
}

function maxDate(entries, fullAnalystStatus, now) {
  const dates = [
    ...entries.map((entry) => entry.asOfDate),
    stringValue(fullAnalystStatus?.as_of_date),
    stringValue(fullAnalystStatus?.trading_date),
  ].filter((value) => value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  return dates.sort((left, right) => right.localeCompare(left, "en"))[0] ?? formatShanghaiIso(now).slice(0, 10);
}

function titleForDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日市场研究简报`;
}

function titleForDateEn(date) {
  return `Market research brief for ${date}`;
}

function coverageSummary(entry) {
  if (entry.universeCount <= 0) {
    return `${entry.label} 已生成公开状态，但覆盖统计暂不可用。`;
  }
  return `${entry.label} ${entry.successCount}/${entry.universeCount} 完成。`;
}

function coverageSummaryEn(entry) {
  if (entry.universeCount <= 0) {
    return `${entry.labelEn} has public status, but coverage statistics are unavailable.`;
  }
  return `${entry.labelEn} completed ${entry.successCount}/${entry.universeCount}.`;
}

function canaryStatus(monitor) {
  if (!monitor) {
    return "unavailable";
  }
  return monitor.overall_status === "healthy" ? "healthy" : "degraded";
}

function canaryText(status) {
  if (status === "healthy") {
    return "健康";
  }
  if (status === "degraded") {
    return "需关注";
  }
  return "暂不可用";
}

function canaryTextEn(status) {
  if (status === "healthy") {
    return "healthy";
  }
  if (status === "degraded") {
    return "needs attention";
  }
  return "unavailable";
}

function dailyHealth(entries) {
  const updated = entries.filter(statusLooksUpdated);
  if (updated.length === 0) {
    return "unavailable";
  }
  if (updated.some(needsReview)) {
    return "needs_review";
  }
  if (updated.some(hasDataGap)) {
    return "ok_with_data_gaps";
  }
  return "ok";
}

function updateStatus(health) {
  if (health === "ok") {
    return "reports_updated";
  }
  if (health === "ok_with_data_gaps") {
    return "reports_updated_with_gaps";
  }
  if (health === "needs_review") {
    return "needs_review";
  }
  return "unavailable";
}

function knownGaps(entries) {
  const seen = new Set();
  const gaps = [];
  for (const entry of entries) {
    for (const gap of entry.gapRows) {
      const key = `${entry.label}:${gap.symbol}:${gap.reason}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      gaps.push({
        symbol: gap.symbol,
        reason: gap.reason,
        affected_report: entry.label,
        code: `gap_${gaps.length + 1}`,
        label: localized(`${gap.symbol} 数据缺口`, `${gap.symbol} data gap`),
        explanation: localized(`${entry.label} 标记 ${gap.reason}。`, `${entry.labelEn} marked ${gap.reason}.`),
      });
    }
  }
  return gaps;
}

function parseSummaryText(value) {
  const text = sanitizePublicText(value, 1100);
  const summaryMatch = text.match(/['"]summary['"]:\s*['"]([^'"]{24,900})['"]/);
  return summaryMatch ? sanitizePublicText(summaryMatch[1], 900) : text;
}

function fullAnalystVersionMetadata(status) {
  return {
    prompt_template_version: stringValue(status?.prompt_template_version) ?? undefined,
    methodology_version: stringValue(status?.methodology_version) ?? undefined,
    execution_model: stringValue(status?.execution_model) ?? undefined,
    symbol_schema: stringValue(status?.symbol_schema) ?? undefined,
    alaya_event_schema: stringValue(status?.alaya_event_schema) ?? undefined,
    agent_parallelism: numberValue(status?.agent_parallelism ?? status?.agent_concurrency, null),
  };
}

function keyValueRecord(values, valueParser = (value) => value) {
  const record = {};
  for (const value of sanitizeList(values, 12, 500)) {
    const [key, ...rest] = value.split(":");
    const normalizedKey = stringValue(key);
    const normalizedValue = stringValue(rest.join(":"));
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    record[normalizedKey] = valueParser(normalizedValue);
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function normalizeAgentItem(symbol, fields, metadata = {}) {
  const researchSummary = parseSummaryText(fields.chairman_synthesis ?? fields.research_summary ?? "");
  if (!researchSummary) {
    return null;
  }
  const kDeep = sanitizeList(fields.k_deep_research, 7).map((text) => localizedOriginal(text, "K 深度研究"));
  const fView = sanitizeList(fields.f_partner_view, 7).map((text) => localizedOriginal(text, "F 伙伴视角"));
  const wView = sanitizeList(fields.w_partner_view, 7).map((text) => localizedOriginal(text, "W 伙伴视角"));
  const gView = sanitizeList(fields.g_partner_view, 7).map((text) => localizedOriginal(text, "G 伙伴视角"));
  const chairman = sanitizeList(fields.chairman_synthesis ? [fields.chairman_synthesis] : [researchSummary], 3).map((text) => localizedOriginal(text, "Chairman synthesis"));
  const redTeam = sanitizeList(fields.red_team_audit ?? fields.red_team_review, 7).map((text) => localizedOriginal(text, "红队审计"));
  const evidenceGaps = sanitizeList(fields.evidence_gaps, 7).map((text) => localizedOriginal(text, "证据缺口"));
  const watchConditions = sanitizeList(fields.watch_conditions ?? fields.watch_items, 7).map((text) => localizedOriginal(text, "观察条件"));
  return {
    symbol,
    title: localized(`${symbol} 研究摘要`, `${symbol} research summary`),
    prompt_template_version: stringValue(fields.prompt_template_version) ?? metadata.prompt_template_version,
    methodology_version: stringValue(fields.methodology_version) ?? metadata.methodology_version,
    execution_model: stringValue(fields.execution_model) ?? metadata.execution_model,
    symbol_schema: metadata.symbol_schema,
    alaya_event_schema: metadata.alaya_event_schema,
    research_status: stringValue(fields.research_status) ?? undefined,
    research_summary: localizedOriginal(researchSummary, `${symbol} 研究摘要`),
    key_updates: sanitizeList(fields.key_updates, 8).map((text) => localizedOriginal(text, "关键观察")),
    research_context: sanitizeList(fields.research_context, 7).map((text) => localizedOriginal(text, "研究上下文")),
    k_deep_research: kDeep,
    f_partner_view: fView,
    w_partner_view: wView,
    g_partner_view: gView,
    chairman_synthesis: chairman,
    red_team_audit: redTeam,
    evidence_gaps: evidenceGaps,
    watch_conditions: watchConditions,
    confidence_boundary: fields.confidence_boundary
      ? localizedOriginal(fields.confidence_boundary, "置信边界")
      : undefined,
    agent_statuses: keyValueRecord(fields.agent_statuses),
    agent_hashes: keyValueRecord(fields.agent_hashes),
    agent_timings: keyValueRecord(fields.agent_timings, (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }),
    parallelism: keyValueRecord(fields.parallelism, (value) => {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }),
    red_team_verdict: stringValue(fields.red_team_verdict) ?? undefined,
    public_payload_hash: stringValue(fields.public_payload_hash) ?? undefined,
    positive_case: sanitizeList(fields.positive_case, 7).map((text) => localizedOriginal(text, "正方观察")),
    negative_case: sanitizeList(fields.negative_case, 7).map((text) => localizedOriginal(text, "反方观察")),
    red_team_review: sanitizeList(fields.red_team_review, 7).map((text) => localizedOriginal(text, "反方审查")),
    risk_factors: sanitizeList(fields.risk_factors, 7).map((text) => localizedOriginal(text, "风险因素")),
    watch_items: sanitizeList(fields.watch_items, 7).map((text) => localizedOriginal(text, "观察项")),
    source_notes: sanitizeList(fields.source_notes, 4, 260).map((text) => localizedOriginal(text, "来源摘要")),
    raw_markdown: researchSummary,
  };
}

function parseFullAnalystMarkdown(markdown, metadata = {}) {
  if (!markdown) {
    return [];
  }
  const sections = [];
  const lines = markdown.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^###\s+([A-Z]+:[A-Z0-9.]+)\s*$/);
    if (heading) {
      if (current) {
        sections.push(current);
      }
      current = { symbol: heading[1], lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    sections.push(current);
  }

  return sections
    .map((section) => {
      const fields = {};
      let activeField = null;
      for (const line of section.lines) {
        const field = line.match(/^- ([a-z_]+):(?:\s*(.*))?$/);
        if (field) {
          activeField = field[1];
          if (listFields.has(activeField)) {
            fields[activeField] = [];
            if (field[2]?.trim()) {
              fields[activeField].push(field[2].trim());
            }
          } else {
            fields[activeField] = field[2]?.trim() ?? "";
          }
          continue;
        }

        const listItem = line.match(/^\s+-\s+(.*)$/);
        if (listItem && activeField) {
          if (listFields.has(activeField)) {
            fields[activeField].push(listItem[1].trim());
          } else {
            fields[activeField] = `${fields[activeField] ?? ""} ${listItem[1].trim()}`.trim();
          }
          continue;
        }

        if (activeField && line.trim() && !line.startsWith("#")) {
          if (listFields.has(activeField) && fields[activeField]?.length > 0) {
            const index = fields[activeField].length - 1;
            fields[activeField][index] = `${fields[activeField][index]} ${line.trim()}`.trim();
          } else if (!listFields.has(activeField)) {
            fields[activeField] = `${fields[activeField] ?? ""} ${line.trim()}`.trim();
          }
        }
      }
      return normalizeAgentItem(section.symbol, fields, metadata);
    })
    .filter(Boolean);
}

function scoreAgentItem(item) {
  let score = 0;
  if (!/based only on the supplied input|supplied structured context|input json/i.test(item.research_summary)) {
    score += 4;
  }
  score += Math.min(item.source_notes.length, 2);
  score += Math.min(item.key_updates.length, 3);
  score += Math.min(item.risk_factors.length, 2);
  return score;
}

function selectedAgentItems(items, limit = 8) {
  return [...items]
    .sort((left, right) => scoreAgentItem(right) - scoreAgentItem(left) || left.symbol.localeCompare(right.symbol, "en"))
    .slice(0, limit);
}

function fullAnalystSummary(status, monitor, agentItems) {
  const canary = canaryStatus(monitor);
  const versionMetadata = fullAnalystVersionMetadata(status);
  const reportMarkdown =
    normalizeReportHref(status?.latest_public_report_file ?? status?.report_file, null) ??
    normalizeReportHref(monitor?.links?.report_markdown, "/reports/full_analyst_evening_hk_YYYY-MM-DD.md");
  const statusJson = normalizeReportHref(monitor?.links?.status_json, "/reports/status_full_analyst_evening_hk.json");
  const publishCount = numberValue(status?.publish_count, 0);
  const universeCount = numberValue(status?.universe_count, numberValue(status?.symbol_count, publishCount));
  const runStatus = stringValue(status?.run_status) ?? stringValue(monitor?.latest_run?.status) ?? "unavailable";
  const readableCount = agentItems.length;

  return {
    run_id: stringValue(status?.run_id) ?? stringValue(monitor?.latest_run?.run_id) ?? "unavailable",
    run_status: runStatus,
    ...versionMetadata,
    agent_parallelism: versionMetadata.agent_parallelism,
    report_markdown: reportMarkdown,
    status_json: statusJson,
    evidence_layer: stringValue(status?.evidence_layer) ?? "runtime/status evidence + public-safe artifact smoke",
    publish_count: publishCount,
    needs_review_count: numberValue(status?.needs_review_count, 0),
    blocked_count: numberValue(status?.blocked_count, 0),
    failed_count: numberValue(status?.failed_count, 0),
    data_gap_count: numberValue(status?.data_gap_count, 0),
    canary_status: canary,
    summary:
      readableCount > 0
        ? localized(
            `Full Analyst 先行试跑已接入 ${readableCount} 个公开 per-symbol 研究摘要，状态为 ${canaryText(canary)}，发布闸门 ${publishCount}/${universeCount || publishCount}。这些内容是研究观察，不是正式结论升级。`,
            `Full Analyst Canary has ${readableCount} public per-symbol research summaries, is ${canaryTextEn(canary)}, and shows publication gate ${publishCount}/${universeCount || publishCount}. These are research observations, not formal conclusion upgrades.`,
          )
        : localized(
            "Full Analyst rich brief unavailable；当前只能读取 Full Analyst monitor/status，不能展示每标的 agent 分析。",
            "Full Analyst rich brief is unavailable; only Full Analyst monitor/status can be read, without per-symbol agent analysis.",
          ),
  };
}

function promptFrameworkSummary(status) {
  const stages = status?.stage_statuses && typeof status.stage_statuses === "object" ? status.stage_statuses : {};
  const methodology = stringValue(status?.methodology_version);
  const executionModel = stringValue(status?.execution_model);
  return {
    prompt_template_version: stringValue(status?.prompt_template_version),
    runner: stringValue(status?.llm_runner),
    model: stringValue(status?.llm_model),
    max_concurrency: numberValue(status?.max_concurrency, null),
    agent_parallelism: numberValue(status?.agent_parallelism ?? status?.agent_concurrency, null),
    task_structure: [
      localized(
        methodology === "ksana_4_1_lite" ? "Ksana 4.1-lite 公开安全 Full Analyst 先行试跑" : "public-safe 全池 Full Analyst 先行试跑",
        methodology === "ksana_4_1_lite" ? "Ksana 4.1-lite public-safe Full Analyst candidate/canary run" : "public-safe full-pool candidate/canary run",
      ),
      localized(
        "per-symbol K 深度研究、F/W/G 伙伴视角、Chairman synthesis、红队审计、证据缺口和观察条件",
        "per-symbol K deep research, F/W/G partner views, Chairman synthesis, red-team audit, evidence gaps, and watch conditions",
      ),
      localized(
        executionModel === "independent_agent_calls"
          ? "执行模型明确标记为 independent agent calls；K/F/W/G 独立运行，Chairman 和 Red Team 依赖顺序运行"
          : executionModel === "multi_perspective_single_call"
            ? "执行模型明确标记为 single-call multi-perspective，不伪装成 independent agents"
            : "执行模型以公开状态文件为准",
        executionModel === "independent_agent_calls"
          ? "Execution is explicitly independent agent calls; K/F/W/G run independently, then Chairman and Red Team run in dependency order"
          : executionModel === "multi_perspective_single_call"
            ? "Execution is explicitly single-call multi-perspective, not claimed as independent agents"
            : "Execution model follows the public status artifact",
      ),
      localized("公开产物发布前经过 judge gate", "judge gate before public artifact publishing"),
      localized("读者页面曝光前经过 public safety scan", "public safety scan before reader-facing exposure"),
      localized("发布闸门后写入 GOTRA 内部 Alaya cognition flywheel / knowledge memory / readback state", "GOTRA internal Alaya cognition flywheel / knowledge memory / readback state after publish gate"),
    ],
    judge_gate: `judge_gate=${stringValue(stages.judge_gate) ?? "unavailable"}`,
    public_safety_scan: `public_safety_scan=${stringValue(stages.public_safety_scan) ?? stringValue(status?.public_scan_status) ?? "unavailable"}`,
    raw_io_policy: "No raw prompt text, provider/model I/O, or credential material is embedded in this reader brief.",
  };
}

function internalAlaya(status, monitor) {
  const mode = stringValue(status?.alaya_mode) ?? (monitor?.checks?.alaya_readback ? "internal_readback" : "unavailable");
  const synced = numberValue(status?.alaya_synced_count, 0);
  const failed = numberValue(status?.alaya_failed_count, 0);
  const verified = numberValue(status?.alaya_readback_verified_count, 0);
  const readbackFailed = numberValue(status?.alaya_readback_failed_count, 0);
  return {
    mode,
    synced_count: synced,
    failed_count: failed,
    readback_verified_count: verified,
    readback_failed_count: readbackFailed,
    sync_status: stringValue(status?.alaya_sync_status),
    readback_status: stringValue(status?.alaya_readback_status) ?? stringValue(monitor?.checks?.alaya_readback),
    interpretation:
      mode === "unavailable"
        ? localized(
            "Full Analyst rich brief unavailable；当前没有足够公开状态描述 GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state。",
            "Full Analyst rich brief is unavailable; there is not enough public status to describe GOTRA internal Alaya cognition flywheel / knowledge memory / feedback state.",
          )
        : localized(
            `GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state 记录 ${synced} 个同步事件，${verified} 个回读验证，失败 ${failed + readbackFailed} 个；这不是外部 Alaya 服务或独立 repo。`,
            `GOTRA internal Alaya cognition flywheel / knowledge memory / feedback state records ${synced} sync event(s), ${verified} readback verification(s), and ${failed + readbackFailed} failure(s); this is not an external Alaya service or separate repo.`,
          ),
  };
}

function topItems(entries, gaps, fullAnalyst, agentItems) {
  const complete = entries.find((entry) => statusLooksUpdated(entry) && !hasDataGap(entry) && !needsReview(entry));
  const gapReport = entries.find(hasDataGap);
  const items = [];

  if (agentItems.length > 0) {
    const first = selectedAgentItems(agentItems, 1)[0];
    items.push({
      id: "full-analyst-rich-brief",
      label: localized("Full Analyst 今日研究摘要已接入", "Full Analyst research summaries are connected"),
      summary: localized(`${fullAnalyst.publish_count} 个标的通过候选发布闸门；精选研究样本包括 ${first.symbol}。`, `${fullAnalyst.publish_count} symbol(s) passed the candidate publication gate; selected research samples include ${first.symbol}.`),
      why_it_matters: localized("普通读者可以先看 agent 的研究摘要、正反观点、red-team、风险因素和观察项，而不是只看产物健康状态。", "Readers can start from agent summaries, positive/negative cases, red-team, risks, and watch items instead of only artifact health."),
    });
  } else {
    items.push({
      id: "full-analyst-rich-brief-unavailable",
      label: localized("Full Analyst rich brief unavailable", "Full Analyst rich brief unavailable"),
      summary: localized("当前没有可读的 per-symbol agent 分析摘要；页面只展示公开状态 fallback。", "There is no readable per-symbol agent analysis summary; the page only shows public-status fallback."),
      why_it_matters: localized("缺少 rich brief 时不能把先行试跑健康伪装成完整研究简报。", "When the rich brief is missing, canary health must not be presented as a complete research brief."),
    });
  }

  if (complete) {
    items.push({
      id: "coverage-complete",
      label: localized(`${complete.label}覆盖完整`, `${complete.labelEn} coverage complete`),
      summary: localized(`${coverageSummary(complete)} 暂无需要读者优先处理的数据缺口。`, `${coverageSummaryEn(complete)} No data gap needs reader priority.`),
      why_it_matters: localized("覆盖完整意味着这份普通行情覆盖日报的阅读完整性较高。", "Complete coverage means this ordinary coverage daily is more readable for the day."),
    });
  }
  if (gapReport) {
    items.push({
      id: "coverage-data-gap",
      label: localized(`${gapReport.label}存在已知数据缺口`, `${gapReport.labelEn} has known data gaps`),
      summary: localized(`${coverageSummary(gapReport)} 已知缺口 ${Math.max(gapReport.gapRows.length, 1)} 个，已在公开状态中标记。`, `${coverageSummaryEn(gapReport)} ${Math.max(gapReport.gapRows.length, 1)} known gap(s) are marked in public status.`),
      why_it_matters: localized("缺口被公开标记后，读者可以把它从完整覆盖样本中排除。", "Once a gap is public-marked, readers can exclude it from complete-coverage samples."),
    });
  }
  items.push({
    id: "claim-boundary",
    label: localized("边界保持不升级", "Claim boundary stays limited"),
    summary: localized("Full Analyst 仍是 candidate/canary，不是 formal acceptance、science/public proof、performance proof 或交易信号。", "Full Analyst remains candidate/canary, not formal acceptance, science/public proof, performance proof, or a trading signal."),
    why_it_matters: localized("读者可以使用研究观察清单，但不能把它读成买卖建议或收益证明。", "Readers can use the research watchlist, but must not read it as trading advice or performance proof."),
  });
  return items.slice(0, 5);
}

function researchWatchlist(gaps, agentItems, fullAnalyst) {
  const gapItems = gaps.slice(0, 5).map((gap) => ({
    symbol: gap.symbol,
    question: localized(`${gap.symbol} 的公开价格覆盖是否恢复？`, `Has public price coverage recovered for ${gap.symbol}?`),
    reason: gap.explanation ?? localized(`${gap.affected_report} 标记 ${gap.reason}。`, `${gap.affected_report} marked ${gap.reason}.`),
    next_check: localized(`等待下一次${gap.affected_report}或 Full Analyst 状态确认。`, `Wait for the next ${gap.affected_report} or Full Analyst status to confirm.`),
    source: "daily_gap",
  }));
  const selected = selectedAgentItems(agentItems, 8).map((item) => ({
    symbol: item.symbol,
    question: item.watch_items[0] ?? localized(`${item.symbol} 的下一次公开披露或运营数据是否支持当前研究框架？`, `Does the next public disclosure or operating data for ${item.symbol} support the current research frame?`),
    reason: item.red_team_review[0] ?? item.risk_factors[0] ?? localized("Full Analyst 标记为需要继续验证的研究观察项。", "Full Analyst marked this as a research observation requiring further verification."),
    next_check: item.watch_items[1] ?? item.watch_items[0] ?? localized("复查下一次公开报告、发行人公告和生产日报状态。", "Review the next public report, issuer disclosure, and production daily status."),
    source: "full_analyst",
  }));
  const canaryItem =
    fullAnalyst.canary_status === "degraded"
      ? [
          {
            symbol: "Full Analyst Canary",
            question: localized("先行试跑心跳、产物新鲜度、公开安全扫描是否恢复健康？", "Have Canary heartbeat, artifact freshness, and public scan recovered to healthy?"),
            reason: localized("Full Analyst monitor 当前不是 healthy。", "Full Analyst monitor is not currently healthy."),
            next_check: localized("复查 status_full_analyst_monitor.json 与最新 Full Analyst status artifact。", "Recheck status_full_analyst_monitor.json and the latest Full Analyst status artifact."),
            source: "canary",
          },
        ]
      : [];
  return [...gapItems, ...selected, ...canaryItem].slice(0, 12);
}

function buildBrief() {
  const now = new Date();
  const entries = reportSchedules.map(normalizeEntry);
  const monitor = readJson("status_full_analyst_monitor.json");
  const fullStatus = readJson("status_full_analyst_evening_hk.json");
  const versionMetadata = fullAnalystVersionMetadata(fullStatus);
  const briefSchema = versionMetadata.execution_model === "independent_agent_calls" ? "gotra.daily_reader_brief.v3" : "gotra.daily_reader_brief.v2";
  const reportHref =
    normalizeReportHref(fullStatus?.latest_public_report_file ?? fullStatus?.report_file, null) ??
    normalizeReportHref(monitor?.links?.report_markdown, null);
  const markdown = reportHref ? readText(fileNameFromHref(reportHref)) : null;
  const agentItems = parseFullAnalystMarkdown(markdown, versionMetadata);
  const canary = canaryStatus(monitor);
  const briefDate = maxDate(entries, fullStatus, now);
  const gaps = knownGaps(entries);
  const health = dailyHealth(entries);
  const updateState = updateStatus(health);
  const reportsUpdatedCount = entries.filter(statusLooksUpdated).length;
  const reportsWithDataGapsCount = entries.filter(hasDataGap).length;
  const fullAnalyst = fullAnalystSummary(fullStatus, monitor, agentItems);
  const subtitle =
    health === "unavailable"
      ? localized("今日公开日报状态暂不可完整读取。", "Today's public daily report status is not fully readable.")
      : localized(
          `${reportsUpdatedCount} 份日报已更新，${gaps.length > 0 ? `存在 ${gaps.length} 个已知数据缺口` : "暂无公开标记的数据缺口"}，Full Analyst 先行试跑状态为${canaryText(canary)}。`,
          `${reportsUpdatedCount} daily report(s) updated, ${gaps.length > 0 ? `${gaps.length} known data gap(s) are present` : "no public-marked data gaps"}, and Full Analyst Canary is ${canaryTextEn(canary)}.`,
        );
  const dailyReportStatus = {
    status: updateState,
    reports_updated_count: reportsUpdatedCount,
    reports_with_data_gaps_count: reportsWithDataGapsCount,
    known_gap_count: gaps.length,
    summary:
      health === "unavailable"
        ? localized("普通日报公开状态暂不可完整读取。", "Ordinary daily report public status is not fully readable.")
        : localized(
            `${reportsUpdatedCount} 份普通日报有公开状态，${gaps.length > 0 ? `${gaps.length} 个已知数据缺口被标记` : "暂无公开标记的数据缺口"}。`,
            `${reportsUpdatedCount} ordinary daily report(s) have public status; ${gaps.length > 0 ? `${gaps.length} known data gap(s) are marked` : "no public-marked data gaps"}.`,
          ),
  };
  const readerSummary =
    health === "unavailable"
      ? localized(
          "公开状态不足，今日不从私有或 raw 产物推断研究过程效果。",
          "Public status is insufficient, so today's page does not infer research-process effectiveness from private or raw artifacts.",
        )
      : localized(
          `日报按公开状态更新；${gaps.length > 0 ? "已知数据缺口被公开标记" : "暂无公开标记的数据缺口"}；Full Analyst 先行试跑状态为${canaryText(canary)}；per-symbol rich brief ${agentItems.length > 0 ? "已接入" : "不可用"}。`,
          `Daily reports updated according to public status; ${gaps.length > 0 ? "known data gaps are public-marked" : "no public-marked data gaps"}; Full Analyst Canary is ${canaryTextEn(canary)}; per-symbol rich brief is ${agentItems.length > 0 ? "connected" : "unavailable"}.`,
        );

  return {
    schema_version: briefSchema,
    schema: briefSchema,
    as_of_date: briefDate,
    mode: "public_status_synthesis",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    ...versionMetadata,
    evidence_layer: "local checks + runtime/status evidence + public-safe artifact smoke",
    title: localized(titleForDate(briefDate), titleForDateEn(briefDate)),
    subtitle,
    tldr:
      agentItems.length > 0
        ? localized(
            `Full Analyst 先行试跑已接入 ${agentItems.length} 个公开 per-symbol 研究摘要；今日先看 agent 分析矩阵、red-team、风险因素、观察清单和数据缺口。${subtitle.zh} 本简报不是投资建议或交易信号。`,
            `Full Analyst Canary has ${agentItems.length} public per-symbol research summaries; start with the agent matrix, red-team, risk factors, watchlist, and data gaps today. ${subtitle.en} This brief is not investment advice or a trading signal.`,
          )
        : localized(
            `Full Analyst rich brief unavailable；当前页面只能展示公开状态摘要。${subtitle.zh} 本简报不是投资建议或交易信号。`,
            `Full Analyst rich brief is unavailable; this page can only show a public-status summary. ${subtitle.en} This brief is not investment advice or a trading signal.`,
          ),
    reader_summary: readerSummary,
    daily_report_status: dailyReportStatus,
    full_analyst: fullAnalyst,
    agent_analysis_items: agentItems,
    prompt_framework_summary: promptFrameworkSummary(fullStatus),
    internal_alaya: internalAlaya(fullStatus, monitor),
    research_watchlist: researchWatchlist(gaps, agentItems, fullAnalyst),
    top_items: topItems(entries, gaps, fullAnalyst, agentItems),
    watchlist: gaps.slice(0, 8).map((gap) => ({
      symbol: gap.symbol,
      reason: localized(`${gap.affected_report} 仍有 ${gap.reason}。`, `${gap.affected_report} still has ${gap.reason}.`),
      status: "data_gap",
      reader_takeaway: localized("这个标的今天不适合被当成完整覆盖样本。", "This symbol should not be treated as a complete-coverage sample today."),
    })),
    changes_since_last_brief: [
      ...entries.filter(statusLooksUpdated).map((entry) =>
        localized(
          `${entry.label}${entry.asOfDate ? `更新到 ${entry.asOfDate}` : "已有公开状态更新"}${hasDataGap(entry) ? "，但存在已知数据缺口。" : "。"}`,
          `${entry.labelEn}${entry.asOfDate ? ` updated to ${entry.asOfDate}` : " has a public status update"}${hasDataGap(entry) ? ", with known data gaps." : "."}`,
        ),
      ),
      ...(fullStatus ? [localized(`Full Analyst 先行试跑 ${fullAnalyst.run_status}，公开研究摘要 ${agentItems.length} 个。`, `Full Analyst Canary is ${fullAnalyst.run_status}, with ${agentItems.length} public research summaries.`)] : []),
      ...(canary !== "unavailable" ? [localized(`Full Analyst 先行试跑为 ${canaryText(canary)}。`, `Full Analyst Canary is ${canaryTextEn(canary)}.`)] : []),
    ],
    known_gaps: gaps,
    research_effectiveness: {
      daily_update_status: updateState,
      reports_updated_count: reportsUpdatedCount,
      reports_with_data_gaps_count: reportsWithDataGapsCount,
      canary_status: canary,
      reader_summary: readerSummary,
    },
    system_health: {
      daily_reports: health,
      full_analyst_canary: canary,
    },
    next_watch: [
      ...gaps.slice(0, 4).map((gap) => localized(`等待下一次${gap.affected_report}确认 ${gap.symbol} 是否恢复完整覆盖。`, `Wait for the next ${gap.affected_report} to confirm whether ${gap.symbol} returns to complete coverage.`)),
      ...(selectedAgentItems(agentItems, 4).map((item) => item.watch_items[0]).filter(Boolean)),
      canary === "healthy"
        ? localized("继续观察 Full Analyst 先行试跑是否保持健康，但不把先行试跑当成正式结论升级。", "Continue watching whether Full Analyst Canary stays healthy, without treating it as a formal conclusion upgrade.")
        : localized("复查 Full Analyst 先行试跑的心跳新鲜度、产物新鲜度和公开安全扫描。", "Recheck Full Analyst Canary heartbeat freshness, artifact freshness, and public safety scan."),
      localized("下一次生产日报继续核对覆盖率、数据缺口和公开产物链接。", "In the next production daily report, keep checking coverage, data gaps, and public artifact links."),
    ],
    boundary: [
      localized("研究信息，不是投资建议。", "Research information only, not investment advice."),
      localized("不是交易信号。", "Not a trading signal."),
      localized("不是业绩证明。", "Not performance proof."),
      localized("不是科学或公开证明。", "Not science/public proof."),
      localized("Full Analyst 仍是先行试跑，不是正式结论升级。", "Full Analyst remains a canary/candidate path, not a formal conclusion upgrade."),
      localized("不输出买/卖/持有。不提供仓位指令。不提供价格目标。不承诺回报。", "No buy/sell/hold, position sizing, target price, or return promise is provided."),
    ],
    technical_status: {
      run_id: fullAnalyst.run_id,
      run_status: fullAnalyst.run_status,
      judge_gate: promptFrameworkSummary(fullStatus).judge_gate,
      public_safety_scan: promptFrameworkSummary(fullStatus).public_safety_scan,
      alaya_readback: stringValue(fullStatus?.alaya_readback_status) ?? stringValue(monitor?.checks?.alaya_readback),
      schema: briefSchema,
      artifact_path: "/reports/daily_reader_brief.json",
    },
    links: {
      latest_report: "/reports/latest.md",
      full_analyst_report: fullAnalyst.report_markdown,
      reports_page: "#/reports",
      status_json: "/reports/status.json",
      full_analyst_status: fullAnalyst.status_json,
      full_analyst_monitor: "/reports/status_full_analyst_monitor.json",
      daily_reader_brief: "/reports/daily_reader_brief.json",
    },
  };
}

function main() {
  if (!fs.existsSync(reportsDir)) {
    console.error(`Reports directory does not exist: ${reportsDir}`);
    process.exit(1);
  }
  const brief = buildBrief();
  const latestPath = path.join(reportsDir, "daily_reader_brief.json");
  const datedPath = path.join(reportsDir, `daily_reader_brief_${brief.brief_date}.json`);
  fs.writeFileSync(latestPath, `${JSON.stringify(brief, null, 2)}\n`);
  fs.writeFileSync(datedPath, `${JSON.stringify(brief, null, 2)}\n`);
  console.log(`Generated ${latestPath}`);
  console.log(`Generated ${datedPath}`);
  console.log(`agent_analysis_items=${brief.agent_analysis_items.length}`);
}

main();
