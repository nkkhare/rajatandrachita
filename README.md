# Rachita & Rajat · Save the Date

An animated presentation of the supplied, unmodified 1024×1536 save-the-date artwork. Guests tap a CSS-built envelope to reveal the card. Once it settles, a narrow river region gently shimmers and live canvas petals fall within the card.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production site in `dist/` with relative asset URLs, suitable for the repository's GitHub Pages subpath.

## Layers

1. Blurred copy of the image outside the card.
2. Ivory envelope back, flap, front, and seal around the same card that becomes the final invitation.
3. Original PNG, unchanged, with the 2:3 portrait ratio.
4. Canvas water overlay clipped to an editable polygon below the bridge and inside the floral corners.
5. Lightweight canvas petals clipped to the invitation container.

The envelope uses `closed → opening → revealed` states. Water and petals start only at `revealed`, use `requestAnimationFrame`, and stop when the tab is hidden. Reduced-motion visitors get a short envelope fade and a static card.

For visual tuning, set `DEBUG_ENVELOPE` in `src/EnvelopeIntro.tsx` to slow and label the envelope layers, or set `DEBUG_WATER` in `src/animation/water.ts` to outline the editable `WATER_MASK_POINTS` and exaggerate the river displacement. Leave both set to `false` for production.
