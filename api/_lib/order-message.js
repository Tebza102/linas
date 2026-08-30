"use strict";

/*
 * Builds the exact WhatsApp message text for an order.
 *
 * Deliberately a separate, pure module: the server stores this string on the
 * order record AND returns it to the browser for the wa.me link, so what the
 * customer sends and what Lina reads in admin are the same bytes by
 * construction rather than by two implementations agreeing.
 *
 * The message states plainly that the order is NOT confirmed. Opening
 * WhatsApp is not a sale, and the customer should never infer otherwise.
 */

/** Cents to a display string. Always shows cents, so R60 reads "R60.00". */
function formatCents(cents) {
  const n = Number(cents) || 0;
  return "R" + (n / 100).toFixed(2);
}

/**
 * `items` are the SERVER-priced lines, never the browser's.
 * Absent optional fields produce no line at all — the message must never
 * contain a literal "null" or "undefined".
 */
function buildOrderWhatsAppMessage({ referenceNumber, items, subtotalCents, customerName, customerNote }) {
  const lines = [];

  lines.push("Hello Lina's, I would like to place the following order.");
  lines.push("");
  lines.push("Order reference:");
  lines.push(referenceNumber);
  lines.push("");

  (items || []).forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Unit price: ${formatCents(item.unitPriceCents)}`);
    lines.push(`Line total: ${formatCents(item.lineTotalCents)}`);
    lines.push("");
  });

  lines.push("Order subtotal:");
  lines.push(formatCents(subtotalCents));
  lines.push("");

  if (customerName) {
    lines.push("Name:");
    lines.push(customerName);
    lines.push("");
  }

  lines.push("Customer note:");
  lines.push(customerNote || "None");
  lines.push("");

  lines.push(
    "This order is awaiting confirmation and is not confirmed until Lina's replies. " +
    "Please confirm availability, collection or delivery arrangements, and the final payment method."
  );

  return lines.join("\n");
}

module.exports = { buildOrderWhatsAppMessage, formatCents };
