# Lina's Design DNA v1.0

**Installed:** 29 August 2026  
**Scope:** Lina's public/customer-facing digital experience  
**Status:** Authoritative visual implementation standard for new public UI work.  
**Product principle:** Lina's is a Digital Business Platform, not a brochure website. Visual quality must improve customer trust, menu discovery, catering conversion and ease of use without adding operational complexity.

This document converts the approved Lina's visual direction into implementation rules that coding agents can execute consistently. It exists to close the gap between an attractive design mock and a browser implementation that drifts from it.

A later **approved** entry in `docs/LINA-DECISION-LOG.md` may supersede a rule here. Otherwise, this document governs public visual work.

---

## 1. Design North Star

Lina's must feel:

- Minimal
- Premium
- Chef-led
- Warm but disciplined
- Editorial rather than template-driven
- Confident rather than decorative
- Food-led without becoming visually noisy
- Contemporary and mobile-first

**Luxury comes from composition, typography, photography, whitespace, proportion and pacing — not from extra effects.**

The approved homepage direction uses a clean white canvas, Lina's red, dark editorial text, Chef Lina as the human anchor, and real food imagery as the primary visual interest.

### Explicitly rejected visual behaviour

Do not introduce any of the following unless separately approved:

- Bounce or spring animation
- Spinning elements
- Floating decorative objects
- Glow effects
- Neon treatments
- Glassmorphism
- 3D tilt or perspective tricks
- Aggressive parallax
- Large decorative gradients
- Pill-heavy SaaS styling
- Excessive rounded cards
- Stock-food imagery
- AI-generated food or people presented as authentic Lina's content
- Animation whose only purpose is spectacle

---

## 2. Brand Colour System

The current public visual direction standardises the website red as:

```css
--lina-red: #B2373E;
--lina-white: #FFFFFF;
--lina-ink: #201512;
--lina-line: rgba(32, 21, 18, 0.12);
```

`#B2373E` is the approved current public-site red token and supersedes the earlier homepage/design-foundation ambiguity for new public UI work. The original logo source asset must never be destructively recoloured or overwritten; approved logo exports may be prepared separately when needed.

Contrast checks:

- `#B2373E` on `#FFFFFF`: approximately 5.98:1 — passes WCAG AA for normal text.
- `#201512` on `#FFFFFF`: high-contrast body copy.

### Colour discipline

- Primary page background: `#FFFFFF`.
- Lina's red: primary CTA, headline emphasis, section labels, active states and selected details.
- Ink: body copy and supporting interface text.
- Food photography supplies natural colour.
- Do not add beige, bronze, blue, purple, neon or unrelated accent colours to the approved homepage direction.
- Opacity may be used for hierarchy; new hues may not be invented for hierarchy.

---

## 3. Typography DNA

### Display / editorial

Use a high-contrast editorial serif already available to the project or an approved equivalent. It is for:

- Hero statements
- Section headings
- Selected pull statements

Do not introduce a new font dependency merely to approximate a mock without approval.

### Body / interface

Use the project's existing clean humanist/system sans stack for:

- Navigation
- Body copy
- Buttons
- Menu labels
- Forms
- Operational information

### Logo rule

The Lina's hand-drawn wordmark is a logo asset only. Never imitate the logo by typing Lina's in a script font.

### Hierarchy rule

The browser implementation must preserve the mock's hierarchy before trying to make it “responsive”. The primary headline must remain visually dominant; body copy and secondary UI must not compete with it.

---

## 4. Grid, Width and Spacing

### Desktop

- 12-column grid
- 24px gutters
- Maximum core content width: 1280px
- Full-bleed elements are deliberate exceptions only

### Mobile

- 4-column grid
- 16px gutters
- 20px minimum outer page margin unless a deliberate full-bleed media moment is approved

### Spacing scale

Use only this scale unless a measured visual-QA correction is explicitly documented:

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px
```

Do not solve layout problems with arbitrary one-off spacing values.

### Alignment rule

Header, hero copy and downstream section headings must share deliberate vertical alignment lines. Misaligned section edges are treated as visual defects, not taste differences.

---

## 5. Homepage Composition Contract

The approved homepage direction is a three-act customer journey.

### Act 1 — Meet Lina's

Required visual structure:

- Pure white background
- Unboxed Lina's logo in the header
- Minimal navigation
- Primary “Request a Quote” action
- Left-side editorial message
- Lina's-red hero headline
- Chef Lina as the main human visual on the right
- Primary CTA: Request a Quote
- Secondary CTA: Explore the Menu
- Small supporting proof points may be used only if they remain visually quiet

The hero must not become a collage, card wall or effects showcase.

### Act 2 — Summer Menu

Required structure:

- Section label: **SUMMER MENU**
- Clear editorial heading introducing the seasonal selection
- Three approved food photographs
- Each dish image/card is interactive, not decorative
- Selecting a dish must route the customer to the relevant menu item or menu state
- “View Full Menu” remains available as a broader action

Food photography should carry the colour and appetite appeal. UI around it stays restrained.

### Act 3 — Conversion

End the page with a clear conversion area for one or more existing journeys:

- Request catering / Request a Quote
- Explore full menu
- WhatsApp where appropriate and already supported

Do not add unrelated sections merely to make the homepage longer.

---

## 6. Approved Motion Language

Motion is an enhancement layer. **Never animate a page whose static composition has not first been approved.**

### Entrance sequence target

The experience must be non-blocking. The user may interact immediately.

Recommended implementation envelope:

1. Brand/logo reveal: opacity `0 → 1`, 400–500ms.
2. Chef Lina reveal: opacity `0 → 1`, translateY `12px → 0`, 500–650ms.
3. Hero headline: opacity `0 → 1`, translateY `12–16px → 0`, 500–650ms, line stagger approximately 80–120ms.
4. Supporting copy and CTAs: opacity `0 → 1`, translateY `8–12px → 0`, 400–550ms.
5. Summer Menu cards on first viewport intersection: opacity `0 → 1`, translateY `12px → 0`, optional scale `0.985 → 1`, 450–550ms, card stagger approximately 80–120ms.

Preferred easing family:

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

Equivalent restrained ease-out is acceptable if already present in the codebase.

### Motion limits

- No spring or bounce easing.
- No rotation.
- No perpetual animation.
- No scale larger than approximately 1.02 for hover emphasis on food cards.
- No content should move more than 16px for standard reveal motion.
- No page-load sequence should prevent clicks.
- Avoid scroll hijacking.
- Avoid large background-video payloads when a static or micro-loop solution provides the same value.

### Reduced motion

All motion must collapse cleanly under `prefers-reduced-motion: reduce` with content immediately visible and fully usable.

---

## 7. Video Rule

Video is optional enrichment, not a requirement for the homepage to work.

If a homepage video is approved later:

- Use genuine Lina's footage only.
- Keep it muted by default.
- Prefer a short cinematic micro-loop or controlled reveal rather than an always-dominant background movie.
- Preserve a useful poster/static state.
- Do not autoplay audio.
- Do not make the user wait for video before interacting.
- Respect reduced-motion settings.
- Verify mobile data/performance behaviour before release.

---

## 8. Photography and Asset Governance

Use the repository asset hierarchy exactly:

- `assets/source/` — original client/source material; never overwrite.
- `assets/*/working/` — work in progress.
- `assets/*/approved/` — approved project outputs.

### Production imagery rule

Production public pages may use only:

- Genuine approved Lina's imagery
- Approved brand assets
- Clearly identified representative imagery where the project has already authorised that treatment

Do not invent dishes, faces, environments, testimonials or documentary content.

### Homepage mock reference

The 29 August 2026 approved homepage mock from the current design review is the **visual target, not loose inspiration**. A binary reference image should be stored under `assets/mockups/approved/` before the static implementation pass begins. See `assets/mockups/approved/README.md`.

Coding agents must not redesign the approved target while implementing it.

---

## 9. Component Rules

### Header

- White background in the approved homepage direction.
- Unboxed Lina's logo/mark.
- Minimal navigation.
- One clear primary CTA.
- No oversized decorative navigation treatment.

### Buttons

Primary:

- Lina's red fill
- White text
- Clear hover/focus state

Secondary:

- Transparent or white fill
- Controlled outline
- No excessive radius

Target minimum touch size: 44px.

### Photography cards

- Photography is the focal content.
- Border radius must remain restrained.
- Shadows, if present, must be subtle enough not to turn the design into a generic card UI.
- Hover state may use a very small lift/scale and/or editorial text reveal.

### Dividers

Use hairlines and whitespace rather than heavy boxes.

---

## 10. Responsive Behaviour

Mobile is a designed state, not a compressed desktop screenshot.

Required principles:

- Preserve content priority: logo → headline → primary action → chef/food → menu discovery.
- Avoid text collisions with Chef Lina.
- Maintain ≥44px interactive targets.
- No horizontal overflow.
- Do not force desktop line breaks onto mobile.
- Summer Menu cards may stack or use an accessible horizontal treatment only when it preserves clarity and easy tapping.
- Motion may simplify further on mobile for performance.

Required visual-QA widths unless a later release checklist supersedes them:

```text
1440 / 1280 / 768 / 390px
```

Also spot-check 375px where practical.

---

## 11. Accessibility and Performance

Minimum requirements:

- WCAG AA text contrast.
- Visible keyboard focus states.
- Semantic buttons/links for interactive elements.
- Meaningful alt text for genuine content images.
- Do not communicate state by colour alone.
- Reduced-motion support.
- Lazy-load below-the-fold imagery where appropriate.
- Avoid unnecessarily heavy animation/video assets.
- No console errors or failed asset requests introduced by visual work.

---

## 12. Mandatory Implementation Workflow

Every substantial public visual implementation must follow this order.

### Phase 0 — Inspect only

Before editing:

- Read `CLAUDE.md`.
- Read this Design DNA.
- Read the latest relevant Decision Log entries.
- Inspect the actual current page and styles.
- Inspect approved/source assets.
- Return a Surgical Edit Change Contract.
- Identify exact files allowed to change.

No implementation during inspection.

### Phase 1 — Static visual reproduction

- Reproduce the approved mock without entrance animation.
- Preserve existing routes and working business journeys.
- Do not make creative substitutions.
- Compare a browser screenshot with the approved reference.
- Correct proportion, spacing, typography, alignment and image crop before moving on.

### Phase 2 — Responsive reproduction

- Implement tablet/mobile layouts.
- Compare at required widths.
- Fix overflow, hierarchy and tap-target issues.

### Phase 3 — Interaction

- Wire Summer Menu dish cards to the correct existing menu destination/state.
- Verify Request a Quote, Explore Menu and other approved CTAs.
- Do not alter backend behaviour unless separately authorised.

### Phase 4 — Motion

- Add only the approved restrained entrance/reveal language.
- Verify standard and reduced-motion states.

### Phase 5 — Visual QA and diff review

Required:

```bash
git diff --name-only
git diff --stat
git diff
```

Also verify:

- Browser screenshots against reference
- Console errors
- Failed network/assets
- Horizontal overflow
- Keyboard focus
- Reduced motion
- Existing navigation
- Existing enquiry/menu journeys affected by the edited page

---

## 13. Protected Systems

A homepage/design task does **not** grant permission to modify:

- Coming Soon/private-preview gate
- Authentication
- Admin roles or permissions
- Firebase configuration
- Firestore rules/indexes/schema
- Production environment variables
- Enquiry persistence
- Order persistence
- Notification/email delivery
- API routes
- Payment functionality
- Deployment configuration
- Domains/DNS
- `package.json`
- lockfiles
- Unrelated public pages
- Admin UI

If one of these becomes necessary, stop and request an explicit scope expansion.

---

## 14. Visual Acceptance Gate

A visual task is **not done because the code runs**.

It is done only when:

- The static browser result visibly matches the approved mock's composition and hierarchy.
- Required responsive states have been inspected.
- Assets are the approved assets, not substitutes.
- Motion remains restrained and optional to usability.
- Every interactive-looking element has a real purpose.
- Existing customer journeys still work.
- No protected system changed unexpectedly.
- Git diff contains only approved files.

When a browser implementation differs materially from the mock, treat the mismatch as an implementation defect until either corrected or explicitly approved as a design decision.

---

## 15. Governance

Changes to this file require:

1. A clear reason.
2. An entry in `docs/LINA-DESIGN-DNA-INSTALLATION-RECORD.md`.
3. For material design-direction changes, an approved Decision Log entry.
4. Visual regression review where the change affects existing public pages.

Do not silently evolve the design system inside individual page CSS files.