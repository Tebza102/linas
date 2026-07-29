# Lina Interactive Menu Direction v1 — 20260728

Applies to all three directions (weighted differently per `assets/mockups/working/lina-direction-*.md`). Source of truth for every item, name and price is `assets/source/menu/Linas_menu.pdf` — nothing below invents a price, description or item not already in that PDF.

## Structure
Four categories exactly mirroring the PDF's own sections — no reorganising the client's own menu logic:
1. **Plates** — flat R60, three options (short-rib & chakalaka & potato salad / braised chicken & dombolo & spinach & potato salad / beef stew & potato salad & spinach).
2. **Kota** — five options, R25–R50.
3. **Chips & Snacks** — chips (three sizes), bread/vienna/russian/noodles.
4. **Drinks** — juice, energy drinks, cold drinks, 2L cold drinks.

## Card anatomy
- Image (or labelled placeholder — see mapping below) in `1:1` crop.
- Item name, exactly as written in the PDF.
- Price, exactly as written in the PDF (no rounding, no "from R.." unless the PDF itself is ambiguous — it isn't).
- "Special/limited" tag — **not currently used**; the PDF marks no item as a daily special, so no direction should invent one. This tag activates only once Tebogo confirms a real daily special.
- Tap/click → detail panel: full ingredient list from the PDF, Order/Enquire action.

## Image-to-item mapping (Step 6 requirement: flag uncertain matches, don't block)
| Menu item | Candidate image | Confidence | Treatment |
|---|---|---|---|
| Plates (all three options, generic) | `instagram_1785242438335.png` — the confirmed chef photo shows a wooden board with a starch mound, an orange/yellow salad, and glazed meat pieces, consistent in general shape with a Plates order | **Uncertain — plausible, not certain.** Could reasonably be the "braised chicken, dombolo, spinach, potato salad" or "short-rib, chakalaka, potato salad" option, but the specific dish isn't distinguishable with confidence from the photo alone. | Use only as a **category-level** hero image for "Plates" (not tied to one specific option name), with a visible caption inviting confirmation, rather than asserting it is a specific named dish. |
| Kota (all five options) | None | No confirmed photo | Labelled placeholder per item: "Photo pending" |
| Chips & Snacks (all options) | None | No confirmed photo | Labelled placeholder per item |
| Drinks (all options) | None | No confirmed photo | Labelled placeholder, or simple flat-icon treatment (bottle/can silhouette) rather than a fabricated photo |

No other supplied image was used for menu mapping — the eight rejected fine-dining/wellness images (see Asset Register) show dishes (lamb shank, tagliatelle, prawns, choux pastry, avocado toast) that do not correspond to any item on the actual menu, which is itself further evidence they belong to an unrelated source.

## Mobile behaviour
- Category tabs swipeable, sticky beneath the nav once the menu section is in view.
- Cards scroll horizontally within a category on mobile, wrap to a grid on desktop.
- Detail panel opens as a bottom sheet on mobile, a centred modal on desktop; closable by tap, swipe-down, or Escape key.

## Fallback rule
Every placeholder state is visually calm (a flat `--paper` or `--trailer-grey` tile with small caption text) — never a stretched stock photo, never a grey box with a broken-image icon, and never an AI-generated "illustrative" food image presented as if it were a real photo of Lina's food.
