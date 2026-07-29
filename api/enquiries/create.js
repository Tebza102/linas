"use strict";

// POST /api/enquiries/create — the ONLY path that creates an enquiry
// document. The public form calls this instead of writing to Firestore
// directly (see firestore.rules for why: rate-limiting, a honeypot check,
// and duplicate detection all need a trusted server in front of the
// database, which client-side Security Rules alone cannot provide).

const { getFirestore, admin } = require("../_lib/firebase-admin");
const { validateEnquirySubmission, ValidationError } = require("../_lib/validate-enquiry");

const RATE_LIMIT_MAX_PER_MINUTE = 5;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

async function checkRateLimit(db, ip) {
  const ref = db.collection("rateLimits").doc(Buffer.from(ip).toString("hex").slice(0, 64));
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    const data = snap.data();
    if (now - data.windowStart > 60 * 1000) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= RATE_LIMIT_MAX_PER_MINUTE) {
      throw new ValidationErrorRateLimited();
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) });
  });
}

class ValidationErrorRateLimited extends Error {
  constructor() {
    super("Too many submissions. Please try again in a minute.");
    this.statusCode = 429;
  }
}

async function findRecentDuplicate(db, phone) {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - DUPLICATE_WINDOW_MS);
  const snap = await db.collection("enquiries")
    .where("phone", "==", phone)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

async function generateReferenceNumber(db, tx) {
  const today = new Date();
  const datePart =
    today.getUTCFullYear().toString() +
    String(today.getUTCMonth() + 1).padStart(2, "0") +
    String(today.getUTCDate()).padStart(2, "0");
  const counterRef = db.collection("counters").doc(datePart);
  const counterSnap = await tx.get(counterRef);
  const next = counterSnap.exists ? (counterSnap.data().count || 0) + 1 : 1;
  tx.set(counterRef, { count: next }, { merge: true });
  return `LINA-${datePart}-${String(next).padStart(4, "0")}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let db;
  try {
    db = getFirestore();
  } catch (err) {
    // Server misconfiguration (missing env vars) — never surface internals
    // to the customer, but log server-side for diagnosis.
    console.error("Firebase Admin init failed:", err.message);
    res.status(503).json({ ok: false, error: "The enquiry service is temporarily unavailable. Please try again shortly, or contact us directly." });
    return;
  }

  try {
    const ip = getClientIp(req);
    await checkRateLimit(db, ip);

    const fields = validateEnquirySubmission(req.body);

    const existing = await findRecentDuplicate(db, fields.phone);
    if (existing) {
      // Idempotent behaviour: a genuine duplicate click/resubmit within the
      // window returns the SAME reference rather than creating a second
      // record, without pretending the click did nothing.
      res.status(200).json({
        ok: true,
        enquiry: { id: existing.id, referenceNumber: existing.data().referenceNumber },
        duplicate: true
      });
      return;
    }

    const enquiryRef = db.collection("enquiries").doc();
    const referenceNumber = await db.runTransaction(async (tx) => {
      const ref = await generateReferenceNumber(db, tx);
      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(enquiryRef, {
        ...fields,
        referenceNumber: ref,
        status: "New",
        assignedOwnerId: null,
        nextAction: null,
        followUpDate: null,
        quotedAmount: null,
        confirmedAmount: null,
        confirmedAt: null,
        lostReason: null,
        completedAt: null,
        popiaConsentTimestamp: now,
        privacyNoticeVersion: process.env.PRIVACY_NOTICE_VERSION || "v1-draft",
        createdAt: now,
        updatedAt: now
      });
      return ref;
    });

    res.status(201).json({
      ok: true,
      enquiry: { id: enquiryRef.id, referenceNumber }
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({ ok: false, error: err.message, field: err.field || null });
      return;
    }
    if (err instanceof ValidationErrorRateLimited) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Enquiry creation failed:", err);
    res.status(500).json({ ok: false, error: "Something went wrong and the enquiry could not be stored. Please try again." });
  }
};
