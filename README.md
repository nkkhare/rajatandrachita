# Rajat & Rachita · Save the Date

A responsive wedding invitation for **Saturday, May 15, 2027**, in **Philadelphia, Pennsylvania**.

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

- Guests land on a full-screen envelope: textured cotton paper, a flap with a rounded tip, an embossed script "R&R" monogram, and "Tap to open". Tapping it lifts the flap, the envelope drops away, and the invitation rises into view and assembles: the frame draws in, a burgundy silk "Save the Date" banner with gold jhumka tassels unfurls and letters itself, then the names, date, crest, countdown and calendar button arrive (about 4 seconds in all).
- The reveal supports skipping (the **Skip** control or Escape), replay (in the footer), keyboard input, and reduced motion.
- The invitation is a centered portrait card: "We are getting married", "Rajat & Rachita", "Saturday, May 15, 2027", Philadelphia, the couple's watercolor crest, and a live countdown to the day. On the wedding day the countdown reads "Today's the day"; afterwards it's hidden.
- **Add to calendar** offers Google Calendar and a downloadable Apple/Outlook-compatible event. The event is all-day on May 15, 2027; May 16 is its exclusive end date.
- Without JavaScript, the complete invitation and calendar links are available immediately (the countdown needs JavaScript).
- Fonts and images are served locally. No analytics, storage, audio, guest data, or external runtime dependencies are used. Google Calendar is opened only when the guest selects it.
- The experience is modeled on The Digital Yes invitations; see `research/the-digital-yes.md`.

## Files

- `dist/index.html`: accessible content, the envelope, the inline "Save the Date" banner, and calendar links.
- `dist/styles.css`: responsive layout, typography, the envelope layers and interaction styling.
- `dist/invitation.js`: envelope geometry, the opening/replay animation, the countdown, and accessibility behavior.
- `dist/rajat-and-rachita.ics`: downloadable all-day event.
- `dist/assets/`: the crest (900px WebP and PNG copies), local fonts, and their licenses.
- `reference/wedding-crest.png`: the couple's original watercolor crest, unmodified and not published. The copies in `dist/assets/` are resized from it.
- `research/`: notes on the reference experience this site follows.

## Artwork provenance

The crest is the couple's own artwork, shown as supplied (resized for the web). The envelope, its paper texture and the silk banner are drawn in code (CSS and SVG); no image generator was used for them. The banner's gold jhumkas echo the jhumkas in the crest.

Fonts: Cormorant Garamond, Jost and Pinyon Script, downloaded from the Google Fonts distribution and used under their SIL Open Font Licenses.
