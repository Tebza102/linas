// Shared order vocabulary for the admin platform.
//
// Imported by orders.js, dashboard.js and reports.js so the three can never
// disagree about what counts as a sale. If that definition ever changes, it
// changes here once — not in three places that quietly drift apart.

/**
 * THE definition of a completed sale. Deliberately a one-element list, and
 * deliberately not "everything that isn't cancelled".
 *
 * An order is revenue only once Lina has actually handed it over. Not when it
 * was added to a cart, not when WhatsApp opened, not when she confirmed it,
 * not when it was cooked and sitting on the counter. Food that was prepared
 * and never collected is a cost, not income.
 */
export const ORDER_SALE_STATUSES = ["Collected"];

/** Still moving through the kitchen — real money at stake, not yet earned. */
export const ORDER_ACTIVE_STATUSES = ["Pending WhatsApp", "Received", "Confirmed", "Preparing", "Ready for Collection"];

/** Ended without a sale. Kept apart because they mean different things:
 *  Cancelled = called off; Not Collected = made, never fetched. */
export const ORDER_LOST_STATUSES = ["Cancelled", "Not Collected"];

export const ORDER_STATUSES = [...ORDER_ACTIVE_STATUSES, ...ORDER_SALE_STATUSES, ...ORDER_LOST_STATUSES];

export const ORDER_TERMINAL_STATUSES = [...ORDER_SALE_STATUSES, ...ORDER_LOST_STATUSES];

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];
export const PAYMENT_METHODS = ["Cash", "Card", "EFT", "Other"];

/**
 * Which statuses may follow which. Enforced here in the UI rather than in
 * firestore.rules — see the scope note in firestore.rules: the rules enforce
 * what would corrupt the books (the enum, terminal immutability, required
 * reasons, immutable money); the graph itself is a UI concern.
 */
export const ALLOWED_TRANSITIONS = {
  "Pending WhatsApp": ["Received", "Cancelled"],
  "Received": ["Confirmed", "Cancelled"],
  "Confirmed": ["Preparing", "Cancelled"],
  "Preparing": ["Ready for Collection", "Cancelled"],
  "Ready for Collection": ["Collected", "Not Collected", "Cancelled"],
  "Collected": [],
  "Cancelled": [],
  "Not Collected": []
};

/** Statuses that require a written reason before they can be applied. */
export const REASON_REQUIRED_STATUSES = ["Cancelled", "Not Collected"];

/**
 * Soft-delete reasons — mirrored exactly in firestore.rules'
 * isValidDeletionReason(). Change both together, same discipline as
 * ORDER_STATUSES vs. isValidOrderStatus().
 */
export const DELETION_REASONS = ["Unconfirmed", "Test", "Duplicate", "Spam", "Other"];

/** The timestamp field each status stamps when it is applied. */
export const STATUS_TIMESTAMP_FIELD = {
  "Received": "receivedAt",
  "Confirmed": "confirmedAt",
  "Preparing": "preparingAt",
  "Ready for Collection": "readyAt",
  "Collected": "collectedAt",
  "Cancelled": "cancelledAt",
  "Not Collected": "notCollectedAt"
};

/**
 * Order money is integer cents; enquiry money is whole Rands via fmtRand.
 * Showing decimals keeps the two revenue streams visually distinguishable so
 * they are never mistaken for one another.
 *
 * The decimal separator is a period, deliberately matching
 * api/_lib/order-message.js — so the figure Lina reads in admin is character-
 * identical to the one in the customer's WhatsApp message and the two can be
 * reconciled at a glance. (en-ZA would render a comma, which would silently
 * make the same amount look like two different numbers.)
 */
export function fmtCents(cents) {
  const rands = (Number(cents) || 0) / 100;
  const [whole, frac] = rands.toFixed(2).split(".");
  return "R" + whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + frac;
}

/** Sums subtotals of orders in the given statuses, excluding QA records and
 *  soft-deleted records (o.deletedAt absent/null means "not deleted" — see
 *  firestore.rules' isCurrentlyDeleted() for the same check server-side). */
export function sumCents(orders, statuses) {
  return orders
    .filter((o) => !o.isTestRecord && !o.deletedAt && statuses.includes(o.status))
    .reduce((total, o) => total + (Number(o.subtotalCents) || 0), 0);
}

export function countIn(orders, statuses) {
  return orders.filter((o) => !o.isTestRecord && !o.deletedAt && statuses.includes(o.status)).length;
}

/**
 * Today's date in SAST, matching the server's orderDateKey.
 *
 * Deliberately NOT the UTC todayIso() used elsewhere in the admin panel:
 * South Africa is UTC+2, so between 00:00 and 02:00 SAST a UTC date would
 * report yesterday and the day's order board would be wrong.
 */
export function sastToday() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * The SAST date a timestamp falls on. Used for "collected today", which must
 * key off when the order was COLLECTED, not when it was placed — an order
 * placed at 23:50 and collected at 00:10 belongs to the second day's takings.
 */
export function sastDateOf(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
