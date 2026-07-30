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
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, serverTimestamp
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
