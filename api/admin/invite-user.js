"use strict";

// POST /api/admin/invite-user — owner/developer only. Creates (or finds) a
// Firebase Auth user, sets their role custom claim, writes the matching
// adminUsers/{uid} document, and returns a password-SET link for the caller
// to share themselves. Mirrors scripts/firebase-admin-bootstrap.js exactly,
// exposed through an authenticated endpoint instead of a local CLI script
// so the Users module can drive it — but it never emails anyone itself:
// no invitation is sent until a human deliberately shares the returned link.

const { getFirestore, getAuth, admin } = require("../_lib/firebase-admin");

const VALID_ROLES = ["owner", "developer", "observer", "staff"];

async function requireOwnerOrDev(req) {
  const authHeader = req.headers.authorization || "";
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) {
    const err = new Error("Missing Authorization header.");
    err.statusCode = 401;
    throw err;
  }
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(match[1]);
  } catch (err) {
    const e = new Error("Invalid or expired session. Please sign in again.");
    e.statusCode = 401;
    throw e;
  }
  if (decoded.role !== "owner" && decoded.role !== "developer") {
    const err = new Error("Only an owner or developer can manage users.");
    err.statusCode = 403;
    throw err;
  }
  return decoded;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let db, auth;
  try {
    db = getFirestore();
    auth = getAuth();
  } catch (err) {
    console.error("Firebase Admin init failed:", err.message);
    res.status(503).json({ ok: false, error: "The service is temporarily unavailable. Please try again shortly." });
    return;
  }

  try {
    const caller = await requireOwnerOrDev(req);

    const email = req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const displayName = req.body && typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";
    const role = req.body && req.body.role;
    const relationship = req.body && typeof req.body.relationship === "string" ? req.body.relationship.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, error: "A valid email is required." });
      return;
    }
    if (!displayName) {
      res.status(400).json({ ok: false, error: "A display name is required." });
      return;
    }
    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ ok: false, error: `role must be one of: ${VALID_ROLES.join(", ")}.` });
      return;
    }

    let userRecord;
    let wasExisting = true;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code !== "auth/user-not-found") throw err;
      wasExisting = false;
      userRecord = await auth.createUser({ email, displayName, emailVerified: false });
    }

    await auth.setCustomUserClaims(userRecord.uid, { role });

    await db.collection("adminUsers").doc(userRecord.uid).set({
      uid: userRecord.uid,
      displayName,
      email,
      role,
      relationship: relationship || null,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: null,
      invitedBy: caller.uid
    }, { merge: true });

    const passwordSetLink = await auth.generatePasswordResetLink(email);

    res.status(200).json({
      ok: true,
      uid: userRecord.uid,
      wasExisting,
      passwordSetLink
    });
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Invite user failed:", err);
    res.status(500).json({ ok: false, error: "Could not create or update this user. Please try again." });
  }
};
