// The flowering-vine bow forms itself in place.
//
// What is drawn is always the approved painting itself. Every pixel of it is
// assigned once, either to the knot or to whichever section of vine (two
// loops, two tails) runs nearest, and it records how far along that section
// it lies. Each frame a soft front travels outward from the knot along every
// section, revealing pixels as it passes; leaves and blossoms, which lie away
// from the vine's core, open a moment after it. Each section also unfurls as
// a whole: it scales out from the knot with a slight turn, the loops draw in
// as the bow tightens, and the bow settles. Nothing is ever drawn twice, so
// there are no seams, and the last frame is the painting, pixel for pixel.
//
// All coordinates are in the bow image's own pixels (198 x 137).

type Pt = readonly [number, number];

export const BOW_SIZE = { width: 198, height: 137 };
const KNOT: Pt = [94, 49];
const STEP = 1.5;                 // resampling step along each centreline

// Traced centrelines of the approved bow, each running outward from its
// vine's point in the knot.
const ARMS = {
  leftTail: { anchor: [90, 52] as Pt, path: [[88, 60], [85, 70], [80, 82], [75, 94], [68, 106], [62, 117], [57, 126], [55, 132]] as Pt[] },
  leftLoop: { anchor: [90, 52] as Pt, path: [[89, 46], [84, 38], [75, 30], [66, 23], [56, 17], [44, 11], [30, 8], [18, 11], [9, 19], [6, 29], [9, 39], [17, 47], [28, 52], [42, 55], [56, 55], [70, 53], [82, 51], [89, 50]] as Pt[] },
  rightTail: { anchor: [100, 52] as Pt, path: [[102, 62], [105, 74], [109, 86], [114, 98], [120, 109], [127, 119], [134, 127], [139, 132]] as Pt[] },
  rightLoop: { anchor: [100, 52] as Pt, path: [[102, 46], [110, 38], [119, 30], [130, 22], [142, 16], [155, 12], [168, 11], [180, 16], [187, 25], [189, 36], [184, 46], [175, 53], [162, 58], [148, 60], [134, 58], [120, 55], [108, 52], [102, 51]] as Pt[] },
};
type ArmName = keyof typeof ARMS;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// ---- geometry ----------------------------------------------------------------

function resample(anchor: Pt, path: Pt[]) {
  const pts: Pt[] = [anchor, ...path];
  const out: Pt[] = [anchor];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
    let d = STEP - carry;
    while (d <= len) { const t = d / len; out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); d += STEP; }
    carry = len - (d - STEP);
  }
  return out;
}

type Section = { name: ArmName; anchor: Pt; points: Pt[] };

const KNOT_RADIUS = 11;        // the knot is solid inside this radius…
const KNOT_EDGE = 7;           // …and feathers out over this much, overlapping its neighbours
const FEATHER = 9;              // softness of the travelling front, in steps
const LEAF_DELAY = 0.3;         // steps of delay per pixel of distance from the vine

const sections: Section[] = (Object.keys(ARMS) as ArmName[]).map((name) => ({
  name, anchor: ARMS[name].anchor, points: resample(ARMS[name].anchor, ARMS[name].path),
}));

// ---- the choreography ----------------------------------------------------------

/** Length of the whole formation, in seconds. */
export const BOW_FORM_SECONDS = 8.0 / 1.2 / 0.9 / 0.9 / 0.8 * 0.9;   // then 10% slower twice, 20% slower, 10% faster (about 9.3 s)

type Pose = { reveal: number; scale: number; turn: number };   // reveal in steps along the section

// One continuous motion: a single eased clock drives everything, and each
// section moves at a steady rate inside its own window. The windows overlap,
// so something is always growing and nothing comes to rest until the end.
// starts growing briskly from the very first frame (no slow wind-up), and
// eases gently to rest at the end
const easeInOut = (x: number) => { const u = clamp01(x); return 0.3 * u + 0.7 * Math.sin(u * Math.PI / 2); };

function poses(t: number) {
  const u = easeInOut(t / BOW_FORM_SECONDS);
  const deg = Math.PI / 180;
  const tighten = smooth(phase(u, 0.5, 0.8));
  const squeeze = Math.sin(Math.PI * phase(u, 0.5, 0.8));
  const grow = (section: Section, start: number, end: number, turn: number, loose: number): Pose => {
    const p = phase(u, start, end), steps = section.points.length + FEATHER + 30;
    return {
      reveal: p * steps,
      // unfurls outward from the knot with a slight turn, easing into place
      scale: mix(0.9, 1, Math.sqrt(p)) * mix(loose, 1, tighten),
      turn: turn * (1 - Math.sqrt(p)),
    };
  };
  const byName = (n: ArmName) => sections.find((s) => s.name === n)!;
  return {
    leftLoop: grow(byName('leftLoop'), 0.02, 0.55, 7 * deg, 1.02),
    rightLoop: grow(byName('rightLoop'), 0.1, 0.62, -7 * deg, 1.02),
    leftTail: grow(byName('leftTail'), 0.34, 0.95, -5 * deg, 1),
    rightTail: grow(byName('rightTail'), 0.4, 1, 5 * deg, 1),
    knot: { radius: mix(0, KNOT_RADIUS + KNOT_EDGE + 6, phase(u, 0, 0.24)), scale: mix(0.8, 1, Math.sqrt(phase(u, 0, 0.24))) * (1 - 0.04 * squeeze) },
    // the whole bow eases the last hair into its final size as it comes to rest
    settle: 1 + 0.012 * (1 - smooth(phase(u, 0.55, 1))),
  };
}

// ---- rendering -----------------------------------------------------------------

type Layer = {
  name: ArmName | 'knot';
  canvas: HTMLCanvasElement;
  image: ImageData;
  pixels: Int32Array;        // indices of this layer's painted pixels
  order: Float32Array;       // when each is revealed (steps along the section, or radius)
  alpha: Uint8ClampedArray;  // its painted alpha
  lastFront: number;         // the front last rendered, to skip unchanged layers
};

export class BowTie {
  private layers: Layer[];

  constructor(bow: HTMLImageElement) {
    const W = BOW_SIZE.width, H = BOW_SIZE.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    x.drawImage(bow, 0, 0);
    const src = x.getImageData(0, 0, W, H).data;
    const names = ['knot', ...sections.map((s) => s.name)] as const;
    const lists = names.map(() => ({ pixels: [] as number[], order: [] as number[] }));
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (src[i * 4 + 3] === 0) continue;
      const dk = Math.hypot(px - KNOT[0], py - KNOT[1]);
      if (dk <= KNOT_RADIUS + KNOT_EDGE) { lists[0].pixels.push(i); lists[0].order.push(dk); }
      if (dk <= KNOT_RADIUS) continue;
      // nearest point on any section's centreline
      let best = 0, bestD = Infinity, bestK = 0;
      sections.forEach((s, si) => s.points.forEach(([qx, qy], k) => {
        const d = (px - qx) ** 2 + (py - qy) ** 2;
        if (d < bestD) { bestD = d; best = si; bestK = k; }
      }));
      lists[best + 1].pixels.push(i);
      lists[best + 1].order.push(bestK + Math.sqrt(bestD) * LEAF_DELAY);
    }
    this.layers = names.map((name, li) => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const image = canvas.getContext('2d')!.createImageData(W, H);
      const pixels = Int32Array.from(lists[li].pixels);
      const alpha = new Uint8ClampedArray(pixels.length);
      pixels.forEach((p, j) => {
        image.data[p * 4] = src[p * 4]; image.data[p * 4 + 1] = src[p * 4 + 1]; image.data[p * 4 + 2] = src[p * 4 + 2];
        // the knot's rim fades out over its neighbours instead of ending in a hard circle
        const fade = li === 0 ? 1 - smooth((lists[0].order[j] - KNOT_RADIUS) / KNOT_EDGE) : 1;
        alpha[j] = src[p * 4 + 3] * fade;
      });
      return { name, canvas, image, pixels, order: Float32Array.from(lists[li].order), alpha, lastFront: -1 };
    });
  }

  /** Draws the bow at `seconds` into a context whose transform maps bow pixels. */
  draw(ctx: CanvasRenderingContext2D, seconds: number) {
    const t = Math.max(0, seconds);
    const pose = poses(t);
    const settle = pose.settle;
    ctx.save();
    ctx.translate(KNOT[0], KNOT[1]); ctx.scale(settle, settle); ctx.translate(-KNOT[0], -KNOT[1]);
    // tails beneath, loops over them, the knot on top (as in the painting)
    for (const name of ['leftTail', 'rightTail', 'leftLoop', 'rightLoop', 'knot'] as const) {
      const layer = this.layers.find((l) => l.name === name)!;
      const front = name === 'knot' ? pose.knot.radius : pose[name].reveal;
      if (front <= 0) continue;
      const soft = name === 'knot' ? 5 : FEATHER;
      if (front !== layer.lastFront) {
        const data = layer.image.data;
        for (let j = 0; j < layer.pixels.length; j++) {
          data[layer.pixels[j] * 4 + 3] = layer.alpha[j] * smooth((front - layer.order[j]) / soft);
        }
        layer.canvas.getContext('2d')!.putImageData(layer.image, 0, 0);
        layer.lastFront = front;
      }
      const scale = name === 'knot' ? pose.knot.scale : pose[name].scale;
      const turn = name === 'knot' ? 0 : pose[name].turn;
      const [ax, ay] = name === 'knot' ? KNOT : ARMS[name].anchor;
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(turn); ctx.scale(scale, scale); ctx.translate(-ax, -ay);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }


  // ---- after forming: a gentle, endless breeze ------------------------------
  // The tails hang as a chain of three overlapping parts, each turning a little
  // more than the one above it and a moment later, so they ripple like hanging
  // vines; the loops (and their blossoms) sway very slightly, mostly at their
  // outer ends, about the knot; the knot itself stays put. With every angle at
  // zero this draws the finished painting exactly, so the hand-over from
  // forming is seamless, and the sway eases in over the first two seconds.
  private sway?: { name: ArmName; parts: { canvas: HTMLCanvasElement; pivot: Pt }[] }[];
  private scratch?: HTMLCanvasElement;

  private prepareSway() {
    const W = BOW_SIZE.width, H = BOW_SIZE.height;
    const part = (layer: Layer, weight: (u: number) => number, n: number) => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!; const img = ctx.createImageData(W, H);
      for (let j = 0; j < layer.pixels.length; j++) {
        const p = layer.pixels[j] * 4, u = clamp01(layer.order[j] / n);
        img.data[p] = layer.image.data[p]; img.data[p + 1] = layer.image.data[p + 1]; img.data[p + 2] = layer.image.data[p + 2];
        img.data[p + 3] = layer.alpha[j] * weight(u);
      }
      ctx.putImageData(img, 0, 0);
      return canvas;
    };
    this.sway = sections.map((sec) => {
      const layer = this.layers.find((l) => l.name === sec.name)!;
      const n = sec.points.length - 1, at = (u: number) => sec.points[Math.round(u * n)];
      if (sec.name.endsWith('Tail')) {
        const w0 = (u: number) => Math.max(0, 1 - u / 0.5), w2 = (u: number) => Math.max(0, (u - 0.5) / 0.5);
        return { name: sec.name, parts: [
          { canvas: part(layer, w0, n), pivot: sec.anchor },
          { canvas: part(layer, (u) => 1 - w0(u) - w2(u), n), pivot: at(0.25) },
          { canvas: part(layer, w2, n), pivot: at(0.75) },
        ] };
      }
      // loops come back to the knot, so they turn about it; their flower
      // clusters (three bumps along the loop) each sway on their own
      const bump = (c: number) => (u: number) => Math.max(0, 1 - Math.abs(u - c) / 0.25) ** 2 * Math.sin(Math.PI * u) ** 2;
      const b1 = bump(0.25), b2 = bump(0.5), b3 = bump(0.75);
      return { name: sec.name, parts: [
        { canvas: part(layer, (u) => 1 - b1(u) - b2(u) - b3(u), n), pivot: sec.anchor },
        { canvas: part(layer, b1, n), pivot: at(0.1) },
        { canvas: part(layer, b2, n), pivot: sec.anchor },
        { canvas: part(layer, b3, n), pivot: at(0.9) },
      ] };
    });
  }

  /** Draws the finished bow swaying, `seconds` after it finished forming. */
  drawSway(ctx: CanvasRenderingContext2D, seconds: number) {
    if (!this.sway) this.prepareSway();
    const deg = Math.PI / 180, TAU = Math.PI * 2;
    const ramp = smooth(seconds / 2);
    const breeze = (period: number, lag: number, ph: number) =>
      0.8 * Math.sin(TAU * (seconds - lag) / period + ph) + 0.2 * Math.sin(TAU * (seconds - lag) / (period * 1.7) + ph * 1.9);
    const motion: Record<ArmName, { amps: number[]; period: number; ph: number }> = {
      leftTail: { amps: [1.5, 2.5, 3.75], period: 6.5, ph: 0 },
      rightTail: { amps: [1.5, 2.5, 3.75], period: 7.3, ph: 1.1 },
      leftLoop: { amps: [0.45, 1.6, 1.4, 1.7], period: 8.2, ph: 0.5 },
      rightLoop: { amps: [0.45, 1.5, 1.7, 1.4], period: 9.1, ph: 2.0 },
    };
    // each part has its own rhythm and timing, so the flower clusters move as
    // separate things in the same breeze
    const own = [1, 1.13, 0.89, 1.21], offs = [0, 2.1, 4.3, 1.2];
    // each arm's overlapping parts are summed (additive) in a scratch canvas at
    // the target's resolution, so where parts overlap they add back up to the
    // painting exactly, then the arm is laid over the card
    const target = ctx.canvas, tf = ctx.getTransform();
    if (!this.scratch || this.scratch.width !== target.width || this.scratch.height !== target.height) {
      this.scratch = document.createElement('canvas'); this.scratch.width = target.width; this.scratch.height = target.height;
    }
    const sc = this.scratch.getContext('2d')!;
    for (const name of ['leftTail', 'rightTail', 'leftLoop', 'rightLoop'] as const) {
      const arm = this.sway!.find((a) => a.name === name)!, m = motion[name];
      const chain = name.endsWith('Tail');
      sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, target.width, target.height);
      sc.setTransform(tf); sc.globalCompositeOperation = 'lighter'; sc.imageSmoothingQuality = 'high';
      const ctxArm = sc;
      ctxArm.save();
      arm.parts.forEach((pt, j) => {
        const a = ramp * m.amps[j] * deg * breeze(m.period * (chain ? 1 : own[j]), chain ? 0.45 * j : 0.3 * j, m.ph + (chain ? 0 : offs[j]));
        if (!chain) ctxArm.save();
        ctxArm.translate(pt.pivot[0], pt.pivot[1]); ctxArm.rotate(a); ctxArm.translate(-pt.pivot[0], -pt.pivot[1]);
        ctxArm.drawImage(pt.canvas, 0, 0);
        if (!chain) ctxArm.restore();
      });
      ctxArm.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.scratch, 0, 0); ctx.restore();
    }
    ctx.drawImage(this.layers.find((l) => l.name === 'knot')!.canvas, 0, 0);
  }
}