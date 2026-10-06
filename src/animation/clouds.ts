// The clouds drift, each on its own. Every cloud or cloud group has a soft
// zone around it; inside that zone the painting is redrawn a few pixels
// offset, so the cloud floats within its own patch of sky while its resting
// place stays recognisable. Anything that is not sky (lettering, the gold
// arch, flowers, the skyline) is masked out of every zone, so only sky moves.
//
// Each cloud follows a slow, shallow wave: mostly horizontal, with a much
// smaller vertical lift, built from two harmonics so it never visibly stops
// and reverses, and a whisper of growth. Durations, distances, and phases all
// differ, so no two clouds move together, and nearer, larger clouds drift a
// little further and faster than distant ones.
export const DEBUG_CLOUDS = false;

const IMAGE_WIDTH = 1024;
export const CLOUD_BAND_TOP = 60;       // source-image pixels covered by the canvas
export const CLOUD_BAND_HEIGHT = 880;

type Cloud = {
  // zone, as an ellipse in source-image pixels
  cx: number; cy: number; rx: number; ry: number;
  drift: number;      // reach either side of rest (source px); at the card's ~0.42 screen px per
                      // source px a full cycle travels about 20-50 screen px
  lift: number;       // vertical reach either side (source px): about 4-8 screen px a cycle
  period: number;     // seconds per cycle
  phase: number;      // where in its cycle it starts (radians)
  dir: number;        // 1 drifts right first, -1 left first
};

// Nearer, larger clouds: more drift and shorter periods. Distant wisps: less.
const CLOUDS: Cloud[] = [
  { cx: 225, cy: 545, rx: 150, ry: 110, drift: 60, lift: 10, period: 29, phase: 0.4, dir: 1 },    // left, beside the names
  { cx: 200, cy: 748, rx: 125, ry: 52, drift: 44, lift: 8, period: 34, phase: 2.1, dir: -1 },    // left, lower
  { cx: 200, cy: 862, rx: 125, ry: 54, drift: 36, lift: 6, period: 39, phase: 4.0, dir: 1 },     // left, near the skyline
  { cx: 800, cy: 418, rx: 125, ry: 58, drift: 52, lift: 8, period: 24, phase: 1.3, dir: -1 },    // right, upper
  { cx: 818, cy: 700, rx: 112, ry: 95, drift: 56, lift: 10, period: 31, phase: 3.3, dir: 1 },     // right, middle
  { cx: 812, cy: 890, rx: 105, ry: 40, drift: 32, lift: 6, period: 45, phase: 5.2, dir: -1 },    // right, lower
  { cx: 245, cy: 280, rx: 85, ry: 85, drift: 28, lift: 4, period: 42, phase: 0.9, dir: -1 },     // wisps left of SAVE THE DATE
  { cx: 790, cy: 280, rx: 90, ry: 85, drift: 30, lift: 4, period: 37, phase: 2.7, dir: 1 },      // wisps right of SAVE THE DATE
  { cx: 515, cy: 135, rx: 115, ry: 50, drift: 24, lift: 4, period: 44, phase: 4.6, dir: 1 },     // high wisps under the arch's peak
];

const FEATHER = 0.35;   // fraction of each zone's radius that fades out
const MARGIN = 70;      // room around a zone for the shifted painting (more than any drift)

type Zone = {
  cloud: Cloud;
  x0: number; y0: number; w: number; h: number;   // zone box in source pixels
  mask: HTMLCanvasElement;                        // soft zone with non-sky removed
  source: HTMLCanvasElement;                      // the sky around it, with anything else painted out
  work: HTMLCanvasElement;                        // per-frame scratch
};

function smooth(t: number) { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); }

// Lettering, by where it sits (source pixels); colour alone cannot tell the
// gold letters from sunlit cloud.
const LETTERING = [
  { x0: 300, x1: 732, y0: 180, y1: 404 },   // SAVE THE DATE and its lotus divider
  { x0: 344, x1: 690, y0: 398, y1: 530 },   // Rachita
  { x0: 438, x1: 600, y0: 520, y1: 640 },   // the bow
  { x0: 386, x1: 662, y0: 626, y1: 772 },   // Rajat
  { x0: 280, x1: 748, y0: 764, y1: 914 },   // date, city, and lotus divider
];

function isGold(d: Uint8ClampedArray, k: number) {
  const r = d[k], g = d[k + 1], b = d[k + 2], max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return false;
  const sat = (max - min) / max, lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  let hue = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
  hue *= 60; if (hue < 0) hue += 360;
  return hue > 25 && hue < 52 && sat > 0.42 && lum > 0.45;
}

function isProtected(x: number, y: number, d: Uint8ClampedArray, k: number, stride: number) {
  if (x < 100 || x > 924 || y > 930) return true;                             // arch sides, flowers, skyline
  if (LETTERING.some((b) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1)) return true;
  // the arch's curved top: gold, and thin (cloud highlights are broad)
  if (isGold(d, k)) {
    const reach = 7 * 4;
    const thinX = !isGold(d, k - reach) || !isGold(d, k + reach);
    const thinY = !isGold(d, k - stride * 7) || !isGold(d, k + stride * 7);
    if (thinX || thinY) return true;
  }
  return false;
}

function buildZones(image: HTMLImageElement): Zone[] {
  const full = document.createElement('canvas');
  full.width = IMAGE_WIDTH; full.height = image.naturalHeight || 1536;
  const fx = full.getContext('2d', { willReadFrequently: true })!;
  fx.drawImage(image, 0, 0);
  return CLOUDS.map((cloud) => {
    const x0 = Math.max(0, Math.round(cloud.cx - cloud.rx)), y0 = Math.max(0, Math.round(cloud.cy - cloud.ry));
    const w = Math.min(IMAGE_WIDTH, Math.round(cloud.cx + cloud.rx)) - x0, h = Math.round(cloud.cy + cloud.ry) - y0;
    // sampled with a border so the thin-line test can look either side
    const B = 8, sw = w + B * 2, sh = h + B * 2;
    const src = fx.getImageData(x0 - B, y0 - B, sw, sh).data;
    // non-sky pixels; the motion fades out smoothly over ~20 px around them,
    // so there is never a seam between moving and still sky
    const hard = document.createElement('canvas'); hard.width = w; hard.height = h;
    const hx = hard.getContext('2d')!, hd = hx.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (isProtected(x0 + i, y0 + j, src, ((j + B) * sw + i + B) * 4, sw * 4)) hd.data[(j * w + i) * 4 + 3] = 255;
    }
    hx.putImageData(hd, 0, 0);
    const near = document.createElement('canvas'); near.width = w; near.height = h;
    const nx = near.getContext('2d', { willReadFrequently: true })!;
    nx.filter = 'blur(9px)'; nx.drawImage(hard, 0, 0);
    const spread = nx.getImageData(0, 0, w, h).data;
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const mx = mask.getContext('2d')!, md = mx.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = j * w + i;
      const dx = (x0 + i - cloud.cx) / cloud.rx, dy = (y0 + j - cloud.cy) / cloud.ry, d = Math.hypot(dx, dy);
      const zone = 1 - smooth((d - (1 - FEATHER)) / FEATHER);
      const guard = hd.data[p * 4 + 3] ? 1 : Math.min(1, (spread[p * 4 + 3] / 255) * 2.6);
      md.data[p * 4 + 3] = Math.round(zone * (1 - smooth(guard)) * 255);
    }
    mx.putImageData(md, 0, 0);
    // What gets shifted: the sky around the zone with lettering, the arch, and
    // flowers painted out (filled from the sky around them), so nothing but
    // sky can ever slide into view.
    const sx0 = x0 - MARGIN, sy0 = y0 - MARGIN, swd = w + MARGIN * 2, sht = h + MARGIN * 2;
    const around = fx.getImageData(sx0 - B, sy0 - B, swd + B * 2, sht + B * 2).data;
    const holes = document.createElement('canvas'); holes.width = swd; holes.height = sht;
    const ox = holes.getContext('2d')!;
    ox.drawImage(image, sx0, sy0, swd, sht, 0, 0, swd, sht);
    const od = ox.getImageData(0, 0, swd, sht);
    for (let j = 0; j < sht; j++) for (let i = 0; i < swd; i++) {
      let bad = false;
      for (let dj = -3; dj <= 3 && !bad; dj += 3) for (let di = -3; di <= 3; di += 3) {
        const jj = j + dj, ii = i + di;
        if (jj < 0 || ii < 0 || jj >= sht || ii >= swd) continue;
        if (isProtected(sx0 + ii, sy0 + jj, around, ((jj + B) * (swd + B * 2) + ii + B) * 4, (swd + B * 2) * 4)) { bad = true; break; }
      }
      if (bad) od.data[(j * swd + i) * 4 + 3] = 0;
    }
    ox.putImageData(od, 0, 0);
    const source = document.createElement('canvas'); source.width = swd; source.height = sht;
    const sx = source.getContext('2d')!;
    for (const r of [28, 12, 5]) { sx.filter = `blur(${r}px)`; sx.drawImage(holes, 0, 0); }
    sx.filter = 'none'; sx.drawImage(holes, 0, 0);
    const work = document.createElement('canvas'); work.width = swd; work.height = sht;
    return { cloud, x0, y0, w, h, mask, source, work };
  });
}

export class CloudRenderer {
  private context: CanvasRenderingContext2D | null;
  private zones: Zone[];
  private resizeObserver: ResizeObserver;
  private lastRender = -Infinity;

  constructor(image: HTMLImageElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: true });
    this.zones = buildZones(image);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.lastRender = -Infinity;
  }

  render(seconds: number) {
    const context = this.context;
    // the motion is very slow, so ~30 fps is indistinguishable and halves the work
    if (!context || seconds - this.lastRender < 1 / 30) return;
    this.lastRender = seconds;
    const k = this.canvas.width / IMAGE_WIDTH;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const amp = DEBUG_CLOUDS ? 4 : 1;

    for (const zone of this.zones) {
      const { cloud } = zone;
      const theta = (2 * Math.PI * seconds) / cloud.period + cloud.phase;
      // a shallow, uneven wave: two harmonics, so its speed varies but it never halts
      const dx = amp * cloud.dir * cloud.drift * (0.78 * Math.sin(theta) + 0.22 * Math.sin(2 * theta + 1.1));
      const dy = amp * cloud.lift * (0.7 * Math.sin(theta + 1.7) + 0.3 * Math.sin(3 * theta + 0.4));
      const grow = 1 + 0.008 * (1 + Math.sin(theta * 0.5 + cloud.phase));    // at most 1.6% larger

      // the painting, offset and grown about the cloud's centre, cut to its zone
      const wx = zone.work.getContext('2d')!;
      wx.setTransform(1, 0, 0, 1, 0, 0);
      wx.globalCompositeOperation = 'source-over';
      wx.clearRect(0, 0, zone.work.width, zone.work.height);
      wx.translate(MARGIN + cloud.cx - zone.x0 + dx, MARGIN + cloud.cy - zone.y0 + dy);
      wx.scale(grow, grow);
      wx.translate(-cloud.cx, -cloud.cy);
      wx.drawImage(zone.source, zone.x0 - MARGIN, zone.y0 - MARGIN);
      wx.setTransform(1, 0, 0, 1, 0, 0);
      wx.globalCompositeOperation = 'destination-in';
      wx.drawImage(zone.mask, MARGIN, MARGIN);

      context.setTransform(k, 0, 0, k, 0, -CLOUD_BAND_TOP * k);
      context.drawImage(zone.work, zone.x0 - MARGIN, zone.y0 - MARGIN);
      if (DEBUG_CLOUDS) {
        context.strokeStyle = '#00f5ff'; context.lineWidth = 2 / k;
        context.beginPath(); context.ellipse(cloud.cx, cloud.cy, cloud.rx, cloud.ry, 0, 0, Math.PI * 2); context.stroke();
      }
    }
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.context?.setTransform(1, 0, 0, 1, 0, 0);
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
