# Rajat & Rachita · Save the Date

A responsive wedding save-the-date for **May 14–15, 2027**, in **Philadelphia, Pennsylvania**.

## Website

**[Open the invitation](https://nkkhare.github.io/rajatandrachita/)**

GitHub Pages publishes the contents of `dist/` using `.github/workflows/pages.yml`. Changes to the invitation on `main` deploy automatically. You can also run the workflow manually from the repository’s Actions tab.

The repository’s **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**. All site assets use relative paths so the invitation works at the repository’s `/rajatandrachita/` address as well as in the local preview.

## Preview

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173>. No package installation or build step is required.

## Experience

- Guests land on a full-screen envelope: smooth ivory paper, a flap with a rounded tip, an embossed script "R&R" monogram, and "Tap to open". Tapping it lifts the flap, the envelope drops away, and the card rises into view (about six seconds in all).
- The reveal supports skipping (the **Skip** control or Escape), replay (in the footer), keyboard input, and reduced motion.
- Once the card has settled it stays gently alive: the river shimmers, haze drifts across the mountains and the city, and a few petals fall. All of it sits behind the words, and reduced motion turns it off.
- The invitation is the couple's own painted card, shown whole: "Save the Date", "Rajat & Rachita", "May 14 - 15, 2027", "Philadelphia, Pennsylvania" and "Invitation to follow", framed in blossom and gold over the Philadelphia skyline and the river.
- Once it has settled the card stays gently alive: the river shimmers, haze drifts behind the skyline, and petals fall. All of it is laid over the artwork without altering it, and reduced motion turns it off.
- Without JavaScript, the card is shown immediately.
- Fonts and images are served locally. No analytics, storage, audio, guest data, or external runtime dependencies are used. Google Calendar is opened only when the guest selects it.
- The experience is modeled on The Digital Yes invitations; see `research/the-digital-yes.md`.

## Files

- `dist/index.html`: accessible content, the envelope, the inline "Save the Date" banner, and calendar links.
- `dist/styles.css`: responsive layout, typography, the envelope layers and interaction styling.
- `dist/invitation.js`: envelope geometry, the opening/replay animation, and accessibility behavior.
- `dist/rajat-and-rachita.ics`: downloadable all-day event.
- `dist/assets/`: the card's photo bands (`art/`, WebP and JPEG), local fonts, and their licenses.
- `art-src/card-art/`: copies the couple's paintings in and bakes the card's art from crops of them (`fetch.py`, then `bake.py`; `paint.js` softens the upscaling).
- `reference/`: the couple's original paintings — the watercolor crest and the Philadelphia medallion — unmodified and not published.
- `research/`: notes on the reference experience this site follows.

## Artwork provenance

The card's art is all the couple's own. The mountains are cut from their crest
(`reference/wedding-crest.png`); the city is cut from their Philadelphia painting
(`reference/philadelphia-medallion.png`): Independence Hall, City Hall's tower with William Penn, the skyline
between them and the river along the foot. Neither original is modified or published whole — only crops of them ship, baked by
`art-src/card-art/`. The envelope and the silk banner are drawn in code (CSS and SVG); no image generator was used
for them, and the banner's gold jhumkas echo the jhumkas in the crest.

Fonts: Cormorant Garamond, Jost and Pinyon Script, downloaded from the Google Fonts distribution and used under their SIL Open Font Licenses.
