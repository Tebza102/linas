# CLAUDE.md — Lina Digital Growth Platform

## Authority
Before meaningful work, read these files in order:
1. `docs/LINA-MASTER-PRODUCT-DELIVERY-BRIEF.md`
2. `docs/LINA-DECISION-LOG.md`
3. `docs/LINA-DESIGN-DNA.md`
4. `docs/LINA-PROJECT-PLAN.md`
5. `docs/LINA-CLIENT-INPUTS-REGISTER.md`
6. `docs/LINA-TEST-AND-RELEASE-CHECKLIST.md`

The Master Product & Delivery Brief is the primary source of truth. The Decision Log records later approved changes. For public visual/UI work, `docs/LINA-DESIGN-DNA.md` is mandatory and governs implementation unless a later approved Decision Log entry explicitly supersedes it.

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
- At the end of each session, update the Decision Log, Client Inputs Register and project status section in the Project Plan where the session materially changes those records. Do not invent a client input merely to create a log entry.
- Record reusable components/modules created for later extraction into the Apprigate delivery system.

## Public visual implementation team
For public design implementation, apply all of these lenses before declaring work complete:
- **Creative director / brand guardian** — protect the approved Lina's visual target and reject unapproved creative reinterpretation.
- **UI systems designer** — enforce Design DNA tokens, grid, spacing, typography, responsive rules and component consistency.
- **Front-end engineer** — implement the smallest maintainable HTML/CSS/JS change using the existing architecture.
- **Motion designer** — use only the restrained motion envelope defined in the Design DNA; motion is added after static visual approval.
- **UX and accessibility reviewer** — protect keyboard use, reduced motion, contrast, tap targets, performance and clear customer journeys.
- **Visual QA / release reviewer** — compare browser screenshots against the approved reference at required widths and verify that protected operational systems remain unchanged.

These are review responsibilities, not permission to introduce extra features, frameworks, dependencies or visual concepts.

## Approved-mock fidelity rule
For a task that supplies an approved mock:
- The mock is a **visual target, not inspiration**.
- Do not redesign, embellish or “improve” it during implementation without explicit approval.
- Build the static composition first. Do not add entrance animation while the static page still differs materially from the reference.
- Use exact approved assets; do not regenerate or substitute photography simply because an asset is inconvenient to place.
- Compare a fresh browser screenshot directly with the approved reference before moving from static layout to responsive behaviour, interaction or motion.
- When a browser result differs materially from the approved mock, treat that difference as an implementation defect until corrected or explicitly approved.

## Surgical implementation sequence
For substantial public visual work, use this sequence:

**Inspect → Change Contract → Static visual match → Responsive match → Interaction → Motion → Visual QA → Git diff review**

During inspection, identify the smallest file allowlist and protected systems. Do not edit during the inspection phase. If another file becomes necessary after the allowlist is approved, stop and explain why before editing it.

## Verification & Change Protocol
These rules apply to every change request on this project, design or otherwise — follow them by default, not only when a prompt spells them out explicitly.
- Confirm current state before changing anything. Never assume an earlier fix landed. Before starting new work, check each relevant piece of prior-requested state and report what's actually found — then fix anything that isn't as expected, as part of the same pass.
- Require exact references, not descriptions. If a request mentions "the background," "the layout," or similar without pointing at a specific selector/file/attached image, ask which exact element is meant rather than guessing from the phrase alone.
- Treat every change as a complete end-state, not just the named removal/addition. Removing a shadow, a background, or an element implies the full resulting layout (spacing, edges, alignment) — work out and state what the surroundings should look like once it's gone, don't leave that implicit.
- Verify with measured values, not visual impression. Use `getBoundingClientRect()`, computed style comparisons, exact hex/rgb — not "looks about right" or "confirmed" with nothing behind it. When two elements should share a color, confirm the underlying value is identical, not just visually similar.
- Name likely false alarms before they cause unnecessary churn. If a fill and an outline of the same color will render at different perceived intensities (a real, expected effect), say so up front rather than letting it look like a bug to be "fixed" in a later round.
- State what's explicitly out of scope, so nothing gets touched or dropped as an unintended side effect of a nearby change.
- Close every visual change with a fresh screenshot compared directly against the reference or prior state — not just a list of properties changed — and a verification checklist backed by actual measured results.
- For public visual work, also verify the implementation against `docs/LINA-DESIGN-DNA.md` and the approved reference stored under `assets/mockups/approved/`.

## Protected launch-critical systems during visual work
Unless a task explicitly authorises them, public visual work must not change:
- Coming Soon/private-preview gate
- Authentication or user permissions
- Firebase configuration, Firestore rules/indexes/schema
- Production environment variables
- Enquiry/order persistence
- Notification/email delivery
- API routes
- Payment functionality
- Deployment configuration, domains or DNS
- `package.json` or lockfiles
- Admin functionality
- Unrelated pages

## Definition of done
A task is not complete because the UI exists. It is complete only when the user journey works end-to-end, data persists, errors are handled, tests/build pass and the result is documented. A public visual task also requires reference-matched visual QA, responsive inspection, reduced-motion verification and a clean Git diff limited to the approved scope.
