---
name: linas-design-fidelity
description: Governs faithful implementation of approved Lina's public designs. Use for homepage, menu, catering, brand, layout, typography, image, responsive, or motion work.
user-invocable: false
---

# Lina's Design Fidelity

Read `docs/LINA-DESIGN-DNA.md` before assessing or implementing public visual work.

When an approved reference image exists, treat it as the visual target, not inspiration.

## Fidelity sequence

1. Confirm the exact approved reference asset.
2. Render the existing browser state at the reference viewport.
3. Compare structure before styling details: section order, layout, proportions, alignment, image placement, typography hierarchy, whitespace.
4. Build/fix the static composition first.
5. Measure major geometry with browser values: bounding boxes, widths, heights, gaps, font sizes, line heights, colours, image crop/object-position, and overflow.
6. Match desktop first only where the approved desktop mock is the source, then implement tablet/mobile using the Design DNA's mobile-first constraints without inventing a different visual language.
7. Preserve exact genuine Lina's assets. Do not regenerate or substitute them for convenience.
8. Add interaction only after the static composition is accepted.
9. Add motion last and keep it restrained.
10. Compare fresh screenshots again after each stage.

## Visual prohibitions

Unless explicitly approved, do not introduce:

- bounce or spring motion;
- spinning or floating decoration;
- 3D tilt/skew;
- large parallax effects;
- glow/neon;
- glassmorphism;
- generic SaaS cards/pills;
- arbitrary gradients;
- excessive border radii;
- stock or fabricated food imagery;
- unapproved decorative sections;
- changes that make the page visually busier than the approved reference.

Luxury must come from composition, typography, photography, whitespace, proportion, contrast, and pacing.

## Motion envelope

Preferred entrance/reveal behaviour:

- opacity 0 → 1;
- translateY approximately 8–16px → 0;
- approximately 300–650ms depending on hierarchy;
- restrained stagger approximately 80–140ms;
- non-spring easing;
- never block navigation or CTAs;
- fully respect `prefers-reduced-motion`.

If animation makes static screenshot comparison unreliable, disable or freeze it during visual QA.
