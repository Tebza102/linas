/*
 * Lina's public menu — approved 2026-08-31.
 *
 * Do not add descriptions, specials, or prices that are not on the approved
 * menu. `id` and `priceCents` mirror api/_lib/menu-catalog.js, which is the
 * authoritative price source the order endpoint actually charges against;
 * `price` is the display string the customer reads.
 * firebase-tests/menu-catalog-parity.test.js fails if this file and the
 * catalogue ever disagree on id, name, price, category or active status, so
 * change both together.
 *
 * `tabs` is presentation only — it groups categories into the two visible
 * tabs. The Summer Menu is one category; "The Rest of Lina's Menu" shows
 * Everyday Favourites and Drinks together as headings in one continuous
 * view, so nothing is buried behind a second level of navigation.
 *
 * `group` marks the two dishes that require a choice. Each option is its own
 * catalogue item (see the note in menu-catalog.js): the renderer draws one
 * card per group with a button per option, and the chosen option is what
 * reaches the cart, the order and the WhatsApp message.
 */
const LINA_MENU = {
  tabs: [
    { id: "summer", label: "Summer Menu", categories: ["summer"] },
    { id: "rest", label: "The Rest of Lina’s Menu", categories: ["everyday", "drinks"] }
  ],
  categories: [
    {
      id: "summer",
      label: "Summer Menu",
      // Sits beneath the featured items, not above them — these are the
      // approved photographs of these exact dishes, but plating varies.
      footnote: "Images are for illustrative purposes. Actual presentation may vary slightly.",
      items: [
        {
          id: "summer-burger-beef",
          name: "Lina’s Burger & Fries (Beef)",
          price: "R60",
          priceCents: 6000,
          image: "/assets/mockups/working/media/lina-home-featured-burger-working-v1-20260830.png",
          imageConfidence: "confirmed",
          group: "summer-burger",
          groupName: "Lina’s Burger & Fries",
          groupNote: "Choose: Beef or Chicken",
          choiceLabel: "Beef"
        },
        {
          id: "summer-burger-chicken",
          name: "Lina’s Burger & Fries (Chicken)",
          price: "R60",
          priceCents: 6000,
          image: "/assets/mockups/working/media/lina-home-featured-burger-working-v1-20260830.png",
          imageConfidence: "confirmed",
          group: "summer-burger",
          groupName: "Lina’s Burger & Fries",
          groupNote: "Choose: Beef or Chicken",
          choiceLabel: "Chicken"
        },
        {
          id: "summer-tacos-prawn",
          name: "Lina’s Tacos (Prawn)",
          price: "R50",
          priceCents: 5000,
          image: "/assets/mockups/working/media/lina-home-featured-shrimp-tacos-working-v1-20260830.png",
          imageConfidence: "confirmed",
          group: "summer-tacos",
          groupName: "Lina’s Tacos",
          groupNote: "Choose: Prawn or Chicken",
          choiceLabel: "Prawn"
        },
        {
          id: "summer-tacos-chicken",
          name: "Lina’s Tacos (Chicken)",
          price: "R50",
          priceCents: 5000,
          image: "/assets/mockups/working/media/lina-home-featured-shrimp-tacos-working-v1-20260830.png",
          imageConfidence: "confirmed",
          group: "summer-tacos",
          groupName: "Lina’s Tacos",
          groupNote: "Choose: Prawn or Chicken",
          choiceLabel: "Chicken"
        },
        {
          id: "summer-chicken-schnitzel",
          name: "Lina’s Chicken Schnitzel",
          price: "R70",
          priceCents: 7000,
          image: "/assets/mockups/working/media/lina-home-featured-chicken-working-v1-20260830.png",
          imageConfidence: "confirmed",
          note: "Served with Greek salad and fries"
        }
      ]
    },
    {
      id: "everyday",
      label: "Everyday Favourites",
      items: [
        { id: "everyday-beef-stew-steak-fried-chicken", name: "Beef Stew, Steak or Fried Chicken with two side salads and dombolo", price: "R60", priceCents: 6000, image: null },
        { id: "everyday-boerewors-roll", name: "Boerewors Roll with caramelised onions", price: "R35", priceCents: 3500, image: null },
        { id: "everyday-cheesy-fries-roll", name: "Cheesy Fries Roll with smoked chicken vienna", price: "R35", priceCents: 3500, image: null },
        { id: "everyday-six-wings", name: "Six Wings", price: "R40", priceCents: 4000, image: null },
        { id: "everyday-kota-cheese-half-russian-vienna-polony", name: "Kota: Chips, cheese, half Russian, vienna and polony", price: "R30", priceCents: 3000, image: null },
        { id: "everyday-kota-full-russian-full-vienna-cheese-polony-egg", name: "Kota: Chips, full Russian, full vienna, cheese, polony and egg", price: "R50", priceCents: 5000, image: null }
      ]
    },
    {
      id: "drinks",
      label: "Drinks",
      items: [
        { id: "drinks-fruto-juice", name: "Fruto Juice: Guava, Mango or Orange", price: "R17", priceCents: 1700, image: null },
        { id: "drinks-dragon-energy", name: "Dragon Energy Drink: Peach, Espresso or Original", price: "R12", priceCents: 1200, image: null },
        { id: "drinks-frugo-sparkling", name: "Frugo Sparkling: Apple or Red Grape", price: "R17", priceCents: 1700, image: null },
        { id: "drinks-canned-soft-drink", name: "Canned Soft Drink: Coke, Orange, Stoney or Sprite", price: "R15", priceCents: 1500, image: null },
        { id: "drinks-lemonade", name: "Lemonade", price: "R17", priceCents: 1700, image: null }
      ]
    }
  ]
};
