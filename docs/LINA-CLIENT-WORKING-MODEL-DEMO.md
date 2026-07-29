# Lina's — Client Working-Model Demo
**Date:** 2026-07-29 (prepared for the client meeting the following day)
**Status:** Working demo — local review environment, not the production platform.

## Purpose
Prove that Lina's is being built as a **digital business platform**, not only a website, by demonstrating one real, working, end-to-end business journey: a customer submits a catering enquiry, it is genuinely stored, Lina sees it in an admin view, updates its status and adds a follow-up note, and the dashboard figures update accordingly — all persisting across a browser refresh and a server restart.

This complements, and does not replace, the Direction D visual prototype (`/v2`) or the historical V1 prototype (`/`).

## Customer journey
Discover Lina's → Browse catering or menu → Request a quote → Receive confirmation → Lina follows up → Customer receives quote → Booking confirmed.

## Business operations journey
New enquiry → Stored in the system → Lina notified (visible in admin) → Lead reviewed → Status updated → Follow-up recorded → Quote sent → Booking confirmed or lost → Performance dashboard updated.

## Data fields captured per enquiry
Name, phone, email, event type, event date, event location, estimated guest count, service required, menu interest, budget range, additional notes, lead source, POPIA consent — plus a system-generated reference number, status, follow-up log, next-action date, and created/updated timestamps.

## Lead statuses
`New` → `Contacted` → `Quoted` → `Confirmed` / `Lost`, with `Completed` after a confirmed booking is delivered. Status and every follow-up note are persisted immediately.

## Dashboard metrics
Total enquiries; count per status (New/Contacted/Quoted/Confirmed/Completed/Lost); conversion rate (Confirmed+Completed ÷ closed leads); enquiries by source; enquiries by event type; progress toward the R350,000 mobile-kitchen growth goal (honestly shown at 0% — no real revenue exists yet in this demo, so no figure is invented); average response time (explicitly marked as a production-only placeholder, since this demo doesn't simulate elapsed real time between enquiry and first contact).

## How data is stored (technical, for the record)
A local SQLite database file (`data/lina-demo.db`), created and queried via Node's built-in `node:sqlite` module — no external service, no npm install, no localStorage. This is the "lightweight local demo API and file-backed persistence" called for when no production backend exists yet. Data persists across page refreshes and full server restarts (verified — see below). `data/*.db` is gitignored as runtime data, not source content.

## Demo limitations (explicit, not hidden)
- **Not production-secure.** The admin view (`admin.html`) has no login. It is clearly labelled as a client-review demo in its own banner. Production requires real authentication before this route is exposed.
- **No real historical data.** Every figure on the dashboard reflects only what has been entered during testing or the live meeting demo — nothing is backdated or invented.
- **No production integrations.** No email/SMS notification to Lina, no payment processing, no CRM, no analytics platform connection yet.
- **Reference numbers restart per environment.** Since this is a local file, reference numbers are sequential within this demo database only, not a production numbering scheme.
- **Average response time** cannot be demonstrated in a same-session demo and is explicitly marked as a placeholder.
- **R350,000 growth-goal progress** has no real revenue to calculate from yet and is honestly shown at 0%, not estimated.

## Production requirements still outstanding
Real authentication for the admin route; a production-grade database (or a promoted version of this same SQLite approach, depending on hosting decision); email/WhatsApp notification to Lina on new enquiries; confirmed contact details (WhatsApp number, address, hours — see Client Inputs Register I-006/I-007/I-013/I-014); real historical/financial data once the business starts taking bookings through the platform; full QA per `docs/LINA-TEST-AND-RELEASE-CHECKLIST.md`; final hosting and deployment (explicitly out of scope for this demo).

## Meeting demonstration sequence
Recommended order, matching `assets/mockups/working/demo/index.html`:
1. **Progress report** (`progress-report.html`) — what's done, in progress, and next.
2. **Customer & business journey** (`client-journey.html`) — plain-language explanation.
3. **Public platform** (`/v2`) — the visual prototype, for context.
4. **Enquiry form** (`enquiry.html`) — submit one real, live test enquiry; note the reference number shown.
5. **Admin view** (`admin.html`) — show the enquiry has arrived; change status New → Contacted; add a follow-up note; change status to Quoted.
6. **Dashboard** (`dashboard.html`) — show the figures reflect the change just made.
7. **Refresh the browser** on the admin view — show the record and its updates are still there.
8. **Flyer example** (`flyer.html`) — how a marketing asset feeds the same enquiry pipeline.
9. **Roadmap preview** (`roadmap-preview.html`) — structure preview only, not the final 12-month plan.

## Verified end-to-end test (run before this document was written)
1. Opened the public enquiry form. ✓
2. Submitted a real test catering enquiry through the actual form UI. ✓
3. A reference number was generated and shown on screen (`LINA-20260729-0001`). ✓
4. Opened the admin view. ✓
5. Confirmed the enquiry appeared in the lead table. ✓
6. Changed status from New to Contacted and saved. ✓
7. Added a follow-up note; confirmed it appears in the follow-up log with a timestamp. ✓
8. Changed status to Quoted and saved. ✓
9. Opened the dashboard; confirmed "Quotes sent" reflected the change. ✓
10. Navigated away and back (equivalent to a refresh). ✓
11. Confirmed the record, its status, and its follow-up note all remained exactly as saved. ✓

Zero console errors and zero failed network requests throughout. The test record was then deleted so the database starts empty for the actual client meeting — enquiry #1 in the room will be a genuine live demonstration, not a pre-loaded example.
