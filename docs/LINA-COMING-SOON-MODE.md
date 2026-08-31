# Lina's — Coming Soon / Private Preview Mode

Operations runbook for the public launch gate built on
`feature/coming-soon-private-preview` (branched from the archived stable
build, `archive/linas-live-before-poster-redesign-2026-08-01` /
`e55e6df`). See Decision Log D-023 for the build record.

## What this is

A gate, enforced by `middleware.js` (Vercel Routing Middleware, runs before
the CDN on every request), that shows anonymous visitors a branded Coming
Soon page instead of the real public site, while:
- the admin platform (`/admin/*`, all `/api/*`) keeps working exactly as
  before, untouched;
- the enquiry form and WhatsApp link on the Coming Soon page itself keep
  working, via the real `api/enquiries/create.js`;
- two named reviewers can see the complete real site behind a shared
  password;
- the owner/developer can unlock the complete real site from inside admin,
  without the shared password, using their existing Firebase session.

It is a **presentation gate, not a secrecy mechanism** — non-HTML assets
(CSS/JS/images, including `menu-data.js`) are never blocked, so this does
not hide prices or content from anyone who already knows a direct asset URL.

## Turning it on

Set in Vercel (Production **and** Preview environment variables, as
appropriate):

```
COMING_SOON_ENABLED=true
COMING_SOON_REVIEWER_PASSWORD=<a real password, given only to the two named reviewers>
COMING_SOON_COOKIE_SECRET=<32+ random bytes — see .env.example for a generator command>
COMING_SOON_ACCESS_VERSION=1
```

`COMING_SOON_LAUNCH_AT`, `COMING_SOON_PROMO_ENABLED`, `COMING_SOON_PROMO_TEXT`
are optional — leave them unset until the client provides a real launch date
and/or approves real promo copy. The page never fabricates either.

**If `COMING_SOON_ENABLED` is missing entirely, the gate is off.** This is
deliberate — a missing env var must never take a live business offline.

## Automatic launch at `COMING_SOON_LAUNCH_AT`

Once `COMING_SOON_LAUNCH_AT` is set to a real, approved instant, the gate
opens itself automatically — no redeploy, no manual step. `middleware.js`
checks `hasLaunchTimeArrived()` (`api/_lib/launch-time.js`) against the
server's own clock on every request (middleware runs uncached, so the very
next request after the configured instant gets the real site). This is the
same value that drives the countdown display — one date, one meaning.

**Emergency hold:** if a problem is found close to the configured instant,
set `COMING_SOON_LAUNCH_HOLD=true` and redeploy. This keeps the gate closed
regardless of the clock, without touching `COMING_SOON_LAUNCH_AT` itself —
the countdown keeps showing the correct, already-approved date; only
enforcement pauses. Unset it (or set to anything other than `"true"`) and
redeploy to resume automatic launch.

## Turning it off manually (no launch date configured, or before it arrives)

Set `COMING_SOON_ENABLED=false` (or delete the var) and redeploy. **Do not
delete the feature** — `middleware.js`, the `api/preview/*` endpoints, and
`coming-soon.html/css/js` all stay in the repo for the next campaign/
maintenance window that needs the same gate. Nothing here is
launch-day-only code.

## Revoking access instantly

If the reviewer password leaks, or a reviewer/developer needs to be cut off
immediately: change `COMING_SOON_ACCESS_VERSION` to any new value and
redeploy. Every previously-issued cookie (reviewer and developer alike)
fails verification immediately — no need to know who currently holds a
cookie, no code change beyond the one env var.

To revoke a *specific* person without logging everyone else out, the only
lever right now is rotating `COMING_SOON_REVIEWER_PASSWORD` (affects all
shared-password holders) or — for a developer/owner bypass — revoking that
person's Firebase custom claim role (affects their admin access too, not
just preview).

## Rotating the reviewer password

Update `COMING_SOON_REVIEWER_PASSWORD` and redeploy. Existing reviewer
cookies remain valid until they expire (7 days) or the access version is
bumped — rotating the password does not itself invalidate cookies already
issued under the old one.

## Architecture summary

- `middleware.js` — the gate itself. Reads `classifyPath()` to decide
  protected vs. allowed, then checks the signed `linas_private_preview`
  cookie.
- `api/_lib/preview-paths.js` — pure route classifier (unit tested).
- `api/_lib/preview-token.js` — HMAC-signed, access-versioned cookie
  tokens (unit tested: tamper/expiry/version/wrong-secret rejection).
- `api/preview/unlock.js` — shared-password endpoint, rate-limited,
  constant-time comparison, generic error on any failure.
- `api/preview/developer-unlock.js` — verifies the caller's real Firebase
  ID token server-side, allows only `owner`/`developer`.
- `api/preview/logout.js` — clears the cookie.
- `api/coming-soon/config.js` — the only way the static Coming Soon page
  learns about the countdown/promo state (never returns the password or
  cookie secret).
- `assets/mockups/working/prototype-v2/coming-soon.{html,css,js}` — the
  page itself. Standalone stylesheet, does not touch the live `styles.css`.
- `assets/mockups/working/prototype-v2/preview-exit.js` — included on all 7
  real public pages; no-ops unless the non-secret `linas_preview_ui` hint
  cookie is present, in which case it shows a discreet exit control.
- `admin/js/layout.js` — "Unlock Website Preview" sidebar action
  (owner/developer only).
- `api/_lib/launch-time.js` — pure, unit-tested clock check
  (`hasLaunchTimeArrived()`) that drives automatic launch at
  `COMING_SOON_LAUNCH_AT`.

## Known limitations

- The reviewer password is shared, not per-person — see "Revoking access"
  above.
- No automated notification when a reviewer/developer unlocks the preview,
  or when automatic launch actually fires — nothing currently pages anyone
  at the moment the gate opens itself.
- Automatic launch depends on the deployed server's clock (reliable,
  NTP-synced infrastructure time) — never a visitor's device clock, and
  never the client-side countdown, which is cosmetic display only.
