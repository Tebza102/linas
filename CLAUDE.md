# CLAUDE.md — Lina Digital Growth Platform

## Authority
Before meaningful work, read these files in order:
1. `docs/LINA-MASTER-PRODUCT-DELIVERY-BRIEF.md`
2. `docs/LINA-PROJECT-PLAN.md`
3. `docs/LINA-DECISION-LOG.md`
4. `docs/LINA-CLIENT-INPUTS-REGISTER.md`
5. `docs/LINA-TEST-AND-RELEASE-CHECKLIST.md`

The Master Product & Delivery Brief is the primary source of truth. The Decision Log records later approved changes.

## Mandatory operating rules
- Audit the repository before editing. Report stack, routes, data layer, auth, forms, current errors and deployment status.
- Do not begin full implementation until the product direction, core customer journey, Phase 1 scope and visual system are recorded.
- Do not silently add scope. Classify each new request as **Critical for Phase 1**, **Phase 2**, or **Rejected/unnecessary**.
- Do not invent final client facts, prices, testimonials, service areas or photographs. Use clearly labelled placeholders and update the Client Inputs Register.
- Build mobile-first and keep one consistent design system across every screen.
- Every visible action must work. Forms must persist to a production-capable database and expose submissions in an admin/lead view.
- Do not rely on localStorage for critical client, enquiry, order or analytics data.
- Include POPIA consent, privacy notice, validation, failure states, duplicate-submission handling and useful user feedback.
- Run type checks, lint, tests and production build after meaningful changes. Verify forms, database writes, notifications, permissions and mobile layouts.
- Preserve working architecture unless a change is justified in the Decision Log.
- At the end of each session, update the Decision Log, Client Inputs Register and project status section in the Project Plan.
- Record reusable components/modules created for later extraction into the Apprigate delivery system.

## Definition of done
A task is not complete because the UI exists. It is complete only when the user journey works end-to-end, data persists, errors are handled, tests/build pass and the result is documented.
