# Direction Comparison & Recommendation v1 — 20260728

## Reference-use confirmation
None of the three directions borrows the Tengile MalaMala site's layout, typography, colour system, animation timings, or content — confirmed by construction, since the palette was derived from Lina's own logo (`#A43129` sampled directly from the file) and the type/grid/motion rules were written from the brief's stated principles (cinematic media, editorial type, minimal nav, parallax depth, expanding galleries), not copied from any reference site. Only the interaction-quality principles named in the brief were adopted.

## Internal review passes (Step 8)
Two refinement passes were run against the no-AI-slop checklist before this recommendation was written.

**Pass 1 — structural review**
- *Caught:* Direction C's hero used two equal-weight solid CTAs, which reads as indecisive/template-like rather than a considered hierarchy. *Fixed:* changed to one primary solid button + one secondary outline button (edited directly in `lina-direction-c-integrated-growth-platform-v1-20260728.md`).
- *Caught:* Direction B's "Catering occasions & services" was specified as a compact icon-card row — exactly the generic feature-card pattern the brief prohibits. *Fixed:* changed to a single-line editorial list (edited directly in `lina-direction-b-visual-food-menu-v1-20260728.md`), keeping it lighter than Direction A without becoming a template grid.

**Pass 2 — colour/contrast review**
- *Caught:* `--ochre` (`#C97C2C`) was assigned to menu tags and labels without checking contrast against `--paper`. Measured at 2.92:1 — fails WCAG AA at any text size. This is exactly the kind of "arbitrary colour" the brief's quality checklist warns about — a colour chosen for mood without verifying it actually works. *Fixed:* `--ochre` is now fill-only (tag background with `--ink` text at 5.44:1, which passes), never used as text on `--paper`. All five core colour pairs are now measured, not assumed (see foundation doc §11).

No further structural issues were found on a third pass; the directions are presented below as post-refinement.

## Comparison

| | Direction A — Cinematic Chef Story | Direction B — Visual Food & Menu | Direction C — Integrated Growth Platform |
|---|---|---|---|
| **Strength** | Most human/differentiated; makes the one strong photo do maximum work | Lowest risk — leans on the two most reliable assets (menu + one photo); fastest path to ordering | Serves both customer journeys and the admin/dashboard requirements in one structure |
| **Best fit for** | Catering credibility (Journey A), premium positioning | Mobile-kitchen quick orders (Journey B), fast WhatsApp conversion | Both journeys plus the marketing/lead-tracking requirements in §6 and §9–10 of the Master Brief |
| **Risk** | Heaviest reliance on the thinnest asset (chef/trailer imagery); under-serves quick ordering | Weakest premium-catering credibility; compresses the chef story | Longest page — needs disciplined pacing to avoid feeling stacked; hero serves two intents |
| **Implementation effort** | Medium — fewer distinct components, but the placeholder-to-real-photo swap-in needs to be designed cleanly | Low-medium — most reusable component is the menu system itself, which every direction needs anyway | Medium-high — combines both of the above plus the admin-field alignment; more sections to sequence, but no new components beyond what A and B already require |
| **Dependent on unresolved asset questions** | Yes — sections 3 and 7 stay placeholder-heavy without more chef/trailer photography | Least dependent — menu PDF alone carries most of the page | Yes, same as A, in the story sections; menu section is as protected as B's |

## Recommendation
**Direction C — Integrated Growth Platform.** The brief already names it as the likely default, and nothing in the verified assets argues against that: the one confirmed chef photo and the complete menu both support C's structure exactly as well as they support A or B individually, and C is the only structure that visibly accounts for the admin/lead-tracking requirements the Master Brief treats as non-negotiable (§6 admin/operations, §10 non-functional requirements), not just the public-facing experience.

**Elements to retain from the other directions:**
- From **A**: the full-treatment chef/trailer story section and the editorial (non-card) treatment of catering occasions — both already folded into C.
- From **B**: the elaborate, category-mirrored interactive menu and the persistent WhatsApp order action — both already folded into C.
- Nothing is discarded outright; C is a sequencing of A and B's strongest sections rather than a fourth, separate design.

## Decision requiring Tebogo
Not a choice between materially different commercial directions — this recommendation is a very low-risk call on the current evidence. The real open decision is about **asset usage authority**, not layout: eight supplied images (and one paired video) depict a different, unrelated restaurant's fine-dining plating, and one is an unrelated "Lina's Kitchen" wellness/vitamin ad — see the Asset Register's curation section. None of these were used in any direction above. Tebogo needs to confirm:
1. Whether any of those eight images/eleven video clips are genuinely Lina's to use (source, rights) — if not, they should be removed from the repository rather than kept as ambiguous "source" material.
2. Whether "Lina's Kitchen" (the vitamin/wellness ad) is a separate, unrelated venture that happened to get mixed into this folder, since it directly contradicts the confirmed menu and business model.
3. A quick visual scrub of the 11 `VID_20260728_*.mp4` clips (this environment has no video-frame-extraction tool available and packages could not be installed to add one) to confirm which, if any, are usable trailer/kitchen B-roll.

This does not block proceeding to the implementation specification — Phase 1 design can and does proceed on the confirmed logo, menu, and one chef photo, with clearly labelled placeholders everywhere else, per the project's own content policy.
