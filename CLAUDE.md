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
```

## Deployment

`.github/workflows/pages.yml` deploys `dist/` to GitHub Pages on every push to `main` that touches `dist/**` or the workflow file. It can also be run manually with `workflow_dispatch`. A push to `main` is a public deploy.

The site is served under the `/rajatandrachita/` subpath. **All asset URLs must stay relative** (e.g. `assets/x.webp`, `styles.css`), with no leading `/`, or they break in production while still working in the local preview.

## Architecture

Three files work together, and none of them works fully alone:

- **Progressive enhancement is the core contract.** `index.html` ships with the envelope `#cover` marked `hidden`, the invitation visible and the countdown `hidden`. A tiny inline script in `<head>` sets `<html data-state="loading">`, which hides the page until `invitation.js` runs, so the invitation never flashes before the envelope covers it; a 4 s fallback clears it if the script never runs. `invitation.js` attaches every listener first and only then calls `resetCover()`. If the browser lacks `clip-path: path()`, it removes the state and leaves the invitation showing. Without JS, the full invitation and calendar links show.
- **State machine:** `closed` → `opening` → `opened`, written to `<html data-state>`. CSS scroll-locks the page in `loading`/`closed`/`opening`. The cover is a fixed full-screen overlay (`z-index:20`) above the in-flow invitation, which is `inert`/`aria-hidden` until opened.
- **The envelope is drawn in code**, not an image. Inside `.envelope-button`: `.env-body` (holds `.env-inside`, the interior; `.env-pocket`, the paper below the pocket mouth; an SVG with the blurred flap shadow and the two fold lines; and the hint) and `.env-flap` (its child `.flap-face` holds the dimming layer and the embossed `.monogram`). `layoutEnvelope()` recomputes the geometry on load and resize: the flap's rounded tip sits at 58% of the height, its sides rise at most `min(tan40°·W/2, 0.22H)`, so wide screens get a shallower V. The shapes are applied as `clip-path: path()` in px (on the child `.flap-face`, never on the 3D-rotated `.env-flap`, which Safari mishandles). The paper relief is an SVG `feTurbulence`/`feDiffuseLighting` data-URI tile built in JS (`--cotton`), scaled by device pixel ratio and multiply-blended over the paper tones. The monogram is Pinyon Script embossed with layered `text-shadow`s; `--tip-y`/`--lift` keep it clear of the flap edge.
- **Opening timeline** (Web Animations API via the `animate()` helper, which records every animation so `clearAnimations()` can cancel them, and ignores a missing element). The monogram presses in, the flap rotates up toward the viewer and out of view (with its shadow growing and fading), the envelope body drops, and the invitation rises beneath it. The card then assembles: the frame rules draw in, the banner band unfurls from its center, its tails fold out, the lettering wipes in, the jhumkas swing to rest, then the eyebrow, names, date, place, crest, countdown and calendar button. `finishOpening()` is the single place where the page settles; it's reached from Skip, Escape, a width change mid-opening, a switch to reduced motion, any animation exception, and the `finishTimer` fallback, which is computed from the animations' own end times (+50 ms), so timings can change freely.
- **The banner** is inline SVG in `index.html` (it must be inline so its `<textPath>` lettering can use the self-hosted Pinyon font). Animated groups (`.bn-band`, `.bn-tail-*`, `.bn-text`, `.bn-jhumka-*`) use `transform-box: fill-box`. The jhumkas sit inside an outer `<g transform>` so the animated inner group's CSS `transform` doesn't override their position. Keep `url(#id)` references as SVG attributes, not in `styles.css`.
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
- Raster images use `<picture>` with a WebP source and a PNG fallback. Update both files when replacing an image.
- `reference/wedding-crest.png` is the couple's supplied crest. It must not be modified, and it stays outside `dist/`. The published copies in `dist/assets/wedding-crest.{webp,png}` are 900px resizes of it.
