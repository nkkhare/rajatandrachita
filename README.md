# Rachita & Rajat · Save the Date

An animated presentation of the supplied, unmodified 1024×1536 save-the-date artwork. The image remains the complete invitation; only a narrow water region is gently displaced, and live canvas petals drift over the scene.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production site in `dist/` with relative asset URLs, suitable for the repository's GitHub Pages subpath.

## Layers

1. Blurred copy of the image outside the card.
2. Original PNG, unchanged, with the 2:3 portrait ratio.
3. WebGL water overlay within the source image's bottom 156 pixels. Its shader mask is inset from the bridge and floral corners.
4. Lightweight full-viewport canvas petals.

The animation uses `requestAnimationFrame`, stops when the tab is hidden, and is disabled when the visitor prefers reduced motion. If WebGL is unavailable, the original image remains visible and intact.
