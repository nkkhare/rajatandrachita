# Rachita & Rajat · Save the Date

An animated presentation of the 1024×1536 Philadelphia save-the-date artwork. Guests open a pastel-lavender envelope with a champagne-gold flap to reveal the card. Once it settles, the live countdown, river shimmer, slow cloud drift, and falling petals bring the invitation to life.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production site in `dist/` with relative asset URLs, suitable for the repository's GitHub Pages subpath.

## Layers

1. Blurred copy of the artwork behind the card.
2. The approved envelope artwork, centred at about a quarter of the screen area (`src/EnvelopeIntro.tsx`). It is split into three layers in `src/assets/`: the body (with the paper under the flap painted in), the flap with its gold border and filigree, and the flap's resting shadow. The flap hinges on the envelope's top edge and flips open.
3. The artwork PNG (`public/save-the-date-v32.png`): the sky inside the arch and its clouds come from the colour reference, the lettering uses its antique-gold and gold-brown tones, and the printed countdown box is retouched out. "SAVE THE DATE" is at 76.5% of its painted size (90%, then 85%) and sits about 41 px below the arch. The date and "PHILADELPHIA, PA" lines are at 85% of their painted size, and everything between the title and the countdown (the lotus dividers, names, bow, date and place) is evenly re-spaced, about 25 px apart, down to the countdown. The smooth patches left by retouching (where the printed countdown and the duplicate tower were) are rebuilt with cloud detail from the clear sky beside them at the same height, on their own colours. "Invitation to follow" is not in the PNG: `src/assets/invitation-to-follow.png` is the painted lettering rebuilt at 4x (crisp when zoomed), drawn on top in its original place. "AND" between the names is replaced by a flowering-vine bow, and the names are at 75% size and spaced apart to make room for it. The bow is not baked into the PNG: `src/BowTie.tsx` and `src/animation/bowTie.ts` animate it forming in place (knot, then loops unfurling, then tails) once the invitation is fully visible, then show the approved painting (`src/assets/bow/bow.png`) in its exact place. On top, the live SVG countdown uses the original design at 80% size.
4. A WebGL layer (`src/animation/ambient.ts`) that redraws the card each frame. Water ripples through layered drifting noise, and its existing golden reflections shimmer as independent horizontal streaks. The edge flowers and leaves sway on a slow 20 s breeze (±3 screen px at the tips), anchored at the card's edges, while a frame-only mask (`arch.webp`) keeps the gold arch still. The whole sky drifts slowly beneath the lettering, lotus dividers and arch line, which are redrawn on top. The maps it uses are in `src/assets/ambient/`. Without WebGL, the still painting shows.
5. Lightweight canvas petals falling across the card (`src/animation/petals.ts`).

The opening sequence:
- Tap anywhere and the flap tips toward the viewer over 3.0 s (15% faster than the reference).
- The envelope fades out over the last 0.68 s of the lift, as before, while the whole invitation scene fades in over 4.4 s, with a sine ease-in-out and an almost imperceptible scale from 98.8% to 100%.
- Late in the fade, the corner flowers begin to sway (`src/FlowerBreeze.tsx`, `src/flowers.css`). They are pixel-exact cut-outs of the artwork's own flowers in `src/assets/flowers/`. Each group is anchored at its corner or edge and moves under about 0.6° and 1 px, with its own timing.

The envelope uses `closed → opening → revealed` states, and repeat taps are ignored once it starts opening. The countdown targets midnight in Philadelphia on May 14, 2027 and updates on minute boundaries. Water and clouds start as the invitation begins to fade in; petals start once it is fully visible, drifting in from the top; use `requestAnimationFrame`, and stop when the tab is hidden. Reduced-motion visitors get a short fade to a static card.

## Music

Tapping the envelope starts `public/music/royal-monsoon.mp3` ("Royal Monsoon", ~62 s; see `src/soundtrack.ts`):
- The song plays from 0:00 through the opening and on into the reveal.
- It loops for as long as the invitation is open: its real end (MP3 padding and trailing silence trimmed) is crossfaded over 1.5 s into its opening, so it flows straight back to the beginning with no gap.
- A small toggle in the corner of the revealed invitation mutes and unmutes the music.
- If the file is missing, the site runs silently and the toggle stays hidden.

Use only a licensed recording you have permission to use.

For visual tuning, set `DEBUG_WATER` in `src/animation/water.ts` or `DEBUG_CLOUDS` in `src/animation/clouds.ts` to exaggerate the motion and outline the masks. Leave both set to `false` for production.
