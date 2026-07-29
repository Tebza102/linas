/*
 * Menu data transcribed verbatim from assets/source/menu/Linas_menu.pdf.
 * Do not add descriptions, specials, or prices not present in that PDF.
 * imageConfidence: "confirmed" | "category-plausible" | "none" — see
 * assets/menu/working/lina-interactive-menu-direction-v1-20260728.md
 */
const LINA_MENU = {
  categories: [
    {
      id: "plates",
      label: "Plates",
      priceNote: "R60 each",
      items: [
        {
          name: "Short-rib, chakalaka, potato salad",
          price: "R60",
          image: null,
          imageConfidence: "none"
        },
        {
          // Only this one Plates option carries the plausible photo match —
          // showing the same frame under multiple named dishes would overclaim
          // certainty the visual review didn't support. See
          // assets/menu/working/lina-interactive-menu-direction-v1-20260728.md.
          name: "Braised chicken, dombolo, spinach, potato salad",
          price: "R60",
          image: null,
          imageConfidence: "category-plausible",
          categoryImage: "../media/lina-chef-trailer-frame-working-v1-20260728.jpg"
        },
        {
          name: "Beef stew, potato salad, spinach",
          price: "R60",
          image: null,
          imageConfidence: "category-plausible",
          categoryImage: "../media/lina-gallery-frame-05-signage-working-v1-20260728.jpg"
        }
      ]
    },
    {
      id: "kota",
      label: "Kota",
      items: [
        { name: "Chips, half vienna, polony, atchar", price: "R25", image: null },
        { name: "Chips, cheese, ½ russian & vienna, polony", price: "R30", image: null },
        { name: "Chips, full russian, full vienna, cheese, polony, egg", price: "R50", image: null },
        { name: "4 slice with butter", price: "R10", image: null },
        { name: "3 slices, chips, ½ russian", price: "R12", image: null }
      ]
    },
    {
      id: "chips-snacks",
      label: "Chips & Snacks",
      items: [
        { name: "Small chips", price: "R15", image: null },
        { name: "Medium chips", price: "R25", image: null },
        { name: "Large chips", price: "R30", image: null },
        { name: "Vienna", price: "R10", image: null },
        { name: "Russian", price: "R15", image: null },
        { name: "Noodles", price: "R10", image: null }
      ]
    },
    {
      id: "drinks",
      label: "Drinks",
      items: [
        { name: "Juice", price: "R17", image: null },
        { name: "Energy drinks", price: "R12", image: null },
        { name: "Cold drinks", price: "R14", image: null },
        { name: "2 litre cold drinks", price: "R27", image: null }
      ]
    }
  ]
};
