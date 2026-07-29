#!/usr/bin/env node
"use strict";

/*
 * Lina's — controlled admin-user bootstrap script.
 *
 * This is the ONLY way admin/staff accounts get created or promoted — there
 * is no public sign-up page, and Firestore rules refuse to let a client
 * write its own adminUsers document or role. This script uses the Firebase
 * Admin SDK (server-side only, credentials from a local .env.local or
 * GOOGLE env vars — see .env.example) to:
 *   1. Create (or find) a Firebase Auth user for the given email.
 *   2. Set a custom claim { role: "owner" | "staff" } on that user.
 *   3. Create/update the matching adminUsers/{uid} Firestore document.
 *
 * It NEVER runs automatically and NEVER invents a password on someone
 * else's behalf — it sends a real Firebase password-reset/set-password
 * link to the given email, so only that person ever knows their password.
 *
 * Usage (requires explicit --confirm; refuses to run without it):
 *   node scripts/firebase-admin-bootstrap.js --email tebogo@example.com --role owner --name "Tebogo" --confirm
 */

loadLocalEnv();
const { getAuth, getFirestore, admin } = require("../api/_lib/firebase-admin");

// Minimal .env.local loader (no dotenv dependency needed for one script).
function loadLocalEnv() {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = { confirm: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") out.confirm = true;
    else if (a === "--email") out.email = argv[++i];
    else if (a === "--role") out.role = argv[++i];
    else if (a === "--name") out.name = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.confirm) {
    console.error(
      "Refusing to run without --confirm. This creates/promotes a real " +
      "admin login. Re-run with --confirm once you're sure.\n\n" +
      "Usage: node scripts/firebase-admin-bootstrap.js --email <email> --role <owner|staff> --name \"<Display Name>\" --confirm"
    );
    process.exit(1);
  }
  if (!args.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
    console.error("A valid --email is required.");
    process.exit(1);
  }
  if (!["owner", "staff"].includes(args.role)) {
    console.error('--role must be exactly "owner" or "staff".');
    process.exit(1);
  }
  if (!args.name || !args.name.trim()) {
    console.error("--name is required (used as the admin's display name).");
    process.exit(1);
  }

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(args.email);
    console.log(`Found existing Firebase Auth user: ${userRecord.uid}`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    userRecord = await auth.createUser({
      email: args.email,
      displayName: args.name,
      emailVerified: false
    });
    console.log(`Created new Firebase Auth user: ${userRecord.uid}`);
  }

  await auth.setCustomUserClaims(userRecord.uid, { role: args.role });
  console.log(`Set custom claim role="${args.role}" on ${userRecord.uid}`);

  await db.collection("adminUsers").doc(userRecord.uid).set({
    uid: userRecord.uid,
    displayName: args.name,
    email: args.email,
    role: args.role,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: null
  }, { merge: true });
  console.log(`Wrote adminUsers/${userRecord.uid} (role: ${args.role}, active: true)`);

  const resetLink = await auth.generatePasswordResetLink(args.email);
  console.log(
    "\nDone. This person does not have a password yet — send them this " +
    "password-SET link (valid for a limited time, generated just now):\n\n" +
    `  ${resetLink}\n\n` +
    "They should open it, set their own password, then sign in at /admin."
  );
}

main().catch((err) => {
  console.error("Bootstrap failed:", err.message);
  process.exit(1);
});
