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
- [ ] Social/campaign links land on the correct offer.
- [ ] Repeat/return journey is understandable.

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
