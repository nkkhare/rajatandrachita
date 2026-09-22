// Turns a photo into a watercolor painting, so the card's scenes read like the couple's crest: recognizable shapes,
// softened into washes, not photographic detail. Runs in the browser on a canvas (see paint.html).
//
//   1. Kuwahara smoothing, twice: every pixel takes the calmest neighbouring patch's average color, which melts
//      texture into flat, brush-like areas while keeping the edges between them.
//   1b. A gentle blur over that, because Kuwahara's patches are square and would otherwise read as blocks.
//   2. Pigment edges: watercolor pools where a wash stops, so edges get a soft, slightly darker rim.
//   3. Color: tones mapped onto the crest's palette, then saturation pushed back up, since a wash keeps more
//      color than the softened photo does.
//   4. Paper: gentle uneven washes (low-frequency blotches) and a fine cold-press grain, seeded so output repeats.
//   5. Lift toward the paper color, like a transparent wash, then a whisker of blur to take the digital edge off.
'use strict';

function kuwahara(src, w, h, r) {
  const W = w + 1;
  const sat = Array.from({ length: 6 }, () => new Float64Array(W * (h + 1)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = (y + 1) * W + (x + 1);
      for (let c = 0; c < 3; c++) {
        const v = src[i + c];
        sat[c][o] = v + sat[c][o - 1] + sat[c][o - W] - sat[c][o - W - 1];
        sat[c + 3][o] = v * v + sat[c + 3][o - 1] + sat[c + 3][o - W] - sat[c + 3][o - W - 1];
      }
    }
  }
  const box = (t, x0, y0, x1, y1) => t[(y1 + 1) * W + (x1 + 1)] - t[y0 * W + (x1 + 1)] - t[(y1 + 1) * W + x0] + t[y0 * W + x0];
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = Infinity;
      let mean = [0, 0, 0];
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = Math.max(0, Math.min(x, x + dx * r)), x1 = Math.min(w - 1, Math.max(x, x + dx * r));
        const y0 = Math.max(0, Math.min(y, y + dy * r)), y1 = Math.min(h - 1, Math.max(y, y + dy * r));
        const n = (x1 - x0 + 1) * (y1 - y0 + 1);
        let variance = 0;
        const m = [0, 0, 0];
        for (let c = 0; c < 3; c++) {
          m[c] = box(sat[c], x0, y0, x1, y1) / n;
          variance += box(sat[c + 3], x0, y0, x1, y1) / n - m[c] * m[c];
        }
        if (variance < best) { best = variance; mean = m; }
      }
      const i = (y * w + x) * 4;
      out[i] = mean[0]; out[i + 1] = mean[1]; out[i + 2] = mean[2]; out[i + 3] = 255;
    }
  }
  return out;
}

// Separable Gaussian blur: the pass that turns the smoothing's square patches into soft, painted shapes.
function blur(px, w, h, sigma) {
  if (!sigma) return px;
  const r = Math.max(1, Math.ceil(sigma * 2.5));
  const kernel = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const sum = kernel.reduce((a, b) => a + b, 0);
  const norm = kernel.map((v) => v / sum);
  const tmp = new Float32Array(px.length);
  const out = new Uint8ClampedArray(px.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = -r; k <= r; k++) v += px[(y * w + Math.min(w - 1, Math.max(0, x + k))) * 4 + c] * norm[k + r];
        tmp[(y * w + x) * 4 + c] = v;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = -r; k <= r; k++) v += tmp[(Math.min(h - 1, Math.max(0, y + k)) * w + x) * 4 + c] * norm[k + r];
        out[i + c] = v;
      }
      out[i + 3] = 255;
    }
  }
  return out;
}

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Smooth value noise on a coarse grid, for uneven washes.
function blotches(w, h, cell, random) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Float32Array.from({ length: gw * gh }, random);
  const out = new Float32Array(w * h);
  const s = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const gy = y / cell, iy = Math.floor(gy), fy = s(gy - iy);
    for (let x = 0; x < w; x++) {
      const gx = x / cell, ix = Math.floor(gx), fx = s(gx - ix);
      const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
      out[y * w + x] = (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
    }
  }
  return out;
}

// Map tone onto a palette: dark pixels take the first color, bright ones the last. This is how a photographed city
// ends up in the crest's own range (violet-blue shadows, lavender stone, peach sky) instead of its camera colors.
const CREST = [[0, [72, 76, 114]], [0.32, [134, 143, 182]], [0.55, [176, 180, 206]], [0.72, [232, 203, 172]], [0.88, [246, 222, 190]], [1, [252, 240, 220]]];

function gradientMap(px, stops, strength) {
  const out = new Uint8ClampedArray(px.length);
  for (let i = 0; i < px.length; i += 4) {
    const t = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
    let k = 1;
    while (k < stops.length - 1 && stops[k][0] < t) k++;
    const [t0, c0] = stops[k - 1], [t1, c1] = stops[k];
    const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    for (let c = 0; c < 3; c++) {
      const mapped = c0[c] + (c1[c] - c0[c]) * f;
      out[i + c] = px[i + c] + (mapped - px[i + c]) * strength;
    }
    out[i + 3] = 255;
  }
  return out;
}

function paint(imageData, options = {}) {
  const { radius = 6, smooth = 0, edge = 0.55, wash = 0.1, grain = 0.035, lift = 0.1, saturate = 1, palette = null, paper = [253, 249, 242], seed = 7 } = options;
  const { width: w, height: h } = imageData;
  let px = imageData.data;
  if (radius) {
    px = kuwahara(px, w, h, radius);
    px = kuwahara(px, w, h, Math.max(2, Math.round(radius / 2)));
  }

  px = blur(px, w, h, smooth);
  if (palette) px = gradientMap(px, palette.stops || CREST, palette.strength ?? 0.85);

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2];
  const random = rng(seed);
  const big = blotches(w, h, 90, random), small = blotches(w, h, 22, random);
  const out = new Uint8ClampedArray(px.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x, i = k * 4;
      const L = (dx, dy) => lum[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))];
      const gx = L(1, -1) + 2 * L(1, 0) + L(1, 1) - L(-1, -1) - 2 * L(-1, 0) - L(-1, 1);
      const gy = L(-1, 1) + 2 * L(0, 1) + L(1, 1) - L(-1, -1) - 2 * L(0, -1) - L(1, -1);
      const rim = Math.min(1, Math.hypot(gx, gy) / 260) * edge;
      const tone = 1 - rim * 0.35 + (big[k] - 0.5) * wash + (small[k] - 0.5) * wash * 0.5 + (random() - 0.5) * grain;
      const grey = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
      for (let c = 0; c < 3; c++) {
        const v = (grey + (px[i + c] - grey) * saturate) * tone;
        out[i + c] = v + (paper[c] - v) * lift;
      }
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}
