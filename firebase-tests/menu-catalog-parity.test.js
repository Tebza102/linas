"use strict";

/*
 * Parity between the server-side price authority (api/_lib/menu-catalog.js)
 * and the public menu the customer actually sees
 * (assets/mockups/working/prototype-v2/menu-data.js).
 *
 * These two files MUST agree. If they drift, a customer is shown one price
 * and charged another — the exact class of bug that erodes trust fastest and
 * is invisible in code review. This suite is the gate: change one file and
 * `npm run test:unit` fails until you change the other.
 *
 * menu-data.js is a plain browser script declaring `const LINA_MENU` with no
 * export, and it ships to production as-is. Rather than pollute a shipped
 * file with a module.exports shim, it's read and evaluated in a sandbox.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const catalog = require("../api/_lib/menu-catalog");

const menuDataPath = path.resolve(
  __dirname, "..", "assets", "mockups", "working", "prototype-v2", "menu-data.js"
);
const LINA_MENU = vm.runInNewContext(
  fs.readFileSync(menuDataPath, "utf8") + "\n;LINA_MENU"
);

/** Every item on the public menu, flattened, with its owning category. */
function publicItems() {
  const out = [];
  LINA_MENU.categories.forEach((cat) => {
    cat.items.forEach((item) => out.push({ ...item, categoryId: cat.id }));
  });
  return out;
}

const activeCatalogItems = catalog.ITEMS.filter((i) => i.active);

test("every active catalogue item appears on the public menu", () => {
  const publicIds = new Set(publicItems().map((i) => i.id));
  const missing = activeCatalogItems.filter((i) => !publicIds.has(i.id)).map((i) => i.id);
  assert.deepEqual(missing, [], `active catalogue items missing from menu-data.js: ${missing.join(", ")}`);
});

test("every public menu item exists in the catalogue and is active", () => {
  const unknown = publicItems()
    .filter((i) => !catalog.getActiveItem(i.id))
    .map((i) => i.id || `(no id: ${i.name})`);
  assert.deepEqual(unknown, [], `menu items with no active catalogue entry: ${unknown.join(", ")}`);
});

test("priceCents matches the catalogue for every item", () => {
  const drift = publicItems()
    .filter((i) => {
      const c = catalog.getItem(i.id);
      return c && c.priceCents !== i.priceCents;
    })
    .map((i) => `${i.id}: menu ${i.priceCents} vs catalogue ${catalog.getItem(i.id).priceCents}`);
  assert.deepEqual(drift, [], `price drift: ${drift.join("; ")}`);
});

test("the displayed price string matches priceCents", () => {
  // The customer reads `price`; the server charges `priceCents`. A mismatch
  // here is precisely the "shown one price, charged another" failure.
  const mismatched = publicItems()
    .filter((i) => i.price !== "R" + i.priceCents / 100)
    .map((i) => `${i.id}: shows ${i.price} but priceCents ${i.priceCents}`);
  assert.deepEqual(mismatched, [], mismatched.join("; "));
});

test("all catalogue prices are whole Rands (the display string has no cents)", () => {
  const fractional = catalog.ITEMS.filter((i) => i.priceCents % 100 !== 0).map((i) => i.id);
  assert.deepEqual(fractional, [], `these need a display format that shows cents: ${fractional.join(", ")}`);
});

test("item names match the catalogue exactly, including special characters", () => {
  // "½ russian" must survive verbatim — a normalised copy would silently
  // change what the customer ordered on the WhatsApp message.
  const mismatched = publicItems()
    .filter((i) => {
      const c = catalog.getItem(i.id);
      return c && c.name !== i.name;
    })
    .map((i) => `${i.id}: "${i.name}" vs "${catalog.getItem(i.id).name}"`);
  assert.deepEqual(mismatched, [], mismatched.join("; "));
});

test("each item's category matches the catalogue", () => {
  const mismatched = publicItems()
    .filter((i) => {
      const c = catalog.getItem(i.id);
      return c && c.categoryId !== i.categoryId;
    })
    .map((i) => `${i.id}: menu ${i.categoryId} vs catalogue ${catalog.getItem(i.id).categoryId}`);
  assert.deepEqual(mismatched, [], mismatched.join("; "));
});

test("catalogue ids are unique and slug-shaped", () => {
  const ids = catalog.ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate catalogue ids");
  const malformed = ids.filter((id) => !/^[a-z0-9-]+$/.test(id));
  assert.deepEqual(malformed, [], `ids must be lowercase slugs: ${malformed.join(", ")}`);
});

test("catalogue prices are positive integers", () => {
  const invalid = catalog.ITEMS
    .filter((i) => !Number.isInteger(i.priceCents) || i.priceCents <= 0)
    .map((i) => `${i.id}: ${i.priceCents}`);
  assert.deepEqual(invalid, [], invalid.join("; "));
});

test("de-listed catalogue items are absent from the public menu", () => {
  // Setting active:false must actually remove it from what customers see —
  // otherwise they can add an item the server will refuse to price.
  const publicIds = new Set(publicItems().map((i) => i.id));
  const stillListed = catalog.ITEMS.filter((i) => !i.active && publicIds.has(i.id)).map((i) => i.id);
  assert.deepEqual(stillListed, [], `de-listed but still on the public menu: ${stillListed.join(", ")}`);
});

test("every catalogue item belongs to a real category", () => {
  const orphaned = catalog.ITEMS.filter((i) => !catalog.getCategory(i.categoryId)).map((i) => i.id);
  assert.deepEqual(orphaned, [], orphaned.join(", "));
});
