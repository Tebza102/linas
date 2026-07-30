#!/usr/bin/env node
"use strict";
// TEST-ONLY fixture: creates a known-password owner account directly in the
// Auth/Firestore EMULATORS for automated end-to-end testing. Never touches
// real Firebase (requires FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST
// to be set — refuses to run otherwise, as a safety check).
const { getAuth, getFirestore, admin } = require("../api/_lib/firebase-admin");

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error("Refusing to run: emulator env vars are not set. This must never touch real Firebase.");
    process.exit(1);
  }
  const auth = getAuth();
  const db = getFirestore();

  const email = "e2e-owner@example.test";
  const password = "TestPassword123!";

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    user = await auth.createUser({ email, password, displayName: "E2E Test Owner", emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { role: "owner" });
  await db.collection("adminUsers").doc(user.uid).set({
    uid: user.uid, displayName: "E2E Test Owner", email, role: "owner",
    active: true, createdAt: admin.firestore.FieldValue.serverTimestamp(), lastLoginAt: null
  });
  console.log(`Seeded test owner: ${email} / ${password} (uid: ${user.uid})`);
}

main().catch((err) => { console.error(err); process.exit(1); });
