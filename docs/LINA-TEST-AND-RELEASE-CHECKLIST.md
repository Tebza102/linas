# Lina Test and Release Checklist
A feature may be marked complete only when the relevant checks pass.

## Product and scope
- [ ] Selected direction is recorded.
- [ ] Phase 1 scope is frozen.
- [ ] Phase 2 items are separated.
- [ ] No invented client facts or prices remain.

## Customer journeys
- [ ] Catering enquiry works from landing page to admin inbox.
- [ ] Order/WhatsApp-assisted flow works and gives clear confirmation.
- [x] Order is recorded in the backend BEFORE WhatsApp opens; opening WhatsApp never counts as a sale on its own. Verified against real production Firestore, 31 Jul (Decision Log D-021).
- [x] A client-supplied price/subtotal on an order is never trusted — the server always prices from the catalogue. Verified live by forging a value and confirming it was ignored.
- [x] Only `Collected` orders count as sales; order revenue never mixes with enquiry revenue (separate fields, separate units, separate dashboard/report sections, growth-goal bar untouched).
- [ ] Social/campaign links land on the correct offer.
- [ ] Repeat/return journey is understandable.

## Coming Soon / private preview gate (per Decision Log D-023 — run before ever setting COMING_SOON_ENABLED=true in a real environment)
- [ ] `COMING_SOON_COOKIE_SECRET` and `COMING_SOON_REVIEWER_PASSWORD` are set to real values (never the test placeholders in .env.example).
- [ ] Gate-on: every protected route AND its raw `.html` twin redirects for an unauthenticated visitor.
- [ ] Gate-on: `/admin/*` and `/api/*` still work exactly as normal.
- [ ] Gate-off (or the env var unset): the site is byte-identical to a normal deploy.
- [ ] A tampered/expired/wrong-version cookie is rejected, not just a missing one.
- [ ] `admin:check` includes every `api/preview/*`, `api/coming-soon/*`, `api/_lib/preview-*.js`, and `coming-soon.js`/`preview-exit.js` file.

## Order pricing (per Decision Log D-021 — run whenever a price or the catalogue changes)
- [ ] `npm run test:unit` passes (includes `menu-catalog-parity.test.js`, which fails if `menu-data.js` and `api/_lib/menu-catalog.js` ever drift).
- [ ] Any new/changed/de-listed menu item gets a new/updated catalogue id — ids are frozen once shipped; never reuse an id for a different item.

## Data and admin
- [ ] Form submissions persist in the configured production database.
- [ ] Admin can view submissions.
- [ ] Status changes persist.
- [ ] Notes and next actions persist.
- [ ] Source tracking works.
- [ ] Critical data does not rely only on localStorage.
- [ ] Permissions prevent unauthorised admin access.

## UX and interface
- [ ] Mobile navigation works.
- [ ] Main CTAs are obvious.
- [ ] Forms have labels, validation and useful messages.
- [ ] Loading, empty, success and error states exist.
- [ ] Typography, spacing and components follow one system.
- [ ] Images are approved, credited/owned as required and optimised.
- [ ] No dead links or non-working controls.

## POPIA and security
- [ ] Consent is present where personal data is collected.
- [ ] Privacy notice is accessible.
- [ ] Server-side validation exists where applicable.
- [ ] Secrets are not committed.
- [ ] Duplicate/spam handling is implemented appropriately.
- [ ] Error logging and recovery/export approach are documented.

## Engineering
- [ ] Type checks pass.
- [ ] Lint passes.
- [ ] Automated tests pass.
- [ ] Production build passes.
- [ ] Console errors are resolved.
- [ ] Key routes work directly and after refresh.
- [ ] Environment variables are documented.

## Branding assets
- [ ] Logo source is stored.
- [ ] Brand application sheet exported.
- [ ] Menu template exported.
- [ ] Digital flyer exported.
- [ ] Social templates exported.
- [ ] Business card/contact card exported.
- [ ] Uniform/signage/mobile-kitchen mock-ups exported where feasible.
- [ ] Asset register is updated.

## Release
- [ ] Private/client preview is stable.
- [ ] Final deployment URL is recorded.
- [ ] Decision Log is current.
- [ ] Client Inputs Register is current.
- [ ] Phase 2 backlog is recorded.
- [ ] Training and support next steps are recorded.
