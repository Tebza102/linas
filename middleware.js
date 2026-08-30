// Lina's — Coming Soon route gate.
//
// Runs before the CDN on every request (confirmed working on this
// zero-build, CommonJS project in CP0 — Vercel compiles this ESM file to
// CommonJS automatically). This is the only mechanism on this stack that
// can gate a static HTML page: there is no server rendering these pages to
// add an "if locked" check to, so the gate has to happen here, before the
// static file is ever served.
//
// COMING_SOON_ENABLED unset or anything other than "true" ⇒ full
// passthrough, site behaves exactly as it does today. A missing env var
// must never take a live business offline.
//
// See docs/LINA-COMING-SOON-MODE.md for the full operations runbook.

import { next, rewrite } from "@vercel/functions";
import { classifyPath } from "./api/_lib/preview-paths.js";
import { verifyPreviewToken, parseCookies, COOKIE_NAME } from "./api/_lib/preview-token.js";

const COMING_SOON_PATH = "/assets/mockups/working/prototype-v2/coming-soon.html";

// Node runtime, not the Edge default: preview-token.js uses Node's built-in
// `crypto` module (crypto.timingSafeEqual) for real constant-time signature
// verification, which the Edge runtime does not support. Using Node here
// also means middleware and every api/preview/* endpoint share the exact
// same signing/verification code, rather than two implementations (Web
// Crypto here, Node crypto there) that could quietly drift apart.
export const config = {
  runtime: "nodejs"
};

export default function middleware(request) {
  if (process.env.COMING_SOON_ENABLED !== "true") {
    return next();
  }

  const url = new URL(request.url);

  if (classifyPath(url.pathname) === "allowed") {
    return next();
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const result = verifyPreviewToken(cookies[COOKIE_NAME]);

  if (result.valid) {
    // A reviewer/developer's unlocked response must never be cached and
    // handed to a different, unauthenticated visitor.
    return next({ headers: { "Cache-Control": "private, no-store" } });
  }

  if (url.pathname === "/") {
    return rewrite(new URL(COMING_SOON_PATH, url), {
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  const redirectUrl = new URL("/", url);
  redirectUrl.searchParams.set("from", url.pathname);
  return Response.redirect(redirectUrl, 302);
}
