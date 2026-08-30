"use strict";

/*
 * Server-side authoritative menu catalogue.
 *
 * This file — never the browser — decides what an item costs. The public
 * cart posts { itemId, quantity } only; api/_lib/validate-order.js resolves
 * every id here and computes line totals and the subtotal from THESE
 * prices. Any unitPriceCents/lineTotalCents/subtotalCents a client sends is
 * ignored outright.
 *
 * Prices are integer CENTS. The rest of the platform stores enquiry money in
 * Rands (`confirmedAmount`); order money is always `*Cents`. The differing
 * names and units are deliberate — they make a careless merge of the two
 * revenue streams either impossible or immediately, visibly wrong (100x out).
 *
 * IDS ARE FROZEN ONCE SHIPPED. Historical orders store the id, so renaming
 * one silently repoints analytics at a different dish. To correct a display
 * name, change `name` and keep the id. To replace a dish, add a new id and
 * set the old one `active: false` (it stays here so historical orders can
 * still resolve their names).
 *
 * The public menu (assets/mockups/working/prototype-v2/menu-data.js) mirrors
 * these ids and prices for display. firebase-tests/menu-catalog-parity.test.js
 * fails if the two ever drift, so change both together.
 */

const CATALOG_VERSION = "2026-07-31";
const CURRENCY = "ZAR";

// Sanity ceilings. A walk-up mobile-kitchen order that exceeds any of these
// is far more likely to be a scripted payload than a real customer.
const MAX_QUANTITY_PER_LINE = 20;
const MAX_LINES_PER_ORDER = 20;
const MAX_ORDER_TOTAL_CENTS = 500000; // R5,000

const CATEGORIES = [
  { id: "plates", label: "Plates" },
  { id: "kota", label: "Kota" },
  { id: "chips-snacks", label: "Chips & Snacks" },
  { id: "drinks", label: "Drinks" }
];

const ITEMS = [
  // Plates — R60 each
  { id: "plates-short-rib-chakalaka-potato-salad", categoryId: "plates", name: "Short-rib, chakalaka, potato salad", priceCents: 6000, active: true },
  { id: "plates-braised-chicken-dombolo-spinach-potato-salad", categoryId: "plates", name: "Braised chicken, dombolo, spinach, potato salad", priceCents: 6000, active: true },
  { id: "plates-beef-stew-potato-salad-spinach", categoryId: "plates", name: "Beef stew, potato salad, spinach", priceCents: 6000, active: true },

  // Kota
  { id: "kota-chips-half-vienna-polony-atchar", categoryId: "kota", name: "Chips, half vienna, polony, atchar", priceCents: 2500, active: true },
  { id: "kota-chips-cheese-half-russian-vienna-polony", categoryId: "kota", name: "Chips, cheese, ½ russian & vienna, polony", priceCents: 3000, active: true },
  { id: "kota-chips-full-russian-full-vienna-cheese-polony-egg", categoryId: "kota", name: "Chips, full russian, full vienna, cheese, polony, egg", priceCents: 5000, active: true },
  { id: "kota-4-slice-with-butter", categoryId: "kota", name: "4 slice with butter", priceCents: 1000, active: true },
  { id: "kota-3-slices-chips-half-russian", categoryId: "kota", name: "3 slices, chips, ½ russian", priceCents: 1200, active: true },

  // Chips & Snacks
  { id: "chips-snacks-small-chips", categoryId: "chips-snacks", name: "Small chips", priceCents: 1500, active: true },
  { id: "chips-snacks-medium-chips", categoryId: "chips-snacks", name: "Medium chips", priceCents: 2500, active: true },
  { id: "chips-snacks-large-chips", categoryId: "chips-snacks", name: "Large chips", priceCents: 3000, active: true },
  { id: "chips-snacks-vienna", categoryId: "chips-snacks", name: "Vienna", priceCents: 1000, active: true },
  { id: "chips-snacks-russian", categoryId: "chips-snacks", name: "Russian", priceCents: 1500, active: true },
  { id: "chips-snacks-noodles", categoryId: "chips-snacks", name: "Noodles", priceCents: 1000, active: true },

  // Drinks
  { id: "drinks-juice", categoryId: "drinks", name: "Juice", priceCents: 1700, active: true },
  { id: "drinks-energy-drinks", categoryId: "drinks", name: "Energy drinks", priceCents: 1200, active: true },
  { id: "drinks-cold-drinks", categoryId: "drinks", name: "Cold drinks", priceCents: 1400, active: true },
  { id: "drinks-2-litre-cold-drinks", categoryId: "drinks", name: "2 litre cold drinks", priceCents: 2700, active: true }
];

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
const CATEGORIES_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/**
 * Any item, including de-listed ones — so admin views and historical orders
 * can still resolve a name. Never use this to price a new order.
 */
function getItem(id) {
  if (typeof id !== "string") return null;
  return ITEMS_BY_ID.get(id) || null;
}

/**
 * Only items currently orderable. This is the ONLY lookup order validation
 * may use — a de-listed item must not be purchasable.
 */
function getActiveItem(id) {
  const item = getItem(id);
  return item && item.active ? item : null;
}

function getCategory(id) {
  if (typeof id !== "string") return null;
  return CATEGORIES_BY_ID.get(id) || null;
}

module.exports = {
  CATALOG_VERSION,
  CURRENCY,
  MAX_QUANTITY_PER_LINE,
  MAX_LINES_PER_ORDER,
  MAX_ORDER_TOTAL_CENTS,
  CATEGORIES,
  ITEMS,
  getItem,
  getActiveItem,
  getCategory
};
