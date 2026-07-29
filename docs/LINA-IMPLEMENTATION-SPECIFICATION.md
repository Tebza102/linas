# Lina Implementation Specification — Direction C (Integrated Growth Platform)
**Version:** 1.0 (design-sprint output, not yet built)
**Status:** Recommended, pending Tebogo/client confirmation at the 29 July direction-approval milestone
**Source design docs:** `assets/brand/working/lina-design-system-foundation-v1-20260728.md`, `assets/mockups/working/lina-direction-c-integrated-growth-platform-v1-20260728.md`, `assets/menu/working/lina-interactive-menu-direction-v1-20260728.md`, `assets/mockups/working/lina-direction-comparison-recommendation-v1-20260728.md`

This document specifies **what to build once Direction C is approved**. No coding has been done under this task — per instructions, this is a specification only.

## 1. Section order (single page, anchor-navigated)
1. Cinematic hero (dual-weight CTA: primary "Order now", secondary "Enquire for an event")
2. Lina positioning statement
3. Mobile-kitchen & catering overview (two routed blocks)
4. Interactive visual menu (Plates / Kota / Chips & Snacks / Drinks)
5. Chef & trailer story
6. Catering occasions & services (editorial list, not cards)
7. Gallery / image sequence (lightbox)
8. Order or catering enquiry (two distinct forms/flows)
9. Contact & social

## 2. Components required
- `HeroMedia` (image or muted looping video, red duotone scrim, headline + dual CTA)
- `PositioningStatement` (serif pull-quote block)
- `JourneyRouter` (two-block "mobile kitchen vs catering" section, each with its own CTA)
- `MenuSystem`: `CategoryTabs`, `MenuCard` (1:1 image/placeholder, name, price, optional tag), `MenuDetailPanel` (modal desktop / bottom sheet mobile)
- `ChefStory` (4:5 portrait + editorial copy block)
- `OccasionsList` (editorial list, image-optional)
- `Gallery` (lightbox, lazy-loaded, swipeable)
- `EnquiryForm` (catering — Journey A)
- `OrderAction` (WhatsApp-assisted — Journey B; not a cart/checkout)
- `StickyOrderBar` (persistent mobile bottom bar: Order / Enquire / WhatsApp)
- `ContactBlock` (address, hours, WhatsApp, social links, POPIA privacy link)
- `PlaceholderFrame` (shared component for every unconfirmed-image slot — must never be swapped for a stock photo silently)

## 3. Responsive behaviour
- Mobile-first build order: mobile layout implemented and reviewed before desktop breakpoints are added.
- Grid: 4-col/16px gutter mobile → 12-col/24px gutter desktop (foundation §3).
- `StickyOrderBar` is mobile-only; on desktop its actions live in the persistent nav CTA instead.
- Menu cards: horizontal scroll per category on mobile, wrap to grid ≥768px.

## 4. Motion behaviour
- Hero: slow Ken Burns (1.0→1.04, ~8s) until a reviewed video clip is approved to replace it (see §6).
- Scroll reveals: opacity + 8–16px rise, ~300ms, no spring easing.
- Parallax: background media max 15% scroll-speed differential vs foreground text; no 3D tilt.
- Menu card stagger: 60–80ms per card, capped total delay.
- All motion gated behind `prefers-reduced-motion` — reduced-motion users get instant/static states, not a slowed-down version of the same animation.
- **Phase 1 motion:** hero Ken Burns/video, scroll reveals, menu stagger, lightbox transitions, sticky bar show/hide.
- **Phase 2 motion (not built now):** cursor-aware parallax layers, animated campaign-landing variants per traffic source, any motion tied to dashboard/analytics visualisations.

## 5. Media files used (as of this specification)
| Slot | File | Status |
|---|---|---|
| Hero / chef story | `assets/source/social/instagram_1785242438335.png` | Confirmed genuine |
| Logo / favicon | `assets/source/brand/Linas_Logo.jpg`, `Linas_Favicon.jpg` | Confirmed genuine |
| Menu data | `assets/source/menu/Linas_menu.pdf` | Confirmed genuine, authoritative |
| All other hero/gallery/menu-item photography, BTS video | — | **Not yet confirmed** — use `PlaceholderFrame`, pending Tebogo's response on the Asset Register's open curation questions |

No other supplied file may be used until the Asset Register's "Deferred pending Tebogo confirmation" or "Rejected" items are resolved.

## 6. Menu interactions
- Category tabs mirror the PDF exactly (§ full spec in the menu working doc).
- Tap/click on a card opens the detail panel; ingredient text is copied verbatim from the PDF.
- No item is marked "special" until Tebogo confirms one; no price is rounded or reformatted from the PDF.
- Order action from a menu card triggers the WhatsApp-assisted flow (pre-filled message with item name — no live cart, no payment integration; explicitly out of Phase 1 scope per Master Brief §6).

## 7. Form interactions
- **Catering enquiry (Journey A):** occasion type, date, guest estimate, contact details, message, POPIA consent checkbox (required). Inline validation. Success state confirms submission and sets expectation for follow-up. Duplicate-submission guard (e.g. disable-on-submit + idempotency check server-side).
- **Order (Journey B):** WhatsApp-assisted — no separate form; button opens WhatsApp with a pre-filled order message. Requires Client Inputs Register I-006 (confirmed WhatsApp number) before go-live.
- Both flows write to the same admin lead/order inbox with a `source` field distinguishing them.

## 8. Navigation
- Transparent-over-hero nav resolving to solid `--paper` with hairline border after hero scroll-past.
- 4–5 anchor links + one primary CTA, per foundation §7.
- Mobile: no hamburger-hidden CTA; `StickyOrderBar` keeps conversion actions reachable at all times.

## 9. Accessibility
- WCAG AA minimum; colour pairs measured in foundation §11 (do not introduce a new colour without measuring contrast the same way).
- Alt text mandatory on every image (including `PlaceholderFrame` — e.g. "Photo pending: chef close-up").
- Captions on any video.
- Keyboard-operable menu detail panel and gallery lightbox, with visible focus states and Escape-to-close.
- Forms: labelled fields, non-colour-only error indication.

## 10. Performance rules
- Lazy-load gallery and below-the-fold menu images/video.
- Hero media optimised (compressed video or responsive image srcset) — no unoptimised phone-camera originals shipped directly.
- No layout shift from late-loading fonts/images (reserve space, use font-display swap or equivalent).
- Lighthouse/production build must pass before release per `docs/LINA-TEST-AND-RELEASE-CHECKLIST.md`.

## 11. Data requirements
- Production-capable persistent database for enquiries and orders (no critical data in localStorage — Master Brief §10).
- Fields per submission: type (enquiry/order), contact details, occasion/item details, source, status, notes, next action, timestamp.
- Status values match the Master Brief §6 admin set: New, Contacted, Quoted/Confirmed, In Progress, Completed, Lost/Cancelled.

## 12. Admin implications
- Admin/lead inbox lists all submissions with status, source, and notes/next-action fields (Master Brief §6).
- Basic dashboard: counts by status, source breakdown, popular items, simple date filtering — matches what the public page actually captures (§ "platform/dashboard alignment" in the Direction C doc), nothing more.
- Role/access protection required on the admin route (Master Brief §10).

## 13. Analytics events (Phase 1 minimum)
- `hero_cta_click` (which CTA: order vs enquire)
- `menu_category_view`, `menu_item_expand`, `menu_order_click`
- `enquiry_form_submit`, `enquiry_form_error`
- `whatsapp_order_click`
- `gallery_open`
- Source captured on every enquiry/order event (website/Instagram/WhatsApp/referral/other) to feed the admin dashboard's source breakdown.

## 14. Testing requirements
Full checklist already exists at `docs/LINA-TEST-AND-RELEASE-CHECKLIST.md` — this build must satisfy all of: customer-journey end-to-end tests (catering enquiry, WhatsApp order), data/admin persistence tests, UX/mobile tests, POPIA/security tests, and engineering tests (type-check, lint, automated tests, production build). No item in that checklist is superseded by this specification.

## Explicit non-scope (do not silently add)
- No live cart or online payment (Phase 2 candidate only, and only if a future decision changes scope).
- No fabricated testimonials, prices, descriptions, or "special" tags beyond what §6/§16 of the source docs confirm.
- No use of any image/video still marked "Deferred" or "Rejected" in the Asset Register.
