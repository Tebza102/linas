# Lina's — Prototype V2 Design Rationale (Direction D — Cinematic Catering Gateway)
**Date:** 2026-07-28
**Status:** Design exploration for review — not yet approved by Tebogo, not yet approved by Lina.

## 1. Why Prototype V1 was rejected
Tebogo's direct feedback, treated as authoritative:
- V1 read as a generic AI-generated slide/template.
- The pale background (`#F7F1E8`) presented as a dominant "yellow" that felt artificial for a food brand.
- Photography sat inside boxed, narrow containers with empty margin on either side instead of dominating the screen.
- The homepage was a long single-page scroll through nine stacked sections rather than a one-screen entry point.
- The experience read as SaaS/IT, not as a real chef-led catering business.

None of this was a functional failure — V1's menu, forms, accessibility and WhatsApp logic all worked correctly (see `docs/LINA-VIDEO-MEDIA-REVIEW.md` and the V1 verification report). The problem was entirely the visual execution, which is why V2 keeps the working logic and replaces the composition.

## 2. What was retained from the original Direction C strategy
Direction C's underlying strategic combination — serving both the mobile-kitchen order journey and the private-catering enquiry journey from one coherent platform, with admin-field alignment — is **not discarded**. V2 (Direction D) is a new *visual* execution of the same strategic scope, reorganised into separate destination pages instead of one long single page. Nothing about the confirmed menu, business model, or customer journeys changed.

## 3. Definition of Direction D
Direction D — **Cinematic Catering Gateway** — treats each page as an editorial "chapter" built around one dominant photograph or video, with minimal text and no boxed card layouts. The interface is designed to disappear behind the media rather than compete with it.

## 4. How the Ballena Cabo reference informed the work
`ballenacabo.com` was reviewed (via automated content analysis, not visual copying) purely for its **design principles**: full-bleed photography as the primary structural element, minimal consistent navigation (top placement, secondary footer), progressive disclosure through distinct visual chapters rather than dense scrolling, generous negative space between modular sections, sparse restrained typography, and an early, persistently accessible primary action. These principles — not Ballena's actual layout, copy, or code — shaped V2's structure.

## 5. What was deliberately not copied
No layout, copy, typeface, animation timing, navigation design, colour palette, image treatment, page order, code, or branding was taken from Ballena. Lina's colour system is derived entirely from her own logo (`#A43129`, sampled directly from `Linas_Logo.jpg`) and her own photography — nothing from the reference site's visual identity appears anywhere in V2.

## 6. Selected landing composition
Two concepts were built and compared:
- **Concept 1 — Full-screen cinematic gateway** (`prototype-v2/index.html`): media fills 100% of the viewport, with identity, positioning line, actions, and destination links overlaid directly on it.
- **Concept 2 — Full-height split gateway** (`prototype-v2/concept-2-split-landing.html`, comparison-only, not routed into the live navigation): media fills roughly the left 55–60% of the viewport; a dark panel on the right carries identity, actions, and a vertical destination list.

**Concept 1 was selected.** Concept 2 is a legitimate, well-executed alternative, but its dark panel still occupies close to half the screen — reintroducing a milder version of the exact problem being fixed (imagery sharing space with a flat non-photographic area rather than fully defining the page). Concept 1 lets Chef Lina and the trailer occupy the entire screen, which most directly answers the feedback that "images must justify and fill the available visual space." Screenshot: `assets/mockups/working/client-review-v2/v2-concept-2-comparison.png`.

## 7. The one-screen gateway model
The landing page (`index.html`) measures **934px of scroll height at a 900px viewport** — effectively one screen, with only a few pixels of natural overflow from the bottom chapter strip and sticky WhatsApp button. It contains, in order: full-bleed hero media, eyebrow + headline + supporting line, two actions (Request a Quote / Explore the Menu), and a slim horizontal row of five destination links (Catering, Menu, Chef Lina, Mobile Kitchen, Gallery) — all within the hero itself. There is no second homepage section below the fold; the landing page's job is to establish the brand and route visitors onward, not explain every service.

## 8. New page structure
```
/                     Landing gateway (Concept 1)
/catering.html        Catering services and event types
/menu.html             Interactive visual menu (reused menu-data.js)
/chef-lina.html        Chef Lina's story
/mobile-kitchen.html   Trailer / mobile-kitchen capability
/gallery.html          Cinematic media wall (photos + click-to-play video)
/contact.html          Quotation / enquiry journey
```
Plain static HTML/CSS/JS per page — no framework, no client-side router. Shared `styles.css` and `script.js` are loaded on every page; each page is a real, separately-loadable URL under `/assets/mockups/working/prototype-v2/`, reachable at `http://localhost:8000/v2` for the entry point.

## 9. Media distribution
| Page | Media | Type |
|---|---|---|
| Landing | Confirmed chef-in-trailer photo (poster) + `lina-hero-preview` clip (muted loop) | Photo + video |
| Catering | `lina-catering-preview` (new derivative, plate assembly) | Video |
| Menu | `lina-preparation-frame` (header band) + existing menu-item stills | Photo |
| Chef Lina | Confirmed hero photo (full-bleed) + `lina-chef-trailer-frame` | Photo |
| Mobile Kitchen | `lina-mobilekitchen-preview` (new derivative, trailer stovetop) + `lina-gallery-frame-05-signage` | Video + photo |
| Gallery | 5 stills in a masonry wall + 1 click-to-play video (`lina-gallery-clip-01`, new derivative) | Photo + video |
| Contact | `lina-gallery-frame-05-signage` (hero) | Photo |

Three new compressed video derivatives were created this round (ffmpeg, already installed and authorised in the prior session — not reinstalled): `lina-catering-preview-working-v1-20260728.mp4` (795KB), `lina-mobilekitchen-preview-working-v1-20260728.mp4` (1.5MB), `lina-gallery-clip-01-working-v1-20260728.mp4` (453KB). No video appears on more than one page. Originals in `assets/source/social/` are untouched. All are recorded in `docs/LINA-ASSET-REGISTER.md`.

## 10. Video performance safeguards
- At most one autoplaying video per page, always muted, always `playsinline`, always with a poster image.
- `prefers-reduced-motion` is checked before calling `.play()` on any hero video — confirmed via automated test that the hero video stays paused when the OS/browser signals reduced motion.
- Gallery video is **click-to-play only** (no autoplay) — a `<video controls>` element replaces the poster image only after a user clicks a visible play button.
- All derivatives are re-encoded H.264, scaled to 640–720px wide, sub-2MB.

## 11. Accessibility approach
Reused and re-verified from V1: keyboard-operable full-screen nav overlay (Escape closes, focus moves to the close button on open and returns to the trigger on close, Tab is trapped inside while open), accessible menu modal (same pattern), accessible gallery lightbox, visible focus rings (`outline: 3px solid` brand red) on every interactive element, semantic single-`<h1>`-per-page headings (two duplicate-h1 pages from an early draft were caught and fixed during this pass), alt text on every image, form labels, and `aria-live` status regions for both the form and the WhatsApp fallback message.

## 12. Business-conversion approach
Every page keeps a persistent, small WhatsApp action (bottom-right, not blocking navigation) and routes back to `contact.html` for the fuller quotation flow (event type, date, guest count, **location**, catering requirements, contact details, notes, POPIA consent — expanded from V1's shorter form per this round's brief). The contact page text explicitly distinguishes prototype behaviour ("nothing is actually sent, emailed or stored") from the future production lead-storage/CRM work, so nobody reviewing this mistakes it for a live lead pipeline.

## 13. Open content dependencies (unchanged from V1, still outstanding)
- Confirmed WhatsApp number (Client Inputs Register I-006 / I-014) — kept unconfigured; honest fallback message shown instead of a link.
- Address/hours (I-007 / I-013).
- Usage rights on the 8 previously-rejected fine-dining/wellness images (I-012) — still excluded from V2 entirely.
- Chef Lina's real biography (I-005) — placeholder retained.
- Trailer specification / service-area radius (I-008).

## 14. Client approval questions
1. Does the one-screen, full-bleed landing gateway (Concept 1) read as "real catering business" rather than template? This was the central complaint about V1.
2. Is the dark, warm, red-accented palette (no cream/yellow background) the right direction, or would Lina prefer a lighter alternative *without* returning to a flat pale full-page background?
3. **A judgment call made without asking first, flagged here for confirmation:** the brief mentioned an internal R350,000 mobile-kitchen growth goal (Sandton) as "already approved for internal strategic presentation." This prototype's public Mobile Kitchen page describes the growth **ambition qualitatively** ("growing this mobile-kitchen capability further is part of Lina's future plans") but does **not** state the specific figure or location publicly — stating a specific fundraising/growth target on a public customer-facing page seemed like a commercially sensitive disclosure that should be confirmed with Tebogo/Lina before publishing, not assumed. Please confirm whether that figure should ever appear on the public site, and if so, where.
4. Is Concept 1 (full-screen) preferred over Concept 2 (split), or should Concept 2 be developed further instead?
