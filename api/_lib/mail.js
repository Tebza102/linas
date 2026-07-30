"use strict";

// Server-side SMTP transport (Nodemailer), used only inside /api. Replaces
// the earlier Resend-based sender — see Decision Log for why. Credentials
// come from Vercel environment variables (or a local .env.local for
// testing) — never from a committed file, never sent to the browser.

const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !port || !user || !password) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD (see .env.example)."
    );
  }

  const numericPort = Number(port);
  transporter = nodemailer.createTransport({
    host,
    port: numericPort,
    // Port 465 is implicit TLS; anything else (587, 25) uses STARTTLS,
    // which Nodemailer negotiates automatically when secure is false.
    secure: numericPort === 465,
    auth: { user, pass: password }
  });
  return transporter;
}

/**
 * Sends one email via SMTP. Never throws — always resolves with
 * { status: "accepted", providerId } or { status: "failed", error }, so
 * callers never need their own try/catch around the network call.
 * "accepted" means the SMTP server accepted the message for relay — like
 * the previous Resend-based sender, this is not proof of inbox delivery.
 */
async function sendMail({ to, subject, html, text }) {
  const fromName = process.env.SMTP_FROM_NAME || "Lina's";
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  if (!to || !fromEmail) {
    return { status: "failed", error: "Email is not configured (missing recipient/sender)." };
  }

  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text
    });
    return { status: "accepted", providerId: info.messageId || null };
  } catch (err) {
    return { status: "failed", error: String(err && err.message ? err.message : err).slice(0, 300) };
  }
}

module.exports = { getTransporter, sendMail };
