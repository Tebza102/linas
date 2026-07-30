// Lina's admin portal — the single place that converts a Confirmed
// enquiry into a booking/calendar event, prefilled from the enquiry so
// nobody has to retype the customer's details. Shared by detail.js
// (the "Create booking" action) and anywhere else that needs it, so
// there is only one write path for this conversion.
import { db } from "./firebase-init.js";
import {
  collection, addDoc, getDocs, query, where, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ENQUIRY_TYPE_TO_EVENT_TYPE = {
  "Wedding": "Wedding",
  "Funeral": "Funeral",
  "Corporate event": "Corporate event",
  "Private function": "Private function",
  "Mobile-kitchen order": "Mobile kitchen service"
};

export async function findBookingForEnquiry(enquiryId) {
  const snap = await getDocs(query(collection(db, "bookings"), where("linkedEnquiryId", "==", enquiryId), limit(1)));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function createBookingFromEnquiry(enquiry, uid) {
  const now = serverTimestamp();
  const ref = await addDoc(collection(db, "bookings"), {
    title: `${enquiry.customerName} — ${enquiry.enquiryType}`,
    eventType: ENQUIRY_TYPE_TO_EVENT_TYPE[enquiry.enquiryType] || "Other",
    linkedEnquiryId: enquiry.id,
    customerName: enquiry.customerName,
    phone: enquiry.phone,
    email: enquiry.email || null,
    eventDate: enquiry.eventDate || null,
    bookingStatus: "Confirmed",
    assignedPerson: enquiry.assignedOwnerId || null,
    internalNotes: null,
    createdBy: uid,
    createdAt: now,
    updatedAt: now
  });
  return ref.id;
}
