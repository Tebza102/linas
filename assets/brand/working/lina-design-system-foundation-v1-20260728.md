# Lina Design System Foundation v1 — 20260728

One shared foundation underneath all three presentation directions. Directions differ in emphasis and pacing, not in colour, type, spacing or component behaviour.

## 1. Colour — derived from the real logo
Sampled directly from `assets/source/brand/Linas_Logo.jpg` (background pixel, multiple points): `#A43129`. This is a warm brick/terracotta red, not a pure fire-engine red and not a purple-leaning "SaaS" red — it already carries food warmth (chakalaka, grilled meat, chilli) without needing a gradient to manufacture that feeling.

| Token | Hex | Use |
|---|---|---|
| `--lina-red` | `#A43129` | Primary brand colour. CTAs, key accents, section dividers, logo field. Used deliberately, never as a full-bleed background behind long text. |
| `--ink` | `#201512` | Body text, headlines on light backgrounds. Warm near-black, not pure `#000` — softer, more editorial. |
| `--paper` | `#F7F1E8` | Primary background. Warm off-white (unbleached-paper tone), not clinical white. |
| `--trailer-grey` | `#3A3634` | Secondary dark surface (brushed-steel trailer interior tone, seen in the confirmed chef photo). Used for footer, dark section backgrounds, video overlays. |
| `--ochre` | `#C97C2C` | Secondary accent — fried/browned food tones (chips, viennas, russians). **Fill colour only** — measured at 2.92:1 against `--paper`, which fails WCAG AA as text at any size, so it never carries text directly on `--paper`. Used as a tag/chip *background* with `--ink` text on top (5.44:1, passes AA), or as a thin border/underline accent. |
| `--gravy` | `#6B3A24` | Tertiary accent — chakalaka/gravy brown. Used sparingly for depth in duotone treatments and menu category dividers. |

No purple, no blue, no neon. No gradient is used as a background filler; the only permitted gradient is a short, low-opacity red→transparent scrim behind hero text for legibility over photography — never decorative.

## 2. Typography
- **Display/headline:** a high-contrast editorial serif (character in the register of Fraunces or Canela — final licensed face to be confirmed at build time, not invented here). Used for section headlines, the positioning statement, and pull-quotes. Never used for body copy or UI labels — it is a voice, not a workhorse.
- **Body/UI:** a clean humanist sans (register of Inter or General Sans). Used for body copy, menu items, prices, forms, navigation.
- The logo's hand-drawn script wordmark (`Lina's`) stays a **logo-only** asset. It is not extended into a website heading font — line-art scripts collapse at small sizes and this exact rule prevents the "matched the logo font everywhere" template look.

### Type scale (mobile-first, 1.25 ratio, 16px base)
`12 / 14 / 16 / 20 / 25 / 31 / 39 / 49 / 61px` — headline sizes step up further on desktop only where a full-bleed cinematic moment justifies it (up to ~96px for the hero statement on large viewports).

## 3. Grid & spacing
- Mobile: 4-column grid, 16px gutter, 20px outer margin.
- Desktop: 12-column grid, 24px gutter, max content width 1280px (full-bleed media ignores the grid deliberately).
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px. No arbitrary one-off spacing values.

## 4. Image treatment
Because the verified photo library is currently thin (see Asset Register), the system relies on a **consistent treatment**, not volume:
- Warm, slightly desaturated grade on every photo — consistent white balance across shoots of varying quality.
- Fixed crop ratios only: `21:9` cinematic (hero/full-bleed), `4:5` portrait (chef/people), `1:1` (menu cards, gallery grid), `16:9` (video).
- A signature **red duotone scrim** (`--lina-red` at 15–25% over a darkened image) is the one recurring visual device used to unify photos of different quality/origin at section transitions — used sparingly, never as a full-screen "glass" panel.
- No stock food photography. Placeholder frames (see below) are used instead of stock images when real photography is missing.

## 5. Placeholder rule
Where a genuine photo isn't yet confirmed, use a labelled placeholder: a solid `--trailer-grey` or `--paper` frame with a small centred caption (e.g. "Photo pending — chef close-up") in body type — never a stock photo standing in as if it were real, and never an AI-generated image presented as documentary content.

## 6. Buttons & hierarchy
- **Primary** — solid `--lina-red` fill, `--paper` text. Reserved for the one dominant action per screen (Order / Enquire).
- **Secondary** — `--ink` outline, transparent fill, `--ink` text. Supporting actions (View menu, See gallery).
- **Tertiary** — text-only with an animated underline on hover/focus. Inline and navigational links.
- **WhatsApp action** — distinct treatment using the recognisable WhatsApp mark, never re-skinned in brand red (functional recognisability over brand purity here, since WhatsApp-assisted ordering is explicit Phase 1 scope).
- Radius: 4px on buttons and form fields (soft, not pill-shaped, not sharp) — deliberately avoids the generic rounded-rectangle SaaS look on one end and a harsh template look on the other.

## 7. Navigation
- Minimal single-row nav: logo mark (small), 4–5 anchor links, one primary CTA.
- Transparent over the hero, resolves to a solid `--paper` bar with a bottom hairline once the user scrolls past the hero.
- Mobile: no hamburger-only pattern hiding the CTA — a persistent slim bottom action bar (Order / Enquire / WhatsApp) stays reachable at all times, since conversion is the point of Phase 1.

## 8. Border & radius rules
- Photography and video frames: sharp corners (0px radius) — this is what keeps the design feeling editorial/print-led rather than "app card" everywhere.
- UI controls (buttons, inputs, menu-item cards, chips): 4px radius, consistent everywhere. No mixed radii on the same screen.
- Dividers: 1px hairlines in `--ink` at 10% opacity, not heavy drop shadows.

## 9. Motion principles
- Hero: slow Ken Burns image scale (1.0 → 1.04 over ~8s) or, where video is confirmed usable, a muted looping cinematic clip — never both competing at once.
- Scroll reveals: content fades in and rises 8–16px, ~300ms, no spring/bounce easing.
- Parallax: background media may drift at a different scroll speed than foreground text (max 15% speed differential) — never full 3D tilt/skew.
- No infinite decorative animation (no floating shapes, no perpetual glow pulses).
- All motion respects `prefers-reduced-motion` and is disabled/replaced with a static state for those users.

## 10. Mobile behaviour
- Mobile is the primary design target, not a breakpoint afterthought.
- Thumb-reachable CTAs, ≥44px tap targets, swipeable menu category tabs and gallery.
- Sticky bottom action bar as described in §7.

## 11. Accessibility rules
- WCAG AA contrast minimum for all text, measured (not assumed): `--ink`/`--paper` = 15.88:1, `--lina-red`/`--paper` = 6.13:1, `--paper`/`--lina-red` (button text) = 6.13:1, `--gravy`/`--paper` = 8.29:1 — all pass. `--ochre`/`--paper` = 2.92:1 **fails** AA, which is why §6/§12 restrict ochre to fill backgrounds with `--ink` text on top (5.44:1, passes), never as text directly on `--paper`. Body copy always uses `--ink` on `--paper`, never red-on-red or red-on-photo without a scrim.
- Visible focus states on every interactive element.
- Alt text required for every image; captions for video.
- Forms: labelled fields, inline error text (not colour-only), keyboard-operable menu modal with a visible close control.

## 12. Menu-card behaviour
- Card = image (or labelled placeholder) + item name + price + optional "special/limited" tag + short description **only where the menu PDF or an approved source supplies one** (most current items don't have descriptions beyond their listed ingredients — do not invent flavour copy).
- Tap/click opens a detail panel (modal on desktop, bottom sheet on mobile) with the full ingredient list from the PDF and an Order/Enquire action.
- Category tabs (Plates / Kota / Chips & Snacks / Drinks) mirror the PDF's own structure exactly.

## 13. Form behaviour
- Two distinct flows per the Master Brief: **catering enquiry** (Journey A) and **mobile-kitchen order** (Journey B, WhatsApp-assisted).
- Inline validation, clear success and duplicate-submission states, POPIA consent checkbox required before submission, no critical data held only client-side.

## 14. Gallery behaviour
- Expanding lightbox gallery mixing confirmed photo(s) and (once visually reviewed) video clips.
- Lazy-loaded, swipe-navigable on mobile, keyboard-navigable on desktop.
- Every gallery item traces to a Register entry marked "Selected" — nothing rejected or unconfirmed appears here.
