// Lina's — Routing Middleware de-risk spike (CP0).
//
// Confirms Vercel Routing Middleware actually executes on this zero-build,
// CommonJS-everywhere project before any gating logic is built on top of it.
// This file is deliberately trivial: it sets one observable response header
// and does nothing else. See docs/LINA-COMING-SOON-MODE.md once CP5 lands.

export default function middleware(request) {
  const headers = new Headers();
  headers.set("x-lina-middleware", "active");
  return new Response(null, {
    status: 200,
    headers,
  });
}

export const config = {
  matcher: "/mw-spike-check",
};
