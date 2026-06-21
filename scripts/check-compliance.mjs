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
  "市场 edge",
  "预测能力被证明",
  "我们很准",
  "越来越准",
  "自动学习变强",
];

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
      if (line.includes(pattern)) {
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
