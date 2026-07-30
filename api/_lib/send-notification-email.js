"use strict";

// Sends the operational "new enquiry" notification email via Resend.
// Server-side only — RESEND_API_KEY never reaches browser code. Called
// AFTER the enquiry is already committed to Firestore (see
// api/enquiries/create.js): a failure here must never be treated as a
// reason to fail or roll back the enquiry itself.

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

function buildEmailContent(enquiry, referenceNumber, adminLink) {
  const receivedAt = new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });

  const rows = [
    ["Reference", referenceNumber],
    ["Customer name", enquiry.customerName],
    ["Phone", enquiry.phone],
    ["Email", enquiry.email || "—"],
    ["Enquiry type", enquiry.enquiryType],
    ["Event date", enquiry.eventDate || "Not supplied"],
    ["Guest count", enquiry.guestCount != null ? enquiry.guestCount : "Not supplied"],
    ["Received", receivedAt]
  ];

  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #eee;">${esc(k)}</td><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #eee;">${esc(v)}</td></tr>`
  ).join("");

  const messageHtml = enquiry.message
    ? `<p style="margin:16px 0 0;font-size:14px;white-space:pre-line;">${esc(enquiry.message)}</p>`
    : "";

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:18px;margin:0 0 4px;">New enquiry — ${esc(referenceNumber)}</h1>
      <p style="color:#666;font-size:13px;margin:0 0 20px;">A new enquiry was submitted on Lina's website.</p>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      ${messageHtml ? `<p style="color:#666;font-size:13px;margin:16px 0 0;">Customer message:</p>${messageHtml}` : ""}
      <p style="margin:24px 0 0;">
        <a href="${esc(adminLink)}" style="display:inline-block;background:#A43129;color:#fff;text-decoration:none;padding:10px 20px;border-radius:2px;font-size:14px;">Open in admin inbox</a>
      </p>
    </div>
  `;

  const text = [
    `New enquiry — ${referenceNumber}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    enquiry.message ? `\nMessage:\n${enquiry.message}` : "",
    `\nOpen in admin inbox: ${adminLink}`
  ].filter(Boolean).join("\n");

  return {
    subject: `New enquiry: ${enquiry.customerName} (${referenceNumber})`,
    html,
    text
  };
}

/**
 * Attempts to send the notification email. Never throws — always resolves
 * with { status: "sent", providerId } or { status: "failed", error }, so
 * callers can safely record the outcome without needing their own
 * try/catch around a network call.
 */
async function sendNotificationEmail(enquiry, referenceNumber, adminLink) {
  const to = process.env.ENQUIRY_NOTIFICATION_TO;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  if (!to || !from) {
    return { status: "failed", error: "Notification email is not configured (missing recipient/sender)." };
  }

  try {
    const resend = getResendClient();
    const { subject, html, text } = buildEmailContent(enquiry, referenceNumber, adminLink);
    const result = await resend.emails.send({ from, to, subject, html, text });
    if (result.error) {
      // Truncate — never store a full provider payload, just enough to
      // show a human a short reason in the admin UI.
      return { status: "failed", error: String(result.error.message || result.error).slice(0, 300) };
    }
    return { status: "sent", providerId: result.data && result.data.id ? result.data.id : null };
  } catch (err) {
    return { status: "failed", error: String(err && err.message ? err.message : err).slice(0, 300) };
  }
}

module.exports = { sendNotificationEmail, buildEmailContent };
