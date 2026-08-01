# Lina Live Archive — 2026-08-01

Snapshot of the exact stable build serving Production immediately before the
poster-led luxury visual refinement round began. This document is the
authoritative rollback reference for that work.

## Live release identity

| Field | Value |
|---|---|
| Live domain | `https://linas.co.za` |
| Exact Git commit | `e55e6dfc09a22882efc5de8d39f424ef097a040d` (`e55e6df`) |
| Branch the commit sits on | `feat/firebase-admin-platform` |
| Archive branch | `archive/linas-live-before-poster-redesign-2026-08-01` |
| Archive tag (annotated) | `linas-live-pre-poster-redesign-2026-08-01` |
| Vercel Production deployment ID | `dpl_3fv9XYdv2k7Zwfkz9tZ45khYeyUK` |
| Vercel Production deployment URL | `https://linas-6iyepbh2e-apprigate.vercel.app` |
| Firebase project | `lina-s` |
| Archived on (local time, SAST) | 2026-08-01, morning |

Note: at the moment of archiving, `feat/firebase-admin-platform`'s HEAD
(`7d4a3e6`) was one commit ahead of the live commit — that commit touches
only `docs/LINA-DECISION-LOG.md` and `docs/LINA-PROJECT-PLAN.md` (verified via
`git diff e55e6df..7d4a3e6 --stat`), no application code. The archive branch
and tag deliberately point at `e55e6df`, the exact commit that was built and
deployed, not the docs-ahead HEAD.

## Firestore state at archive time

- **Rules deployment:** Live, ruleset created `2026-07-31T16:41:51Z`, confirmed to contain the `orders`/`orderActivities` match blocks and all role-check functions (`isOwner`, `isDeveloper`, `isObserver`, `isOwnerOrDev`, `isStaff`).
- **Composite indexes:** Both required indexes confirmed `READY`:
  - `orders`: `orderDateKey` ASC, `createdAt` DESC
  - `orders`: `status` ASC, `createdAt` DESC
  - `orderActivities`: `orderId` ASC, `createdAt` DESC

## Automated test results at archive time

- `npm run admin:check` — clean across all 36 checked files
- `npm run test:unit` — 58/58 passing
- `npm run test:rules:auto` — 51/51 passing
- `npm audit --omit=dev` — 0 vulnerabilities

## Feature set present in this archive

- Public site (Version 2/Direction D) at clean URLs: `/`, `/catering`, `/menu`, `/chef-lina`, `/mobile-kitchen`, `/gallery`, `/contact`
- Public cart with two-step WhatsApp checkout (`assets/mockups/working/prototype-v2/cart.js`)
- Server-validated, server-priced backend order creation (`api/orders/create.js`) — order stored before WhatsApp opens
- Admin Orders module (Today board + All orders history), owner/developer write, observer read-only, staff excluded
- Sales tracking with strict `Collected`-only sale recognition, structurally separate from enquiry revenue
- Owner/developer/observer role system across the full admin platform
- Enquiry capture, sales pipeline, marketing centre, quotations, invoices, reports (pre-existing from earlier rounds)

## Known limitations at time of archive

- No "Pay online" UI exists anywhere in the public cart/menu — online payment was never built (explicitly out of scope; see Decision Log D-022). No misleading "Coming soon" label exists because there was never a payment entry point to label.
- Composite Firestore index build status should always be re-confirmed `READY` before relying on the admin Orders detail panel's activity-history view in any restored environment — index state is a live-project property, not something a Git commit or bundle restores.
- Staff role has no access to the Orders module by design (open product question — see Client Inputs Register I-017).

## Rollback verification

A temporary Preview was built directly from the archive branch
(`archive/linas-live-before-poster-redesign-2026-08-01`, i.e. commit `e55e6df`)
in an isolated git worktree, to confirm the archived state is independently
deployable without touching Production.

- **Preview URL:** `https://linas-axi6ideyx-apprigate.vercel.app` (`dpl_HvewucHhffprajZg5U5tgQ7z926H`, `target: null` — confirmed a Preview, never Production)

Verified against that Preview (real headless-browser automation, not assertion):

| Item | Result |
|---|---|
| Homepage loads, title correct | Pass — zero console errors |
| Navigation present | Pass |
| Login link present | Pass |
| Contact details (WhatsApp number) visible | Pass |
| Operating hours visible | Pass |
| Address (Heidelberg) visible | Pass |
| Desktop hero media | Pass |
| Mobile hero media | Pass |
| Enquiry form present on /contact | Pass |
| Menu renders with working add-to-cart | Pass — 3 cards, add button functional |
| Cart → two-step checkout → backend order creation | Pass — real order `LINA-ORD-20260801-0001` (R60.00) created in Firestore via the archived commit's `/api/orders/create`, confirmed directly against the database (not just UI state, which lagged behind due to network latency in the test harness) |
| Admin login page (email/password fields) | Pass |
| All 7 public routes + 2 admin routes + cart.js + api/orders/create | Pass — all return 200 (405 on GET for the POST-only order endpoint, correctly) |

The one test order created during this verification (`LINA-ORD-20260801-0001`)
was flagged `isTestRecord: true` immediately after, not deleted.

## Rollback procedure

If the poster-led redesign (or any future change) needs to be reverted to
this exact known-good state, follow this procedure. It does **not** use a
destructive reset — it builds and redeploys the archived commit as a new
deployment, so the current (possibly broken) deployment remains recoverable
in Vercel's own deployment history regardless.

```bash
# 1. Switch to the archive branch (in a clean or separate worktree — do not
#    do this on a branch with uncommitted work).
git fetch origin
git checkout archive/linas-live-before-poster-redesign-2026-08-01
# or, to be fully explicit about the exact commit:
git checkout linas-live-pre-poster-redesign-2026-08-01

# 2. Build that exact commit.
vercel pull --environment=production --yes
vercel build --prod

# 3. Create a Vercel Preview first (safety check, not Production).
vercel deploy --prebuilt
# Open the returned Preview URL and manually verify the golden paths below
# before proceeding to step 5.

# 4. (Only after the Preview looks correct) Deploy that exact prebuilt
#    output to Production.
vercel deploy --prebuilt --prod

# 5. Confirm linas.co.za points to the new (rolled-back) deployment.
vercel inspect linas.co.za
curl -sI https://linas.co.za/ | grep -i x-vercel-id
```

**Do not** run `git reset --hard`, `git push --force` to `main` or the
release branch, or delete the deployment that is being rolled back from —
Vercel keeps deployment history regardless, and a forward roll-forward is
always possible if the rollback itself needs undoing.

**Firestore note:** this rollback procedure restores *application code*
only. It does not, and should not, touch Firestore data, rules, or indexes —
those are live-project state independent of any Git commit, and the rules/
indexes recorded as live in this document should still be the correct ones
for this archived commit's data model. If a future change alters the data
model (new required fields, new collections), rolling back the code without
also considering the live data state could cause a mismatch — check rules/
indexes compatibility before completing a real rollback, don't assume it.

## Backup files

| Artifact | Path | Size | Verified |
|---|---|---|---|
| Git bundle (`--all`, complete history) | `C:\Users\appri\linas-backups\linas-live-pre-poster-redesign-2026-08-01.bundle` | 200 MB | `git bundle verify` — OK, 13 refs, records a complete history |
| ZIP archive (source only, no `.git`/`node_modules`/`.vercel`/secrets) | `C:\Users\appri\linas-backups\linas-live-pre-poster-redesign-2026-08-01.zip` | 918 MB | Opened and enumerated (1055 entries); scanned for `.env`/`serviceaccount`/`.pem`/`credentials`/`secret` patterns — only match was `.env.example` (a safe, no-value template that is normally tracked in git anyway) |

Neither contains `.env.local`, service-account credentials, or any other real
secret material. The ZIP is large mainly because `assets/source/` (175 MB of
original client-supplied video/image source material) is included, per the
instruction to preserve media assets.
