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

function maxDate(entries, now) {
  const dates = entries.map((entry) => entry.asOfDate).filter((value) => value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

function topItems(entries, gaps, canary, monitor) {
  const complete = entries.find((entry) => statusLooksUpdated(entry) && !hasDataGap(entry) && !needsReview(entry));
  const gapReport = entries.find(hasDataGap);
  const items = [];
  if (complete) {
    items.push({
      label: `${complete.label}覆盖完整`,
      summary: `${coverageSummary(complete)} 暂无需要读者优先处理的数据缺口。`,
      why_it_matters: "覆盖完整意味着这份公开日报的阅读完整性较高。",
    });
  }
  if (gapReport) {
    items.push({
      label: `${gapReport.label}存在已知数据缺口`,
      summary: `${coverageSummary(gapReport)} 已知缺口 ${Math.max(gapReport.gapRows.length, 1)} 个，已在公开状态中标记。`,
      why_it_matters: "缺口被公开标记后，读者可以把它从完整覆盖样本中排除。",
    });
  }
  if (canary === "healthy") {
    const readback = monitor?.checks?.alaya_readback === "ok" ? "，内部 Alaya 回读正常" : "";
    items.push({
      label: "Full Analyst 金丝雀健康",
      summary: `Full Analyst 金丝雀监控健康${readback}。`,
      why_it_matters: "金丝雀健康只说明候选链路当前可观察，不等于正式上线或研究结论升级。",
    });
  }
  if (gaps.length > 0) {
    items.push({
      label: "观察清单已更新",
      summary: `今日观察清单包含 ${gaps.length} 个公开标记的数据缺口。`,
      why_it_matters: "观察清单告诉读者哪些标的需要等下一次报告确认。",
    });
  }
  return items.slice(0, 5);
}

function buildBrief() {
  const now = new Date();
  const entries = reportSchedules.map(normalizeEntry);
  const monitor = readJson("status_full_analyst_monitor.json");
  const canary = canaryStatus(monitor);
  const briefDate = maxDate(entries, now);
  const gaps = knownGaps(entries);
  const health = dailyHealth(entries);
  const reportsUpdatedCount = entries.filter(statusLooksUpdated).length;
  const reportsWithDataGapsCount = entries.filter(hasDataGap).length;
  const subtitle =
    health === "unavailable"
      ? "今日公开日报状态暂不可完整读取。"
      : `${reportsUpdatedCount} 份日报已更新，${gaps.length > 0 ? `存在 ${gaps.length} 个已知数据缺口` : "暂无公开标记的数据缺口"}，Full Analyst 金丝雀状态为${canaryText(canary)}。`;

  return {
    schema: "gotra.daily_reader_brief.v1",
    brief_date: briefDate,
    generated_at: formatShanghaiIso(now),
    title: titleForDate(briefDate),
    subtitle,
    tldr: `${subtitle} 本简报只解释公开研究过程状态，不构成投资建议或交易信号。`,
    top_items: topItems(entries, gaps, canary, monitor),
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
      ...(canary !== "unavailable" ? [`Full Analyst 金丝雀为 ${canaryText(canary)}。`] : []),
    ],
    known_gaps: gaps,
    research_effectiveness: {
      daily_update_status: updateStatus(health),
      reports_updated_count: reportsUpdatedCount,
      reports_with_data_gaps_count: reportsWithDataGapsCount,
      canary_status: canary,
      reader_summary:
        health === "unavailable"
          ? "公开状态不足，今日不从私有或 raw 产物推断研究过程效果。"
          : `日报按公开状态更新；${gaps.length > 0 ? "已知数据缺口被公开标记" : "暂无公开标记的数据缺口"}；Full Analyst 金丝雀状态为${canaryText(canary)}。`,
    },
    system_health: {
      daily_reports: health,
      full_analyst_canary: canary,
    },
    next_watch: [
      ...gaps.slice(0, 4).map((gap) => `等待下一次${gap.affected_report}确认 ${gap.symbol} 是否恢复完整覆盖。`),
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
    ],
    links: {
      latest_report: "/reports/latest.md",
      reports_page: "#/reports",
      status_json: "/reports/status.json",
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
}

main();
