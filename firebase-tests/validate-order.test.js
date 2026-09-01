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

/**
 * A minimal valid body; overrides merge on top. Includes valid identity
 * fields by default (order-integrity change made them required) so every
 * pre-existing item/pricing test below keeps testing exactly one thing —
 * override a field to `undefined` to test it missing, not by omitting it,
 * since omitting a key that the base already supplies would not remove it.
 */
function body(overrides) {
  return {
    items: [{ itemId: "everyday-beef-stew-steak-fried-chicken", quantity: 1 }],
    submissionId: SUBMISSION_ID,
    customerName: "Thabo Nkosi",
    customerPhone: "0764834344",
    popiaConsent: true,
    ...overrides
  };
}

test("prices a single-item order from the server catalogue", () => {
  const result = validateOrderSubmission(body());
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].unitPriceCents, 6000);
  assert.equal(result.items[0].lineTotalCents, 6000);
  assert.equal(result.items[0].name, "Beef Stew, Steak or Fried Chicken with two side salads and dombolo");
  assert.equal(result.items[0].categoryLabel, "Everyday Favourites");
  assert.equal(result.subtotalCents, 6000);
  assert.equal(result.itemCount, 1);
  assert.equal(result.lineCount, 1);
  assert.equal(result.currency, "ZAR");
});

test("computes line totals and subtotal across multiple items", () => {
  const result = validateOrderSubmission(body({
    items: [
      { itemId: "everyday-beef-stew-steak-fried-chicken", quantity: 2 }, // 12000
      { itemId: "drinks-canned-soft-drink", quantity: 3 },                //  4500
      { itemId: "drinks-fruto-juice", quantity: 1 }                             //  1700
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
      itemId: "everyday-beef-stew-steak-fried-chicken",
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
      { itemId: "drinks-fruto-juice", quantity: 2 },
      { itemId: "drinks-fruto-juice", quantity: 3 }
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
      { itemId: "drinks-fruto-juice", quantity: 15 },
      { itemId: "drinks-fruto-juice", quantity: 10 }
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
    items: [{ itemId: "drinks-fruto-juice", quantity: 0 }]
  })), OrderValidationError);
});

test("rejects a negative quantity", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-fruto-juice", quantity: -1 }]
  })), OrderValidationError);
});

test("rejects a string quantity (no type coercion)", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-fruto-juice", quantity: "2" }]
  })), OrderValidationError);
});

test("rejects a fractional quantity", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-fruto-juice", quantity: 1.5 }]
  })), OrderValidationError);
});

test("rejects a quantity over the per-line cap", () => {
  assert.throws(() => validateOrderSubmission(body({
    items: [{ itemId: "drinks-fruto-juice", quantity: 21 }]
  })), OrderValidationError);
});

test("rejects more distinct lines than the per-order cap", () => {
  const items = [];
  for (let i = 0; i < 21; i++) items.push({ itemId: "drinks-fruto-juice", quantity: 1 });
  assert.throws(() => validateOrderSubmission(body({ items })), OrderValidationError);
});

test("honeypot field rejects the submission (never a fake success)", () => {
  assert.throws(() => validateOrderSubmission(body({ company: "Acme Ltd" })), OrderValidationError);
});

// ---- Required customer identity (order-integrity change) ----
// An anonymous order attempt is no longer representable at all: name,
// phone and consent are each unconditionally required, checked in that
// order. body()'s defaults already supply valid values for all three, so
// every case below overrides exactly the one field under test — to
// `undefined` for "missing", which correctly overrides the default (unlike
// simply omitting the key, which would not).

test("rejects a missing name", () => {
  assert.throws(() => validateOrderSubmission(body({ customerName: undefined })), OrderValidationError);
});

test("rejects a whitespace-only name", () => {
  assert.throws(() => validateOrderSubmission(body({ customerName: "   " })), OrderValidationError);
});

test("rejects a name of the wrong type (not coerced, unlike other fields)", () => {
  [123, ["Thabo"], { first: "Thabo" }, true].forEach((bad) => {
    assert.throws(
      () => validateOrderSubmission(body({ customerName: bad })),
      OrderValidationError,
      `expected rejection for customerName ${JSON.stringify(bad)}`
    );
  });
});

test("truncates an excessively long name to 120 characters rather than rejecting", () => {
  const result = validateOrderSubmission(body({ customerName: "A".repeat(400) }));
  assert.equal(result.customerName.length, 120);
});

test("rejects a missing phone", () => {
  assert.throws(() => validateOrderSubmission(body({ customerPhone: undefined })), OrderValidationError);
});

test("rejects a phone of the wrong type", () => {
  [4834344, ["076"], {}].forEach((bad) => {
    assert.throws(
      () => validateOrderSubmission(body({ customerPhone: bad })),
      OrderValidationError,
      `expected rejection for customerPhone ${JSON.stringify(bad)}`
    );
  });
});

test("rejects an invalid/too-short phone number", () => {
  assert.throws(() => validateOrderSubmission(body({ customerPhone: "12" })), OrderValidationError);
});

test("accepts a valid South African number and normalises formatting", () => {
  const result = validateOrderSubmission(body({
    customerName: "  Thabo Nkosi  ", customerPhone: "076 483 4344"
  }));
  assert.equal(result.customerName, "Thabo Nkosi");
  assert.equal(result.customerPhone, "076 483 4344");
  assert.equal(result.popiaConsent, true);
});

test("accepts an international-format South African number", () => {
  const result = validateOrderSubmission(body({ customerPhone: "+27 76 483 4344" }));
  assert.equal(result.customerPhone, "+27 76 483 4344");
});

test("rejects missing consent even when name and phone are both valid", () => {
  assert.throws(() => validateOrderSubmission(body({ popiaConsent: undefined })), OrderValidationError);
});

test("rejects consent explicitly set to false", () => {
  assert.throws(() => validateOrderSubmission(body({ popiaConsent: false })), OrderValidationError);
});

test("rejects a truthy but non-boolean consent value (no coercion)", () => {
  assert.throws(() => validateOrderSubmission(body({ popiaConsent: "yes" })), OrderValidationError);
});

test("a valid submission always returns popiaConsent: true", () => {
  const result = validateOrderSubmission(body());
  assert.equal(result.popiaConsent, true);
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
