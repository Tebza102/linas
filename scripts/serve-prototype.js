/*
 * Lina's — local prototype server.
 *
 * Dependency-free static file server for reviewing the Direction C
 * client-review prototype in a browser. This is local review tooling only —
 * it is not a production server and must never be used for deployment.
 *
 * Usage:
 *   node scripts/serve-prototype.js
 *   PORT=9000 node scripts/serve-prototype.js   (optional override)
 *
 * Stop with Ctrl+C.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8000;

// The prototype's own HTML/CSS/JS reference shared media and brand assets
// via relative paths that climb out of its folder (e.g. "../media/...",
// "../../../source/brand/..."), by design — those files live in
// assets/mockups/working/media/ and assets/source/brand/, per the Asset
// Register's folder rules. Rooting this server at the prototype folder alone
// would 404 every one of those references, so the served root is the repo
// root; the prototype's index.html is what actually loads at "/".
const ROOT = path.resolve(__dirname, "..");
const PROTOTYPE_INDEX = "/assets/mockups/working/prototype/index.html";
const PROTOTYPE_V2_INDEX = "/assets/mockups/working/prototype-v2/index.html";

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
  ".mp3": "audio/mpeg",
  // .mpeg here is audio, not video: assets/mockups/working/media/
  // lina-track-3.mpeg is a genuine MP3 (verified via ffprobe) that
  // shipped with an unusual extension. Revisit this mapping if a real
  // .mpeg video file is ever added to the project.
  ".mpeg": "audio/mpeg",
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

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split("?")[0]);
    if (reqPath === "/") {
      // Send the browser to the prototype's real path so its own relative
      // asset references resolve correctly — see the ROOT comment above.
      res.writeHead(302, { Location: PROTOTYPE_INDEX });
      res.end();
      return;
    }
    if (reqPath === "/v2" || reqPath === "/v2/") {
      // Same reasoning as "/" above, pointed at the V2 (Direction D) review copy.
      res.writeHead(302, { Location: PROTOTYPE_V2_INDEX });
      res.end();
      return;
    }

    // Resolve against ROOT and refuse anything that escapes it
    // (blocks "../" traversal regardless of how it's encoded).
    const resolved = path.normalize(path.join(ROOT, reqPath));
    if (!resolved.startsWith(ROOT)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden\n");
      return;
    }

    fs.stat(resolved, (err, stats) => {
      if (err || !stats.isFile()) {
        send404(res, reqPath);
        return;
      }
      serveFile(res, resolved);
    });
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error\n");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error(`Something else is already listening on http://localhost:${PORT}`);
    console.error(`Either stop that process, or run this server on a different port:`);
    console.error(`  PowerShell:  $env:PORT=8001; node scripts/serve-prototype.js`);
    console.error(`  Git Bash:    PORT=8001 node scripts/serve-prototype.js\n`);
  } else {
    console.error("\nServer failed to start:", err.message, "\n");
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log("");
  console.log("Lina's — local prototype server running.");
  console.log("");
  console.log(`  Prototype V1 (Direction C):   http://localhost:${PORT}`);
  console.log(`  Prototype V2 (Direction D):   http://localhost:${PORT}/v2`);
  console.log("");
  console.log("  This window must stay open while you view the prototype.");
  console.log("  Press Ctrl+C in this window to stop the server.");
  console.log("");
});

function shutdown() {
  console.log("\nStopping Lina's prototype server...");
  server.close(() => {
    console.log("Stopped. You can close this window now.\n");
    process.exit(0);
  });
  // Force-exit if close() hangs (e.g. a stuck keep-alive connection).
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
