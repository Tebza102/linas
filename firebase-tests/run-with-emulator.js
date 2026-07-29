#!/usr/bin/env node
"use strict";

// Starts the Firestore emulator, waits for it to be ready, runs the rules
// tests, then shuts the emulator down — a single command for CI/local use
// instead of two terminals.

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

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
    emulator.kill();
  }
}

main();
