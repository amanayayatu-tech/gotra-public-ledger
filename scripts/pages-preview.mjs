/* global URL, console, process */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {
    port: 4179,
    basePath: "/gotra-public-ledger/",
    distDir: path.join(repoRoot, "dist"),
  };

  argv.forEach((arg, index) => {
    const next = argv[index + 1];
    if (arg === "--port" && next) {
      args.port = Number(next);
    }
    if (arg === "--base" && next) {
      args.basePath = next.endsWith("/") ? next : `${next}/`;
    }
    if (arg === "--dist" && next) {
      args.distDir = path.resolve(next);
    }
  });

  return args;
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  if (extension === ".xml") return "application/xml; charset=utf-8";
  return "application/octet-stream";
}

function resolveRequestPath(requestPath, args) {
  let normalizedPath = requestPath;
  if (normalizedPath.startsWith(args.basePath)) {
    normalizedPath = normalizedPath.slice(args.basePath.length - 1);
  }
  if (normalizedPath === "/" || normalizedPath === "") {
    normalizedPath = "/index.html";
  }

  const decoded = decodeURIComponent(normalizedPath);
  const resolvedPath = path.resolve(args.distDir, `.${decoded}`);
  if (!resolvedPath.startsWith(args.distDir)) {
    return { status: 403 };
  }
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    return { status: 200, filePath: resolvedPath };
  }
  if (path.extname(resolvedPath)) {
    return { status: 404 };
  }
  return { status: 200, filePath: path.join(args.distDir, "index.html") };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(path.join(args.distDir, "index.html"))) {
    console.error(`Missing dist/index.html in ${args.distDir}`);
    process.exit(1);
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const result = resolveRequestPath(url.pathname, args);
    if (result.status !== 200 || !result.filePath) {
      response.writeHead(result.status, { "content-type": "text/plain; charset=utf-8" });
      response.end(result.status === 403 ? "Forbidden" : "Not found");
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-cache",
      "content-type": contentTypeFor(result.filePath),
    });
    fs.createReadStream(result.filePath).pipe(response);
  });

  server.listen(args.port, "127.0.0.1", () => {
    console.log(`Pages preview serving ${args.distDir} at http://127.0.0.1:${args.port}${args.basePath}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
