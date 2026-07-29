# Lina Asset Register and Folder Rules

## Core rule
Original files received from Lina must never be overwritten, redesigned in place or mixed with project-produced assets. Original source assets live only under `assets/source/`. Everything the project produces lives under its own `working/` or `approved/` folder.

## Folder structure
```text
assets/
├── source/
│   ├── brand/       Original logo and brand files supplied by Lina (never edited in place)
│   ├── menu/        Original menu/price-list files supplied by Lina (source of truth for supplied content)
│   ├── social/      Original/approved social-media reference material (not project-created posts)
│   └── documents/   Original business/programme documents (company info, GEP docs, briefs, registration)
│
├── brand/
│   ├── working/     Brand work in progress (colour explorations, typography options, draft sheets)
│   └── approved/    Approved brand outputs (final brand sheet, approved logo exports, stationery)
│
├── menu/
│   ├── working/     Menu designs and structured menu work in progress
│   └── approved/    Approved menu outputs (final digital/print menu, approved website menu data)
│
├── social/
│   ├── working/     Social-media and campaign work in progress
│   └── approved/    Approved social posts, stories, WhatsApp assets and campaign exports
│
└── mockups/
    ├── working/     Draft mock-ups (uniform, apron, mobile kitchen, signage, vehicle, device previews)
    └── approved/    Approved presentation and production mock-ups
```

## Naming convention

### Original source files (`assets/source/**`)
Retain the original filename where practical. A safe prefix may be added without changing the original content.

Examples:
- `assets/source/brand/lina-original-logo.png`
- `assets/source/menu/lina-original-menu.pdf`
- `assets/source/social/lina-instagram-reference-01.jpg`

### Produced files (`assets/{brand,menu,social,mockups}/{working,approved}`)
`lina-[asset]-[status]-v[number]-YYYYMMDD.ext`

Examples:
- `assets/brand/working/lina-brand-sheet-working-v1-20260728.pdf`
- `assets/brand/approved/lina-brand-sheet-approved-v1-20260730.pdf`
- `assets/menu/approved/lina-digital-menu-approved-v1-20260730.pdf`

## Asset rules
- Never overwrite, redesign in place or rename the original in `assets/source/`; produced work goes in `working/` or `approved/`, never back into `source/`.
- Never overwrite an approved output file; create a new version.
- Keep editable/working and approved export files clearly cross-referenced.
- Record origin and approval status in the register below.
- Instagram media in `assets/source/social/` is interim reference/content only when usage is authorised; project-created social posts belong in `assets/social/working/` or `assets/social/approved/`, not in `source/`.
- Do not treat low-resolution social images as final print assets.

## Register
| Asset | Source/owner | Format | Status | Approved by | Notes |
|---|---|---|---|---|---|
| Logo (`Linas_Logo.jpg`) | Client | JPG, 4678×3307 | Received | — | Brand red sampled at `#A43129`. White line-art chef mark. Genuine, high resolution. |
| Favicon (`Linas_Favicon.jpg`) | Client | JPG, 3355×2705 | Received | — | Same mark/red as logo (`#A33029`, within JPEG compression tolerance). Genuine. |
| Menu (`Linas_menu.pdf`) | Client | PDF | Received | — | Complete, unambiguous: Plates R60 (3 options), Kota R25/R30/R50, chips R15/R25/R30, snacks, drinks. Source of truth for all pricing. |
| `instagram_1785242438335.png` | Client (mobile trailer) | PNG | Received — genuine | — | Chef in the actual trailer, "Lina's" embroidered uniform, "CHEF LINA" trailer signage visible. High-confidence brand asset. |
| `instagram_1785242548210.png` | Uncertain | PNG | Flagged | — | Stovetop/charring-peppers process shot. Plausible but unbranded; sequential file ID to a confirmed non-Lina image (see below). Needs Tebogo confirmation before use. |
| `instagram_1785236732091.png` | Client (info) / stock (border imagery) | PNG | Flagged | — | Real address info ("1 Chris Street, Heidelberg Town", Unique Builders parking lot) but event date (27 Apr 2026) is already past, and bordering food photography reads as stock, not Lina's own plates. Address should be re-confirmed against Client Inputs Register I-006/I-008, not used as a hero/gallery image. |
| `instagram_1785242499183.png` | Not Lina | PNG | **Rejected** | — | "Lina's Kitchen" vitamin/wellness ad (avocado toast, "STACK NOURISHMENT"). Contradicts the confirmed menu and business model. Do not use; flagged for Tebogo re: possible brand-name confusion with an unrelated venture. |
| `instagram_1785242548211.png` / `.mp4` | Not Lina | PNG/MP4 | **Rejected** | — | Fine-dining open-kitchen plating, full sit-down dining room visible, gold cutlery, ceramic plates. Inconsistent with a mobile kota/chips trailer. Usage rights unconfirmed — do not use. |
| `instagram_1785242581478.png`, `instagram_1785242581479.png` | Not Lina | PNG | **Rejected** | — | Choux pastry / spun-sugar dessert plating. Fine-dining style, no connection to the confirmed menu. Do not use. |
| `instagram_1785242618289.png` | Not Lina | PNG | **Rejected** | — | Creamy meatball tagliatelle shot outdoors on grass. Style and dish don't match the menu or trailer context. Do not use. |
| `instagram_1785244457096.png` | Not Lina | PNG | **Rejected** | — | Lamb shank, mash, microgreens on stoneware. Fine-dining plating. Do not use. |
| `instagram_1785244500645.png` | Not Lina | PNG | **Rejected** | — | Beef stew and pap cakes with gold cutlery, restaurant table setting. Do not use. |
| `instagram_1785244529237.png` | Not Lina | PNG | **Rejected** | — | Prawn and pearl-barley salad, gold cutlery. Fine-dining plating. Do not use. |
| `VID_20260728_040731_672.mp4` | Client (`@CHEF_LINA_MOEK`, confirmed by visible watermark) | MP4, 1080×1920 (portrait), HEVC | **Selected — primary hero/chef-trailer video** | — | Chef in embroidered "Lina" coat plating a Plates-matching dish on the trailer counter. Visually reviewed via contact sheet and confirmed. See `docs/LINA-VIDEO-MEDIA-REVIEW.md` for full classification. |
| `VID_20260728_040704_084.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | **Selected — preparation sequence** | — | Trailer stovetop: chicken, potato salad, chakalaka, bread. Trailer signage partially visible. |
| `VID_20260728_040911_609.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | **Selected — food/menu close-up** | — | Top-down plate assembly into takeaway tray, well-lit throughout. |
| `VID_20260728_040923_128.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | **Selected — gallery/catering-occasions/contact-lead** | — | Full trailer exterior signage ("Lina's / CHEF LINA / CATERING" + phone/email) at an outdoor catering event. Phone/email visible but not fully legible/confirmed — see Client Inputs Register I-014. |
| `VID_20260728_040857_536.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Selected — food close-up, **first ~5s only** | — | Chicken bowl close-up; underexposed/dark for the final ~5 seconds, unusable past that point. |
| `VID_20260728_040903_207.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Selected — gallery/event support | — | Outdoor catering event trays, some handheld motion blur. |
| `VID_20260728_040939_436.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | **Rejected — near-duplicate** | — | Same size/duration as `040731_672` (different checksum: a second take, not a byte-identical file); contact sheet confirms same scene. Only `040731_672` used. |
| `VID_20260728_040646_848.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Deferred | — | Home-kitchen tea/toast/honey — genuine but off-menu, different kitchen. Personal-brand B-roll only. |
| `VID_20260728_040854_122.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Deferred | — | Home-kitchen baking (batter, loaf) — genuine but off-menu. |
| `VID_20260728_040946_727.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Deferred | — | Elaborate home-kitchen spread (rice, glazed meat, salad) — plausibly documents the *private catering* service line, distinct from the confirmed R60 menu; needs Tebogo to confirm relevance before use. |
| `VID_20260728_040956_983.mp4` | Client (watermarked) | MP4, 1080×1920, HEVC | Deferred | — | Home-kitchen sauce + potato gratin — same open question as above. |
| `instagram_1785242548211.mp4` | Not Lina | MP4 | **Rejected** | — | Companion clip to the rejected fine-dining plating photo of the same file ID. Do not use. |

## Media curation decisions (Step 2 — design-direction sprint, 2026-07-28)
**Selected for design use:**
- **Hero / chef identity / trailer presence:** `instagram_1785242438335.png` — only confirmed genuine chef+trailer photograph.
- **Menu source of truth:** `Linas_menu.pdf` (all copy, pricing, and item names in every direction must trace back to this file).
- **Brand mark:** `Linas_Logo.jpg` / `Linas_Favicon.jpg`.

**Deferred pending Tebogo confirmation (not used in any direction below):**
- `instagram_1785242548210.png` (stove/peppers) — plausible but unbranded and adjacent to rejected content.
- `instagram_1785236732091.png` (opening flyer) — address info only, not imagery; event date is stale.
- All 11 `VID_20260728_*.mp4` clips — technically plausible raw footage, but unviewed. Provisionally slated for behind-the-scenes/hero B-roll only after a visual scrub confirms content and resolution.

**Rejected — do not use in any direction, mockup, or export:**
- `instagram_1785242499183.png`, `instagram_1785242548211.png/.mp4`, `instagram_1785242581478.png`, `instagram_1785242581479.png`, `instagram_1785242618289.png`, `instagram_1785244457096.png`, `instagram_1785244500645.png`, `instagram_1785244529237.png` — eight images (plus one paired video) depict fine-dining plating in what is clearly a different, unrelated restaurant, or an unrelated "Lina's Kitchen" wellness/vitamin ad. None match the confirmed R60 kota/chips mobile-kitchen menu, the confirmed trailer, or the confirmed chef. Using them would misrepresent the product and may not be Lina's to use at all.

**Net effect:** the verified real photography library is currently thin — one confirmed photograph plus one PDF menu plus a logo. All three design directions below use clearly labelled placeholders for anything beyond that, per the project's content policy. This is recorded as the one material decision requiring Tebogo in the final report.

## Video review and derivatives (Step 2 continued, 2026-07-28)
Full per-video classification: `docs/LINA-VIDEO-MEDIA-REVIEW.md`. Contact sheets: `assets/mockups/working/video-review/*_contactsheet.jpg` (11 files, one per video, generated with ffmpeg — see tool note below).

**Media tool used:** ffmpeg/ffprobe 8.1.2 (Gyan.FFmpeg build), installed via `winget install Gyan.FFmpeg` for local media inspection only, as authorised. System-level install — does not touch the repository, and no ffmpeg binaries are committed. Confirmed no suitable tool existed beforehand (no ffmpeg/ffprobe/ImageMagick/Python on this machine).

**Derivatives created** (all under `assets/mockups/working/media/`, all working-stage, none moved to `approved/`):
| File | Source | Purpose |
|---|---|---|
| `lina-hero-poster-working-v1-20260728.jpg` | `instagram_1785242438335.png`, resized to 1200px wide | Desktop hero background + `<video poster>` fallback |
| `lina-chef-trailer-frame-working-v1-20260728.jpg` | `VID_20260728_040731_672.mp4` @ 19s | Chef & trailer story section (second real moment, distinct from the hero photo) |
| `lina-preparation-frame-working-v1-20260728.jpg` | `VID_20260728_040704_084.mp4` @ 6s | Preparation sequence still |
| `lina-gallery-frame-01-working-v1-20260728.jpg` | `VID_20260728_040923_128.mp4` @ 3s | Gallery — trailer + event, wide framing |
| `lina-gallery-frame-02-working-v1-20260728.jpg` | `VID_20260728_040911_609.mp4` @ 3s | Gallery — plate assembly |
| `lina-gallery-frame-03-working-v1-20260728.jpg` | `VID_20260728_040903_207.mp4` @ 2s | Gallery — catering event trays |
| `lina-gallery-frame-04-working-v1-20260728.jpg` | `VID_20260728_040857_536.mp4` @ 2s | Gallery — chicken close-up (before the clip darkens) |
| `lina-gallery-frame-05-signage-working-v1-20260728.jpg` | `VID_20260728_040923_128.mp4` @ 3.3s | Gallery/contact-proof — sharpest view of trailer signage |
| `lina-hero-preview-working-v1-20260728.mp4` | `VID_20260728_040731_672.mp4`, **re-trimmed 2026-07-29 to 9s–21s** (was 2s–21s), muted, 720px wide, H.264, ~1.6MB | Landing hero video (still→video crossfade in Direction D). The original 2–21s trim contained a ~1.5s window (~5–6.5s in) where an Instagram music-attribution sticker appeared and visually clashed with the hero headline text during the V2 luxury-refinement review; the 9–21s window is confirmed sticker-free (checked via frame sampling) and leads into a stronger closing "presenting the finished plate" moment. |

All originals in `assets/source/social/` remain untouched (verified by unchanged file size against the pre-review listing).

**Mobile crop recommendation:** all source photography/video is portrait (1080×1920 video; 1440×1920 confirmed hero photo). This works naturally for a mobile-first hero. For desktop, recommend a centred crop with a soft blurred-edge extension (not a hard stretch or letterbox) to fill a wide viewport without distorting the subject — this is a build-time treatment, not a further derivative produced here.

**Usage-rights note carried forward:** the phone number/email visible on the trailer signage (`lina-gallery-frame-05-signage-working-v1-20260728.jpg`) is not fully legible at this resolution and is not treated as confirmed contact information — see Client Inputs Register I-014.

## Direction C prototype build (2026-07-28)
New working files under `assets/mockups/working/prototype/`: `index.html`, `styles.css`, `script.js`, `menu-data.js` (menu content transcribed verbatim from `Linas_menu.pdf`). All 9 media derivatives listed above are used in the built prototype; the confirmed hero photo and the `@CHEF_LINA_MOEK`-watermarked video/photo frames are the only real media in use, everything else is a labelled "Photo pending" placeholder. (Note: an ad-hoc `serve.js` originally created inside this folder for one-off testing was later removed and superseded by the permanent `scripts/serve-prototype.js` at the repo root — see the local-development environment work recorded separately.)

## Prototype V2 / Direction D build (2026-07-28)
New working files under `assets/mockups/working/prototype-v2/`: `index.html` (landing gateway, Concept 1 — selected), `catering.html`, `menu.html`, `chef-lina.html`, `mobile-kitchen.html`, `gallery.html`, `contact.html`, `concept-2-split-landing.html` (comparison-only, not routed into navigation), `styles.css`, `script.js`, `menu-data.js` (copied unchanged from V1 — content itself was never in question). Full rationale: `docs/LINA-PROTOTYPE-V2-DESIGN-RATIONALE.md`.

**Three new video derivatives created this round** (ffmpeg already installed/authorised in the prior media-review session — not reinstalled):
| File | Source | Trim | Purpose |
|---|---|---|---|
| `lina-catering-preview-working-v1-20260728.mp4` | `VID_20260728_040911_609.mp4` | 0.3s–8.8s | Catering page hero (plate assembly) |
| `lina-mobilekitchen-preview-working-v1-20260728.mp4` | `VID_20260728_040704_084.mp4` | 0.5s–13.5s | Mobile Kitchen page hero (trailer stovetop) |
| `lina-gallery-clip-01-working-v1-20260728.mp4` | `VID_20260728_040857_536.mp4` | 0s–4.8s (well-lit portion only, per the original review note that this clip darkens after ~5s) | Gallery click-to-play tile |

All three are H.264, 640–720px wide, muted, sub-2MB, stored under `assets/mockups/working/media/` alongside the existing 9 derivatives. Original source clips in `assets/source/social/` remain untouched.

One integrity fix made during review: `lina-chef-trailer-frame-working-v1-20260728.jpg` had originally been attached to two differently-named Plates items in `menu-data.js`; corrected so only the one plausible match ("Braised chicken, dombolo, spinach, potato salad") keeps it, avoiding a false impression that a single photo documents two distinct dishes.

**Verification screenshots:** `assets/mockups/working/client-review/*.png` — captured via a custom Chrome DevTools Protocol driver against headless Microsoft Edge (no chromium-cli or Playwright available in this environment; a zero-install driver script was written using only Node's built-in `http` and `WebSocket` rather than installing browser-automation packages beyond the ffmpeg install already authorised).
