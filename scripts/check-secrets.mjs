/* global console, process */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  ".github/workflows",
  "docs",
  "public",
  "scripts",
  "src",
  "README.md",
  "index.html",
  "package.json",
];

const ignoredDirs = new Set([".git", "dist", "node_modules", ".vite"]);
const allowedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yml",
  ".yaml",
]);

const secretPatterns = [
  { name: "OpenAI key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "Stripe secret key", pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g },
  { name: "Private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    name: "Secret-like env assignment",
    pattern:
      /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN|STRIPE_SECRET_KEY|SENDGRID_API_KEY|MAILCHIMP_API_KEY|SMTP_PASSWORD|API_SECRET|SECRET_KEY|PRIVATE_KEY)\s*=\s*["']?[^"'\s<>{}]+/g,
  },
];

const placeholderValues = new Set([
  "example",
  "placeholder",
  "redacted",
  "changeme",
  "your_key_here",
  "your-api-key",
  "xxx",
  "***",
]);

function isPlaceholder(match) {
  const value = match.split("=").at(1)?.replace(/^["']|["']$/g, "").trim().toLowerCase();
  return value ? placeholderValues.has(value) || value.includes("placeholder") : false;
}

function listFiles(entry) {
  const absolute = path.join(root, entry);
  if (!fs.existsSync(absolute)) {
    return [];
  }
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    if (ignoredDirs.has(path.basename(absolute))) {
      return [];
    }
    return fs.readdirSync(absolute).flatMap((child) => listFiles(path.join(entry, child)));
  }
  return allowedExtensions.has(path.extname(absolute)) ? [absolute] : [];
}

const hits = [];
for (const file of scanRoots.flatMap(listFiles)) {
  const relative = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    for (const { name, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        if (name === "Secret-like env assignment" && isPlaceholder(match[0])) {
          continue;
        }
        hits.push({ file: relative, line: index + 1, name, text: line.trim() });
      }
    }
  });
}

if (hits.length > 0) {
  console.error("Potential secret/API key hits:");
  hits.forEach((hit) => {
    console.error(`${hit.file}:${hit.line} [${hit.name}] ${hit.text}`);
  });
  process.exit(1);
}

console.log(`Secret scan passed: potential secret/API key hits = 0 across ${scanRoots.join(", ")}`);
