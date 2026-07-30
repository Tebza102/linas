"use strict";

// POST /api/webhooks/resend — receives delivery-status events from Resend
// (sent/delivered/delayed/bounced/failed/suppressed/complained) and updates
// the matching enquiry's owner/customer notification fields. This endpoint
// has no Firebase Auth in front of it — Resend can't send a Firebase ID
// token — so its ONLY protection is verifying Resend's webhook signature
// against RESEND_WEBHOOK_SECRET (server-only, never in browser code). Every
// write here goes through the Admin SDK, which bypasses firestore.rules —
// and those rules never grant any client (authenticated or not) write
// access to these fields, so a forged webhook is the only way they could
// ever be altered from outside this file.

const { Webhook } = require("svix");
const { getFirestore, admin } = require("../_lib/firebase-admin");

// Disables Vercel's automatic JSON body parsing so we can verify the
// signature against the exact raw bytes Resend sent — HMAC verification
// fails against a body that's been parsed and re-serialised, since
// key order/whitespace isn't guaranteed to round-trip identically.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error("Payload too large")); req.destroy(); return; }
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

// Maps a Resend event type to the status we display, and to which
// timestamp field records it. "sent" is Resend's own term for having
// handed the message to the receiving server — we surface it as
// "accepted" to match the rest of the status model (see Part 3).
const EVENT_MAP = {
  "email.sent": { status: "accepted", tsField: "AcceptedAt" },
  "email.delivered": { status: "delivered", tsField: "DeliveredAt" },
  "email.delivery_delayed": { status: "delayed", tsField: "DelayedAt" },
  "email.bounced": { status: "bounced", tsField: "FailedAt" },
  "email.failed": { status: "failed", tsField: "FailedAt" },
  "email.suppressed": { status: "suppressed", tsField: "FailedAt" },
  "email.complained": { status: "suppressed", tsField: "FailedAt" }
};

async function findEnquiryByProviderId(db, emailId) {
  const ownerSnap = await db.collection("enquiries").where("ownerNotificationProviderId", "==", emailId).limit(1).get();
  if (!ownerSnap.empty) return { doc: ownerSnap.docs[0], prefix: "ownerNotification" };
  const customerSnap = await db.collection("enquiries").where("customerConfirmationProviderId", "==", emailId).limit(1).get();
  if (!customerSnap.empty) return { doc: customerSnap.docs[0], prefix: "customerConfirmation" };
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured.");
    res.status(503).json({ ok: false, error: "Webhook not configured." });
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    res.status(400).json({ ok: false, error: "Could not read request body." });
    return;
  }

  let event;
  try {
    const wh = new Webhook(secret);
    // svix expects exactly these three headers, lower-cased by Node already.
    event = wh.verify(rawBody, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    });
  } catch (err) {
    // Never log the raw body or signature — just that verification failed.
    console.error("Resend webhook signature verification failed.");
    res.status(401).json({ ok: false, error: "Invalid signature." });
    return;
  }

  const mapping = EVENT_MAP[event.type];
  if (!mapping) {
    // Unrecognised/irrelevant event type — acknowledge so Resend doesn't
    // retry, but nothing to do.
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const emailId = event.data && event.data.email_id;
  if (!emailId) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  let db;
  try {
    db = getFirestore();
  } catch (err) {
    console.error("Firebase Admin init failed:", err.message);
    res.status(503).json({ ok: false, error: "Service temporarily unavailable." });
    return;
  }

  const found = await findEnquiryByProviderId(db, emailId);
  if (!found) {
    // Nothing to update (could be an email this system didn't send, or one
    // whose enquiry was later removed) — still acknowledge so Resend
    // doesn't keep retrying a webhook we can never satisfy.
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  // Idempotent by construction: replaying the same event just writes the
  // same status/timestamp fields again — no counters are incremented here
  // (unlike notificationAttempts, which only send attempts touch), so a
  // duplicate webhook delivery has no cumulative side effect.
  const update = {
    [`${found.prefix}Status`]: mapping.status,
    [`${found.prefix}${mapping.tsField}`]: now,
    [`${found.prefix}LastEventAt`]: now
  };
  // Store only a short, safe category — never the full event payload.
  if (mapping.status === "bounced" || mapping.status === "failed" || mapping.status === "suppressed") {
    const safeReason = event.data && event.data.bounce && event.data.bounce.type
      ? String(event.data.bounce.type).slice(0, 100)
      : mapping.status;
    update[`${found.prefix}LastError`] = safeReason;
  }

  await found.doc.ref.update(update).catch((err) => {
    console.error("Failed to apply webhook update:", err.message);
  });

  res.status(200).json({ ok: true });
};
