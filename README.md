# Rachita & Rajat · Save the Date

An animated presentation of the 1024×1536 Philadelphia save-the-date artwork. Guests open a lavender, lace-trimmed, wax-sealed envelope to reveal the card. Once it settles, the live countdown, river shimmer, slow cloud drift, and falling petals bring the invitation to life.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production site in `dist/` with relative asset URLs, suitable for the repository's GitHub Pages subpath.

## Layers

1. Blurred copy of the artwork behind the card.
2. A whole envelope in true 1.4 : 1 proportions, centred at about a quarter of the screen area (`src/EnvelopeIntro.tsx`), in the Bridgerton style: light lavender paper with blind-embossed damask, dusty-lavender lace and satin ribbon along the lid (`src/EnvelopeDecor.tsx`), and a pearl-ivory R&R wax seal with rose garlands (`src/WaxSeal.tsx`). The side and bottom flaps stay still while the lid flips open on a hinge at the top of the screen.
3. The artwork PNG (`public/save-the-date-sunset-v3.png`): the sky inside the arch and its clouds come from the colour reference, the lettering uses its antique-gold and gold-brown tones, and the printed countdown box is retouched out. On top, the live SVG countdown uses the original design at 80% size.
4. A canvas cloud drift, masked to the open sky beside the lettering (`src/animation/clouds.ts`).
5. A canvas water overlay, clipped to an editable polygon below the bridge (`src/animation/water.ts`).
6. Lightweight canvas petals falling across the card (`src/animation/petals.ts`).

The opening follows the reference intro's timing:
- Tap anywhere and the lid tips toward the viewer over 3.0 s (CSS `rotateX` with about four envelope-heights of perspective).
- The envelope fades out over the last 0.68 s.
- After 0.17 s, the card fades up 20 px over 0.68 s.

These timings are 15% faster than the reference.

The envelope uses `closed → opening → revealed` states, and repeat taps are ignored once it starts opening. The countdown targets midnight in Philadelphia on May 14, 2027 and updates on minute boundaries. Water, clouds, and petals start only at `revealed`, use `requestAnimationFrame`, and stop when the tab is hidden. Reduced-motion visitors get a short fade to a static card.

## Music

Tapping the envelope starts `public/music/save-the-date.m4a` (see `src/soundtrack.ts`):
- The song plays from 0:00 through the opening and on into the reveal.
- After 0:15 it loops only 0:05–0:15, with a short crossfade at the loop point. The intro never repeats.
- A small toggle in the corner of the revealed invitation mutes and unmutes the music.
- If the file is missing, the site runs silently and the toggle stays hidden.

Use only a licensed recording you have permission to use.

For visual tuning, set `DEBUG_WATER` in `src/animation/water.ts` or `DEBUG_CLOUDS` in `src/animation/clouds.ts` to exaggerate the motion and outline the masks. Leave both set to `false` for production.
