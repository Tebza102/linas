// Lina's — Homepage first-screen content configuration.
//
// Single source of truth for the hero copy, the two CTA destinations and
// the chef portrait used on the homepage first screen. home.js reads only
// from this object — nothing is hardcoded in index.html or home.js.
//
// Copy is reused verbatim from the previously approved hero copy — no new
// factual claims are introduced (CLAUDE.md: never invent client facts,
// prices, service areas). The headline is a plain string per the approved
// 2026-08-29 mock (no italic connector word — that treatment is retired).
//
// heroImage points at the human-approved Chef Lina hero asset
// (lina-home-chef-approved-v1-20260830.png, 1535x2047, locked — never
// cropped/regenerated/edited, only presented via CSS object-fit:contain so
// the full supplied photograph is always visible, never destructively
// cropped).
//
// The Summer Menu section and Act 3 conversion band (added this round) use
// static markup directly in index.html rather than this config object,
// since their content does not change based on any state.
var LINA_HOME_MEDIA = {
  copy: {
    tagline: "Freshly prepared. Made with care.",
    eyebrow: "Lina's",
    headline: "Chef-Led Catering & Mobile-Kitchen Experiences",
    supporting: "Weddings, funerals, corporate events and private catering — plus a real mobile kitchen serving plates to order."
  },

  cta: {
    primary: { label: "Request a Quote", href: "/contact" },
    secondary: { label: "Explore the Menu", href: "/menu" }
  },

  heroImage: {
    src: "/assets/mockups/working/media/lina-home-chef-approved-v1-20260830.png",
    alt: "Chef Lina smiling and presenting a plated meal"
  }
};
