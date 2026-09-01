"use strict";

/*
 * POST /api/orders/create — the ONLY path that creates an order document.
 *
 * The public cart calls this when the customer presses "Order via WhatsApp".
 * Nothing is created merely by adding to the cart: an un-checked-out cart
 * stays local browser state. This endpoint is the deliberate boundary between
 * browsing and a real, recorded order intent.
 *
 * The order is stored BEFORE the customer is offered the WhatsApp link, and
 * the response is the only thing the confirmation screen renders from — so
 * the customer can never be shown a success state for an order that was not
 * actually saved.
 *
 * An order created here is "Pending WhatsApp": a genuine intent record, NOT a
 * sale. Revenue is recognised only when Lina marks it Collected (see
 * admin/js/order-constants.js).
 */

const { getFirestore, admin } = require("../_lib/firebase-admin");
const { validateOrderSubmission, OrderValidationError } = require("../_lib/validate-order");
const { buildOrderWhatsAppMessage } = require("../_lib/order-message");
const { getClientIp, enforceRateLimit, RateLimitedError } = require("../_lib/rate-limit");

const RATE_LIMIT_MAX_PER_MINUTE = 5;
const DEFAULT_WHATSAPP_NUMBER = "27764834344";

// South Africa is UTC+2 with no DST.
//
// This deliberately does NOT reuse the enquiry endpoint's getUTC* date part.
// Between 00:00 and 02:00 SAST the UTC date is still yesterday, which would
// put a late-night order on the previous day's board and give it a
// yesterday-dated reference number. For a trading day that matters, so orders
// key off SAST throughout. Enquiries keep their UTC behaviour unchanged.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

function sastDateParts() {
  const d = new Date(Date.now() + SAST_OFFSET_MS);
  const iso = d.toISOString();
  return {
    orderDateKey: iso.slice(0, 10),           // 2026-07-31
    counterDatePart: iso.slice(0, 10).replace(/-/g, "") // 20260731
  };
}

/**
 * Sequential, duplicate-free order reference inside a transaction.
 *
 * Uses counter doc `ORD-<date>`, deliberately DISTINCT from the enquiry
 * endpoint's bare `<date>` doc. If the two ever shared a counter the
 * sequences would interleave and both would appear to skip numbers.
 */
async function generateOrderReference(db, tx, counterDatePart) {
  const counterRef = db.collection("counters").doc(`ORD-${counterDatePart}`);
  const snap = await tx.get(counterRef);
  const next = snap.exists ? (snap.data().count || 0) + 1 : 1;
  tx.set(counterRef, { count: next }, { merge: true });
  return { reference: `LINA-ORD-${counterDatePart}-${String(next).padStart(4, "0")}`, next };
}

function buildWhatsappUrl(message) {
  const number = process.env.LINA_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** The shape the confirmation screen renders from. Server figures only. */
function publicOrderPayload(id, reference, fields, whatsappMessage) {
  return {
    id,
    referenceNumber: reference,
    status: "Pending WhatsApp",
    items: fields.items,
    itemCount: fields.itemCount,
    subtotalCents: fields.subtotalCents,
    currency: fields.currency,
    whatsappMessage,
    whatsappUrl: buildWhatsappUrl(whatsappMessage)
  };
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
    res.status(503).json({
      ok: false,
      error: "Ordering is temporarily unavailable. Please try again shortly, or contact us on WhatsApp."
    });
    return;
  }

  try {
    // Own budget, separate from enquiries — see api/_lib/rate-limit.js.
    await enforceRateLimit(db, getClientIp(req), {
      prefix: "ord_",
      max: RATE_LIMIT_MAX_PER_MINUTE,
      message: "Too many orders in a short time. Please try again in a minute."
    });

    // Prices and totals are computed here from the server catalogue. Anything
    // money-shaped in req.body is ignored.
    const fields = validateOrderSubmission(req.body);

    // Idempotency: a retried POST (double tap, flaky connection) must return
    // the original order, not create a second one.
    const existing = await db.collection("orders")
      .where("submissionId", "==", fields.submissionId).limit(1).get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      console.log("Duplicate order submission detected", { referenceNumber: data.referenceNumber });
      res.status(200).json({
        ok: true,
        duplicateDetected: true,
        order: publicOrderPayload(doc.id, data.referenceNumber, {
          items: data.items,
          itemCount: data.itemCount,
          subtotalCents: data.subtotalCents,
          currency: data.currency
        }, data.whatsappMessage)
      });
      return;
    }

    const { orderDateKey, counterDatePart } = sastDateParts();
    const orderRef = db.collection("orders").doc();
    const activityRef = db.collection("orderActivities").doc();

    const result = await db.runTransaction(async (tx) => {
      const { reference } = await generateOrderReference(db, tx, counterDatePart);
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Built inside the transaction because it needs the reference. Pure, so
      // a transaction retry simply rebuilds it identically.
      const whatsappMessage = buildOrderWhatsAppMessage({
        referenceNumber: reference,
        items: fields.items,
        subtotalCents: fields.subtotalCents,
        customerName: fields.customerName,
        customerNote: fields.customerNote
      });

      tx.set(orderRef, {
        referenceNumber: reference,
        channel: "web-cart",
        source: "Website",
        createdVia: "public-api",
        fulfilmentType: "Collection",
        collectionPoint: "Unique Builders parking lot, just before Oasis Center, 1 Chris Street, Heidelberg, 1441",

        status: "Pending WhatsApp",
        statusReason: null,
        statusUpdatedAt: now,
        statusUpdatedBy: null,

        paymentStatus: "Pending",
        paymentMethod: null,
        paymentReference: null,
        paymentUpdatedAt: null,

        items: fields.items,
        lineCount: fields.lineCount,
        itemCount: fields.itemCount,
        subtotalCents: fields.subtotalCents,
        currency: fields.currency,
        catalogVersion: fields.catalogVersion,

        customerName: fields.customerName,
        customerPhone: fields.customerPhone,
        customerNote: fields.customerNote,
        // Consent is only meaningful when personal details were actually
        // supplied. Firestore rules keep this field out of the admin update
        // allowlist, so staff filling in details later can never flip it true.
        popiaConsent: fields.popiaConsent,
        popiaConsentTimestamp: fields.popiaConsent ? now : null,
        privacyNoticeVersion: fields.popiaConsent
          ? (process.env.PRIVACY_NOTICE_VERSION || "v1-draft") : null,

        whatsappMessage,

        receivedAt: null,
        confirmedAt: null,
        preparingAt: null,
        readyAt: null,
        collectedAt: null,
        cancelledAt: null,
        notCollectedAt: null,

        // Soft-deletion metadata (order-integrity change). Explicit null at
        // creation, matching the lifecycle-timestamp fields above — restore
        // clears these back to explicit null too, never removes them, so
        // "not deleted" has exactly one representation for every order
        // created from this point on (see firestore.rules).
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,

        internalNotes: null,
        isTestRecord: false,
        submissionId: fields.submissionId,
        orderDateKey,

        createdAt: now,
        updatedAt: now
      });

      // Written in the same transaction as the order: an order can never
      // exist without the creation entry in its audit trail.
      tx.set(activityRef, {
        orderId: orderRef.id,
        orderReference: reference,
        actionType: "created",
        previousValue: null,
        newValue: "Pending WhatsApp",
        reason: null,
        note: null,
        createdBy: "system",
        createdAt: now
      });

      return { reference, whatsappMessage };
    });

    res.status(201).json({
      ok: true,
      order: publicOrderPayload(orderRef.id, result.reference, fields, result.whatsappMessage)
    });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      res.status(err.statusCode).json({
        ok: false, error: err.message, field: err.field, code: err.code
      });
      return;
    }
    if (err instanceof RateLimitedError) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Order creation failed:", err);
    res.status(500).json({
      ok: false,
      error: "Something went wrong and your order was not saved. Nothing was sent — please try again."
    });
  }
};
