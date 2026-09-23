# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page wedding save-the-date (Rajat & Rachita, Saturday May 15, 2027, Philadelphia), hosted at https://nkkhare.github.io/rajatandrachita/. There is no package manager, build step, framework, or test suite. **`dist/` is the hand-edited source, not build output.** Edit files there directly.

The experience is modeled on The Digital Yes invitations; `research/the-digital-yes.md` records that reference (their frame-by-frame timeline) and the design decisions made with the couple.

## Commands

```sh
# Local preview (then open http://127.0.0.1:4173)
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist

# The only checks CI runs; run them before pushing
test -s dist/index.html && node --check dist/invitation.js

# Rebuild the card's art after editing art-src/card-art/*.html (needs Chrome and macOS sips)
python3 art-src/card-art/fetch.py   # once: copies the paintings into src/ (git-ignored)
python3 art-src/card-art/bake.py
```

## Deployment

`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages on every push to `main` that touches `dist/**` or the workflow file. It can also be run manually with `workflow_dispatch`. A push to `main` is a public deploy.

The site is served under the `/rajatandrachita/` subpath. **All asset URLs must stay relative** (e.g. `assets/x.webp`, `styles.css`), with no leading `/`, or they break in production while still working in the local preview.

## Architecture

Three files work together, and none of them works fully alone:

- **Progressive enhancement is the core contract.** `index.html` ships with the envelope `#cover` marked `hidden`, the invitation visible and the countdown `hidden`. A tiny inline script in `<head>` sets `<html data-state="loading">`, which hides the page until `invitation.js` runs, so the invitation never flashes before the envelope covers it; a 4 s fallback clears it if the script never runs. `invitation.js` attaches every listener first and only then calls `resetCover()`. If the browser lacks `clip-path: path()`, it removes the state and leaves the invitation showing. Without JS, the full invitation and calendar links show.
- **State machine:** `closed` → `opening` → `opened`, written to `<html data-state>`. CSS scroll-locks the page in `loading`/`closed`/`opening`. The cover is a fixed full-screen overlay (`z-index:20`) above the in-flow invitation, which is `inert`/`aria-hidden` until opened.
- **The envelope is drawn in code**, not an image. Inside `.envelope-button`: `.env-body` (holds `.env-inside`, the interior; `.env-pocket`, the paper below the pocket mouth; an SVG with the side-flap shading, the blurred flap shadow and the two fold lines; and the hint) and `.env-flap` (its child `.flap-face` holds the dimming layer and the embossed `.monogram`). `layoutEnvelope()` recomputes the geometry on load and resize: the flap's rounded tip sits at 58% of the height, its sides rise at most `min(tan40°·W/2, 0.22H)`, so wide screens get a shallower V. The shapes are applied as `clip-path: path()` in px (on the child `.flap-face`, never on the 3D-rotated `.env-flap`, which Safari mishandles). The paper is deliberately smooth, like a real envelope: flat tones with soft gradient lighting, no texture or noise. The monogram is Pinyon Script embossed with layered `text-shadow`s; `--tip-y`/`--lift` keep it clear of the flap edge.
- **Opening timeline** (Web Animations API via the `animate()` helper, which records every animation so `clearAnimations()` can cancel them, and ignores a missing element). It's paced like The Digital Yes's envelope (see `research/`). The camera slowly pushes in, the monogram presses in, the flap eases up a little and then swings up toward the viewer and out of view (its shadow growing, then fading before the flap leaves the frame), there's a beat on the interior, the envelope body drops, and the invitation rises beneath it at `card` (3.9 s). The card arrives blank and the banner comes first, every step timed by `at(ms, duration)` from `card` and stretched by `pace`: the rolled silk (`.bn-rolls`) appears, the band unrolls from its middle while the two `.bn-roll`s travel out along its curve, the tails fold out, the jhumkas swing, and "Save the Date" is written on (the text's outline is drawn with `stroke-dashoffset` behind a left-to-right wipe, then the fill comes in). Only then does everything else populate: the photo bands, the frame rules, the eyebrow, names, date, place, countdown and calendar button. This order is the couple's request; keep the banner first. The flap, `.flap-dim` and the flap shadow share one timing and one easing, so their keyframe offsets are fractions of the flap's angle; keep them on a single easing curve (splitting the flap into eased segments makes it stop dead between them). `finishOpening()` is the single place where the page settles; it's reached from Skip, Escape, a width change mid-opening, a switch to reduced motion, any animation exception, and the `finishTimer` fallback, which is computed from the animations' own end times (+50 ms), so timings can change freely.
- **The banner** is inline SVG in `index.html` (it must be inline so its `<textPath>` lettering can use the self-hosted Pinyon font). Animated groups (`.bn-band`, `.bn-tail-*`, `.bn-text`, `.bn-jhumka-*`) use `transform-box: fill-box`. The ribbon is an outline, not a solid: gold strokes on no fill, 78 tall (top edge y=62, bottom y=140), with the lettering in burgundy on the paper. The unroll clips `.bn-band` by `inset()` of its own box, so nothing wider than the band may live inside it; the roll keyframes are computed from the band's curve (x = 104 + 392t, top edge y = 62 + 124t(1-t)), so change them together, and the rolls' height tracks the band's. `.bn-roll` is hidden by default, so the settled page shows the plain banner. The jhumkas sit inside an outer `<g transform>` so the animated inner group's CSS `transform` doesn't override their position. Keep `url(#id)` references as SVG attributes, not in `styles.css`.
- **Card art:** both bands are crops of the couple's two paintings, so the card reads as one hand and nothing third-party ships. `dist/assets/art/mountains.{webp,jpg}` comes from the crest (`reference/wedding-crest.png`): its peaks and forest, with its pines brought in from their own corner to frame both sides. `dist/assets/art/philadelphia.{webp,jpg}` comes from the Philadelphia medallion (`reference/philadelphia-medallion.png`): the skyline across the back, Independence Hall among its trees at the left, City Hall's tower with William Penn at the right, and the bridge over the river along the foot. **Every crop must stay inside its painting's inner gold ring** (both are 1254², centre 627,627, radius ≈560 — check all four corners) **and clear of its lettering**: the crest's gold monogram (below y≈330) and jhumka (beyond x≈830), and the medallion's "SAVE THE DATE" (x 490-790, y 450-800). In the HTML a slot is the crop window and the image inside is scaled by `width`, pulled into place by `left`/`top`; neighbours meet through wide `linear-gradient` side fades with `mask-composite: intersect`. A per-image rule must out-specify a shared `img` rule (write `.band img.hall`, not `.hall`) or its `filter`/`mask` is silently dropped. They're baked by `art-src/card-art/` (`fetch.py` copies the paintings in, `bake.py` renders each piece in `PIECES` from its own HTML file and softens it with `paint.js` — `SOFTEN` only takes the edge off the upscaling; preview by opening `paint.html?src=…` in a browser). The bands are 1200×680, for a 600-wide card at 2×. On the page they're `<picture>`s (`.card-art`) behind the text, with CSS masks feathering their edges into the card; the `.invitation::before`/`::after` spacers (`aspect-ratio`, so they scale with the card) keep the words in the clear band between them. If you change the card's copy or type sizes, check the calendar button still clears the skyline.
- **Countdown:** `WEDDING` in `invitation.js` is midnight EDT on May 15, 2027. It shows days/hours/minutes (minutes rounded up, so it never shows 0 while time remains), re-renders on each minute boundary and when the tab becomes visible, shows "Today’s the day" on the day, and hides itself afterwards.
- **Reduced motion** is handled twice. JS opens instantly via `finishOpening()`, and a CSS media query turns off all transitions and animations.
- **Focus management:** opening moves focus to `#skip-button`, and finishing moves it to `#invitation-title` (`tabindex="-1"`). `#replay-button` lives in the footer and is shown only once the invitation is open.
- `styles.css` is written as dense one-line rules with design tokens in `:root` (`--paper`, `--card`, `--env*`, `--grain`, `--ink`, `--burgundy`, `--gold`, `--muted`, `--line`, `--serif`, `--sans`, `--script`). Keep that style. Breakpoints: `max-width:480px` and `max-width:360px` for phones, and `min-width:761px and max-height:860px` to tighten short desktop windows.

## Event details are duplicated

The date and location are hard-coded in several places, so a change must update all of them:
- `dist/index.html`: `<title>`, meta description, the `<time datetime>` and its text ("Saturday, May 15, 2027"), the location line, the footer (`05.15.2027`), and the Google Calendar URL (`dates=20270515%2F20270516`, URL-encoded text/location/details)
- `dist/invitation.js`: the `WEDDING` countdown target
- `dist/rajat-and-rachita.ics`: `DTSTART`/`DTEND` (all-day event, so `DTEND` is the exclusive next day), `LOCATION`, `SUMMARY`, `DESCRIPTION`
- `README.md`

## Constraints

- No external runtime dependencies: no CDNs, Google Fonts links, analytics, storage, or tracking. Fonts (Cormorant Garamond, Jost, Pinyon Script) are self-hosted `.woff2` files in `dist/assets/` with their OFL license files. The page is `noindex, nofollow`.
- Raster images use `<picture>` with a WebP source and a fallback: PNG for graphics, JPEG for the photo bands (a photo as PNG would be megabytes). Update both files when replacing an image.
- `reference/wedding-crest.png` and `reference/philadelphia-medallion.png` are the couple's supplied paintings. Neither may be modified, and both stay outside `dist/`. `fetch.py` copies them into `art-src/card-art/src/` (git-ignored); only crops of them ship.
