"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateEnquirySubmission, ValidationError } = require("../api/_lib/validate-enquiry");

test("accepts a valid submission and normalises fields", () => {
  const result = validateEnquirySubmission({
    customerName: "  Thabo Nkosi  ",
    phone: "+27 82 555 1234",
    email: "  Thabo@Example.COM ",
    enquiryType: "Wedding",
    guestCount: "80",
    popiaConsent: true,
    source: "Instagram"
  });
  assert.equal(result.customerName, "Thabo Nkosi");
  assert.equal(result.email, "thabo@example.com");
  assert.equal(result.guestCount, 80);
  assert.equal(result.source, "Instagram");
  assert.equal(result.status, undefined); // status is set by the handler, not validation
});

test("rejects missing customerName", () => {
  assert.throws(() => validateEnquirySubmission({
    phone: "0825551234", enquiryType: "Wedding", popiaConsent: true
  }), ValidationError);
});

test("rejects missing/invalid phone", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "123", enquiryType: "Wedding", popiaConsent: true
  }), ValidationError);
});

test("rejects invalid enquiryType (not in the approved list)", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", enquiryType: "Birthday Bash", popiaConsent: true
  }), ValidationError);
});

test("rejects missing popiaConsent", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", enquiryType: "Wedding", popiaConsent: false
  }), ValidationError);
});

test("rejects an invalid email format when one is provided", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", enquiryType: "Wedding", popiaConsent: true, email: "not-an-email"
  }), ValidationError);
});

test("honeypot field rejects the submission (never a fake success)", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Bot", phone: "0825551234", enquiryType: "Wedding", popiaConsent: true, company: "SpamCo"
  }), ValidationError);
});

test("unknown/extra fields are silently dropped, not persisted", () => {
  const result = validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true,
    assignedOwnerId: "hacker-uid", quotedAmount: 999999, status: "Confirmed"
  });
  assert.equal("assignedOwnerId" in result, false);
  assert.equal("quotedAmount" in result, false);
  assert.equal("status" in result, false);
});

test("rejects an out-of-range guest count", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true, guestCount: "-5"
  }), ValidationError);
});

test("rejects a submission with no email (required as of Phase 1 customer confirmation)", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", enquiryType: "Wedding", popiaConsent: true
  }), ValidationError);
});

test("accepts and passes through a valid submissionId", () => {
  const result = validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true,
    submissionId: "client-generated-uuid-1234"
  });
  assert.equal(result.submissionId, "client-generated-uuid-1234");
});

test("rejects a malformed submissionId", () => {
  assert.throws(() => validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true,
    submissionId: "short"
  }), ValidationError);
});

test("accepts the expanded source list and captures UTM/campaign tracking fields", () => {
  const result = validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true,
    source: "Facebook",
    campaignId: "camp-123", campaignName: "Spring Wedding Push", campaignCode: "SPRING26",
    landingPage: "/campaigns/spring", referralPartner: "Jane's Florist",
    utmSource: "facebook", utmMedium: "cpc", utmCampaign: "spring_wedding_2026"
  });
  assert.equal(result.source, "Facebook");
  assert.equal(result.campaignId, "camp-123");
  assert.equal(result.campaignName, "Spring Wedding Push");
  assert.equal(result.campaignCode, "SPRING26");
  assert.equal(result.landingPage, "/campaigns/spring");
  assert.equal(result.referralPartner, "Jane's Florist");
  assert.equal(result.utmSource, "facebook");
  assert.equal(result.utmMedium, "cpc");
  assert.equal(result.utmCampaign, "spring_wedding_2026");
});

test("falls back to Website source and null tracking fields when none are supplied", () => {
  const result = validateEnquirySubmission({
    customerName: "Test", phone: "0825551234", email: "test@example.com", enquiryType: "Wedding", popiaConsent: true
  });
  assert.equal(result.source, "Website");
  assert.equal(result.campaignId, null);
  assert.equal(result.utmSource, null);
});
