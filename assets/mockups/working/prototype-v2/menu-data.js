/*
 * Menu data transcribed verbatim from assets/source/menu/Linas_menu.pdf.
 * Do not add descriptions, specials, or prices not present in that PDF.
 * imageConfidence: "confirmed" | "category-plausible" | "none" — see
 * assets/menu/working/lina-interactive-menu-direction-v1-20260728.md
 *
 * `id` and `priceCents` are additive MACHINE METADATA, not menu content —
 * they mirror api/_lib/menu-catalog.js, which is the authoritative price
 * source the order endpoint actually charges against. `price` remains the
 * verbatim display string from the PDF. firebase-tests/menu-catalog-parity.test.js
 * fails if this file and the catalogue ever disagree, so change both together.
 */
const LINA_MENU = {
  categories: [
    {
      id: "plates",
      label: "Plates",
      priceNote: "R60 each",
      items: [
        {
          id: "plates-short-rib-chakalaka-potato-salad",
          name: "Short-rib, chakalaka, potato salad",
          price: "R60",
          priceCents: 6000,
          image: null,
          imageConfidence: "none"
        },
        {
          // Only this one Plates option carries the plausible photo match —
          // showing the same frame under multiple named dishes would overclaim
          // certainty the visual review didn't support. See
          // assets/menu/working/lina-interactive-menu-direction-v1-20260728.md.
          id: "plates-braised-chicken-dombolo-spinach-potato-salad",
          name: "Braised chicken, dombolo, spinach, potato salad",
          price: "R60",
          priceCents: 6000,
          image: null,
          imageConfidence: "category-plausible",
          categoryImage: "/assets/mockups/working/media/lina-chef-trailer-frame-working-v1-20260728.jpg"
        },
        {
          id: "plates-beef-stew-potato-salad-spinach",
          name: "Beef stew, potato salad, spinach",
          price: "R60",
          priceCents: 6000,
          image: null,
          imageConfidence: "category-plausible",
          categoryImage: "/assets/mockups/working/media/lina-gallery-frame-05-signage-working-v1-20260728.jpg"
        }
      ]
    },
    {
      id: "kota",
      label: "Kota",
      items: [
        { id: "kota-chips-half-vienna-polony-atchar", name: "Chips, half vienna, polony, atchar", price: "R25", priceCents: 2500, image: null },
        { id: "kota-chips-cheese-half-russian-vienna-polony", name: "Chips, cheese, ½ russian & vienna, polony", price: "R30", priceCents: 3000, image: null },
        { id: "kota-chips-full-russian-full-vienna-cheese-polony-egg", name: "Chips, full russian, full vienna, cheese, polony, egg", price: "R50", priceCents: 5000, image: null },
        { id: "kota-4-slice-with-butter", name: "4 slice with butter", price: "R10", priceCents: 1000, image: null },
        { id: "kota-3-slices-chips-half-russian", name: "3 slices, chips, ½ russian", price: "R12", priceCents: 1200, image: null }
      ]
    },
    {
      id: "chips-snacks",
      label: "Chips & Snacks",
      items: [
        { id: "chips-snacks-small-chips", name: "Small chips", price: "R15", priceCents: 1500, image: null },
        { id: "chips-snacks-medium-chips", name: "Medium chips", price: "R25", priceCents: 2500, image: null },
        { id: "chips-snacks-large-chips", name: "Large chips", price: "R30", priceCents: 3000, image: null },
        { id: "chips-snacks-vienna", name: "Vienna", price: "R10", priceCents: 1000, image: null },
        { id: "chips-snacks-russian", name: "Russian", price: "R15", priceCents: 1500, image: null },
        { id: "chips-snacks-noodles", name: "Noodles", price: "R10", priceCents: 1000, image: null }
      ]
    },
    {
      id: "drinks",
      label: "Drinks",
      items: [
        { id: "drinks-juice", name: "Juice", price: "R17", priceCents: 1700, image: null },
        { id: "drinks-energy-drinks", name: "Energy drinks", price: "R12", priceCents: 1200, image: null },
        { id: "drinks-cold-drinks", name: "Cold drinks", price: "R14", priceCents: 1400, image: null },
        { id: "drinks-2-litre-cold-drinks", name: "2 litre cold drinks", price: "R27", priceCents: 2700, image: null }
      ]
    }
  ]
};
