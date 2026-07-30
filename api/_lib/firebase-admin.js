"use strict";

// Lazily-initialised Firebase Admin SDK singleton for server-side use only.
// Credentials come from Vercel environment variables (or a local .env.local
// for testing) — never from a committed file, never sent to the browser.
// See .env.example for the required variable names.

const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.apps[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || "lina-s";

  // Local/test-only path: when FIRESTORE_EMULATOR_HOST (and/or
  // FIREBASE_AUTH_EMULATOR_HOST) is set, the Admin SDK talks to the local
  // emulator, which does not check credentials — a projectId is enough.
  // This env var is never set in the deployed Vercel environment, so
  // production always requires the real service-account credential below.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return admin.initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_PROJECT_ID, " +
      "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see .env.example)."
    );
  }

  // Handles both forms: a single-line value with literal "\n" escape
  // sequences (how Vercel/most .env tooling store it), or a value that
  // already contains real newlines (a PEM key pasted as-is). The regex is
  // a no-op on real newlines, so applying it unconditionally is safe.
  const normalizedKey = privateKey.trim().replace(/\\n/g, "\n");
  if (!normalizedKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY does not look like a valid PEM private key " +
      "(missing 'BEGIN PRIVATE KEY'). Check it was copied in full from the " +
      "service-account JSON's \"private_key\" field."
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: normalizedKey
    })
  });
}

function getFirestore() {
  getAdminApp();
  return admin.firestore();
}

function getAuth() {
  getAdminApp();
  return admin.auth();
}

module.exports = { admin, getAdminApp, getFirestore, getAuth };
