"use strict";

// POST /api/enquiries/create — the ONLY path that creates an enquiry
// document. The public form calls this instead of writing to Firestore
// directly (see firestore.rules for why: rate-limiting, a honeypot check,
// and duplicate detection all need a trusted server in front of the
// database, which client-side Security Rules alone cannot provide).

const { getFirestore, admin } = require("../_lib/firebase-admin");
const { validateEnquirySubmission, ValidationError } = require("../_lib/validate-enquiry");
const { sendOwnerNotification, sendCustomerConfirmation } = require("../_lib/send-notification-email");

const RATE_LIMIT_MAX_PER_MINUTE = 5;
// Fallback dedup window for rapid identical payloads (e.g. a double-click on
// an older cached page without a submissionId). Deliberately short and
// deliberately requires several fields to match — NOT just the phone number
// — so a genuinely new enquiry from a repeat customer is never suppressed.
// See Part 2 of the notification-workflow rework: the previous rule
// (any two enquiries sharing a phone within 5 minutes) was too broad.
const FALLBACK_DUPLICATE_WINDOW_MS = 30 * 1000;

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

/**
 * Primary idempotency check: an exact client-generated submissionId match.
 * This is the strong signal — a genuine duplicate click/resubmit of the
 * SAME form-fill will always carry the same submissionId (generated once
 * per form load), regardless of how much time has passed.
 */
async function findBySubmissionId(db, submissionId) {
  if (!submissionId) return null;
  const snap = await db.collection("enquiries").where("submissionId", "==", submissionId).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

/**
 * Secondary, narrower fallback for clients that didn't send a submissionId
 * (an older cached page) or a network-level retry that regenerated one:
 * only treated as a duplicate if customerName, phone, enquiryType, eventDate
 * AND message all match another enquiry from within the last 30 seconds.
 * This deliberately does NOT match on phone alone, so a repeat customer
 * enquiring again — even minutes later — always gets a new record.
 */
async function findRecentIdenticalPayload(db, fields) {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - FALLBACK_DUPLICATE_WINDOW_MS);
  const snap = await db.collection("enquiries")
    .where("phone", "==", fields.phone)
    .where("createdAt", ">=", cutoff)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  const match = snap.docs.find((d) => {
    const e = d.data();
    return e.customerName === fields.customerName
      && e.enquiryType === fields.enquiryType
      && (e.eventDate || null) === (fields.eventDate || null)
      && (e.message || null) === (fields.message || null);
  });
  return match || null;
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

    const bySubmissionId = await findBySubmissionId(db, fields.submissionId);
    const existing = bySubmissionId || await findRecentIdenticalPayload(db, fields);
    if (existing) {
      const reason = bySubmissionId ? "submissionId" : "rapid-identical-payload";
      // Safe to log: reference number and a reason code, never full PII.
      console.log("Duplicate submission detected", { referenceNumber: existing.data().referenceNumber, reason });
      res.status(200).json({
        ok: true,
        enquiry: { id: existing.id, referenceNumber: existing.data().referenceNumber },
        duplicateDetected: true
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
        viewedAt: null,
        popiaConsentTimestamp: now,
        privacyNoticeVersion: process.env.PRIVACY_NOTICE_VERSION || "v1-draft",
        // Owner (internal) notification and customer confirmation are
        // tracked entirely independently — one failing must never affect
        // the other, and neither ever affects the stored enquiry itself.
        ownerNotificationStatus: "pending",
        ownerNotificationProviderId: null,
        ownerNotificationLastError: null,
        ownerNotificationAttempts: 0,
        ownerNotificationAcceptedAt: null,
        ownerNotificationDeliveredAt: null,
        ownerNotificationDelayedAt: null,
        ownerNotificationFailedAt: null,
        ownerNotificationLastEventAt: null,
        customerConfirmationStatus: "pending",
        customerConfirmationProviderId: null,
        customerConfirmationLastError: null,
        customerConfirmationAttempts: 0,
        customerConfirmationAcceptedAt: null,
        customerConfirmationDeliveredAt: null,
        customerConfirmationDelayedAt: null,
        customerConfirmationFailedAt: null,
        customerConfirmationLastEventAt: null,
        createdAt: now,
        updatedAt: now
      });
      return ref;
    });

    // The enquiry is now safely stored — everything below is best-effort.
    // Neither notification's failure can turn this into an error response
    // or roll back the stored enquiry; the customer already has a valid
    // reference. Both sends run in parallel so a customer waiting on this
    // response only pays for one round trip's worth of latency, not two.
    const adminLink = `https://${req.headers.host}/admin/inbox.html?enquiry=${enquiryRef.id}`;
    // Test-only failure injection: lets us verify the "email failed but
    // enquiry still stored" path deterministically, without touching or
    // exposing the real Resend API key and without depending on sandbox
    // recipient restrictions (which fail asynchronously, not the way our
    // code needs to observe a failure). Never available in Production,
    // and requires an explicit, non-default header no real customer
    // request would ever send — mirrors the existing ?emulator=1 pattern.
    const forceNotificationFailure =
      process.env.VERCEL_ENV !== "production" &&
      req.headers["x-lina-test-force-notification-failure"] === "1";
    const simulatedFailure = { status: "failed", error: "Simulated failure for controlled testing." };

    const [ownerOutcome, customerOutcome] = await Promise.all([
      forceNotificationFailure ? Promise.resolve(simulatedFailure) : sendOwnerNotification(fields, referenceNumber, adminLink),
      forceNotificationFailure ? Promise.resolve(simulatedFailure) : sendCustomerConfirmation(fields, referenceNumber)
    ]);

    const now = admin.firestore.FieldValue.serverTimestamp();
    await enquiryRef.update({
      ownerNotificationStatus: ownerOutcome.status,
      ownerNotificationProviderId: ownerOutcome.providerId || null,
      ownerNotificationLastError: ownerOutcome.error || null,
      ownerNotificationAttempts: admin.firestore.FieldValue.increment(1),
      ownerNotificationAcceptedAt: ownerOutcome.status === "accepted" ? now : null,
      ownerNotificationFailedAt: ownerOutcome.status === "failed" ? now : null,
      ownerNotificationLastEventAt: now,
      customerConfirmationStatus: customerOutcome.status,
      customerConfirmationProviderId: customerOutcome.providerId || null,
      customerConfirmationLastError: customerOutcome.error || null,
      customerConfirmationAttempts: admin.firestore.FieldValue.increment(1),
      customerConfirmationAcceptedAt: customerOutcome.status === "accepted" ? now : null,
      customerConfirmationFailedAt: customerOutcome.status === "failed" ? now : null,
      customerConfirmationLastEventAt: now
    }).catch((err) => {
      // Even recording the outcome is best-effort — the enquiry itself is
      // already safely stored regardless of what happens here.
      console.error("Failed to record notification outcome:", err.message);
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
