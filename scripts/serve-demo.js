/*
 * Lina's — local client working-model demo server.
 *
 * Serves the same static content as scripts/serve-prototype.js (V1 at "/",
 * V2 at "/v2", plus everything else in the repo) AND adds a small JSON API
 * backed by a real local SQLite file (scripts/lina-demo-db.js) so the
 * enquiry -> admin -> dashboard journey actually persists data.
 *
 * This is a LOCAL REVIEW SERVER for the client working-model demo. It is
 * not a production server, not authenticated, and not deployed anywhere.
 *
 * Usage:
 *   node scripts/serve-demo.js
 *   PORT=9000 node scripts/serve-demo.js   (optional override)
 *
 * Stop with Ctrl+C. Does not touch or replace scripts/serve-prototype.js —
 * "npm run prototype" still works exactly as before.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const db = require("./lina-demo-db");

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.resolve(__dirname, "..");
const PROTOTYPE_INDEX = "/assets/mockups/working/prototype/index.html";
const PROTOTYPE_V2_INDEX = "/assets/mockups/working/prototype-v2/index.html";
const DEMO_INDEX = "/assets/mockups/working/demo/index.html";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf"
};

function send404(res, reqPath) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(`404 Not Found: ${reqPath}\n`);
}
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error("Body too large")); req.destroy(); return; }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  stream.on("open", () => {
    res.writeHead(200, { "Content-Type": contentType });
    stream.pipe(res);
  });
  stream.on("error", () => send404(res, filePath));
}

async function handleApi(req, res, reqPath) {
  const parts = reqPath.split("/").filter(Boolean); // ["api", "enquiries", "12"]

  try {
    if (parts[1] === "enquiries" && !parts[2] && req.method === "POST") {
      const body = await readJsonBody(req);
      const created = db.createEnquiry(body);
      sendJson(res, 201, { ok: true, enquiry: created });
      return;
    }
    if (parts[1] === "enquiries" && !parts[2] && req.method === "GET") {
      sendJson(res, 200, { ok: true, enquiries: db.listEnquiries() });
      return;
    }
    if (parts[1] === "enquiries" && parts[2] && req.method === "GET") {
      const row = db.getEnquiryById(Number(parts[2]));
      if (!row) return sendJson(res, 404, { ok: false, error: "Not found" });
      sendJson(res, 200, { ok: true, enquiry: row });
      return;
    }
    if (parts[1] === "enquiries" && parts[2] && req.method === "PATCH") {
      const body = await readJsonBody(req);
      const updated = db.updateEnquiry(Number(parts[2]), body);
      sendJson(res, 200, { ok: true, enquiry: updated });
      return;
    }
    if (parts[1] === "dashboard" && req.method === "GET") {
      sendJson(res, 200, { ok: true, dashboard: db.getDashboard() });
      return;
    }
    sendJson(res, 404, { ok: false, error: "Unknown API route" });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    sendJson(res, statusCode, { ok: false, error: err.message || "Internal error" });
  }
}

const server = http.createServer((req, res) => {
  (async () => {
    try {
      let reqPath = decodeURIComponent(req.url.split("?")[0]);

      if (reqPath.startsWith("/api/")) {
        await handleApi(req, res, reqPath);
        return;
      }

      if (reqPath === "/") { res.writeHead(302, { Location: PROTOTYPE_INDEX }); res.end(); return; }
      if (reqPath === "/v2" || reqPath === "/v2/") { res.writeHead(302, { Location: PROTOTYPE_V2_INDEX }); res.end(); return; }
      if (reqPath === "/demo" || reqPath === "/demo/") { res.writeHead(302, { Location: DEMO_INDEX }); res.end(); return; }

      const resolved = path.normalize(path.join(ROOT, reqPath));
      if (!resolved.startsWith(ROOT)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("403 Forbidden\n");
        return;
      }

      fs.stat(resolved, (err, stats) => {
        if (err || !stats.isFile()) { send404(res, reqPath); return; }
        serveFile(res, resolved);
      });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error\n");
    }
  })();
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error(`Either stop that process, or run this server on a different port:`);
    console.error(`  PowerShell:  $env:PORT=8001; node scripts/serve-demo.js`);
    console.error(`  Git Bash:    PORT=8001 node scripts/serve-demo.js\n`);
  } else {
    console.error("\nServer failed to start:", err.message, "\n");
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log("");
  console.log("Lina's — local CLIENT WORKING-MODEL DEMO server running.");
  console.log("");
  console.log(`  Meeting demo hub:             http://localhost:${PORT}/demo`);
  console.log(`  Prototype V1 (Direction C):   http://localhost:${PORT}`);
  console.log(`  Prototype V2 (Direction D):   http://localhost:${PORT}/v2`);
  console.log(`  Local demo database file:     data/lina-demo.db`);
  console.log("");
  console.log("  This window must stay open during the demo.");
  console.log("  Press Ctrl+C in this window to stop the server.");
  console.log("");
});

function shutdown() {
  console.log("\nStopping Lina's demo server...");
  server.close(() => {
    console.log("Stopped. You can close this window now.\n");
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
