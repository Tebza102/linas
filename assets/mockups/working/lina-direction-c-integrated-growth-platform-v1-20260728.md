# Direction C — Integrated Growth Platform (v1, 20260728)

Focus: cinematic landing page, mobile-kitchen ordering, catering enquiries, menu, lead/order capture, marketing conversion, platform/dashboard alignment. Built on the shared foundation. Treated as the likely recommended direction per the brief, tested here against the actual confirmed assets rather than assumed.

## Rationale
This direction doesn't choose between "story" (A) and "menu" (B) — it sequences them so each does its job, then adds the admin/lead-capture backbone the Master Brief requires for Phase 1 (§6, §10 non-functional requirements). It is the only direction that visibly accounts for both customer journeys (A: catering enquiry, B: mobile-kitchen order) and the business-side needs (source tracking, dashboard, admin inbox) in the same page structure.

## One-page structure (desktop & mobile)

1. **Cinematic hero** — Full-bleed `21:9`, confirmed chef photo, red duotone scrim, editorial headline pairing identity + product ("Chef-led. Mobile. Ready to order." — placeholder, pending approval). Two CTAs, deliberately **not** equal weight (revised after internal review — two same-weight solid buttons read as indecisive and template-like): primary solid `--lina-red` button "Order now" (→ menu anchor), secondary `--ink`-outline button "Enquire for an event" (→ catering form anchor) alongside it. Both journeys are served on this page; the hero simply picks the higher-frequency action (quick mobile-kitchen orders) as visually primary, matching real usage rather than treating the hero as a 50/50 fork.
2. **Lina positioning statement** — Medium length, editorial serif pull-quote, same content rules as A/B (confirmed facts only).
3. **Mobile kitchen & catering overview** — Two clearly separated editorial blocks (not cards): each with its own short copy and its own CTA, directly mapping to Journey A and Journey B from the Master Brief. This is the one section unique to this direction — it exists specifically to route two different customer intents from the same page.
4. **Interactive visual menu** — Full spec per `assets/menu/working/lina-interactive-menu-direction-v1-20260728.md`, same elaborate treatment as Direction B (category tabs, detail panels, WhatsApp order action) since fast conversion still matters here.
5. **Chef & trailer story** — Full treatment close to Direction A's, since credibility for catering enquiries (higher value, event-based) depends on the same trust-building the chef story provides.
6. **Catering occasions & services** — Editorial list (as in A), since this is where catering-lead credibility is built.
7. **Gallery/image sequence** — Same honest, placeholder-labelled approach as A/B; additionally, once the video clips are visually reviewed and cleared, this is the section that gains a short muted looping BTS reel (kitchen process shot, once confirmed) to build the "platform, not brochure" feel the brief calls for.
8. **Order or catering enquiry** — Both forms fully built out (unlike B's lighter catering form): enquiry form captures occasion type, date, guest count, contact details, consent; order flow is WhatsApp-assisted per confirmed Phase 1 scope (no live cart/payment — that's explicitly out of scope per the Master Brief §6).
9. **Contact & social** — Same content rules as A/B.

## Platform/dashboard alignment (what makes this "integrated")
Everything captured on the public page (enquiry source, order source, occasion type) maps directly onto the admin/lead-inbox fields the Master Brief already specifies: **status** (New/Contacted/Quoted/In Progress/Completed/Lost), **source** (website/Instagram/WhatsApp/referral/other), and **notes/next action**. Nothing on the public page collects a field the admin side can't use — this is the concrete meaning of "platform alignment" rather than a marketing phrase.

## Motion & pacing
A blend: cinematic pacing (A's restraint) for the story/hero sections, faster browsing pacing (B's) for the menu section. The page changes rhythm once, deliberately, at the menu anchor — signalled by a subtle shift from full-bleed imagery to a denser grid, not by a jarring style change.

## Strengths
- Only direction that visibly serves both customer journeys and the admin/dashboard requirements in one coherent structure.
- Recommended-by-default in the brief, and nothing in the confirmed assets contradicts that — the one real chef photo and the complete menu both support this structure just as well as they support A or B individually.
- Cleanest Phase-2 growth path (campaign landing variants, dashboard depth) without restructuring the page.

## Risks
- Longest page of the three — requires the strongest pacing discipline to avoid feeling like "stacked sections" (the exact anti-pattern the brief warns against). Mitigated by the shared motion system's scroll-reveal restraint, but this is the direction most dependent on getting that pacing right in build.
- Serving two journeys equally on one hero (two CTAs) is slightly less immediately clear than A's or B's single-minded opening — needs careful visual weighting so neither CTA reads as secondary/afterthought.
