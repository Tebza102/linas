"use strict";

/*
 * Signed, HttpOnly private-preview access token — shared by middleware.js
 * and every api/preview/* endpoint so there is exactly one implementation
 * of "is this cookie valid", not two that can quietly drift apart.
 *
 * Deliberately NOT a JWT library dependency: the payload is three plain
 * fields and Node's built-in crypto is enough to sign and verify it
 * constant-time. Adding a JWT library would be a second thing to keep
 * patched for one HMAC check.
 *
 * Token shape: "<accessVersion>.<scope>.<expiryEpochSeconds>.<signature>"
 * The signature covers the first three fields only. `accessVersion` lets a
 * single env-var bump invalidate every outstanding cookie (reviewer and
 * developer alike) without a code change or a deploy — see
 * COMING_SOON_ACCESS_VERSION in .env.example.
 */

const crypto = require("crypto");

const COOKIE_NAME = "linas_private_preview";
const UI_HINT_COOKIE_NAME = "linas_preview_ui";

const SCOPES = ["reviewer", "developer"];
const SCOPE_MAX_AGE_SECONDS = {
  reviewer: 7 * 24 * 60 * 60,
  developer: 30 * 24 * 60 * 60
};

function getSecret() {
  const secret = process.env.COMING_SOON_COOKIE_SECRET;
  if (!secret) return null;
  return secret;
}

function getAccessVersion() {
  // Defaults to "1" so a deployment that sets COMING_SOON_ENABLED=true but
  // forgets this var still has a well-defined, bumpable version rather than
  // silently comparing against undefined (which would never match a bumped
  // token and would lock everyone out with no obvious cause).
  const raw = process.env.COMING_SOON_ACCESS_VERSION;
  return raw && raw.trim() ? raw.trim() : "1";
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Builds a signed token for the given scope, expiring after that scope's
 * configured lifetime (reviewer: 7 days, developer: 30 days).
 */
function signPreviewToken(scope) {
  if (!SCOPES.includes(scope)) {
    throw new Error(`Unknown preview scope: ${scope}`);
  }
  const secret = getSecret();
  if (!secret) {
    throw new Error("COMING_SOON_COOKIE_SECRET is not configured.");
  }
  const accessVersion = getAccessVersion();
  const expiresAt = Math.floor(Date.now() / 1000) + SCOPE_MAX_AGE_SECONDS[scope];
  const payload = `${accessVersion}.${scope}.${expiresAt}`;
  const signature = sign(payload, secret);
  return { token: `${payload}.${signature}`, maxAgeSeconds: SCOPE_MAX_AGE_SECONDS[scope], expiresAt };
}

/**
 * Verifies a token string. Every failure mode returns a distinct `reason`
 * for tests and logs, but callers must treat every non-valid result
 * identically (deny) — the reason is diagnostic, not a partial grant.
 */
function verifyPreviewToken(token) {
  const secret = getSecret();
  if (!secret) return { valid: false, reason: "not_configured" };
  if (typeof token !== "string" || !token) return { valid: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 4) return { valid: false, reason: "malformed" };
  const [accessVersion, scope, expiresAtRaw, signature] = parts;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isInteger(expiresAt)) return { valid: false, reason: "malformed" };
  if (!SCOPES.includes(scope)) return { valid: false, reason: "malformed" };

  const payload = `${accessVersion}.${scope}.${expiresAtRaw}`;
  const expectedSignature = sign(payload, secret);

  // Constant-time comparison requires equal-length buffers; a length
  // mismatch is itself a safe, immediate "invalid" (never a crash, never a
  // timing tell beyond "wrong length", which reveals nothing useful).
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad_signature" };
  }

  if (accessVersion !== getAccessVersion()) {
    return { valid: false, reason: "access_version_mismatch" };
  }

  if (Math.floor(Date.now() / 1000) >= expiresAt) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, scope, expiresAt };
}

/** Parses a `Cookie` request header into a plain object. */
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return out;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

/**
 * Builds a `Set-Cookie` header value. `httpOnly: false` is used only for
 * the non-secret UI-hint cookie — every cookie carrying real access is
 * always HttpOnly.
 */
function buildSetCookie(name, value, { maxAgeSeconds, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax", "Secure"];
  if (httpOnly) parts.push("HttpOnly");
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join("; ");
}

/** Builds a `Set-Cookie` header value that immediately expires the cookie. */
function clearCookie(name) {
  return `${name}=; Path=/; SameSite=Lax; Secure; Max-Age=0`;
}

module.exports = {
  COOKIE_NAME,
  UI_HINT_COOKIE_NAME,
  SCOPES,
  SCOPE_MAX_AGE_SECONDS,
  signPreviewToken,
  verifyPreviewToken,
  parseCookies,
  buildSetCookie,
  clearCookie
};
