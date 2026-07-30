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

## Daily status template
**Date:**  
**Completed:**  
**Current status:**  
**Risks/blockers:**  
**Client inputs needed:**  
**Decisions made:**  
**Next action:**  
**Reusable components created:**
