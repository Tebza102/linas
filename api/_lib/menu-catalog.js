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

// Bumped when the catalogue's contents change. Stored on every order, so a
// historical order records which price list it was actually placed against.
const CATALOG_VERSION = "2026-08-31";
const CURRENCY = "ZAR";

// Sanity ceilings. A walk-up mobile-kitchen order that exceeds any of these
// is far more likely to be a scripted payload than a real customer.
const MAX_QUANTITY_PER_LINE = 20;
const MAX_LINES_PER_ORDER = 20;
const MAX_ORDER_TOTAL_CENTS = 500000; // R5,000

// `plates`, `kota` and `chips-snacks` are retained solely because de-listed
// items below still reference them, and every item — active or not — must
// resolve to a real category so historical orders keep a readable label.
// Only `summer`, `everyday` and `drinks` carry orderable items today.
const CATEGORIES = [
  { id: "summer", label: "Summer Menu" },
  { id: "everyday", label: "Everyday Favourites" },
  { id: "drinks", label: "Drinks" },
  { id: "plates", label: "Plates" },
  { id: "kota", label: "Kota" },
  { id: "chips-snacks", label: "Chips & Snacks" }
];

const ITEMS = [
  // ---- Summer Menu (approved 2026-08-31) ----
  // Burger and taco variants are separate ids rather than one id plus a
  // free-text option, so the customer's choice is carried by the item
  // itself: the cart, the stored order, the admin view and the WhatsApp
  // message all read the same catalogue `name` and therefore cannot
  // disagree, and an order with no choice made is not representable.
  { id: "summer-burger-beef", categoryId: "summer", name: "Lina’s Burger & Fries (Beef)", priceCents: 6000, active: true },
  { id: "summer-burger-chicken", categoryId: "summer", name: "Lina’s Burger & Fries (Chicken)", priceCents: 6000, active: true },
  { id: "summer-tacos-prawn", categoryId: "summer", name: "Lina’s Tacos (Prawn)", priceCents: 5000, active: true },
  { id: "summer-tacos-chicken", categoryId: "summer", name: "Lina’s Tacos (Chicken)", priceCents: 5000, active: true },
  { id: "summer-chicken-schnitzel", categoryId: "summer", name: "Lina’s Chicken Schnitzel", priceCents: 7000, active: true },

  // ---- Everyday Favourites (approved 2026-08-31) ----
  { id: "everyday-beef-stew-steak-fried-chicken", categoryId: "everyday", name: "Beef Stew, Steak or Fried Chicken with two side salads and dombolo", priceCents: 6000, active: true },
  { id: "everyday-boerewors-roll", categoryId: "everyday", name: "Boerewors Roll with caramelised onions", priceCents: 3500, active: true },
  { id: "everyday-cheesy-fries-roll", categoryId: "everyday", name: "Cheesy Fries Roll with smoked chicken vienna", priceCents: 3500, active: true },
  { id: "everyday-six-wings", categoryId: "everyday", name: "Six Wings", priceCents: 4000, active: true },
  { id: "everyday-kota-cheese-half-russian-vienna-polony", categoryId: "everyday", name: "Kota: Chips, cheese, half Russian, vienna and polony", priceCents: 3000, active: true },
  { id: "everyday-kota-full-russian-full-vienna-cheese-polony-egg", categoryId: "everyday", name: "Kota: Chips, full Russian, full vienna, cheese, polony and egg", priceCents: 5000, active: true },

  // ---- Drinks (approved 2026-08-31) ----
  { id: "drinks-fruto-juice", categoryId: "drinks", name: "Fruto Juice: Guava, Mango or Orange", priceCents: 1700, active: true },
  { id: "drinks-dragon-energy", categoryId: "drinks", name: "Dragon Energy Drink: Peach, Espresso or Original", priceCents: 1200, active: true },
  { id: "drinks-frugo-sparkling", categoryId: "drinks", name: "Frugo Sparkling: Apple or Red Grape", priceCents: 1700, active: true },
  { id: "drinks-canned-soft-drink", categoryId: "drinks", name: "Canned Soft Drink: Coke, Orange, Stoney or Sprite", priceCents: 1500, active: true },
  { id: "drinks-lemonade", categoryId: "drinks", name: "Lemonade", priceCents: 1700, active: true },

  // ---- De-listed 2026-08-31, replaced by the menu above ----
  // Kept (never deleted) because ids are frozen once shipped: orders placed
  // against these still need to resolve a name in admin and in history.
  // active:false makes them unorderable and, per the parity test, they must
  // also be absent from the public menu — which they are.
  { id: "plates-short-rib-chakalaka-potato-salad", categoryId: "plates", name: "Short-rib, chakalaka, potato salad", priceCents: 6000, active: false },
  { id: "plates-braised-chicken-dombolo-spinach-potato-salad", categoryId: "plates", name: "Braised chicken, dombolo, spinach, potato salad", priceCents: 6000, active: false },
  { id: "plates-beef-stew-potato-salad-spinach", categoryId: "plates", name: "Beef stew, potato salad, spinach", priceCents: 6000, active: false },

  { id: "kota-chips-half-vienna-polony-atchar", categoryId: "kota", name: "Chips, half vienna, polony, atchar", priceCents: 2500, active: false },
  { id: "kota-chips-cheese-half-russian-vienna-polony", categoryId: "kota", name: "Chips, cheese, ½ russian & vienna, polony", priceCents: 3000, active: false },
  { id: "kota-chips-full-russian-full-vienna-cheese-polony-egg", categoryId: "kota", name: "Chips, full russian, full vienna, cheese, polony, egg", priceCents: 5000, active: false },
  { id: "kota-4-slice-with-butter", categoryId: "kota", name: "4 slice with butter", priceCents: 1000, active: false },
  { id: "kota-3-slices-chips-half-russian", categoryId: "kota", name: "3 slices, chips, ½ russian", priceCents: 1200, active: false },

  { id: "chips-snacks-small-chips", categoryId: "chips-snacks", name: "Small chips", priceCents: 1500, active: false },
  { id: "chips-snacks-medium-chips", categoryId: "chips-snacks", name: "Medium chips", priceCents: 2500, active: false },
  { id: "chips-snacks-large-chips", categoryId: "chips-snacks", name: "Large chips", priceCents: 3000, active: false },
  { id: "chips-snacks-vienna", categoryId: "chips-snacks", name: "Vienna", priceCents: 1000, active: false },
  { id: "chips-snacks-russian", categoryId: "chips-snacks", name: "Russian", priceCents: 1500, active: false },
  { id: "chips-snacks-noodles", categoryId: "chips-snacks", name: "Noodles", priceCents: 1000, active: false },

  { id: "drinks-juice", categoryId: "drinks", name: "Juice", priceCents: 1700, active: false },
  { id: "drinks-energy-drinks", categoryId: "drinks", name: "Energy drinks", priceCents: 1200, active: false },
  { id: "drinks-cold-drinks", categoryId: "drinks", name: "Cold drinks", priceCents: 1400, active: false },
  { id: "drinks-2-litre-cold-drinks", categoryId: "drinks", name: "2 litre cold drinks", priceCents: 2700, active: false }
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
