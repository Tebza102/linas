"use strict";

/*
 * POST /api/preview/unlock — the shared-password path for reviewers.
 *
 * Password comparison is server-side and constant-time
 * (crypto.timingSafeEqual), never a client-side JS string compare. Every
 * failure — wrong password, empty password, malformed body — returns the
 * exact same generic message and status code, so a network observer or a
 * scripted attacker learns nothing about which failure occurred. The
 * stored password is never echoed back in any response, ever.
 */

const crypto = require("crypto");
const { getFirestore } = require("../_lib/firebase-admin");
const { getClientIp, enforceRateLimit, RateLimitedError } = require("../_lib/rate-limit");
const { signPreviewToken, buildSetCookie, COOKIE_NAME, UI_HINT_COOKIE_NAME } = require("../_lib/preview-token");

const GENERIC_ERROR = "That password isn't correct. Please try again.";
const RATE_LIMIT_MAX_PER_MINUTE = 5;

/** Constant-time string comparison, tolerant of length mismatches. */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers so the response time
    // doesn't itself leak the correct password's length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const configuredPassword = process.env.COMING_SOON_REVIEWER_PASSWORD;
  if (!configuredPassword) {
    // A misconfigured deployment must fail closed, not silently accept
    // anything (or crash with a stack trace that could leak details).
    res.status(503).json({ ok: false, error: "Private preview is not available right now." });
    return;
  }

  let db;
  try {
    db = getFirestore();
  } catch (err) {
    console.error("Firebase Admin init failed:", err.message);
    res.status(503).json({ ok: false, error: "Private preview is not available right now." });
    return;
  }

  try {
    await enforceRateLimit(db, getClientIp(req), {
      prefix: "pvw_",
      max: RATE_LIMIT_MAX_PER_MINUTE,
      message: "Too many attempts. Please try again in a minute."
    });

    const submitted = req.body && typeof req.body.password === "string" ? req.body.password : "";
    if (!submitted || !safeCompare(submitted, configuredPassword)) {
      res.status(401).json({ ok: false, error: GENERIC_ERROR });
      return;
    }

    const { token, maxAgeSeconds } = signPreviewToken("reviewer");
    res.setHeader("Set-Cookie", [
      buildSetCookie(COOKIE_NAME, token, { maxAgeSeconds, httpOnly: true }),
      buildSetCookie(UI_HINT_COOKIE_NAME, "1", { maxAgeSeconds, httpOnly: false })
    ]);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Preview unlock failed:", err);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
};
