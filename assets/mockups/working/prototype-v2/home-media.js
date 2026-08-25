// Lina's — Homepage first-screen content configuration.
//
// Single source of truth for the hero copy, the two CTA destinations and
// the chef portrait used on the homepage first screen. home.js reads only
// from this object — nothing is hardcoded in index.html or home.js.
//
// Copy is reused verbatim from the previously approved hero copy — no new
// factual claims are introduced (CLAUDE.md: never invent client facts,
// prices, service areas). The headline is restructured (not reworded) to
// carry the italic connector word the new design calls for.
//
// heroImage reuses the existing confirmed chef cutout (background-removed,
// verified genuine alpha — see Decision Log D-028), the same file already
// used for the chef portrait on menu.html. No new asset was supplied for
// this task, so no new file was added.
//
// lina-hero-chef-cutout-working-v1-20260802.webp (used in the Offerings
// section below, and its filename's misleading) is NOT actually a
// background-removed cutout — visual check shows a full rectangular photo
// with the trailer counter, red panel and "CHEF LINA" text baked in. It
// is deliberately NOT used here for that reason.
//
// The "Order Today" / WhatsApp destination that used to live in this
// object is not lost: the floating WhatsApp button (#stickyWhatsapp,
// unchanged by this task) and the Offerings section's own WhatsApp link
// both still use the same verified wa.me URL — see D-029.
var LINA_HOME_MEDIA = {
  copy: {
    tagline: "Freshly prepared. Made with care.",
    eyebrow: "Lina's",
    headline: {
      line1: "Chef-Led Catering",
      connector: "and",
      line2: "Mobile-Kitchen Experiences"
    },
    supporting: "Weddings, funerals, corporate events and private catering — plus a real mobile kitchen serving plates to order."
  },

  cta: {
    primary: { label: "Request a Quote", href: "/contact" },
    secondary: { label: "Explore the Menu", href: "/menu" }
  },

  heroImage: {
    src: "/assets/mockups/working/media/lina-welcome-hero-working-v1-20260802.webp",
    alt: "Chef Lina smiling and presenting a plated meal"
  }
};
