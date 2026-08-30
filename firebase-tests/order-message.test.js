"use strict";

/*
 * Golden-string tests for the WhatsApp order message.
 *
 * This exact text is both stored on the order record and sent by the
 * customer, so it is pinned rather than described — a silent change to the
 * wording would desynchronise what Lina reads from what was actually sent.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildOrderWhatsAppMessage, formatCents } = require("../api/_lib/order-message");

const TWO_LINES = [
  { name: "Short-rib, chakalaka, potato salad", quantity: 2, unitPriceCents: 6000, lineTotalCents: 12000 },
  { name: "Small chips", quantity: 1, unitPriceCents: 1500, lineTotalCents: 1500 }
];

test("formatCents always renders two decimal places", () => {
  assert.equal(formatCents(6000), "R60.00");
  assert.equal(formatCents(1250), "R12.50");
  assert.equal(formatCents(0), "R0.00");
  assert.equal(formatCents(undefined), "R0.00");
});

test("golden message: multiple items with a name and a note", () => {
  const msg = buildOrderWhatsAppMessage({
    referenceNumber: "LINA-ORD-20260731-0001",
    items: TWO_LINES,
    subtotalCents: 13500,
    customerName: "Thabo Nkosi",
    customerNote: "No atchar please."
  });
  assert.equal(msg, [
    "Hello Lina's, I would like to place the following order.",
    "",
    "Order reference:",
    "LINA-ORD-20260731-0001",
    "",
    "1. Short-rib, chakalaka, potato salad",
    "Quantity: 2",
    "Unit price: R60.00",
    "Line total: R120.00",
    "",
    "2. Small chips",
    "Quantity: 1",
    "Unit price: R15.00",
    "Line total: R15.00",
    "",
    "Order subtotal:",
    "R135.00",
    "",
    "Name:",
    "Thabo Nkosi",
    "",
    "Customer note:",
    "No atchar please.",
    "",
    "This order is awaiting confirmation and is not confirmed until Lina's replies. " +
    "Please confirm availability, collection or delivery arrangements, and the final payment method."
  ].join("\n"));
});

test("golden message: anonymous order renders 'None' for the note and no Name block", () => {
  const msg = buildOrderWhatsAppMessage({
    referenceNumber: "LINA-ORD-20260731-0002",
    items: [TWO_LINES[1]],
    subtotalCents: 1500,
    customerName: null,
    customerNote: null
  });
  assert.equal(msg.includes("Name:"), false);
  assert.equal(msg.includes("Customer note:\nNone"), true);
});

test("the message never renders a literal null or undefined", () => {
  const msg = buildOrderWhatsAppMessage({
    referenceNumber: "LINA-ORD-20260731-0003",
    items: [TWO_LINES[0]],
    subtotalCents: 12000,
    customerName: undefined,
    customerNote: undefined
  });
  assert.equal(/null|undefined/.test(msg), false);
});

test("the reference appears exactly once", () => {
  const msg = buildOrderWhatsAppMessage({
    referenceNumber: "LINA-ORD-20260731-0004",
    items: TWO_LINES, subtotalCents: 13500
  });
  assert.equal(msg.split("LINA-ORD-20260731-0004").length - 1, 1);
});

test("states plainly that the order is not yet confirmed", () => {
  // Opening WhatsApp is not a sale; the customer must not infer otherwise.
  const msg = buildOrderWhatsAppMessage({
    referenceNumber: "LINA-ORD-20260731-0005",
    items: TWO_LINES, subtotalCents: 13500
  });
  assert.equal(msg.includes("awaiting confirmation"), true);
  assert.equal(msg.includes("not confirmed until"), true);
});
