"use strict";

/*
 * Which request paths the Coming Soon gate protects.
 *
 * Exported as a pure function (no Request/Response types) specifically so
 * the bypass surface is unit-testable without deploying anything — the
 * cheapest possible net for the failure mode that matters most here: a new
 * public route or an old raw .html path slipping past the gate unnoticed.
 *
 * `vercel.json` rewrites the 7 clean URLs to the underlying .html files, but
 * the raw .html path is ALSO directly requestable — gating only the clean
 * URL would leave a trivial bypass. Both forms of every public page are
 * listed below.
 */

const PROTECTED_CLEAN_PATHS = [
  "/",
  "/catering",
  "/menu",
  "/chef-lina",
  "/mobile-kitchen",
  "/gallery",
  "/contact"
];

const PROTECTED_RAW_HTML_PATHS = [
  "/assets/mockups/working/prototype-v2/index.html",
  "/assets/mockups/working/prototype-v2/catering.html",
  "/assets/mockups/working/prototype-v2/menu.html",
  "/assets/mockups/working/prototype-v2/chef-lina.html",
  "/assets/mockups/working/prototype-v2/mobile-kitchen.html",
  "/assets/mockups/working/prototype-v2/gallery.html",
  "/assets/mockups/working/prototype-v2/contact.html"
];

const PROTECTED_PATHS = new Set([...PROTECTED_CLEAN_PATHS, ...PROTECTED_RAW_HTML_PATHS]);

/**
 * Trailing-slash-insensitive: "/menu/" and "/menu" are the same route to a
 * visitor, and must be the same route to the gate.
 */
function normalize(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Classifies a request path. Anything not explicitly protected is allowed
 * — this is a presentation gate over a small, known set of public pages,
 * not a default-deny perimeter; /admin/*, /api/*, non-HTML assets, the
 * Coming Soon page itself, favicon and robots.txt all fall through here.
 */
function classifyPath(pathname) {
  const normalized = normalize(pathname);
  return PROTECTED_PATHS.has(normalized) ? "protected" : "allowed";
}

module.exports = {
  PROTECTED_CLEAN_PATHS,
  PROTECTED_RAW_HTML_PATHS,
  PROTECTED_PATHS,
  classifyPath
};
