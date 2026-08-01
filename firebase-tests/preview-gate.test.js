"use strict";

/*
 * Tests for classifyPath — the route-gating decision the Coming Soon
 * middleware relies on. This is the cheapest possible net for the failure
 * mode that matters most here: a public page (clean URL or its raw .html
 * twin) slipping past the gate unnoticed.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { classifyPath, PROTECTED_CLEAN_PATHS, PROTECTED_RAW_HTML_PATHS } = require("../api/_lib/preview-paths");

test("every clean public route is protected", () => {
  PROTECTED_CLEAN_PATHS.forEach((path) => {
    assert.equal(classifyPath(path), "protected", `expected ${path} to be protected`);
  });
});

test("every raw .html twin of a public page is ALSO protected (the bypass this exists to close)", () => {
  PROTECTED_RAW_HTML_PATHS.forEach((path) => {
    assert.equal(classifyPath(path), "protected", `expected ${path} to be protected`);
  });
});

test("a trailing slash does not create a bypass", () => {
  assert.equal(classifyPath("/menu/"), "protected");
  assert.equal(classifyPath("/catering/"), "protected");
});

test("admin routes are never gated", () => {
  assert.equal(classifyPath("/admin/login.html"), "allowed");
  assert.equal(classifyPath("/admin/orders.html"), "allowed");
  assert.equal(classifyPath("/admin/js/orders.js"), "allowed");
});

test("api routes are never gated", () => {
  assert.equal(classifyPath("/api/orders/create"), "allowed");
  assert.equal(classifyPath("/api/enquiries/create"), "allowed");
  assert.equal(classifyPath("/api/preview/unlock"), "allowed");
});

test("non-HTML public assets required by both the gated site and the Coming Soon page are never gated", () => {
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/cart.js"), "allowed");
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/styles.css"), "allowed");
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/menu-data.js"), "allowed");
  assert.equal(classifyPath("/assets/mockups/working/media/lina-hero-preview-working-v1-20260728.mp4"), "allowed");
});

test("the Coming Soon page itself is never gated (it would be an infinite redirect otherwise)", () => {
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/coming-soon.html"), "allowed");
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/coming-soon.css"), "allowed");
  assert.equal(classifyPath("/assets/mockups/working/prototype-v2/coming-soon.js"), "allowed");
});

test("favicon and robots.txt are never gated", () => {
  assert.equal(classifyPath("/assets/source/brand/Linas_Favicon.jpg"), "allowed");
  assert.equal(classifyPath("/robots.txt"), "allowed");
});

test("an unrecognised path is allowed by default (this is a presentation gate, not a perimeter)", () => {
  assert.equal(classifyPath("/some/future/unlisted/path"), "allowed");
});
