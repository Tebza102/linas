/*
 * Lina's — LOCAL TEST-ONLY server. Not deployed (excluded from Vercel via
 * .vercelignore/scripts exclusion). Serves the exact same static files as
 * the Vercel deployment, with the SAME routing rules, and wires up the
 * real api/enquiries/create.js handler against the Firestore/Auth
 * emulators (via FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST),
 * so end-to-end testing exercises the actual shipped code, not a mock.
 *
 * Usage: set the emulator env vars, then run this file. See
 * package.json's "test:e2e:server" script.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5050;
const ROOT = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".ico": "image/x-icon"
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stream = fs.createReadStream(filePath);
  stream.on("open", () => { res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" }); stream.pipe(res); });
  stream.on("error", () => { res.writeHead(404); res.end("404 Not Found\n"); });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ""; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > 1e6) { reject(new Error("Body too large")); req.destroy(); } raw += c; });
    req.on("end", () => { if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

// Minimal shim so api/*.js handlers (written for the Vercel Node runtime)
// work unmodified: they expect req.body pre-parsed and res.status().json().
function vercelizeResponse(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    const body = JSON.stringify(obj);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(body);
  };
  return res;
}

const routes = {
  "/api/enquiries/create": require("../api/enquiries/create"),
  "/api/enquiries/retry-notification": require("../api/enquiries/retry-notification"),
  "/api/webhooks/resend": require("../api/webhooks/resend")
};

const server = http.createServer((req, res) => {
  (async () => {
    try {
      const reqPath = decodeURIComponent(req.url.split("?")[0]);

      if (routes[reqPath]) {
        // The Resend webhook verifies a signature over the raw request
        // body — it must read the stream itself, unparsed, the same way
        // Vercel's real runtime leaves it (module.exports.config.api.bodyParser
        // = false in api/webhooks/resend.js).
        if (reqPath !== "/api/webhooks/resend") {
          req.body = req.method === "POST" ? await readJsonBody(req) : {};
        }
        vercelizeResponse(res);
        await routes[reqPath](req, res);
        return;
      }

      if (reqPath === "/" || reqPath === "/v2") {
        res.writeHead(307, { Location: "/assets/mockups/working/prototype-v2/index.html" });
        res.end();
        return;
      }
      if (reqPath === "/admin") {
        res.writeHead(307, { Location: "/admin/login.html" });
        res.end();
        return;
      }

      const resolved = path.normalize(path.join(ROOT, reqPath));
      if (!resolved.startsWith(ROOT)) { res.writeHead(403); res.end("403\n"); return; }
      fs.stat(resolved, (err, stats) => {
        if (err || !stats.isFile()) { res.writeHead(404); res.end("404 Not Found\n"); return; }
        serveFile(res, resolved);
      });
    } catch (err) {
      console.error(err);
      res.writeHead(500); res.end("500\n");
    }
  })();
});

server.listen(PORT, () => {
  console.log(`Local TEST server (emulator-backed) running at http://localhost:${PORT}`);
  console.log(`  Public site:  http://localhost:${PORT}/`);
  console.log(`  Admin (emulator mode): http://localhost:${PORT}/admin/login.html?emulator=1`);
});

process.on("SIGINT", () => { server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
