"use strict";
/*
 * Firestore Security Rules tests, run against the Firebase Emulator Suite.
 * Requires the emulator running locally: `npm run emulators` in one
 * terminal, then `npm run test:rules` in another (or see
 * firebase-tests/run-with-emulator.js for a one-command version).
 */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  initializeTestEnvironment, assertFails, assertSucceeds
} = require("@firebase/rules-unit-testing");
const {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch
} = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "lina-s-rules-test",
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "..", "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8090
    }
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

// The real root cause of the earlier intermittent "create becomes an
// update" failures: without this, documents written by an EARLIER test
// (including from a previous npm run, if the emulator process wasn't
// fully torn down — see run-with-emulator.js) can still exist when a
// LATER test writes to the same id, turning what the test believes is a
// `create` into an `update` against already-existing data, which then
// gets evaluated against — and correctly denied by — the update rule
// instead. clearFirestore() before every single test removes this
// possibility entirely, which is why the arbitrary settle-delay this
// replaced was never a real fix, just a way of statistically avoiding it.
beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedEnquiry(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "enquiries", id), {
      referenceNumber: "LINA-20260101-0001",
      customerName: "Test Customer",
      phone: "0825551234",
      enquiryType: "Wedding",
      status: "New",
      assignedOwnerId: null,
      popiaConsent: true,
      viewedAt: null,
      ownerNotificationStatus: "accepted",
      customerConfirmationStatus: "accepted",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
  });
}

test("unauthenticated user cannot read a single enquiry", async () => {
  await seedEnquiry("e1", {});
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauth.firestore(), "enquiries", "e1")));
});

test("unauthenticated user cannot list enquiries", async () => {
  await seedEnquiry("e2", {});
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(getDocs(collection(unauth.firestore(), "enquiries")));
});

test("authorised owner can read an enquiry", async () => {
  await seedEnquiry("e3", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(getDoc(doc(owner.firestore(), "enquiries", "e3")));
});

test("staff can read an unassigned enquiry but not one assigned to someone else", async () => {
  await seedEnquiry("e4", { assignedOwnerId: null });
  await seedEnquiry("e5", { assignedOwnerId: "other-staff-uid" });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  // Reuse one Firestore instance for both calls — @firebase/rules-unit-testing
  // throws "Firestore has already been started..." if .firestore() is
  // invoked more than once on the same context.
  const staffDb = staff.firestore();
  await assertSucceeds(getDoc(doc(staffDb, "enquiries", "e4")));
  await assertFails(getDoc(doc(staffDb, "enquiries", "e5")));
});

test("public (unauthenticated) enquiry creation is denied — only the server endpoint may create", async () => {
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(setDoc(doc(unauth.firestore(), "enquiries", "hacker1"), {
    referenceNumber: "FAKE-0001",
    customerName: "Hacker",
    phone: "0000000000",
    enquiryType: "Wedding",
    status: "New",
    popiaConsent: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
});

test("even an authenticated admin cannot create an enquiry directly (server endpoint is the only writer)", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(setDoc(doc(owner.firestore(), "enquiries", "manual1"), {
    referenceNumber: "MANUAL-0001",
    customerName: "Manually added",
    phone: "0825551234",
    enquiryType: "Wedding",
    status: "New",
    popiaConsent: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
});

test("invalid status value is rejected on update", async () => {
  await seedEnquiry("e6", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(updateDoc(doc(owner.firestore(), "enquiries", "e6"), {
    status: "Not A Real Status",
    updatedAt: new Date()
  }));
});

test("staff cannot set quotedAmount (owner-only field)", async () => {
  await seedEnquiry("e7", {});
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(updateDoc(doc(staff.firestore(), "enquiries", "e7"), {
    status: "Quoted",
    quotedAmount: 5000,
    updatedAt: new Date()
  }));
});

test("owner can set quotedAmount", async () => {
  await seedEnquiry("e8", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "enquiries", "e8"), {
    status: "Quoted",
    quotedAmount: 5000,
    updatedAt: serverTimestamp()
  }));
});

test("Lost/Cancelled status without a lostReason is rejected", async () => {
  await seedEnquiry("e9", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(updateDoc(doc(owner.firestore(), "enquiries", "e9"), {
    status: "Lost/Cancelled",
    updatedAt: new Date()
  }));
});

test("role escalation is rejected — a user cannot change their own adminUsers role", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "adminUsers", "staff-uid"), {
      uid: "staff-uid", email: "staff@example.com", displayName: "Staff Person",
      role: "staff", active: true, createdAt: new Date(), lastLoginAt: null
    });
  });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(updateDoc(doc(staff.firestore(), "adminUsers", "staff-uid"), { role: "owner" }));

  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "adminUsers", "owner-uid"), {
      uid: "owner-uid", email: "owner@example.com", displayName: "Owner Person",
      role: "owner", active: true, createdAt: new Date(), lastLoginAt: null
    });
  });
  // Even an owner cannot edit their OWN role field.
  await assertFails(updateDoc(doc(owner.firestore(), "adminUsers", "owner-uid"), { role: "staff" }));
});

test("settings write is denied to staff, allowed to owner", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "settings", "business"), { dashboardGoal: 350000 });
  });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(updateDoc(doc(staff.firestore(), "settings", "business"), { dashboardGoal: 999 }));

  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "settings", "business"), { dashboardGoal: 400000 }));
});

test("enquiries can never be deleted from the client", async () => {
  await seedEnquiry("e10", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(deleteDoc(doc(owner.firestore(), "enquiries", "e10")));
});

test("staff can mark an enquiry as viewed once, but not twice, and not alongside another field", async () => {
  await seedEnquiry("e11", {});
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertSucceeds(updateDoc(doc(staffDb, "enquiries", "e11"), { viewedAt: serverTimestamp() }));
  // Second attempt: resource.data.viewedAt is no longer null, so this fails.
  await assertFails(updateDoc(doc(staffDb, "enquiries", "e11"), { viewedAt: serverTimestamp() }));

  await seedEnquiry("e12", {});
  await assertFails(updateDoc(doc(staffDb, "enquiries", "e12"), {
    viewedAt: serverTimestamp(),
    status: "Contacted"
  }));
});

test("notification fields cannot be set directly by an authenticated client, even an owner", async () => {
  // Seeded as "pending" (not the default "accepted") so the attempted
  // change below is a genuine value change — Firestore rules' diff() only
  // reports keys whose VALUE actually changes, so writing the same value
  // the field already holds would not exercise this check at all.
  await seedEnquiry("e13", { ownerNotificationStatus: "pending", customerConfirmationStatus: "pending" });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertFails(updateDoc(doc(ownerDb, "enquiries", "e13"), {
    ownerNotificationStatus: "delivered",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ownerDb, "enquiries", "e13"), {
    customerConfirmationStatus: "delivered",
    updatedAt: serverTimestamp()
  }));
});

test("submissionId cannot be set or altered by a client update", async () => {
  await seedEnquiry("e14", { submissionId: "server-generated-id" });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(updateDoc(doc(owner.firestore(), "enquiries", "e14"), {
    submissionId: "hacker-supplied-id",
    updatedAt: serverTimestamp()
  }));
});

// --- Bookings / calendar (Digital Business Platform improvement) ---

async function seedBooking(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "bookings", id), {
      title: "Test Wedding",
      eventType: "Wedding",
      linkedEnquiryId: null,
      customerName: "Test Customer",
      phone: "0825551234",
      email: "test@example.com",
      eventDate: "2026-12-01",
      bookingStatus: "Confirmed",
      assignedPerson: null,
      internalNotes: null,
      createdBy: "owner-uid",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
  });
}

test("unauthenticated user cannot read or create a booking", async () => {
  await seedBooking("b1", {});
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(getDoc(doc(unauthDb, "bookings", "b1")));
  await assertFails(setDoc(doc(unauthDb, "bookings", "hacker-booking"), {
    title: "Hacker", eventType: "Wedding", createdBy: "x", createdAt: new Date(), updatedAt: new Date()
  }));
});

test("staff can read an unassigned booking but not one assigned to someone else", async () => {
  await seedBooking("b2", { assignedPerson: null });
  await seedBooking("b3", { assignedPerson: "other-staff-uid" });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertSucceeds(getDoc(doc(staffDb, "bookings", "b2")));
  await assertFails(getDoc(doc(staffDb, "bookings", "b3")));
});

test("staff cannot create a booking — converting an enquiry is owner-only", async () => {
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(setDoc(doc(staff.firestore(), "bookings", "staff-created"), {
    title: "Staff Attempt", eventType: "Wedding", bookingStatus: "Tentative", createdBy: "staff-uid",
    createdAt: new Date(), updatedAt: new Date()
  }));
});

test("owner can create a booking", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(setDoc(doc(owner.firestore(), "bookings", "owner-created"), {
    title: "Owner Created", eventType: "Wedding", linkedEnquiryId: null,
    bookingStatus: "Tentative",
    createdBy: "owner-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("staff can add internalNotes only, not bookingStatus or customer details", async () => {
  await seedBooking("b4", {});
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertSucceeds(updateDoc(doc(staffDb, "bookings", "b4"), {
    internalNotes: "Customer called to confirm venue access.",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(staffDb, "bookings", "b4"), {
    bookingStatus: "Cancelled",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(staffDb, "bookings", "b4"), {
    customerName: "Renamed Customer",
    updatedAt: serverTimestamp()
  }));
});

test("owner can update bookingStatus; staff cannot delete a booking", async () => {
  await seedBooking("b5", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "bookings", "b5"), {
    bookingStatus: "Completed",
    updatedAt: serverTimestamp()
  }));

  await seedBooking("b6", {});
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(deleteDoc(doc(staff.firestore(), "bookings", "b6")));
});

// --- Marketing: content planner ---

async function seedContentItem(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "contentItems", id), {
      contentTitle: "Test post",
      platform: "Instagram",
      status: "Draft",
      assignedPerson: null,
      createdBy: "owner-uid",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
  });
}

test("unauthenticated cannot read content; staff cannot create content", async () => {
  await seedContentItem("c1", {});
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauth.firestore(), "contentItems", "c1")));

  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(setDoc(doc(staff.firestore(), "contentItems", "staff-created-content"), {
    contentTitle: "Staff Attempt", platform: "Instagram", status: "Draft",
    createdBy: "staff-uid", createdAt: new Date(), updatedAt: new Date()
  }));
});

test("staff assigned to a content item can update only its status, not owner", async () => {
  await seedContentItem("c2", { assignedPerson: "staff-uid" });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertSucceeds(updateDoc(doc(staffDb, "contentItems", "c2"), {
    status: "Ready", updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(staffDb, "contentItems", "c2"), {
    contentTitle: "Renamed", updatedAt: serverTimestamp()
  }));

  await seedContentItem("c3", { assignedPerson: "someone-else" });
  await assertFails(updateDoc(doc(staffDb, "contentItems", "c3"), {
    status: "Ready", updatedAt: serverTimestamp()
  }));
});

// --- Marketing: campaigns ---

test("staff can read but not write campaigns; owner can manage them", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(setDoc(doc(owner.firestore(), "campaigns", "camp1"), {
    campaignName: "Spring Wedding Push", status: "Active",
    createdBy: "owner-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));

  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertSucceeds(getDoc(doc(staffDb, "campaigns", "camp1")));
  await assertFails(updateDoc(doc(staffDb, "campaigns", "camp1"), { status: "Paused", updatedAt: serverTimestamp() }));
});

// --- Quotations / invoices: owner-only financial records ---

async function seedQuotation(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "quotations", id), {
      quoteNumber: "Q-0001", enquiryId: "e1", amount: 5000, status: "Draft",
      createdBy: "owner-uid", createdAt: new Date(), updatedAt: new Date(),
      ...data
    });
  });
}

test("staff cannot read, create or update quotations; unauthenticated is denied", async () => {
  await seedQuotation("q1", {});
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauth.firestore(), "quotations", "q1")));

  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  const staffDb = staff.firestore();
  await assertFails(getDoc(doc(staffDb, "quotations", "q1")));
  await assertFails(updateDoc(doc(staffDb, "quotations", "q1"), { status: "Sent", updatedAt: serverTimestamp() }));
});

test("owner can create and update a quotation", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "quotations", "q2"), {
    quoteNumber: "Q-0002", enquiryId: "e1", amount: 7500, status: "Draft",
    createdBy: "owner-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "quotations", "q2"), { status: "Sent", updatedAt: serverTimestamp() }));
});

test("staff cannot read or write invoices; owner can", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "invoices", "inv1"), {
      invoiceNumber: "INV-0001", enquiryId: "e1", total: 7500, amountPaid: 0, status: "Draft",
      createdBy: "owner-uid", createdAt: new Date(), updatedAt: new Date()
    });
  });
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(getDoc(doc(staff.firestore(), "invoices", "inv1")));

  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "invoices", "inv1"), {
    status: "Sent", updatedAt: serverTimestamp()
  }));
});

// --- Developer role: full system access, equivalent to owner ---

test("developer has owner-equivalent access: money fields, bookings, quotations, invoices, settings, user management", async () => {
  await seedEnquiry("e15", {});
  const dev = testEnv.authenticatedContext("dev-uid", { role: "developer" });
  const devDb = dev.firestore();

  await assertSucceeds(updateDoc(doc(devDb, "enquiries", "e15"), {
    status: "Quoted", quotedAmount: 12000, updatedAt: serverTimestamp()
  }));

  await assertSucceeds(setDoc(doc(devDb, "bookings", "dev-booking"), {
    title: "Dev Created", eventType: "Wedding", linkedEnquiryId: null,
    bookingStatus: "Tentative", createdBy: "dev-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));

  await assertSucceeds(setDoc(doc(devDb, "quotations", "dev-quote"), {
    quoteNumber: "Q-DEV-0001", enquiryId: "e15", amount: 12000, status: "Draft",
    createdBy: "dev-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));

  await assertSucceeds(setDoc(doc(devDb, "invoices", "dev-invoice"), {
    invoiceNumber: "INV-DEV-0001", enquiryId: "e15", total: 12000, amountPaid: 0, status: "Draft",
    createdBy: "dev-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const seedDb = ctx.firestore();
    await setDoc(doc(seedDb, "settings", "business"), { dashboardGoal: 350000 });
    await setDoc(doc(seedDb, "adminUsers", "staff-to-promote"), {
      uid: "staff-to-promote", email: "staff2@example.com", displayName: "Staff Two",
      role: "staff", active: true, createdAt: new Date(), lastLoginAt: null
    });
  });
  await assertSucceeds(updateDoc(doc(devDb, "settings", "business"), { dashboardGoal: 400000 }));
  await assertSucceeds(updateDoc(doc(devDb, "adminUsers", "staff-to-promote"), { role: "observer" }));
});

// --- Observer role: read-only everywhere, enforced by rules not just UI ---

test("observer can read business data but every write attempt is denied by rules", async () => {
  await seedEnquiry("e16", {});
  await seedBooking("b7", {});
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const seedDb = ctx.firestore();
    await setDoc(doc(seedDb, "campaigns", "camp2"), {
      campaignName: "Observer Read Check", status: "Active",
      createdBy: "owner-uid", createdAt: new Date(), updatedAt: new Date()
    });
    await setDoc(doc(seedDb, "quotations", "q3"), {
      quoteNumber: "Q-0003", enquiryId: "e16", amount: 5000, status: "Draft",
      createdBy: "owner-uid", createdAt: new Date(), updatedAt: new Date()
    });
    await setDoc(doc(seedDb, "invoices", "inv2"), {
      invoiceNumber: "INV-0002", enquiryId: "e16", total: 5000, amountPaid: 0, status: "Draft",
      createdBy: "owner-uid", createdAt: new Date(), updatedAt: new Date()
    });
  });

  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  const obsDb = observer.firestore();

  // Reads succeed across every business collection an observer is
  // permitted to view.
  await assertSucceeds(getDoc(doc(obsDb, "enquiries", "e16")));
  await assertSucceeds(getDoc(doc(obsDb, "bookings", "b7")));
  await assertSucceeds(getDoc(doc(obsDb, "campaigns", "camp2")));
  await assertSucceeds(getDoc(doc(obsDb, "quotations", "q3")));
  await assertSucceeds(getDoc(doc(obsDb, "invoices", "inv2")));

  // Every write attempt fails — including the single-field "mark as
  // viewed" update, which is deliberately the least-restrictive write
  // path on enquiries and still must be denied to a read-only role.
  await assertFails(updateDoc(doc(obsDb, "enquiries", "e16"), { viewedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(obsDb, "bookings", "b7"), { internalNotes: "Observer attempt", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(obsDb, "campaigns", "camp2"), { status: "Paused", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(obsDb, "quotations", "q3"), { status: "Sent", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(obsDb, "invoices", "inv2"), { status: "Sent", updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(obsDb, "quotations", "observer-created"), {
    quoteNumber: "Q-HACK", enquiryId: "e16", amount: 1, status: "Draft",
    createdBy: "observer-uid", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("observer cannot manage settings or users", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const seedDb = ctx.firestore();
    await setDoc(doc(seedDb, "settings", "business"), { dashboardGoal: 350000 });
    await setDoc(doc(seedDb, "adminUsers", "staff-uid2"), {
      uid: "staff-uid2", email: "staff3@example.com", displayName: "Staff Three",
      role: "staff", active: true, createdAt: new Date(), lastLoginAt: null
    });
  });
  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  const obsDb = observer.firestore();
  await assertFails(updateDoc(doc(obsDb, "settings", "business"), { dashboardGoal: 1 }));
  await assertFails(updateDoc(doc(obsDb, "adminUsers", "staff-uid2"), { role: "owner" }));
});

test("a signed-in user can update their own lastLoginAt only, regardless of role", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "adminUsers", "observer-uid"), {
      uid: "observer-uid", email: "observer@example.com", displayName: "Observer Person",
      role: "observer", active: true, createdAt: new Date(), lastLoginAt: null
    });
  });
  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  const obsDb = observer.firestore();
  await assertSucceeds(updateDoc(doc(obsDb, "adminUsers", "observer-uid"), { lastLoginAt: serverTimestamp() }));
  // Still cannot smuggle a role change in alongside it.
  await assertFails(updateDoc(doc(obsDb, "adminUsers", "observer-uid"), { lastLoginAt: serverTimestamp(), role: "owner" }));
});

// --- Orders: server-created, owner/developer-managed, observer read-only ---

async function seedOrder(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "orders", id), {
      referenceNumber: "LINA-ORD-20260731-0001",
      channel: "web-cart",
      status: "Pending WhatsApp",
      statusReason: null,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: null,
      paymentStatus: "Pending",
      paymentMethod: null,
      paymentReference: null,
      paymentUpdatedAt: null,
      items: [{ itemId: "drinks-juice", name: "Juice", unitPriceCents: 1700, quantity: 1, lineTotalCents: 1700 }],
      lineCount: 1,
      itemCount: 1,
      subtotalCents: 1700,
      currency: "ZAR",
      customerName: null,
      customerPhone: null,
      customerNote: null,
      popiaConsent: false,
      receivedAt: null,
      confirmedAt: null,
      preparingAt: null,
      readyAt: null,
      collectedAt: null,
      cancelledAt: null,
      notCollectedAt: null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      internalNotes: null,
      isTestRecord: false,
      submissionId: "seed-submission-0001",
      orderDateKey: "2026-07-31",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
  });
}

test("unauthenticated users cannot read, list or create orders", async () => {
  await seedOrder("o1", {});
  const unauth = testEnv.unauthenticatedContext();
  const unauthDb = unauth.firestore();
  await assertFails(getDoc(doc(unauthDb, "orders", "o1")));
  await assertFails(getDocs(collection(unauthDb, "orders")));
  await assertFails(setDoc(doc(unauthDb, "orders", "hacker-order"), {
    referenceNumber: "FAKE", status: "Collected", subtotalCents: 1,
    createdAt: new Date(), updatedAt: new Date()
  }));
});

test("even an owner cannot create an order directly — the server endpoint is the only writer", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(setDoc(doc(owner.firestore(), "orders", "manual-order"), {
    referenceNumber: "LINA-ORD-MANUAL", status: "Pending WhatsApp", subtotalCents: 5000,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("owner and observer can read orders; staff cannot", async () => {
  await seedOrder("o2", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(getDoc(doc(owner.firestore(), "orders", "o2")));

  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  await assertSucceeds(getDoc(doc(observer.firestore(), "orders", "o2")));

  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(getDoc(doc(staff.firestore(), "orders", "o2")));
});

test("observer and staff cannot update an order", async () => {
  await seedOrder("o3", {});
  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  await assertFails(updateDoc(doc(observer.firestore(), "orders", "o3"), {
    status: "Confirmed", statusUpdatedAt: serverTimestamp(), confirmedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  const staff = testEnv.authenticatedContext("staff-uid", { role: "staff" });
  await assertFails(updateDoc(doc(staff.firestore(), "orders", "o3"), {
    internalNotes: "staff note", updatedAt: serverTimestamp()
  }));
});

test("owner can advance Pending WhatsApp to Confirmed", async () => {
  await seedOrder("o4", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "orders", "o4"), {
    status: "Confirmed",
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: "owner-uid",
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("developer has the same order-management access as owner", async () => {
  await seedOrder("o5", {});
  const dev = testEnv.authenticatedContext("dev-uid", { role: "developer" });
  const devDb = dev.firestore();
  await assertSucceeds(getDoc(doc(devDb, "orders", "o5")));
  await assertSucceeds(updateDoc(doc(devDb, "orders", "o5"), {
    status: "Confirmed", statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: "dev-uid", confirmedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("an invalid order status or payment status is rejected", async () => {
  await seedOrder("o6", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o6"), {
    status: "Delivered By Drone", statusUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o6"), {
    paymentStatus: "Half Paid", updatedAt: serverTimestamp()
  }));
});

test("Cancelled requires a reason; Not Collected requires a reason", async () => {
  await seedOrder("o7", { status: "Confirmed" });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();

  await assertFails(updateDoc(doc(ownerDb, "orders", "o7"), {
    status: "Cancelled", statusUpdatedAt: serverTimestamp(),
    cancelledAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o7"), {
    status: "Cancelled", statusReason: "Customer changed their mind",
    statusUpdatedAt: serverTimestamp(), cancelledAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));

  await seedOrder("o8", { status: "Ready for Collection" });
  await assertFails(updateDoc(doc(ownerDb, "orders", "o8"), {
    status: "Not Collected", statusUpdatedAt: serverTimestamp(),
    notCollectedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o8"), {
    status: "Not Collected", statusReason: "Customer never arrived",
    statusUpdatedAt: serverTimestamp(), notCollectedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("marking Collected requires a server-time collectedAt — the sale timestamp cannot be faked", async () => {
  await seedOrder("o9", { status: "Ready for Collection" });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  // A back-dated or omitted collection time would corrupt daily sales.
  await assertFails(updateDoc(doc(ownerDb, "orders", "o9"), {
    status: "Collected", statusUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o9"), {
    status: "Collected", statusUpdatedAt: serverTimestamp(),
    collectedAt: new Date("2020-01-01"), updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o9"), {
    status: "Collected", statusUpdatedAt: serverTimestamp(),
    collectedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("a terminal order cannot be moved back to an active status", async () => {
  await seedOrder("o10", { status: "Collected", collectedAt: new Date() });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o10"), {
    status: "Preparing", statusUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await seedOrder("o11", { status: "Cancelled", statusReason: "test", cancelledAt: new Date() });
  await assertFails(updateDoc(doc(ownerDb, "orders", "o11"), {
    status: "Confirmed", statusUpdatedAt: serverTimestamp(),
    confirmedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("a Collected order still accepts internal notes and payment reconciliation", async () => {
  // This is the case a flat conjunction of the transition rules would break:
  // the status hasn't changed, so demanding a fresh collectedAt would be wrong.
  await seedOrder("o12", { status: "Collected", collectedAt: new Date() });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o12"), {
    internalNotes: "Customer collected late but happy.", updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o12"), {
    paymentStatus: "Refunded", paymentUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("order money, line items and identity are immutable from the client", async () => {
  // diff() only reports keys whose VALUE changes, so each of these writes a
  // genuinely different value than the seed — otherwise the check proves nothing.
  await seedOrder("o13", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o13"), { subtotalCents: 1, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o13"), {
    items: [{ itemId: "drinks-juice", name: "Juice", unitPriceCents: 1, quantity: 99, lineTotalCents: 99 }],
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o13"), { referenceNumber: "LINA-ORD-FAKE-9999", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o13"), { submissionId: "someone-elses-id", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o13"), { isTestRecord: true, updatedAt: serverTimestamp() }));
});

test("an admin backfilling customer details cannot grant POPIA consent on their behalf", async () => {
  await seedOrder("o14", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  // Filling in details the customer gave over WhatsApp is fine...
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o14"), {
    customerName: "Thabo Nkosi", customerPhone: "0764834344", updatedAt: serverTimestamp()
  }));
  // ...but consent is the customer's to give, never the admin's to record.
  await assertFails(updateDoc(doc(ownerDb, "orders", "o14"), {
    popiaConsent: true, updatedAt: serverTimestamp()
  }));
});

test("an order update without a server-time updatedAt is rejected", async () => {
  await seedOrder("o15", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(updateDoc(doc(owner.firestore(), "orders", "o15"), {
    internalNotes: "no timestamp", updatedAt: new Date("2020-01-01")
  }));
});

test("orders can never be deleted, even by an owner", async () => {
  await seedOrder("o16", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertFails(deleteDoc(doc(owner.firestore(), "orders", "o16")));
});

test("order activities are append-only and attributable", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "orderActivities", "oa1"), {
      orderId: "o1", orderReference: "LINA-ORD-20260731-0001", actionType: "created",
      previousValue: null, newValue: "Pending WhatsApp", createdBy: "system", createdAt: new Date()
    });
  });
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();

  await assertSucceeds(getDoc(doc(ownerDb, "orderActivities", "oa1")));
  // History is immutable once written — that is the whole point of an audit trail.
  await assertFails(updateDoc(doc(ownerDb, "orderActivities", "oa1"), { newValue: "Collected" }));
  await assertFails(deleteDoc(doc(ownerDb, "orderActivities", "oa1")));

  await assertSucceeds(setDoc(doc(ownerDb, "orderActivities", "oa2"), {
    orderId: "o1", orderReference: "LINA-ORD-20260731-0001", actionType: "status-change",
    previousValue: "Pending WhatsApp", newValue: "Confirmed",
    createdBy: "owner-uid", createdAt: serverTimestamp()
  }));
  // Cannot attribute an activity to someone else.
  await assertFails(setDoc(doc(ownerDb, "orderActivities", "oa3"), {
    orderId: "o1", actionType: "status-change", createdBy: "someone-else", createdAt: serverTimestamp()
  }));
});

test("observer can read order activities but cannot write them; unauthenticated is denied", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "orderActivities", "oa4"), {
      orderId: "o1", actionType: "created", createdBy: "system", createdAt: new Date()
    });
  });
  const observer = testEnv.authenticatedContext("observer-uid", { role: "observer" });
  const obsDb = observer.firestore();
  await assertSucceeds(getDoc(doc(obsDb, "orderActivities", "oa4")));
  await assertFails(setDoc(doc(obsDb, "orderActivities", "oa5"), {
    orderId: "o1", actionType: "note", createdBy: "observer-uid", createdAt: serverTimestamp()
  }));

  const unauth = testEnv.unauthenticatedContext();
  await assertFails(getDoc(doc(unauth.firestore(), "orderActivities", "oa4")));
});

test("a status change and its audit entry commit together in one batch", async () => {
  // The admin UI writes both in a writeBatch so an order's status can never
  // advance without its audit record. This proves both writes see the same
  // request.time, which both rules assert against.
  await seedOrder("o17", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  const batch = writeBatch(ownerDb);
  batch.update(doc(ownerDb, "orders", "o17"), {
    status: "Confirmed", statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: "owner-uid", confirmedAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  batch.set(doc(collection(ownerDb, "orderActivities")), {
    orderId: "o17", orderReference: "LINA-ORD-20260731-0001", actionType: "status-change",
    previousValue: "Pending WhatsApp", newValue: "Confirmed",
    createdBy: "owner-uid", createdAt: serverTimestamp()
  });
  await assertSucceeds(batch.commit());
});

test("order reference counters remain unreachable from any client", async () => {
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertFails(getDoc(doc(ownerDb, "counters", "ORD-20260731")));
  await assertFails(setDoc(doc(ownerDb, "counters", "ORD-20260731"), { count: 9999 }));
});

// --- Received status, and soft delete/restore (order-integrity change) ---
// "Delete" is never Firestore's delete operation — allow delete: if false
// stays absolute, proven again below. It is an update to exactly three
// metadata fields, so every test here uses updateDoc, never deleteDoc.

test("Received is a valid status between Pending WhatsApp and Confirmed", async () => {
  await seedOrder("o18", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  await assertSucceeds(updateDoc(doc(owner.firestore(), "orders", "o18"), {
    status: "Received", statusUpdatedAt: serverTimestamp(), statusUpdatedBy: "owner-uid",
    receivedAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
});

test("owner can soft-delete a non-deleted order with a valid reason", async () => {
  await seedOrder("o19", {});
  const owner = testEnv.authenticatedContext("owner-uid", { role: "owner" });
  const ownerDb = owner.firestore();
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o19"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Test",
    updatedAt: serverTimestamp()
  }));
  let after;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    after = await getDoc(doc(ctx.firestore(), "orders", "o19"));
  });
  const data = after.data();
  assert.equal(data.deletionReason, "Test");
  assert.equal(data.deletedBy, "owner-uid");
  assert.ok(data.deletedAt, "deletedAt should be set");
  // Every unrelated field is provably untouched by the soft-delete write.
  assert.equal(data.status, "Pending WhatsApp");
  assert.equal(data.customerName, null);
  assert.equal(data.subtotalCents, 1700);
  assert.equal(data.referenceNumber, "LINA-ORD-20260731-0001");
});

test("developer can soft-delete and restore, same as owner", async () => {
  await seedOrder("o20", {});
  const devDb = testEnv.authenticatedContext("dev-uid", { role: "developer" }).firestore();
  await assertSucceeds(updateDoc(doc(devDb, "orders", "o20"), {
    deletedAt: serverTimestamp(), deletedBy: "dev-uid", deletionReason: "Duplicate",
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(devDb, "orders", "o20"), {
    deletedAt: null, deletedBy: null, deletionReason: null, updatedAt: serverTimestamp()
  }));
});

test("owner can restore a currently-deleted order back to explicit null", async () => {
  await seedOrder("o21", { deletedAt: new Date(), deletedBy: "owner-uid", deletionReason: "Spam" });
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o21"), {
    deletedAt: null, deletedBy: null, deletionReason: null, updatedAt: serverTimestamp()
  }));
  let after;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    after = await getDoc(doc(ctx.firestore(), "orders", "o21"));
  });
  const data = after.data();
  assert.equal(data.deletedAt, null);
  assert.equal(data.deletedBy, null);
  assert.equal(data.deletionReason, null);
});

test("an invalid deletion reason is rejected", async () => {
  await seedOrder("o22", {});
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o22"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Because",
    updatedAt: serverTimestamp()
  }));
});

test("a currently-deleted order cannot be soft-deleted again", async () => {
  await seedOrder("o23", { deletedAt: new Date(), deletedBy: "owner-uid", deletionReason: "Test" });
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o23"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Duplicate",
    updatedAt: serverTimestamp()
  }));
});

test("deletedBy cannot be set on an order that isn't currently deleted", async () => {
  // Setting deletedAt/deletedBy/deletionReason all to null on an
  // already-not-deleted order is a genuine no-op (nothing actually differs)
  // and is correctly allowed by the ordinary update path, same as touching
  // updatedAt with no other change. What must be rejected is a write that
  // actually introduces deletion-shaped data on a non-deleted order without
  // satisfying isSoftDelete() — e.g. deletedBy alone, with deletedAt left
  // null: not a valid soft-delete (deletedAt isn't request.time) and not a
  // valid restore (nothing is currently deleted), and deletedBy is absent
  // from the general update's own field allowlist.
  await seedOrder("o24", {});
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o24"), {
    deletedBy: "owner-uid", updatedAt: serverTimestamp()
  }));
});

test("deletedBy must equal the caller's own uid, not an arbitrary value", async () => {
  await seedOrder("o25", {});
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o25"), {
    deletedAt: serverTimestamp(), deletedBy: "someone-else-entirely", deletionReason: "Test",
    updatedAt: serverTimestamp()
  }));
});

test("deletedAt must be the trusted request time, not a client-supplied date", async () => {
  await seedOrder("o26", {});
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o26"), {
    deletedAt: new Date("2020-01-01"), deletedBy: "owner-uid", deletionReason: "Test",
    updatedAt: serverTimestamp()
  }));
});

test("a soft-delete cannot smuggle a change to status, customer or money fields", async () => {
  await seedOrder("o27", {});
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(updateDoc(doc(ownerDb, "orders", "o27"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Test",
    status: "Collected", updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(ownerDb, "orders", "o27"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Test",
    subtotalCents: 1, updatedAt: serverTimestamp()
  }));
});

test("a terminal (Collected) order can still be soft-deleted", async () => {
  await seedOrder("o28", { status: "Collected", collectedAt: new Date() });
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertSucceeds(updateDoc(doc(ownerDb, "orders", "o28"), {
    deletedAt: serverTimestamp(), deletedBy: "owner-uid", deletionReason: "Test",
    updatedAt: serverTimestamp()
  }));
});

test("observer cannot soft-delete or restore an order", async () => {
  await seedOrder("o29", {});
  await seedOrder("o30", { deletedAt: new Date(), deletedBy: "owner-uid", deletionReason: "Test" });
  const obsDb = testEnv.authenticatedContext("observer-uid", { role: "observer" }).firestore();
  await assertFails(updateDoc(doc(obsDb, "orders", "o29"), {
    deletedAt: serverTimestamp(), deletedBy: "observer-uid", deletionReason: "Test", updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(obsDb, "orders", "o30"), {
    deletedAt: null, deletedBy: null, deletionReason: null, updatedAt: serverTimestamp()
  }));
});

test("staff and unauthenticated cannot soft-delete or restore an order", async () => {
  await seedOrder("o31", {});
  const staffDb = testEnv.authenticatedContext("staff-uid", { role: "staff" }).firestore();
  await assertFails(updateDoc(doc(staffDb, "orders", "o31"), {
    deletedAt: serverTimestamp(), deletedBy: "staff-uid", deletionReason: "Test", updatedAt: serverTimestamp()
  }));
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(updateDoc(doc(unauthDb, "orders", "o31"), {
    deletedAt: serverTimestamp(), deletedBy: "anon", deletionReason: "Test", updatedAt: serverTimestamp()
  }));
});

test("orders still can never be Firestore-deleted, deleted or not", async () => {
  await seedOrder("o32", {});
  await seedOrder("o33", { deletedAt: new Date(), deletedBy: "owner-uid", deletionReason: "Test" });
  const ownerDb = testEnv.authenticatedContext("owner-uid", { role: "owner" }).firestore();
  await assertFails(deleteDoc(doc(ownerDb, "orders", "o32")));
  await assertFails(deleteDoc(doc(ownerDb, "orders", "o33")));
});
