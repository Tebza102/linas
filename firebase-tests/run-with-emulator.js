#!/usr/bin/env node
"use strict";

// Starts the Firestore emulator, waits for it to be ready, runs the rules
// tests, then shuts the emulator down — a single command for CI/local use
// instead of two terminals.

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");

// On Windows, spawning via a shell (needed for the "firebase" .cmd shim)
// means the returned pid is the CMD.EXE wrapper's pid, not the actual
// firebase-tools/Java process tree it launches. child.kill() only ever
// killed that wrapper, leaving the real emulator (and its Firestore data)
// running in the background — which is exactly why a supposedly-fresh
// "npm run test:rules:auto" could still see documents left over from a
// previous run. taskkill /T kills the whole tree, not just the wrapper.
function killProcessTree(pid) {
  if (process.platform === "win32") {
    try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" }); } catch (err) { /* already gone */ }
  } else {
    try { process.kill(-pid, "SIGKILL"); } catch (err) { /* already gone */ }
  }
}

// Defensive pre-flight: if an earlier run's emulator was somehow still
// alive on this port (e.g. a previous invocation was interrupted before
// its own cleanup ran), clear it before starting a fresh one, so this run
// never silently inherits stale Firestore data.
function killWhateverIsOnPort(port) {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`).toString();
    const pids = [...new Set(out.split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))];
    pids.forEach((pid) => killProcessTree(pid));
  } catch (err) { /* nothing listening on that port — nothing to do */ }
}

function waitForEmulator(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function poll() {
      http.get({ host: "127.0.0.1", port, path: "/", timeout: 1000 }, (res) => {
        res.resume();
        resolve();
      }).on("error", () => {
        if (Date.now() > deadline) reject(new Error("Emulator did not become ready in time"));
        else setTimeout(poll, 500);
      });
    })();
  });
}

async function main() {
  killWhateverIsOnPort(8090);

  const emulator = spawn(
    "firebase",
    ["emulators:start", "--only", "firestore", "--project", "lina-s-rules-test"],
    { cwd: path.resolve(__dirname, ".."), stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }
  );

  let emulatorOutput = "";
  emulator.stdout.on("data", (d) => { emulatorOutput += d.toString(); });
  emulator.stderr.on("data", (d) => { emulatorOutput += d.toString(); });

  try {
    await waitForEmulator(8090, 30000);

    const test = spawn(process.execPath, ["--test", path.join(__dirname, "firestore.rules.test.js")], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit"
    });
    const exitCode = await new Promise((resolve) => test.on("close", resolve));
    process.exitCode = exitCode;
  } catch (err) {
    console.error("Emulator did not start in time. Emulator output:\n" + emulatorOutput);
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    killProcessTree(emulator.pid);
  }
}

main();
