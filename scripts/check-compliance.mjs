/* global console, process */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "public", "docs", "README.md", "index.html"];
const allowedExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".md",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
]);

const forbiddenPatterns = [
  "建议买入",
  "建议卖出",
  "买入建议",
  "卖出建议",
  "必涨",
  "必跌",
  "保本",
  "收益承诺",
  "荐股",
  "交易信号",
  "AI 选股",
  "稳定 alpha",
  "alpha 已验证",
  "OOS passed",
  "科学证明",
  "公开证明",
  "跑赢市场",
  "稳定收益",
  "实盘收益",
  "年化收益",
  "稳赚",
  "预测能力被证明",
  "我们很准",
  "越来越准",
  "自动学习变强",
  "目标价",
  "仓位建议",
  "止损",
  "止盈",
  "跟单",
  "市场 edge",
];

const explicitPolicyLinePatterns = [
  /^\s*[-*]\s*Forbidden:\s*/i,
  /^\s*[-*]\s*Forbidden wording:\s*/i,
  /^\s*[-*]\s*禁止[:：]\s*/,
  /^\s*[-*]\s*禁用[:：]\s*/,
];

const negationPatterns = [
  /do not/i,
  /must not/i,
  /not\s+(?:a\s+|an\s+|the\s+)?/i,
  /no\s+/i,
  /禁止/,
  /禁用/,
  /不得/,
  /不能/,
  /不声称/,
  /不是/,
  /不构成/,
  /不允许/,
  /不要/,
  /非/,
];

function segmentBeforeMatch(line, matchIndex) {
  const prefix = line.slice(0, matchIndex);
  const boundaryIndex = Math.max(
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf(";"),
    prefix.lastIndexOf(":"),
    prefix.lastIndexOf(","),
    prefix.lastIndexOf("。"),
    prefix.lastIndexOf("！"),
    prefix.lastIndexOf("？"),
    prefix.lastIndexOf("；"),
    prefix.lastIndexOf("："),
    prefix.lastIndexOf("，"),
    prefix.lastIndexOf("但"),
  );

  return prefix.slice(boundaryIndex + 1);
}

function isPolicyContext(line, pattern) {
  if (explicitPolicyLinePatterns.some((contextPattern) => contextPattern.test(line))) {
    return true;
  }

  const matchIndex = line.indexOf(pattern);
  if (matchIndex < 0) {
    return false;
  }

  const localPrefix = segmentBeforeMatch(line, matchIndex);
  return negationPatterns.some((contextPattern) => contextPattern.test(localPrefix));
}

function listFiles(entry) {
  const absolute = path.join(root, entry);
  if (!fs.existsSync(absolute)) {
    return [];
  }
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    return allowedExtensions.has(path.extname(absolute)) ? [absolute] : [];
  }
  return fs.readdirSync(absolute).flatMap((child) => listFiles(path.join(entry, child)));
}

const hits = [];
for (const file of scanRoots.flatMap(listFiles)) {
  const relative = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    forbiddenPatterns.forEach((pattern) => {
      if (line.includes(pattern) && !isPolicyContext(line, pattern)) {
        hits.push({ file: relative, line: index + 1, pattern, text: line.trim() });
      }
    });
  });
}

if (hits.length > 0) {
  console.error("Compliance forbidden term hits:");
  hits.forEach((hit) => {
    console.error(`${hit.file}:${hit.line} [${hit.pattern}] ${hit.text}`);
  });
  process.exit(1);
}

console.log(`Compliance scan passed: forbidden term hits = 0 across ${scanRoots.join(", ")}`);
