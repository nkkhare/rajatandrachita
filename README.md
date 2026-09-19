# Rajat & Rachita · Save the Date

A local, responsive wedding invitation for **Saturday, May 15, 2027**, in **Philadelphia, Pennsylvania**.

## Preview

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173>. No package installation or build step is required. Nothing has been deployed.

## Experience

- Tap the envelope or **Open invitation** to reveal the original wedding crest and announcement.
- The two-second reveal supports skipping, replay, keyboard input, and reduced motion.
- The layout changes from a desktop composition with artwork beside the text to a stacked mobile invitation.
- **Add to calendar** offers Google Calendar and a downloadable Apple/Outlook-compatible event. The event is all-day on May 15, 2027; May 16 is its exclusive end date.
- Without JavaScript, the complete invitation and calendar links are available immediately.
- Fonts and images are served locally. No analytics, storage, audio, guest data, or external runtime dependencies are used. Google Calendar is opened only when the guest selects it.

## Files

- `dist/index.html`: accessible content and calendar links.
- `dist/styles.css`: responsive layout, typography, and interaction styling.
- `dist/invitation.js`: opening/replay animation and accessibility behavior.
- `dist/rajat-and-rachita.ics`: downloadable all-day event.
- `dist/assets/`: original crest, envelope, local fonts, and their licenses.

The supplied crest is preserved in `dist/assets/wedding-crest.png`, with a high-quality WebP copy for faster browser loading. The skyline in that supplied artwork is intentionally retained; the invitation text identifies Philadelphia as the wedding location.

## Artwork provenance

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
