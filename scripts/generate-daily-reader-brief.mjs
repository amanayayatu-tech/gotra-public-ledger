/* global console, process */
import fs from "node:fs";
import path from "node:path";

const reportSchedules = [
  { key: "morning-hk", label: "港股早报", statusFile: "status_morning_hk.json" },
  { key: "evening-hk", label: "港股晚报", statusFile: "status_evening_hk.json" },
  { key: "morning-us", label: "美股早报", statusFile: "status_morning_us.json" },
  { key: "evening-us", label: "美股晚报", statusFile: "status_evening_us.json" },
  { key: "morning-global", label: "全局汇总", statusFile: "status_morning_global.json" },
];

const listFields = new Set(["key_updates", "positive_case", "negative_case", "red_team_review", "risk_factors", "watch_items", "source_notes"]);

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

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
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
  const cleaned = withoutUrls
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

function coverageSummary(entry) {
  if (entry.universeCount <= 0) {
    return `${entry.label} 已生成公开状态，但覆盖统计暂不可用。`;
  }
  return `${entry.label} ${entry.successCount}/${entry.universeCount} 完成。`;
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

function normalizeAgentItem(symbol, fields) {
  const researchSummary = parseSummaryText(fields.research_summary ?? "");
  if (!researchSummary) {
    return null;
  }
  return {
    symbol,
    research_summary: researchSummary,
    key_updates: sanitizeList(fields.key_updates, 8),
    positive_case: sanitizeList(fields.positive_case, 7),
    negative_case: sanitizeList(fields.negative_case, 7),
    red_team_review: sanitizeList(fields.red_team_review, 7),
    risk_factors: sanitizeList(fields.risk_factors, 7),
    watch_items: sanitizeList(fields.watch_items, 7),
    source_notes: sanitizeList(fields.source_notes, 4, 260),
  };
}

function parseFullAnalystMarkdown(markdown) {
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
      return normalizeAgentItem(section.symbol, fields);
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
  const reportMarkdown =
    normalizeReportHref(monitor?.links?.report_markdown, null) ??
    normalizeReportHref(status?.latest_public_report_file ?? status?.report_file, "/reports/full_analyst_evening_hk_YYYY-MM-DD.md");
  const statusJson = normalizeReportHref(monitor?.links?.status_json, "/reports/status_full_analyst_evening_hk.json");
  const publishCount = numberValue(status?.publish_count, 0);
  const universeCount = numberValue(status?.universe_count, numberValue(status?.symbol_count, publishCount));
  const runStatus = stringValue(status?.run_status) ?? stringValue(monitor?.latest_run?.status) ?? "unavailable";
  const readableCount = agentItems.length;

  return {
    run_id: stringValue(status?.run_id) ?? stringValue(monitor?.latest_run?.run_id) ?? "unavailable",
    run_status: runStatus,
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
        ? `Full Analyst candidate/canary 已接入 ${readableCount} 个公开 per-symbol 研究摘要，状态为 ${canaryText(canary)}，发布闸门 ${publishCount}/${universeCount || publishCount}。这些内容是研究观察，不是正式结论升级。`
        : "Full Analyst rich brief unavailable；当前只能读取 Full Analyst monitor/status，不能展示每标的 agent 分析。",
  };
}

function promptFrameworkSummary(status) {
  const stages = status?.stage_statuses && typeof status.stage_statuses === "object" ? status.stage_statuses : {};
  return {
    prompt_template_version: stringValue(status?.prompt_template_version),
    runner: stringValue(status?.llm_runner),
    model: stringValue(status?.llm_model),
    max_concurrency: numberValue(status?.max_concurrency, null),
    task_structure: [
      "public-safe full-pool candidate/canary run",
      "per-symbol research_summary, key_updates, positive_case, negative_case, red_team_review, risk_factors, watch_items, source_notes",
      "judge gate before public artifact publishing",
      "public safety scan before reader-facing exposure",
      "GOTRA internal Alaya cognition flywheel / knowledge memory / readback state after publish gate",
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
        ? "Full Analyst rich brief unavailable；当前没有足够公开状态描述 GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state。"
        : `GOTRA 内部 Alaya cognition flywheel / knowledge memory / feedback state 记录 ${synced} 个同步事件，${verified} 个回读验证，失败 ${failed + readbackFailed} 个；这不是外部 Alaya 服务或独立 repo。`,
  };
}

function topItems(entries, gaps, fullAnalyst, agentItems) {
  const complete = entries.find((entry) => statusLooksUpdated(entry) && !hasDataGap(entry) && !needsReview(entry));
  const gapReport = entries.find(hasDataGap);
  const items = [];

  if (agentItems.length > 0) {
    const first = selectedAgentItems(agentItems, 1)[0];
    items.push({
      label: "Full Analyst 今日研究摘要已接入",
      summary: `${fullAnalyst.publish_count} 个标的通过候选发布闸门；精选研究样本包括 ${first.symbol}。`,
      why_it_matters: "普通读者可以先看 agent 的研究摘要、正反观点、red-team、风险因素和观察项，而不是只看产物健康状态。",
    });
  } else {
    items.push({
      label: "Full Analyst rich brief unavailable",
      summary: "当前没有可读的 per-symbol agent 分析摘要；页面只展示公开状态 fallback。",
      why_it_matters: "缺少 rich brief 时不能把金丝雀健康伪装成完整研究简报。",
    });
  }

  if (complete) {
    items.push({
      label: `${complete.label}覆盖完整`,
      summary: `${coverageSummary(complete)} 暂无需要读者优先处理的数据缺口。`,
      why_it_matters: "覆盖完整意味着这份普通行情覆盖日报的阅读完整性较高。",
    });
  }
  if (gapReport) {
    items.push({
      label: `${gapReport.label}存在已知数据缺口`,
      summary: `${coverageSummary(gapReport)} 已知缺口 ${Math.max(gapReport.gapRows.length, 1)} 个，已在公开状态中标记。`,
      why_it_matters: "缺口被公开标记后，读者可以把它从完整覆盖样本中排除。",
    });
  }
  items.push({
    label: "边界保持不升级",
    summary: "Full Analyst 仍是 candidate/canary，不是 formal acceptance、science/public proof、performance proof 或交易信号。",
    why_it_matters: "读者可以使用研究观察清单，但不能把它读成买卖建议或收益证明。",
  });
  return items.slice(0, 5);
}

function researchWatchlist(gaps, agentItems, fullAnalyst) {
  const gapItems = gaps.slice(0, 5).map((gap) => ({
    symbol: gap.symbol,
    question: `${gap.symbol} 的公开价格覆盖是否恢复？`,
    reason: `${gap.affected_report} 标记 ${gap.reason}。`,
    next_check: `等待下一次${gap.affected_report}或 Full Analyst 状态确认。`,
    source: "daily_gap",
  }));
  const selected = selectedAgentItems(agentItems, 8).map((item) => ({
    symbol: item.symbol,
    question: item.watch_items[0] ?? `${item.symbol} 的下一次公开披露或运营数据是否支持当前研究框架？`,
    reason: item.red_team_review[0] ?? item.risk_factors[0] ?? "Full Analyst 标记为需要继续验证的研究观察项。",
    next_check: item.watch_items[1] ?? item.watch_items[0] ?? "复查下一次公开报告、发行人公告和生产日报状态。",
    source: "full_analyst",
  }));
  const canaryItem =
    fullAnalyst.canary_status === "degraded"
      ? [
          {
            symbol: "Full Analyst Canary",
            question: "金丝雀心跳、产物新鲜度、公开安全扫描是否恢复健康？",
            reason: "Full Analyst monitor 当前不是 healthy。",
            next_check: "复查 status_full_analyst_monitor.json 与最新 Full Analyst status artifact。",
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
  const reportHref =
    normalizeReportHref(monitor?.links?.report_markdown, null) ??
    normalizeReportHref(fullStatus?.latest_public_report_file ?? fullStatus?.report_file, null);
  const markdown = reportHref ? readText(fileNameFromHref(reportHref)) : null;
  const agentItems = parseFullAnalystMarkdown(markdown);
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
      ? "今日公开日报状态暂不可完整读取。"
      : `${reportsUpdatedCount} 份日报已更新，${gaps.length > 0 ? `存在 ${gaps.length} 个已知数据缺口` : "暂无公开标记的数据缺口"}，Full Analyst 金丝雀状态为${canaryText(canary)}。`;
  const dailyReportStatus = {
    status: updateState,
    reports_updated_count: reportsUpdatedCount,
    reports_with_data_gaps_count: reportsWithDataGapsCount,
    known_gap_count: gaps.length,
    summary:
      health === "unavailable"
        ? "普通日报公开状态暂不可完整读取。"
        : `${reportsUpdatedCount} 份普通日报有公开状态，${gaps.length > 0 ? `${gaps.length} 个已知数据缺口被标记` : "暂无公开标记的数据缺口"}。`,
  };

  return {
    schema: "gotra.daily_reader_brief.v1",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    evidence_layer: "local checks + runtime/status evidence + public-safe artifact smoke",
    title: titleForDate(briefDate),
    subtitle,
    tldr:
      agentItems.length > 0
        ? `Full Analyst candidate/canary 已接入 ${agentItems.length} 个公开 per-symbol 研究摘要；今日先看 agent 分析矩阵、red-team、风险因素、观察清单和数据缺口。${subtitle} 本简报不是投资建议或交易信号。`
        : `Full Analyst rich brief unavailable；当前页面只能展示公开状态摘要。${subtitle} 本简报不是投资建议或交易信号。`,
    daily_report_status: dailyReportStatus,
    full_analyst: fullAnalyst,
    agent_analysis_items: agentItems,
    prompt_framework_summary: promptFrameworkSummary(fullStatus),
    internal_alaya: internalAlaya(fullStatus, monitor),
    research_watchlist: researchWatchlist(gaps, agentItems, fullAnalyst),
    top_items: topItems(entries, gaps, fullAnalyst, agentItems),
    watchlist: gaps.slice(0, 8).map((gap) => ({
      symbol: gap.symbol,
      reason: `${gap.affected_report} 仍有 ${gap.reason}。`,
      status: "data_gap",
      reader_takeaway: "这个标的今天不适合被当成完整覆盖样本。",
    })),
    changes_since_last_brief: [
      ...entries.filter(statusLooksUpdated).map((entry) =>
        `${entry.label}${entry.asOfDate ? `更新到 ${entry.asOfDate}` : "已有公开状态更新"}${hasDataGap(entry) ? "，但存在已知数据缺口。" : "。"}`,
      ),
      ...(fullStatus ? [`Full Analyst candidate/canary ${fullAnalyst.run_status}，公开研究摘要 ${agentItems.length} 个。`] : []),
      ...(canary !== "unavailable" ? [`Full Analyst 金丝雀为 ${canaryText(canary)}。`] : []),
    ],
    known_gaps: gaps,
    research_effectiveness: {
      daily_update_status: updateState,
      reports_updated_count: reportsUpdatedCount,
      reports_with_data_gaps_count: reportsWithDataGapsCount,
      canary_status: canary,
      reader_summary:
        health === "unavailable"
          ? "公开状态不足，今日不从私有或 raw 产物推断研究过程效果。"
          : `日报按公开状态更新；${gaps.length > 0 ? "已知数据缺口被公开标记" : "暂无公开标记的数据缺口"}；Full Analyst 金丝雀状态为${canaryText(canary)}；per-symbol rich brief ${agentItems.length > 0 ? "已接入" : "不可用"}。`,
    },
    system_health: {
      daily_reports: health,
      full_analyst_canary: canary,
    },
    next_watch: [
      ...gaps.slice(0, 4).map((gap) => `等待下一次${gap.affected_report}确认 ${gap.symbol} 是否恢复完整覆盖。`),
      ...(selectedAgentItems(agentItems, 4).map((item) => item.watch_items[0]).filter(Boolean)),
      canary === "healthy"
        ? "继续观察 Full Analyst 金丝雀是否保持健康，但不把金丝雀当成正式结论升级。"
        : "复查 Full Analyst 金丝雀的心跳新鲜度、产物新鲜度和公开安全扫描。",
      "下一次生产日报继续核对覆盖率、数据缺口和公开产物链接。",
    ],
    boundary: [
      "研究信息，不是投资建议。",
      "不是交易信号。",
      "不是业绩证明。",
      "不是科学或公开证明。",
      "Full Analyst 仍是金丝雀，不是正式结论升级。",
      "不输出买/卖/持有、仓位、目标价或收益承诺。",
    ],
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
