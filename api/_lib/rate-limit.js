"use strict";

/*
 * Shared IP rate limiting for public write endpoints.
 *
 * Extracted verbatim from api/enquiries/create.js so the orders endpoint gets
 * the same protection without a copy. The enquiry doc-id derivation is
 * UNCHANGED (`hex(ip).slice(0,64)`) so existing in-flight rate-limit windows
 * keep working across the deploy.
 *
 * Each endpoint passes its own docId prefix. Without one, orders and enquiries
 * would share a single 5/min budget per IP — a customer who submitted an
 * enquiry could then be blocked from placing an order.
 *
 * Known pre-existing limitation, not changed here: IPv6 addresses are long
 * enough that hex encoding truncates under the 64-char cap, so several
 * addresses in the same /64 can collide into one bucket. That is conservative
 * (it over-limits rather than under-limits) and is left as-is deliberately —
 * changing the derivation would reset every live window.
 */

const { admin } = require("./firebase-admin");

const WINDOW_MS = 60 * 1000;

class RateLimitedError extends Error {
  constructor(message) {
    super(message || "Too many submissions. Please try again in a minute.");
    this.statusCode = 429;
  }
}

/**
 * Best-effort client IP. `x-forwarded-for` is set by Vercel's edge; the first
 * segment is the original client.
 */
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

/**
 * Derives the rateLimits doc id for an IP. `prefix` keeps separate endpoints
 * on separate budgets; it sits OUTSIDE the hashed portion so it never eats
 * into the IP's own entropy budget, and the total stays within 64 chars.
 */
function rateLimitDocId(ip, prefix) {
  const hex = Buffer.from(ip).toString("hex");
  if (!prefix) return hex.slice(0, 64);
  return prefix + hex.slice(0, 64 - prefix.length);
}

/**
 * Throws RateLimitedError (statusCode 429) once an IP exceeds `max` writes
 * inside a rolling 60s window. The whole read-modify-write runs in a
 * transaction so concurrent requests cannot both slip past the threshold.
 */
async function enforceRateLimit(db, ip, { prefix = "", max = 5, message } = {}) {
  const ref = db.collection("rateLimits").doc(rateLimitDocId(ip, prefix));
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    const data = snap.data();
    if (now - data.windowStart > WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= max) {
      throw new RateLimitedError(message);
    }
    tx.update(ref, { count: admin.firestore.FieldValue.increment(1) });
  });
}

module.exports = { getClientIp, enforceRateLimit, rateLimitDocId, RateLimitedError, WINDOW_MS };
