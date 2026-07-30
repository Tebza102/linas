"use strict";

// Sends Lina's two operational emails via Resend, server-side only —
// RESEND_API_KEY never reaches browser code:
//   1. an internal "new enquiry" alert to the business (owner notification)
//   2. a receipt confirmation to the customer (customer confirmation)
// Both are independent: a failure in one must never affect the other, and
// neither failure ever affects the already-stored enquiry (see
// api/enquiries/create.js — this module is always called AFTER Firestore
// storage succeeds).

const { Resend } = require("resend");

let resendClient = null;
function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function enquiryRows(enquiry, referenceNumber) {
  const receivedAt = new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  return [
    ["Reference", referenceNumber],
    ["Customer name", enquiry.customerName],
    ["Phone", enquiry.phone],
    ["Email", enquiry.email || "—"],
    ["Enquiry type", enquiry.enquiryType],
    ["Event date", enquiry.eventDate || "Not supplied"],
    ["Guest count", enquiry.guestCount != null ? enquiry.guestCount : "Not supplied"],
    ["Received", receivedAt]
  ];
}

function wrapHtml(bodyHtml) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">${bodyHtml}</div>`;
}

function buildOwnerNotificationContent(enquiry, referenceNumber, adminLink) {
  const rows = enquiryRows(enquiry, referenceNumber);
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #eee;">${esc(k)}</td><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #eee;">${esc(v)}</td></tr>`
  ).join("");
  const messageHtml = enquiry.message ? `<p style="margin:16px 0 0;font-size:14px;white-space:pre-line;">${esc(enquiry.message)}</p>` : "";

  const html = wrapHtml(`
    <h1 style="font-size:18px;margin:0 0 4px;">New enquiry — ${esc(referenceNumber)}</h1>
    <p style="color:#666;font-size:13px;margin:0 0 20px;">A new enquiry was submitted on Lina's website.</p>
    <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    ${messageHtml ? `<p style="color:#666;font-size:13px;margin:16px 0 0;">Customer message:</p>${messageHtml}` : ""}
    <p style="margin:24px 0 0;">
      <a href="${esc(adminLink)}" style="display:inline-block;background:#A43129;color:#fff;text-decoration:none;padding:10px 20px;border-radius:2px;font-size:14px;">Open in admin inbox</a>
    </p>
  `);
  const text = [
    `New enquiry — ${referenceNumber}`, "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    enquiry.message ? `\nMessage:\n${enquiry.message}` : "",
    `\nOpen in admin inbox: ${adminLink}`
  ].filter(Boolean).join("\n");

  return { subject: `New enquiry: ${enquiry.customerName} (${referenceNumber})`, html, text };
}

function buildCustomerConfirmationContent(enquiry, referenceNumber) {
  const receivedAt = new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  const summaryParts = [
    enquiry.enquiryType,
    enquiry.eventDate ? `on ${enquiry.eventDate}` : null,
    enquiry.guestCount != null ? `for ${enquiry.guestCount} guests` : null
  ].filter(Boolean).join(" ");

  // Placeholder response-time commitment — see Client Inputs Register I-015.
  // Not yet confirmed by Tebogo; update here once it is.
  const responseTimeNote = "within 1–2 business days";

  const html = wrapHtml(`
    <h1 style="font-size:18px;margin:0 0 4px;">We've received your enquiry</h1>
    <p style="font-size:14px;color:#333;margin:0 0 16px;">Reference: <strong>${esc(referenceNumber)}</strong></p>
    <p style="font-size:14px;">Thank you, ${esc(enquiry.customerName)} — here's a summary of what you submitted${summaryParts ? ": " + esc(summaryParts) : "."}</p>
    <p style="font-size:13px;color:#666;">Received: ${esc(receivedAt)}</p>
    <p style="font-size:14px;font-weight:600;margin:20px 0;padding:12px;background:#f6f6f6;border-left:3px solid #A43129;">
      This reference confirms receipt of your enquiry. It is not an order or booking confirmation.
    </p>
    <p style="font-size:14px;">Lina reviews every enquiry personally and typically responds ${esc(responseTimeNote)} with a quote or follow-up questions.</p>
    <p style="font-size:13px;color:#666;">If you need to reach us in the meantime, see the contact details on Lina's website.</p>
  `);
  const text = [
    "We've received your enquiry",
    `Reference: ${referenceNumber}`, "",
    `Thank you, ${enquiry.customerName} — here's a summary of what you submitted${summaryParts ? ": " + summaryParts : "."}`,
    `Received: ${receivedAt}`, "",
    "This reference confirms receipt of your enquiry. It is not an order or booking confirmation.", "",
    `Lina reviews every enquiry personally and typically responds ${responseTimeNote} with a quote or follow-up questions.`
  ].join("\n");

  return { subject: `We've received your enquiry (${referenceNumber})`, html, text };
}

/**
 * Sends one email via Resend. Never throws — always resolves with
 * { status: "accepted", providerId } or { status: "failed", error }, so
 * callers never need their own try/catch around the network call. "accepted"
 * (not "sent") is deliberate: this is only Resend's acceptance of the API
 * call, not proof of inbox delivery — see Part 3 of the notification
 * workflow rework. Delivery/bounce/etc. arrive later via the webhook
 * (api/webhooks/resend.js).
 */
async function sendEmail(to, from, content) {
  if (!to || !from) {
    return { status: "failed", error: "Notification email is not configured (missing recipient/sender)." };
  }
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({ from, to, subject: content.subject, html: content.html, text: content.text });
    if (result.error) {
      return { status: "failed", error: String(result.error.message || result.error).slice(0, 300) };
    }
    return { status: "accepted", providerId: result.data && result.data.id ? result.data.id : null };
  } catch (err) {
    return { status: "failed", error: String(err && err.message ? err.message : err).slice(0, 300) };
  }
}

function sendOwnerNotification(enquiry, referenceNumber, adminLink) {
  const to = process.env.ENQUIRY_NOTIFICATION_TO;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  return sendEmail(to, from, buildOwnerNotificationContent(enquiry, referenceNumber, adminLink));
}

function sendCustomerConfirmation(enquiry, referenceNumber) {
  const from = process.env.ENQUIRY_FROM_EMAIL;
  return sendEmail(enquiry.email, from, buildCustomerConfirmationContent(enquiry, referenceNumber));
}

module.exports = {
  sendOwnerNotification,
  sendCustomerConfirmation,
  buildOwnerNotificationContent,
  buildCustomerConfirmationContent
};
