"use strict";

// Server-side validation for public enquiry submissions. Kept separate from
// the HTTP handler so it can be unit-tested directly without spinning up a
// server or the Firebase emulator.

const ENQUIRY_TYPES = [
  "Wedding", "Funeral", "Corporate event", "Private function", "Mobile-kitchen order"
];
const CONTACT_METHODS = ["Phone", "Email", "WhatsApp"];
const SOURCES = [
  "Website", "Instagram", "Facebook", "WhatsApp", "Google",
  "Referral", "Direct outreach", "Campaign", "Other"
];

// Fields the public form may legitimately submit. Anything else in the
// request body is silently dropped, never persisted.
const ALLOWED_INPUT_FIELDS = [
  "customerName", "phone", "email", "preferredContactMethod", "enquiryType",
  "occasion", "eventDate", "eventTime", "location", "guestCount",
  "serviceRequirements", "menuRequirements", "dietaryRequirements",
  "deliveryOrCollection", "equipmentOrStaffing", "budgetGuidance", "message",
  "source", "campaign", "popiaConsent", "submissionId",
  // Lead-source/campaign tracking (Digital Business Platform sales/
  // marketing priority) — all captured automatically from the form/URL,
  // never typed manually by staff.
  "campaignId", "campaignName", "campaignCode", "landingPage",
  "referralPartner", "utmSource", "utmMedium", "utmCampaign"
];

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = 400;
  }
}

function normalizeEmail(email) {
  if (email == null || String(email).trim() === "") return null;
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone) {
  const trimmed = String(phone || "").trim();
  // Keep digits, leading +, spaces, hyphens and parentheses only.
  return trimmed.replace(/[^\d+\s()-]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates and normalises a raw request body into the exact field set that
 * will be persisted. Throws ValidationError on any failure. Honeypot
 * failures throw a distinct-but-still-rejected error rather than a silent
 * fake success, matching this project's "never claim success unless stored"
 * rule with no exceptions.
 */
function validateEnquirySubmission(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  // Honeypot: a hidden field real users never fill. Any value here is
  // rejected outright — no fake success response.
  if (body.company && String(body.company).trim() !== "") {
    throw new ValidationError("Submission rejected.", "company");
  }

  const customerName = String(body.customerName || "").trim();
  if (!customerName) throw new ValidationError("Full name is required.", "customerName");

  const phone = normalizePhone(body.phone);
  if (!phone || !isValidPhone(phone)) {
    throw new ValidationError("A valid phone number is required.", "phone");
  }

  const enquiryType = String(body.enquiryType || "").trim();
  if (!ENQUIRY_TYPES.includes(enquiryType)) {
    throw new ValidationError("A valid event type is required.", "enquiryType");
  }

  if (body.popiaConsent !== true) {
    throw new ValidationError(
      "POPIA consent is required before an enquiry can be stored.",
      "popiaConsent"
    );
  }

  // Email is required as of Phase 1's customer-confirmation feature: the
  // enquiry reference is meaningless to the customer without a channel to
  // also receive written confirmation of it.
  const email = normalizeEmail(body.email);
  if (!email) {
    throw new ValidationError("Email address is required.", "email");
  }
  if (!isValidEmail(email)) {
    throw new ValidationError("Email address is not valid.", "email");
  }

  // A client-generated idempotency key. Optional for backward compatibility
  // (an older cached page without this field still works, just falls back
  // to the short-window payload check below) but always validated if
  // present so it can't be abused to store arbitrary junk.
  let submissionId = null;
  if (body.submissionId != null) {
    const s = String(body.submissionId).trim();
    if (s.length < 8 || s.length > 100) {
      throw new ValidationError("Invalid submission identifier.", "submissionId");
    }
    submissionId = s;
  }

  const preferredContactMethod = CONTACT_METHODS.includes(body.preferredContactMethod)
    ? body.preferredContactMethod
    : null;

  const source = SOURCES.includes(body.source) ? body.source : "Website";

  let guestCount = null;
  if (body.guestCount != null && String(body.guestCount).trim() !== "") {
    const n = Number(body.guestCount);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      throw new ValidationError("Guest count is not valid.", "guestCount");
    }
    guestCount = Math.round(n);
  }

  function optionalString(key, maxLength) {
    if (body[key] == null) return null;
    const s = String(body[key]).trim();
    if (!s) return null;
    return maxLength ? s.slice(0, maxLength) : s;
  }

  return {
    customerName: customerName.slice(0, 200),
    phone,
    email,
    preferredContactMethod,
    enquiryType,
    occasion: optionalString("occasion", 200),
    eventDate: optionalString("eventDate", 20),
    eventTime: optionalString("eventTime", 20),
    location: optionalString("location", 300),
    guestCount,
    serviceRequirements: optionalString("serviceRequirements", 500),
    menuRequirements: optionalString("menuRequirements", 500),
    dietaryRequirements: optionalString("dietaryRequirements", 500),
    deliveryOrCollection: optionalString("deliveryOrCollection", 100),
    equipmentOrStaffing: optionalString("equipmentOrStaffing", 500),
    budgetGuidance: optionalString("budgetGuidance", 100),
    message: optionalString("message", 2000),
    source,
    campaign: optionalString("campaign", 100),
    campaignId: optionalString("campaignId", 100),
    campaignName: optionalString("campaignName", 200),
    campaignCode: optionalString("campaignCode", 100),
    landingPage: optionalString("landingPage", 300),
    referralPartner: optionalString("referralPartner", 200),
    utmSource: optionalString("utmSource", 100),
    utmMedium: optionalString("utmMedium", 100),
    utmCampaign: optionalString("utmCampaign", 100),
    popiaConsent: true,
    submissionId
  };
}

module.exports = {
  validateEnquirySubmission,
  ValidationError,
  ENQUIRY_TYPES,
  CONTACT_METHODS,
  SOURCES,
  ALLOWED_INPUT_FIELDS,
  normalizeEmail,
  normalizePhone,
  isValidEmail,
  isValidPhone
};
