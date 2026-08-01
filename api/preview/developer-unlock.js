"use strict";

/*
 * POST /api/preview/developer-unlock — owner/developer bypass, no shared
 * password required.
 *
 * The browser sends its current Firebase ID token; the role is read from
 * the VERIFIED token's custom claim (`decoded.role`), never trusted from
 * localStorage, sessionStorage, a DOM attribute, or a query string. Mirrors
 * api/admin/invite-user.js's requireOwnerOrDev exactly — same trust
 * boundary, same failure shape — so there is one pattern for "prove you're
 * owner/developer" in this codebase, not two that could drift apart.
 */

const { getAuth } = require("../_lib/firebase-admin");
const { signPreviewToken, buildSetCookie, COOKIE_NAME, UI_HINT_COOKIE_NAME } = require("../_lib/preview-token");

async function requireOwnerOrDev(req) {
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
  if (decoded.role !== "owner" && decoded.role !== "developer") {
    const err = new Error("Only an owner or developer can unlock the private preview.");
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

  try {
    await requireOwnerOrDev(req);

    const { token, maxAgeSeconds } = signPreviewToken("developer");
    res.setHeader("Set-Cookie", [
      buildSetCookie(COOKIE_NAME, token, { maxAgeSeconds, httpOnly: true }),
      buildSetCookie(UI_HINT_COOKIE_NAME, "1", { maxAgeSeconds, httpOnly: false })
    ]);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ ok: false, error: err.message });
      return;
    }
    console.error("Developer preview unlock failed:", err);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
};
