"use strict";

/*
 * Validates and PRICES a public cart submission.
 *
 * The single most important property of this module: it never reads a price
 * from the caller. The browser sends { itemId, quantity } and nothing else
 * that touches money — any unitPriceCents/lineTotalCents/subtotalCents present
 * in the body is simply never looked at. Every price comes from
 * api/_lib/menu-catalog.js and every total is computed here.
 *
 * Synchronous and Firestore-free so the unit tests can hammer it directly.
 * Mirrors validate-enquiry.js: throws on the first failure, and returns a
 * fixed object literal so unknown input fields are structurally dropped
 * rather than filtered by an allowlist someone can forget to update.
 */

const {
  getActiveItem,
  getCategory,
  CATALOG_VERSION,
  CURRENCY,
  MAX_QUANTITY_PER_LINE,
  MAX_LINES_PER_ORDER,
  MAX_ORDER_TOTAL_CENTS
} = require("./menu-catalog");

const { normalizePhone, isValidPhone } = require("./validate-enquiry");

class OrderValidationError extends Error {
  constructor(message, field, code) {
    super(message);
    this.name = "OrderValidationError";
    this.field = field || null;
    this.code = code || "invalid";
    this.statusCode = 400;
  }
}

/**
 * Validates a cart submission and returns the priced order payload.
 * Throws OrderValidationError on the first problem found.
 */
function validateOrderSubmission(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new OrderValidationError("Invalid request.", null, "body_invalid");
  }

  // Honeypot — same convention as the enquiry form. Never a fake success:
  // a bot gets a real rejection, not a pretend confirmation.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    throw new OrderValidationError("Submission rejected.", "company", "honeypot");
  }

  function optionalString(value, maxLength) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s === "" ? null : s.slice(0, maxLength);
  }

  // ---- Items ----
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new OrderValidationError("Your cart is empty.", "items", "items_missing");
  }
  if (body.items.length > MAX_LINES_PER_ORDER) {
    throw new OrderValidationError(
      `An order can hold at most ${MAX_LINES_PER_ORDER} different items.`, "items", "too_many_lines"
    );
  }

  // Merge duplicate itemIds BEFORE applying the per-line cap, so a payload
  // repeating one item 40 times becomes one line of 40 and is then correctly
  // rejected by the quantity cap — rather than sneaking past as 40 valid lines.
  const merged = new Map();
  body.items.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new OrderValidationError("Invalid cart item.", `items[${index}]`, "item_unknown");
    }
    const itemId = typeof raw.itemId === "string" ? raw.itemId : null;
    if (!itemId) {
      throw new OrderValidationError("Invalid cart item.", `items[${index}].itemId`, "item_unknown");
    }
    // getActiveItem, not getItem — a de-listed dish must not be orderable.
    const catalogItem = getActiveItem(itemId);
    if (!catalogItem) {
      throw new OrderValidationError(
        "One of the items is no longer available.", `items[${index}].itemId`, "item_unknown"
      );
    }

    const quantity = raw.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      throw new OrderValidationError(
        "Each item needs a whole quantity of at least 1.", `items[${index}].quantity`, "quantity_invalid"
      );
    }

    const existing = merged.get(itemId);
    if (existing) existing.quantity += quantity;
    else merged.set(itemId, { catalogItem, quantity });
  });

  const items = [];
  let subtotalCents = 0;
  let itemCount = 0;

  merged.forEach(({ catalogItem, quantity }) => {
    if (quantity > MAX_QUANTITY_PER_LINE) {
      throw new OrderValidationError(
        `You can order at most ${MAX_QUANTITY_PER_LINE} of any one item. Please contact us for larger orders.`,
        "items", "quantity_too_large"
      );
    }
    const category = getCategory(catalogItem.categoryId);
    const lineTotalCents = catalogItem.priceCents * quantity;
    items.push({
      itemId: catalogItem.id,
      categoryId: catalogItem.categoryId,
      categoryLabel: category ? category.label : catalogItem.categoryId,
      name: catalogItem.name,
      unitPriceCents: catalogItem.priceCents,
      quantity,
      lineTotalCents
    });
    subtotalCents += lineTotalCents;
    itemCount += quantity;
  });

  if (subtotalCents > MAX_ORDER_TOTAL_CENTS) {
    throw new OrderValidationError(
      "That order is larger than we can take through the website. Please contact us directly.",
      "items", "order_total_too_large"
    );
  }

  // ---- Required customer identity ----
  // A website order attempt must be identifiable: a name and a working
  // WhatsApp/mobile number, both required unconditionally. There is no
  // longer an anonymous-order path — one previously existed, which let a
  // fully anonymous cart persist as an indistinguishable "order" record.
  // Non-string input is rejected outright rather than coerced (unlike
  // optionalString above): a stray number/array/object silently becoming a
  // printable placeholder name would defeat the point of this requirement.
  if (typeof body.customerName !== "string" || !body.customerName.trim()) {
    throw new OrderValidationError("Full name is required.", "customerName", "name_required");
  }
  const customerName = body.customerName.trim().slice(0, 120);

  if (typeof body.customerPhone !== "string" || !body.customerPhone.trim()) {
    throw new OrderValidationError("A WhatsApp/mobile number is required.", "customerPhone", "phone_required");
  }
  const customerPhone = normalizePhone(body.customerPhone.trim());
  if (!isValidPhone(customerPhone)) {
    throw new OrderValidationError("That phone number doesn't look right.", "customerPhone", "phone_invalid");
  }

  // POPIA consent is now unconditionally required, for the same reason: no
  // path to a stored order exists without personal details being supplied.
  if (body.popiaConsent !== true) {
    throw new OrderValidationError(
      "Please agree to us storing your contact details to process this order.",
      "popiaConsent", "consent_required"
    );
  }

  // ---- Idempotency key ----
  // Required, not optional. It replaces the enquiry endpoint's fuzzy
  // "same payload within 30s" fallback, which would be actively wrong here:
  // two customers ordering the same kota moments apart is normal at a
  // walk-up trailer, and collapsing those would under-report a real sale.
  const submissionId = typeof body.submissionId === "string" ? body.submissionId.trim() : "";
  if (submissionId.length < 8 || submissionId.length > 100) {
    throw new OrderValidationError("Invalid submission identifier.", "submissionId", "submission_id_invalid");
  }

  return {
    items,
    lineCount: items.length,
    itemCount,
    subtotalCents,
    currency: CURRENCY,
    catalogVersion: CATALOG_VERSION,
    customerName,
    customerPhone,
    customerNote: optionalString(body.customerNote, 500),
    popiaConsent: true,
    submissionId
  };
}

module.exports = { validateOrderSubmission, OrderValidationError };
