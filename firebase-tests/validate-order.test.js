"use strict";

/*
 * Order validation and server-side pricing.
 *
 * The headline test here is "client-supplied prices and totals are ignored".
 * Everything else guards the edges of a public, unauthenticated endpoint.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateOrderSubmission, OrderValidationError } = require("../api/_lib/validate-order");

const SUBMISSION_ID = "sub-12345678-abcd";

/** A minimal valid body; overrides merge on top. */
function body(overrides) {
  return {
    items: [{ itemId: "plates-short-rib-chakalaka-potato-salad", quantity: 1 }],
    submissionId: SUBMISSION_ID,
    ...overrides
  };
}

test("prices a single-item order from the server catalogue", () => {
  const result = validateOrderSubmission(body());
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].unitPriceCents, 6000);
  assert.equal(result.items[0].lineTotalCents, 6000);
  assert.equal(result.items[0].name, "Short-rib, chakalaka, potato salad");
  assert.equal(result.items[0].categoryLabel, "Plates");
  assert.equal(result.subtotalCents, 6000);
  assert.equal(result.itemCount, 1);
  assert.equal(result.lineCount, 1);
  assert.equal(result.currency, "ZAR");
});

test("computes line totals and subtotal across multiple items", () => {
  const result = validateOrderSubmission(body({
    items: [
      { itemId: "plates-short-rib-chakalaka-potato-salad", quantity: 2 }, // 12000
      { itemId: "chips-snacks-small-chips", quantity: 3 },                //  4500
      { itemId: "drinks-juice", quantity: 1 }                             //  1700
    ]
  }));
  assert.equal(result.subtotalCents, 18200);
  assert.equal(result.itemCount, 6);
  assert.equal(result.lineCount, 3);
});

test("client-supplied prices and subtotal are IGNORED, never trusted", () => {
  // The whole security posture of the endpoint in one test: a caller claiming
  // everything costs 1c must still be charged the real catalogue price.
  const result = validateOrderSubmission(body({
    items: [{
      itemId: "plates-short-rib-chakalaka-potato-salad",
      quantity: 2,
      unitPriceCents: 1,
      lineTotalCents: 2,
      price: "R0.01",
      priceCents: 1
    }],
    subtotalCents: 2,
    total: 2
  }));
  assert.equal(result.items[0].unitPriceCents, 6000);
  assert.equal(result.items[0].lineTotalCents, 12000);
  assert.equal(result.subtotalCents, 12000);
});

test("duplicate itemIds are merged into one line with summed quantity", () => {
  const result = validateOrderSubmission(body({
    items: [
      { itemId: "drinks-juice", quantity: 2 },
      { itemId: "drinks-juice", quantity: 3 }
    ]
  }));
  assert.equal(result.lineCount, 1);
  assert.equal(result.items[0].quantity, 5);
  assert.equal(result.items[0].lineTotalCents, 8500);
  assert.equal(result.subtotalCents, 8500);
});

test("duplicates are merged BEFORE the quantity cap, so they cannot smuggle past it", () => {
  // 15 + 10 of the same item = 25, over the per-line cap of 20. If the merge
  // happened after the cap check, this would wrongly succeed as two legal lines.
  assert.throws(() => validateOrderSubmission(body({
    items: [
      { itemId: "drinks-juice", quantity: 15 },
      { itemId: "drinks-juice", quantity: 10 }
    ]
  })), OrderValidationError);
});

test("rejects an unknown item id", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "not-a-real-dish", quantity: 1 }]
  })), OrderValidationError);
});

test("rejects an empty cart", () => {
  assert.throws(() => validateOrderSubmission(body({ items: [] })), OrderValidationError);
});

test("rejects items that are not an array", () => {
  assert.throws(() => validateOrderSubmission(body({ items: "juice" })), OrderValidationError);
});

test("rejects a non-object cart line", () => {
  assert.throws(() => validateOrderSubmission(body({ items: ["juice"] })), OrderValidationError);
});

test("rejects a missing itemId", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ quantity: 1 }]
  })), OrderValidationError);
});

test("rejects quantity 0", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-juice", quantity: 0 }]
  })), OrderValidationError);
});

test("rejects a negative quantity", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-juice", quantity: -1 }]
  })), OrderValidationError);
});

test("rejects a string quantity (no type coercion)", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-juice", quantity: "2" }]
  })), OrderValidationError);
});

test("rejects a fractional quantity", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-juice", quantity: 1.5 }]
  })), OrderValidationError);
});

test("rejects a quantity over the per-line cap", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-juice", quantity: 21 }]
  })), OrderValidationError);
});

test("rejects more distinct lines than the per-order cap", () => {
  const items = [];
  for (let i = 0; i < 21; i++) items.push({ itemId: "drinks-juice", quantity: 1 });
  assert.throws(() => validateOrderSubmission(body({ items })), OrderValidationError);
});

test("honeypot field rejects the submission (never a fake success)", () => {
  assert.throws(() => validateOrderSubmission(body({ company: "Acme Ltd" })), OrderValidationError);
});

test("an anonymous order needs no consent and stores no personal details", () => {
  const result = validateOrderSubmission(body());
  assert.equal(result.customerName, null);
  assert.equal(result.customerPhone, null);
  assert.equal(result.popiaConsent, false);
});

test("supplying a name without consent is rejected", () => {
  assert.throws(() => validateOrderSubmission(body({
    customerName: "Thabo Nkosi"
  })), OrderValidationError);
});

test("supplying a phone without consent is rejected", () => {
  assert.throws(() => validateOrderSubmission(body({
    customerPhone: "0764834344"
  })), OrderValidationError);
});

test("accepts name and phone when consent is given, and normalises the phone", () => {
  const result = validateOrderSubmission(body({
    customerName: "  Thabo Nkosi  ",
    customerPhone: "076 483 4344",
    popiaConsent: true
  }));
  assert.equal(result.customerName, "Thabo Nkosi");
  assert.equal(result.customerPhone, "076 483 4344");
  assert.equal(result.popiaConsent, true);
});

test("rejects an invalid phone number", () => {
  assert.throws(() => validateOrderSubmission(body({
    customerPhone: "12",
    popiaConsent: true
  })), OrderValidationError);
});

test("requires a submissionId of a sane length", () => {
  assert.throws(() => validateOrderSubmission(body({ submissionId: undefined })), OrderValidationError);
  assert.throws(() => validateOrderSubmission(body({ submissionId: "short" })), OrderValidationError);
});

test("truncates an over-long customer note rather than rejecting the order", () => {
  const result = validateOrderSubmission(body({ customerNote: "x".repeat(900) }));
  assert.equal(result.customerNote.length, 500);
});

test("unknown/extra fields are silently dropped, not persisted", () => {
  const result = validateOrderSubmission(body({
    status: "Collected",
    isTestRecord: true,
    referenceNumber: "LINA-ORD-FAKE",
    collectedAt: "2026-01-01"
  }));
  // A caller must never be able to seed a status, a reference, or mark its
  // own order collected — these simply do not exist on the returned object.
  assert.equal("status" in result, false);
  assert.equal("isTestRecord" in result, false);
  assert.equal("referenceNumber" in result, false);
  assert.equal("collectedAt" in result, false);
});

test("rejects a non-object body", () => {
  assert.throws(() => validateOrderSubmission(null), OrderValidationError);
  assert.throws(() => validateOrderSubmission("items"), OrderValidationError);
  assert.throws(() => validateOrderSubmission([]), OrderValidationError);
});

test("errors carry a field and a machine-readable code", () => {
  try {
    validateOrderSubmission(body({ items: [{ itemId: "nope", quantity: 1 }] }));
    assert.fail("should have thrown");
  } catch (err) {
    assert.equal(err instanceof OrderValidationError, true);
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, "item_unknown");
    assert.equal(typeof err.field, "string");
  }
});
