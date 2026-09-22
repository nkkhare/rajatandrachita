# Research: The Digital Yes invitation experience

The couple want their save-the-date to feel like the digital invitations from **The Digital Yes** (https://www.thedigitalyes.com/). These notes record what that experience is and how it's built, so design decisions here can be checked against it.

Gathered on 2026-09-19 with the Parallel CLI (`parallel-cli extract` / `parallel-cli search`), plus a frame-by-frame capture of their live "The Lovebirds" demo in headless Chrome.

## What they sell

- Hand-designed digital wedding invitations from €175, and interactive Save the Dates at €75. They're delivered as a single link that opens on any phone, with RSVP, maps, music and up to three languages.
- Invitation themes: Bella Vista (Tuscan watercolour under string lights), Villa Perlé (pearl embroidery and swans), La Maison Dorée (white florals, pearl curtains, ivory bow), Royal, Day & Night, Majestic (beaded curtains, chandelier), Teatro (red velvet curtain rise), La Finca (illustrated venue), Cap Blanc (watercolour Riviera), Embroidered Garden, Prestige, Eleganza.
- Save the Date themes: The Lovebirds (two lovebirds, soft florals, gentle countdown), Photo Scratch and Elegant Photo Scratch (scratch to reveal a photo), Majestic, The Soft Lace Edit and The Lace Edit (wax seal on lace), Swans (watercolour swans and a live countdown), Floral, Interactive Scratch (scratch to reveal the date), Bloom, Candlelight (tap to light the candles), Oasis Royale.
- Paid extras: custom illustration, animated video, custom music, a custom wax seal.

## Signature animations
From their post "Animated Wedding Invitations: 7 Effects That Wow Guests" (thedigitalyes.com/blog/animated-wedding-invitation):
1. **Envelope opening.** "A wax-sealed envelope appears, the seal cracks, the envelope unfolds." About 90% of their invitations use it, and it's included in every plan.
2. **Curtain rise** (Teatro): a red velvet curtain lifts to reveal the invitation.
3. **Day to night:** the background shifts from sunrise to starry night as you scroll.
4. Supporting effects:
   - a floating wax seal that follows the cursor (desktop)
   - hand-drawn ink writing for the names
   - parallax on the venue illustration
   - subtle particles (petals, candle smoke, stars), used very sparingly

## "The Lovebirds" demo, frame by frame
Live demo: `https://savethedate-thelovebirds.thedigitalyes.com/?embed=1`, captured at 390×844 (a phone).

**How it's built:** mostly video, not CSS.
- The cover is a still photo of an envelope (`envelope-*.png`).
- A tap plays `video/envelope-open.mp4` (1080×1920, portrait).
- The invitation's illustration layer is a second video (`save-the-date.mp4`). The names, date, countdown and button are live HTML over it.

| Time | What happens |
|---|---|
| Cover | Full-screen close-up of cream cotton paper. The flap has a **rounded tip**; a **blind-embossed script monogram** ("C&H") sits just above it; a tiny tracked-caps **"TAP TO OPEN"** is near the bottom. No wax seal on this design. |
| 0–1.4 s | Slow camera push-in. The flap starts to lift, and a shadow grows under its tip. |
| 1.9–3.2 s | The flap swings up and out of frame, revealing the bright interior. |
| ~4 s | Cut to the invitation page: plain paper. |
| ~5.5 s | A hand-drawn double frame appears. Two birds fly in carrying a ribbon, which unfurls from a bow. Hand-drawn flowers in vases are drawn in along the lower half. |
| ~8.5 s | "Save the Date" is hand-lettered onto the ribbon, stroke by stroke. |
| ~9.5 s | "WE ARE / GETTING MARRIED", then "Clara & Hugo" (italic serif), then "15 JUNE 2027" fade in. |
| ~10.5 s | Countdown (268 DAYS \| 21 HOURS \| 9 MINS) and an "ADD TO CALENDAR" pill button. |
| ~12 s | Settled. A small bird perches near the top. There's a mute button (background music) and an EN / ES switch. |

**Palette and type:** olive-brown ink on a warm off-white page, a wobbly hand-drawn double border, a letterspaced serif for small caps, an italic serif for the names, and a brush script on the banner.

## How this site adapts it
Decisions made with the couple on 2026-09-19:
- **Envelope:** a full-screen embossed envelope on every screen size, drawn live in CSS and SVG instead of video, since there's no video pipeline.
  - The paper is smooth, with soft lighting and crisp folds. (A textured cotton relief was tried first and read as too grainy.)
  - The monogram is a Pinyon Script "R&R" embossed with layered text shadows.
  - The flap is a clipped layer rotated in 3D, with a moving shadow.
- **Reveal:** the flap lifts and swings away, the envelope drops, and the card rises. The card then assembles in sequence, echoing their beats:
  1. a **burgundy silk ribbon with gold jhumka tassels**, taken from the dupatta in the couple's crest, unrolls from the middle like their ribbon unfurling (rolled ends travelling outward, satin texture, gold embroidery, a sheen), then "Save the Date" is written on stroke by stroke, echoing their hand-lettering. The couple asked for the banner to finish before anything else appears
  2. in place of their flower illustration, the card carries the crest's own scenery: its peaks and forest across the top, and along the bottom Philadelphia's landmarks painted in the crest's manner (Independence Hall, City Hall, the Liberty Bell), with the crest's flowers framing the words between them. (Code-drawn scenery read as cartoonish; unpainted photos read as too literal; painted photos of a named park still weren't the crest. The couple asked for the crest itself.)
  3. the frame draws in
  4. the text fades up
  5. the countdown and "Add to calendar" arrive
- **Included:** the countdown and the "We are getting married" line.
- **Not included (yet):** music, the language switch, birds, scratch-to-reveal.

## Reproducing the research
```sh
parallel-cli extract "https://www.thedigitalyes.com/" --full-content --objective "designs, envelope/opening animations, sections, interactive features"
parallel-cli search "The Digital Yes digital wedding invitation designs and animations" --mode advanced
parallel-cli extract "https://www.thedigitalyes.com/save-the-date/the-lovebirds" "https://www.thedigitalyes.com/blog/animated-wedding-invitation" --full-content
```
The demo pages are React apps, so rendering them in headless Chrome (Chrome DevTools Protocol) is the only way to see the animation. Screenshots of their product aren't stored in this public repository.
