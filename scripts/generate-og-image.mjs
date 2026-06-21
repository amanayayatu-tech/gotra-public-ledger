/* global console, process */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataset = JSON.parse(fs.readFileSync(path.join(root, "public/data/ledger.demo.json"), "utf8"));
const boundaryDate = dataset.metadata.current_date_for_boundary_review;

function status(record) {
  if (record.direction_correct !== "pending") {
    return "resolved";
  }
  return record.outcome_availability_date <= boundaryDate ? "frozen_pending" : "pending";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const records = dataset.records.map((record) => ({ ...record, status: status(record) }));
const resolved = records.filter((record) => record.status === "resolved");
const frozenPending = records.filter((record) => record.status === "frozen_pending");
const misses = resolved.filter((record) => record.direction_correct === false);
const tickerCount = new Set(records.map((record) => record.ticker)).size;
const coverageDenominator = resolved.length + frozenPending.length;
const coverage = coverageDenominator > 0 ? `${((resolved.length / coverageDenominator) * 100).toFixed(1)}%` : "暂无";

const metrics = [
  ["公开预测", records.length],
  ["已结算", resolved.length],
  ["公开错误", misses.length],
  ["覆盖标的", tickerCount],
  ["结算覆盖", coverage],
];

const metricBlocks = metrics
  .map(
    ([label, value], index) => `
      <g transform="translate(${92 + index * 200}, 430)">
        <rect width="164" height="112" rx="14" fill="#101820" stroke="#263441"/>
        <text x="18" y="38" fill="#9aa9b5" font-size="20" font-weight="700">${escapeXml(label)}</text>
        <text x="18" y="82" fill="#75d88f" font-size="38" font-weight="900">${escapeXml(value)}</text>
      </g>`,
  )
  .join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="GOTRA Public Ledger public-safe demo snapshot">
  <rect width="1200" height="630" fill="#070b0f"/>
  <rect x="42" y="42" width="1116" height="546" rx="28" fill="#0b1117" stroke="#263441"/>
  <path d="M96 128 L150 96 L150 160 Z" fill="#75d88f"/>
  <path d="M156 96 L214 128 L156 160 Z" fill="#69a7ff"/>
  <text x="96" y="230" fill="#f6fbf8" font-size="58" font-weight="900">GOTRA Public Ledger</text>
  <text x="96" y="292" fill="#f6fbf8" font-size="44" font-weight="850">AI股票研究 · 公开预测账本 · 可审计</text>
  <text x="96" y="350" fill="#9aa9b5" font-size="26">public-safe demo snapshot ${escapeXml(dataset.metadata.snapshot_date)} · research information only · not investment advice</text>
  ${metricBlocks}
  <text x="96" y="575" fill="#71818e" font-size="20">不声称 OOS / 科学公开证明 / 交易信号。错误也保留在同一公开账本中。</text>
</svg>
`;

fs.writeFileSync(path.join(root, "public/og-image.svg"), svg);
console.log("Generated public/og-image.svg");
