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
export const BOW_FORM_SECONDS = 3.2;

type Pose = { reveal: number; scale: number; turn: number };   // reveal in steps along the section

// One continuous motion: a single eased clock drives everything, and each
// section moves at a steady rate inside its own window. The windows overlap,
// so something is always growing and nothing comes to rest until the end.
// moves from the very first frame, eases gently to rest at the end
const easeInOut = (x: number) => { const u = clamp01(x); return 0.3 * u + 0.7 * (u * u * (3 - 2 * u)); };

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

}
