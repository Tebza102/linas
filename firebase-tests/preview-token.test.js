"use strict";

/*
 * Tests for the private-preview signed token/cookie library. Every test in
 * this file uses a throwaway test-only secret set in `before` — never the
 * real COMING_SOON_COOKIE_SECRET, which only ever exists in Vercel's
 * environment configuration.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const ORIGINAL_SECRET = process.env.COMING_SOON_COOKIE_SECRET;
const ORIGINAL_VERSION = process.env.COMING_SOON_ACCESS_VERSION;

before(() => {
  process.env.COMING_SOON_COOKIE_SECRET = "test-only-secret-do-not-use-in-production";
  process.env.COMING_SOON_ACCESS_VERSION = "1";
});

after(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.COMING_SOON_COOKIE_SECRET;
  else process.env.COMING_SOON_COOKIE_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_VERSION === undefined) delete process.env.COMING_SOON_ACCESS_VERSION;
  else process.env.COMING_SOON_ACCESS_VERSION = ORIGINAL_VERSION;
});

// Required fresh per test file (not per test) since the module reads env
// vars lazily inside each function call, not at require-time — but require
// itself is still cached per-process, so this is safe to hoist here.
const {
  signPreviewToken,
  verifyPreviewToken,
  parseCookies,
  buildSetCookie,
  clearCookie,
  SCOPE_MAX_AGE_SECONDS
} = require("../api/_lib/preview-token");

test("a freshly signed reviewer token verifies as valid", () => {
  const { token } = signPreviewToken("reviewer");
  const result = verifyPreviewToken(token);
  assert.equal(result.valid, true);
  assert.equal(result.scope, "reviewer");
});

test("a freshly signed developer token verifies as valid", () => {
  const { token } = signPreviewToken("developer");
  const result = verifyPreviewToken(token);
  assert.equal(result.valid, true);
  assert.equal(result.scope, "developer");
});

test("reviewer and developer tokens carry their documented lifetimes", () => {
  assert.equal(SCOPE_MAX_AGE_SECONDS.reviewer, 7 * 24 * 60 * 60);
  assert.equal(SCOPE_MAX_AGE_SECONDS.developer, 30 * 24 * 60 * 60);
});

test("rejects an unknown scope at signing time", () => {
  assert.throws(() => signPreviewToken("staff"), /Unknown preview scope/);
});

test("rejects a missing token", () => {
  assert.equal(verifyPreviewToken(undefined).valid, false);
  assert.equal(verifyPreviewToken("").valid, false);
  assert.equal(verifyPreviewToken(null).reason, "missing");
});

test("rejects a malformed token (wrong number of segments)", () => {
  const result = verifyPreviewToken("1.reviewer.123456789");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "malformed");
});

test("rejects a token with a nonsense scope", () => {
  const result = verifyPreviewToken("1.superadmin.9999999999.abc");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "malformed");
});

test("rejects a tampered payload (signature no longer matches)", () => {
  const { token } = signPreviewToken("reviewer");
  const [accessVersion, scope, expiresAt, signature] = token.split(".");
  // Flip the scope after signing — a real attacker's most useful tamper,
  // since it would otherwise let a reviewer token claim developer scope.
  const tampered = `${accessVersion}.developer.${expiresAt}.${signature}`;
  const result = verifyPreviewToken(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "bad_signature");
});

test("rejects a token signed with a different secret", () => {
  const { token } = signPreviewToken("reviewer");
  const previousSecret = process.env.COMING_SOON_COOKIE_SECRET;
  process.env.COMING_SOON_COOKIE_SECRET = "a-completely-different-secret";
  try {
    const result = verifyPreviewToken(token);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "bad_signature");
  } finally {
    process.env.COMING_SOON_COOKIE_SECRET = previousSecret;
  }
});

test("rejects an expired token", () => {
  const previousSecret = process.env.COMING_SOON_COOKIE_SECRET;
  const crypto = require("crypto");
  const expiresAt = Math.floor(Date.now() / 1000) - 10; // 10s in the past
  const payload = `1.reviewer.${expiresAt}`;
  const signature = crypto.createHmac("sha256", previousSecret).update(payload).digest("base64url");
  const result = verifyPreviewToken(`${payload}.${signature}`);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "expired");
});

test("rejects a token whose access version no longer matches (revocation)", () => {
  const { token } = signPreviewToken("reviewer");
  const previousVersion = process.env.COMING_SOON_ACCESS_VERSION;
  process.env.COMING_SOON_ACCESS_VERSION = "2"; // simulates an admin bumping the version
  try {
    const result = verifyPreviewToken(token);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "access_version_mismatch");
  } finally {
    process.env.COMING_SOON_ACCESS_VERSION = previousVersion;
  }
});

test("verification fails closed when the cookie secret is not configured", () => {
  const { token } = signPreviewToken("reviewer");
  const previousSecret = process.env.COMING_SOON_COOKIE_SECRET;
  delete process.env.COMING_SOON_COOKIE_SECRET;
  try {
    const result = verifyPreviewToken(token);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "not_configured");
  } finally {
    process.env.COMING_SOON_COOKIE_SECRET = previousSecret;
  }
});

test("signing fails loudly (throws) rather than issuing an unsigned token when the secret is missing", () => {
  const previousSecret = process.env.COMING_SOON_COOKIE_SECRET;
  delete process.env.COMING_SOON_COOKIE_SECRET;
  try {
    assert.throws(() => signPreviewToken("reviewer"), /COMING_SOON_COOKIE_SECRET/);
  } finally {
    process.env.COMING_SOON_COOKIE_SECRET = previousSecret;
  }
});

test("parseCookies reads a multi-cookie header correctly", () => {
  const cookies = parseCookies("a=1; linas_private_preview=abc.def.ghi.jkl; linas_preview_ui=1");
  assert.equal(cookies.a, "1");
  assert.equal(cookies.linas_private_preview, "abc.def.ghi.jkl");
  assert.equal(cookies.linas_preview_ui, "1");
});

test("parseCookies handles an empty or missing header", () => {
  assert.deepEqual(parseCookies(""), {});
  assert.deepEqual(parseCookies(undefined), {});
});

test("buildSetCookie always includes Secure and SameSite=Lax", () => {
  const header = buildSetCookie("linas_private_preview", "abc.def", { maxAgeSeconds: 604800 });
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Max-Age=604800/);
  assert.match(header, /Path=\//);
});

test("buildSetCookie omits HttpOnly only when explicitly told to (the UI-hint cookie)", () => {
  const header = buildSetCookie("linas_preview_ui", "1", { httpOnly: false });
  assert.doesNotMatch(header, /HttpOnly/);
});

test("clearCookie expires the cookie immediately", () => {
  const header = clearCookie("linas_private_preview");
  assert.match(header, /Max-Age=0/);
});
