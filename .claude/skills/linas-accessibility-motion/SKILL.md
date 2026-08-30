---
name: linas-accessibility-motion
description: Reviews Lina's public UI for accessibility, interaction quality, responsive behaviour, restrained motion, and performance. Use whenever layout, navigation, CTAs, images, or animation change.
user-invocable: false
---

# Lina's Accessibility, Motion and Interaction Quality

Apply this review to every changed public UI state.

## Accessibility

- Preserve semantic headings and landmarks.
- Every interactive control must be keyboard operable.
- Keep visible focus states.
- Target at least 44×44px effective touch targets where appropriate on mobile.
- Do not rely on colour alone for meaning.
- Preserve meaningful image alt text.
- Maintain readable contrast against actual rendered backgrounds.
- Avoid layout shifts that move a target while the user is interacting with it.

## Motion

Motion is progressive enhancement, not required content.

- Respect `prefers-reduced-motion` and provide a complete static state.
- Do not delay CTA usability for an entrance sequence.
- Avoid autoplay audio.
- Avoid bounce, spring, spinning, 3D tilt, exaggerated parallax, or perpetual decorative motion.
- Prefer opacity plus 8–16px translation and restrained timing.
- Ensure initial content is not permanently hidden if JS fails.

## Responsive review

Check at minimum the project-required widths, including 1440, 1280, 768, 390 and 375 where applicable.

Verify:

- no horizontal overflow;
- hierarchy remains clear;
- navigation remains reachable;
- text line lengths and wrapping remain intentional;
- images use intentional crops rather than accidental clipping;
- CTA order and visibility remain logical;
- food-card/menu interactions remain obvious on touch devices without hover dependence.

## Performance

- Do not add a large framework or animation library for effects achievable with existing CSS/JS.
- Prefer optimized existing assets.
- Lazy-load below-fold media where compatible with the current architecture.
- Avoid expensive scroll listeners when IntersectionObserver or CSS is sufficient.
- Do not use video merely to create movement when restrained native animation produces the same customer value more reliably.
