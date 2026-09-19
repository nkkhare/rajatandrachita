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

- Tap the envelope's wax seal to open it: the flap lifts with the seal, the invitation slides out of the pocket, and the card comes forward as the envelope falls away (about 2.3 seconds).
- The reveal supports skipping (the **Skip** control or Escape), replay (in the footer), keyboard input, and reduced motion.
- The invitation is a centered card in stationery proportions (3:2), framed by gold line-art corners: Indian flowers (marigold, rose, lotus, jasmine and a gold jhumka) cascading from the top corners, Yosemite from Tunnel View (El Capitan, Half Dome, Bridalveil Fall) bottom-left, and New York (the Brooklyn Bridge, Chrysler, Empire State and One World Trade Center) bottom-right. On phones and portrait tablets the corners become bands above and below the text.
- **Add to calendar** offers Google Calendar and a downloadable Apple/Outlook-compatible event. The event is all-day on May 15, 2027; May 16 is its exclusive end date.
- Without JavaScript, the complete invitation and calendar links are available immediately.
- Fonts and images are served locally. No analytics, storage, audio, guest data, or external runtime dependencies are used. Google Calendar is opened only when the guest selects it.

## Files

- `dist/index.html`: accessible content and calendar links.
- `dist/styles.css`: responsive layout, typography, and interaction styling.
- `dist/invitation.js`: opening/replay animation and accessibility behavior.
- `dist/rajat-and-rachita.ics`: downloadable all-day event.
- `dist/assets/`: envelope, local fonts, and their licenses.
- `dist/assets/art/`: the four corner illustrations (`florals.svg`, `florals-right.svg`, `yosemite.svg`, `new-york.svg`).
- `art-src/`: the script that draws the corner illustrations. Run `node art-src/gen.mjs` to regenerate `dist/assets/art/`; the output is deterministic.
- `reference/wedding-crest.png`: the couple's original watercolor crest, kept unmodified outside the published site. It is no longer displayed; the corner art takes its motifs (Indian flowers, jhumkas, mountains, the New York skyline) as inspiration.

## Artwork provenance

The corner illustrations are original vector line art written as code (`art-src/`) for this site; no image generator was used and they do not trace the crest. Yosemite and New York are places that matter to the couple; the invitation text identifies Philadelphia as the wedding location.

One matching envelope was created with the **built-in Imagegen tool**. The final asset is `dist/assets/envelope.webp`; the original generated image is preserved at `dist/assets/envelope.png`. This artwork does not replace or modify the supplied wedding crest.

Final generation prompt:

```text
Use case: product-mockup
Asset type: interactive clickable envelope asset for a premium wedding save-the-date website.
Primary request: Generate exactly one fine-art stationery envelope, straight-on view of its back, entirely visible, no perspective skew.
Scene/backdrop: Genuinely transparent background with alpha, no painted backdrop. Approximately 3:2 horizontal canvas. Envelope is large and centered with a small generous transparent margin around every edge.
Subject: A warm ivory handmade cotton-paper envelope with a precisely closed triangular flap. Fine, restrained antique-gold edging outlines the envelope and flap. A beautiful small deep burgundy wax seal sits at the central point of the flap and bears an elegant embossed gold monogram.
Text (verbatim): "RR" — only these two uppercase letters, elegantly interlaced on the wax seal. No other typography.
Style/medium: Premium fine-art stationery product illustration, richly tactile but refined and graceful, tasteful wedding aesthetic, exceptionally subtle paper grain.
Lighting/mood: Soft gentle studio lighting and delicate paper fold shading, no hard cast shadow.
Color palette: Warm ivory, restrained antique gold, deep burgundy.
Constraints: Exactly one envelope. Entire silhouette visible. Closed triangular flap. Straight-on orthographic composition. Preserve true transparent alpha. No hands, props, flowers, extra ornaments, background text, watermarks, or typography outside the RR seal.
```

Fonts: Cormorant Garamond and Jost, downloaded from the Google Fonts distribution and used under their SIL Open Font Licenses.
