"use strict";

// POST /api/enquiries/retry-notification — owner-only. Re-attempts the
// operational notification email for one enquiry whose notificationStatus
// is "failed" (or "pending"). Requires a real Firebase ID token in the
// Authorization header; the caller's role is read from THEIR OWN verified
// custom claim, never from anything the client sends in the request body.

const { getFirestore, getAuth, admin } = require("../_lib/firebase-admin");
const { sendNotificationEmail } = require("../_lib/send-notification-email");

async function requireOwner(req) {
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
  if (decoded.role !== "owner") {
    const err = new Error("Only an owner/admin can retry a notification.");
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

  let db;
  try {
    db = getFirestore();
  } catch (err) {
    console.error("Firebase Admin init failed:", err.message);
    res.status(503).json({ ok: false, error: "The service is temporarily unavailable. Please try again shortly." });
    return;
  }

  try {
    await requireOwner(req);

    const enquiryId = req.body && req.body.enquiryId;
    if (!enquiryId || typeof enquiryId !== "string") {
      res.status(400).json({ ok: false, error: "enquiryId is required." });
      return;
    }

    const enquiryRef = db.collection("enquiries").doc(enquiryId);
    const snap = await enquiryRef.get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: "Enquiry not found." });
      return;
    }
    const enquiry = snap.data();

    const adminLink = `https://${req.headers.host}/admin/inbox.html?enquiry=${enquiryId}`;
    const outcome = await sendNotificationEmail(enquiry, enquiry.referenceNumber, adminLink);

    await enquiryRef.update({
      notificationStatus: outcome.status,
      notificationSentAt: outcome.status === "sent" ? admin.firestore.FieldValue.serverTimestamp() : null,
      notificationProviderId: outcome.providerId || null,
      notificationLastError: outcome.error || null,
      notificationAttempts: admin.firestore.FieldValue.increment(1)
    });

    res.status(200).json({ ok: true, notificationStatus: outcome.status });
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Retry notification failed:", err);
    res.status(500).json({ ok: false, error: "Could not retry the notification. Please try again." });
  }
};
