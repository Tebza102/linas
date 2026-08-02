// Lina's — Poster-led homepage, first-screen content configuration.
//
// Single source of truth for every piece of copy, the hero sequence, the
// destination links/reveal images and the header CTA used on the
// homepage first screen. home.js reads only from this object — nothing
// is hardcoded in index.html or home.js.
//
// Copy is reused verbatim from the existing approved hero copy — no new
// factual claims are introduced (CLAUDE.md: never invent client facts,
// prices, service areas).
//
// hero[0] ("chef") is a fully isolated background-removed cutout of Chef
// Lina holding a plated meal, supplied 2026-08-02 ("Lina's Welcome.png",
// verified genuine alpha — see Decision Log D-028).
// hero[1] ("chefAction") is the original confirmed chef photo (full
// frame, real trailer-interior background, not a cutout) — the only
// other chef-identifying image (lina-chef-trailer-frame) stays excluded
// per Decision Log D-023 (a phone number is burned into its pixels).
// hero[2] ("dish") is a background-removed dish cutout from the same
// 2026-08-02 batch.
//
// The "Order Today" destination's WhatsApp link is the exact, already
// verified URL/message used identically across every existing page's
// footer (contact.html, catering.html, etc.) — reused verbatim per
// Decision Log D-029, not invented or altered.
var LINA_HOME_MEDIA = {
  copy: {
    tagline: "Freshly prepared. Made with care.",
    eyebrow: "Lina's",
    headlineLines: ["Chef-led catering", "and mobile-kitchen", "experiences."],
    supporting: "Weddings, funerals, corporate events and private catering — plus a real mobile kitchen serving plates to order."
  },

  cta: {
    primary: { label: "Request a Quote", href: "/contact" }
  },

  hero: [
    {
      id: "chef",
      src: "/assets/mockups/working/media/lina-welcome-hero-working-v1-20260802.webp",
      alt: "Chef Lina smiling and presenting a plated meal"
    },
    {
      id: "chefAction",
      src: "/assets/mockups/working/media/lina-hero-poster-working-v1-20260728.jpg",
      alt: "Chef Lina inside her mobile kitchen trailer, presenting a plated meal"
    },
    {
      id: "dish",
      src: "/assets/mockups/working/media/lina-dish-steak-pap-working-v1-20260802.webp",
      alt: "T-bone steak with pap, a signature plate from Lina's menu"
    }
  ],

  destinations: [
    {
      id: "menu",
      label: "Explore Our Menu",
      href: "/menu",
      image: {
        src: "/assets/mockups/working/media/lina-dish-steak-pap-working-v1-20260802.webp",
        alt: "T-bone steak with pap, a signature plate from Lina's menu"
      }
    },
    {
      id: "order",
      label: "Order Today",
      href: "https://wa.me/27764834344?text=Hello%20Lina's%2C%20I%20would%20like%20to%20enquire%20about%20your%20catering%20or%20mobile%20kitchen%20services.",
      external: true,
      image: {
        src: "/assets/mockups/working/media/lina-dish-tripe-dumpling-working-v1-20260802.webp",
        alt: "Tripe and dumpling in a takeaway container"
      }
    },
    {
      id: "event",
      label: "Plan an Event",
      href: "/catering",
      image: {
        src: "/assets/mockups/working/media/lina-welcome-hero-working-v1-20260802.webp",
        alt: "Chef Lina smiling and presenting a plated meal"
      }
    }
  ]
};
