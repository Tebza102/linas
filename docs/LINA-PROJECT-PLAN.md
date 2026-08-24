# Lina Project Plan
**Sprint:** 28–31 July 2026  
**Status:** Active

## Milestone 1 — Control pack and asset intake
**Target:** 28 July
- Place this document pack in ChatGPT project files and the Claude repository.
- Add logo/brand files, menu files and Instagram source material to `assets/source/brand/`, `assets/source/menu/` and `assets/source/social/` respectively.
- Audit repository and confirm stack, data layer and deployment.
- Confirm Phase 1 scope and primary customer journeys.

**Done when:** Claude has read the pack, the source assets are organised and risks are recorded.

**Status (28 Jul):** Done, with one open item. Source assets are in place and organised (logo, favicon, menu PDF, 12 images, 11 video clips). Risk recorded: only 1 of 12 supplied images is a confirmed genuine Lina photo — 8 are unrelated fine-dining/wellness content and were rejected from design use; see Client Inputs Register I-012/I-013 and Decision Log D-007.

## Milestone 2 — Three product/design directions
**Target:** Before client discussion on 29 July
- Produce Premium Catering direction.
- Produce Mobile Kitchen & Ordering direction.
- Produce Integrated Growth Platform direction.
- Include desktop/mobile key views and rationale.
- Prepare a concise client presentation.

**Done when:** Three distinct, credible choices are reviewable without building three separate products.

**Status (28 Jul):** Done. Three directions produced as working documents under `assets/mockups/working/` (Direction A — Cinematic Chef Story; Direction B — Visual Food and Menu Experience; Direction C — Integrated Growth Platform), each demonstrating the same one-page structure on a shared design system (`assets/brand/working/lina-design-system-foundation-v1-20260728.md`). Comparison and recommendation recorded in `assets/mockups/working/lina-direction-comparison-recommendation-v1-20260728.md` and `docs/LINA-DECISION-LOG.md` D-006. Direction C recommended, pending Milestone 3.

## Milestone 3 — Direction approval and scope freeze
**Target:** 29 July after client feedback
- Record selected direction.
- Confirm retained elements from other directions.
- Freeze Phase 1 scope.
- Place all extras into Phase 2 or reject them.
- Update Decision Log.

**Done when:** Claude has one unambiguous direction and one frozen feature list.

**Status (28 Jul):** Final client approval not yet reached — this milestone is explicitly client-dependent ("after client feedback") and has not been pre-empted. However, Tebogo has since **provisionally approved Direction C for prototype production** (D-009), retaining Direction A's chef/trailer storytelling and editorial occasions presentation plus Direction B's visual menu and WhatsApp ordering action. A front-end-only, client-reviewable prototype is being built on this provisional basis — this is distinct from, and does not substitute for, the final scope-freeze this milestone still requires once client feedback lands.

**Interim — video media review (28 Jul):** All 11 raw video clips visually reviewed (contact sheets in `assets/mockups/working/video-review/`, findings in `docs/LINA-VIDEO-MEDIA-REVIEW.md`). All confirmed genuine (`@CHEF_LINA_MOEK` watermark). Hero decision: video-led on mobile, image-led on desktop, since all footage is portrait/vertical with no landscape option. See Decision Log D-008.

**Interim — prototype build complete (28 Jul):** The Direction C static front-end prototype (`assets/mockups/working/prototype/`) is built and verified — see Decision Log D-010. This is a client-review artifact only: no backend, database, admin dashboard, or deployment. Still **provisional**, not a substitute for this milestone's actual client-approval step.

**Interim — poster-led homepage first direction (2 Aug):** A new first-screen-only homepage direction was built on `feat/poster-led-luxury-refinement`, on top of the live production site (which stays behind the Coming Soon gate throughout, per D-024) — see Decision Log D-025 for the full build, the four logged brand-system divergences (homepage-only `#B2373E`, white/red-led composition, the logo's red backing plate, the labelled MENU control), and the `Green-plate.png` exclusion. Every existing backend/operational feature is untouched and re-verified (90/90 unit tests, 51/51 rules tests, 0 vulnerabilities, unchanged from baseline). This is a client-review artifact only, previewed but **not committed, pushed, merged or deployed** — awaiting explicit approval of the visual direction, same provisional status as the note above.

**Interim — poster-led homepage rebuilt as a split editorial hero (2 Aug, same day):** D-025's numbered-index direction was superseded, not iterated on, per explicit instruction with a reference image — see Decision Log D-026. Same first-screen-only scope, same untouched backend, same "not committed/pushed/merged/deployed" status; the four D-025 divergences carry forward unchanged. Re-verified after the rebuild: 90/90 unit tests, 51/51 rules tests, 0 vulnerabilities, zero overflow/console errors at 1440/1280/768/390px. This is now the current homepage preview — still awaiting explicit approval of the visual direction.

**Pre-launch remediation (24 Aug, `release/2026-09-01-launch-prep`, baseline `cb5fc9a`):** Documentation reconciled to match the homepage actually shipping toward the 1 Sept launch target — see Decision Log D-031. The homepage now also carries an "Our Offerings" section (Catering/Mobile Kitchen/Today's Menu, each a real link) built and corrected after D-028, and D-025's destination-hover interaction turned out to still be live in code despite D-026's note that it was removed — both now accurately recorded. A P0 nav-icon/header-contrast finding from this round's pre-launch audit was investigated and found already resolved by an earlier untracked fix; a minor homepage focus-ring colour-token gap was corrected. Asset Register and I-018 status corrected to reflect which 2026-08-02 batch images are actually deployed. **Still not committed to `main`, not merged, not deployed to Production, and I-018's usage-rights confirmation remains outstanding** — this round is documentation/CSS-token remediation only, not a launch or client-approval event.

## Milestone 4 — Brand application and sales assets
**Target:** 29–30 July
- Brand application sheet.
- Menu design/template.
- Digital flyer.
- Business card/contact card.
- Social post/story templates.
- Uniform, signage and mobile-kitchen mock-ups where source material permits.
- Website/device presentation mock-ups.

**Done when:** Approved exports are stored in the relevant `assets/*/approved/` folder, named consistently and ready for client presentation/use.

## Milestone 5 — Functional Phase 1 build
**Target:** 30 July
- Complete public pages and core journeys.
- Implement lead/order persistence.
- Implement admin inbox, statuses and notes.
- Implement basic analytics dashboard.
- Complete privacy, validation and failure states.

**Done when:** Customer-to-admin flow works end-to-end with stored data.

**Status (29 Jul):** Not yet reached as a production milestone, but a **working demo preview** of this exact flow was built and verified ahead of schedule for the client meeting: enquiry → real local-database persistence → admin inbox with statuses and notes → dashboard, all confirmed end-to-end via automated testing (see `docs/LINA-CLIENT-WORKING-MODEL-DEMO.md` and Decision Log D-014). This is explicitly a local, non-production demo (no auth, no hosting, no real historical data) — it proves the flow works, it does not close this milestone. Full production build, real authentication, and deployment remain scheduled as before.

**Status (30 Jul):** The real Firebase-backed platform superseding the demo is built and verified on a Vercel preview against real production Firebase (see Decision Log D-015): Firestore persistence, role-based `/admin` portal, security rules, and a controlled admin-bootstrap process (first owner account created). The enquiry-notification workflow was then reworked after manual testing surfaced ambiguity — safer duplicate handling, honest email-delivery status (pending/accepted/delivered/delayed/bounced/failed/suppressed), independent owner/customer email tracking, and a signature-verified Resend webhook (see Decision Log D-016). **Remaining before this milestone is fully closed:** (1) Tebogo verifies a real sending domain in Resend — customer confirmation emails currently only work when sent to the Resend account's own address; (2) the Resend webhook needs to be registered in the Resend dashboard (steps given separately); (3) PR still unmerged and production still untouched pending final review and explicit go-ahead.

**Status (30 Jul, later):** PR #2 was merged and Production deployed (real Firebase, SMTP notification workflow, `linas.co.za` domain added pending DNS). Immediately after, the admin-panel priority was revised: away from kitchen-operations planning toward sales-and-marketing, since that is the platform's actual immediate business need. The admin panel was rebuilt accordingly — see Decision Log D-018 for the full account — into an Overview command centre, Sales Pipeline, one master Calendar, Marketing Centre (content planner + campaign tracker), Quotations, Invoices, and Reports, all behind a shared sidebar, with lead source/campaign/UTM tracking added to the enquiry record. This work is on `feat/firebase-admin-platform`, verified on a fresh preview, **not yet merged or deployed to Production**.

**Status (31 Jul):** Client approved Version 2/Direction D as the public site. It is now the site's only public-facing experience at clean URLs (`/`, `/catering`, `/menu`, `/chef-lina`, `/mobile-kitchen`, `/gallery`, `/contact`), with every internal review/approval-status comment removed from public view. The admin panel got the visible redesign the brief called for (branded 280px sidebar, grouped Sales/Marketing/System navigation), a restructured Overview (header, 6 KPIs, 5 real-data charts, 4 compact linking panels), a new Users module with a working (but not yet used) invitation flow, `developer`/`observer` roles, and a session-shared public↔admin "Admin" link. See Decision Log D-020 for the full account, including the one real bug found and fixed (`menu-data.js` relative image paths) and the one open item: the updated Firestore rules (needed for `developer`/`observer` to work against real data) are proven correct against the emulator but not yet deployed to the real `lina-s` project, pending explicit approval. Still on `feat/firebase-admin-platform`, unmerged, Production untouched.

**Status (31 Jul, later still):** The order-tracking release (commit `e55e6df`) is now **live on Production** at `linas.co.za`, under explicit written release authorization. Composite Firestore indexes deployed and confirmed `READY`; Firestore rules re-confirmed live; full lifecycle re-verified directly against Production (not just Preview) via headless-browser automation — public cart, real order creation, and an owner/developer/observer walk-through of the actual admin UI using temporary, clearly-named test accounts (deleted immediately after use). See Decision Log D-022 for the complete account, including one open item carried forward: no "Pay online" UI exists yet (online payment was never in scope this round), so a release-checklist line referencing it had nothing to confirm.

**Status (31 Jul, later):** Backend order records and sales tracking added — the public "Order via WhatsApp" action now creates a server-priced, server-validated order in Firestore before WhatsApp opens, rather than only generating a message. Full pipeline built: server-side price authority (`api/_lib/menu-catalog.js`) with a drift-detecting parity test; a rate-limited, idempotent order-creation endpoint (`api/orders/create.js`) that never trusts a client-supplied price or subtotal; new `orders`/`orderActivities` Firestore rules (server-only create/delete, allowlisted updates, terminal orders protected); a public two-step cart (`assets/mockups/working/prototype-v2/cart.js`) whose confirmation step is a real, pre-rendered WhatsApp link so mobile popup-blocking can't intervene; and an admin Orders module (Today board + full history) with owner/developer write, observer read-only, staff excluded (open question — see Client Inputs Register I-017). Only `Collected` counts as a sale; order revenue is kept structurally separate from enquiry revenue throughout (own fields, own units, own dashboard panel, own Reports section and CSV, growth-goal bar untouched). See Decision Log D-021 for the full account. **Fully verified against real production Firestore on a fresh Preview**, not just the emulator — including a real order placed through the actual deployed UI via headless-browser automation, a forged client-side price proven ignored, idempotency and rate-limiting both proven live, and the order walked through every status to Collected with the correct audit trail and sales-figure separation. One real gap was found and fixed during this verification: the new Firestore rules for orders had never actually been deployed to the live `lina-s` project (they existed only in the emulator-tested file) — deployed with explicit approval once found, and re-confirmed that unauthenticated access is still correctly denied. One outstanding follow-up: the composite Firestore indexes for `orders`/`orderActivities` (`firestore.indexes.json`) still need deploying — this only affects the order-detail activity-history lookup, not order creation or any dashboard/report figure. Still on `feat/firebase-admin-platform`, unmerged, Vercel Production untouched.

## Milestone 6 — QA, release and handover
**Target:** 31 July
- Run full checklist.
- Resolve critical defects.
- Produce private/final deployment.
- Update project documents.
- Record Phase 2 backlog and client-input gaps.
- Prepare training/support handover.

**Done when:** Build passes quality gates and the client can review a stable release.

## Phase 2 backlog (recorded 30 Jul, per Decision Log D-018)
Deferred in full, not started:
- Inventory/stock management and stock calculations
- Supplier records and ingredient planning
- Equipment checklists
- Staff scheduling
- Transport/logistics workflows
- Detailed kitchen-production planning
- Automated event-preparation checklists
- A general-purpose task-management module (a narrow, source-derived follow-up view — enquiry/quotation/invoice/content dates — covers Phase 1's needs instead)
- Real API integrations for Instagram/Facebook/Google Business Profile (currently honest "Setup required"/"Connected" status only, no follower/engagement metrics)
- A genuine Resend (or equivalent) delivery-status webhook, if a future round reintroduces a provider that supports one
- A server-generated provenance marker (e.g. `createdVia: "e2e-test" | "admin-maintenance" | "public-form"`) written at record-creation time, so future test/QA records are distinguishable from real ones without relying on name-pattern matching after the fact — see Decision Log D-019
- A payment gateway for orders — explicitly out of scope for this round (Decision Log D-021); `paymentStatus`/`paymentMethod` fields exist and are staff-editable, but no online payment is processed
- Notification-on-order-creation — an order currently surfaces to Lina only when she opens the admin Orders module (mitigated by the sidebar pending-count badge); an owner email/push per new order is a candidate for a later round
- Staff access to the Orders module — deliberately excluded this round; see Client Inputs Register I-017 for the open question and the small contained change needed to admit it

## Immediate maintenance roadmap (recorded 31 Jul, per Decision Log D-020)
- **Developer Diagnostics / Platform Observations** — deliberately time-boxed out of this round to protect the public-site consolidation and admin restructure. Brief design sketch for a future lightweight pass:
  - **Data model:** a single `platformObservations` Firestore collection. Each doc: `{ area: string, severity: "info"|"warning"|"issue", summary: string, detail: string|null, relatedRoute: string|null, createdBy: uid, createdAt, resolvedAt: timestamp|null }`. No new field on any existing collection — kept fully separate so it can never leak into customer-facing data.
  - **Permissions:** read/write restricted to `isDeveloper()` only in `firestore.rules` (not owner, not observer, not staff — "never appear to Owner, Observer or ordinary Staff unless deliberately shared" per this round's brief). A future `sharedWithOwner: boolean` field could relax this per-item if ever needed.
  - **UI:** one new sidebar item under System, visible only to `role === "developer"`, reusing the existing `panel-list`/`record-row` primitives already in `admin.css` — no new visual system required.
  - **Population:** manual entry only at first (a developer types up what they noticed); a future iteration could have build/QA scripts write entries automatically (e.g. a broken-link check, a missing-image check) via the Admin SDK.
  - **Effort estimate:** roughly the same size as the Settings page (one collection, one rule block, one simple CRUD page) — small, but real work; deferred rather than rushed.

## Outstanding infrastructure item (recorded 31 Jul, per Decision Log D-021)
- **Composite Firestore indexes for `orders`/`orderActivities` are defined in `firestore.indexes.json` but not yet deployed to the live `lina-s` project** — a separate action from the rules deploy (which is done). It does not affect order creation, the Today board, or any dashboard/report figure; it will only affect the order-detail panel's activity-history lookup, which will show a Firestore "requires an index" error until resolved. Deploy with `firebase deploy --only firestore:indexes --project lina-s` (needs the same explicit approval as any live-infrastructure change), or create the specific index via the auto-generated link Firestore returns in that error.

## Interactive digital menu review asset (3 Aug 2026)

**Status:** Complete as a REVIEW artifact; see Decision Log D-029.

- Eight-page A4 interactive PDF produced under `assets/menu/working/digital-menu-v1.0/`.
- Editable HTML/CSS/config source and repeatable zero-package Chrome export script retained.
- Existing website menu data is reused; no duplicate price catalogue was introduced.
- All 18 items/prices reconcile and all 61 PDF actions pass endpoint/protocol validation.
- Mobile-kitchen meal actions use item-specific WhatsApp messages; catering actions use `/contact`.
- No website, backend, Firebase, authentication, route, package, environment or deployment file changed.
- The PDF remains `REVIEW` because production customer routes are still governed by the Coming Soon gate and client approval of this exported asset is not yet recorded.

## Daily status template
**Date:**  
**Completed:**  
**Current status:**  
**Risks/blockers:**  
**Client inputs needed:**  
**Decisions made:**  
**Next action:**  
**Reusable components created:**
