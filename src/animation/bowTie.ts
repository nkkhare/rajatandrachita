// The flowering-vine bow forms itself in place.
//
// The approved bow is a painting, so it is "skinned": each section of vine
// (two loops, two tails) has a traced centreline, and the painting along that
// line, with its leaves and blossoms, is copied into a flexible strip. A small
// patch of the painted knot appears first; then each section is revealed
// outward from the knot along its own final curve, curling the last little
// way into shape as it goes, with a feathered front behind which the leaves
// spread out. The loops draw in to tighten, the tails grow from under the
// knot, and the bow settles. Everything stays inside the final bow's
// footprint, and at the end every strip lies exactly on the painting, which
// then takes over.
//
// All coordinates are in the bow image's own pixels (198 x 137).

type Pt = readonly [number, number];

export const BOW_SIZE = { width: 198, height: 137 };
const KNOT: Pt = [94, 49];
const HALF_WIDTH = 11;            // how far either side of a centreline the strip reaches
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
// cubic-bezier(0.22, 1, 0.36, 1): fast start, long gentle settle
function easeOut(t: number) {
  const x = clamp01(t);
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const u = (lo + hi) / 2, bx = 3 * (1 - u) ** 2 * u * 0.22 + 3 * (1 - u) * u * u * 0.36 + u ** 3;
    if (bx < x) lo = u; else hi = u;
  }
  const u = (lo + hi) / 2;
  return 3 * (1 - u) ** 2 * u * 1 + 3 * (1 - u) * u * u * 1 + u ** 3;
}
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

type Arm = {
  name: ArmName;
  anchor: Pt;
  points: Pt[];          // final resampled centreline, anchor first
  angles: number[];      // unwrapped direction of each segment (radians)
  lengths: number[];
  strip: HTMLCanvasElement;
};

function buildArm(name: ArmName, image: ImageData): Arm {
  const { anchor, path } = ARMS[name];
  const points = resample(anchor, path);
  const angles: number[] = [], lengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0], dy = points[i + 1][1] - points[i][1];
    let a = Math.atan2(dy, dx);
    if (angles.length) { const prev = angles[angles.length - 1]; while (a - prev > Math.PI) a -= 2 * Math.PI; while (a - prev < -Math.PI) a += 2 * Math.PI; }
    angles.push(a); lengths.push(Math.hypot(dx, dy));
  }
  // the strip: one column per centreline point, sampled across the normal
  const cols = points.length, rows = HALF_WIDTH * 2 + 1;
  const strip = document.createElement('canvas'); strip.width = cols; strip.height = rows;
  const out = strip.getContext('2d')!.createImageData(cols, rows);
  const { width, height, data } = image;
  const sample = (x: number, y: number, o: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const acc = [0, 0, 0, 0];
    for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]] as const) {
      const xx = x0 + dx, yy = y0 + dy;
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      const k = (yy * width + xx) * 4, a = data[k + 3] / 255;
      acc[0] += data[k] * a * w; acc[1] += data[k + 1] * a * w; acc[2] += data[k + 2] * a * w; acc[3] += a * w;
    }
    if (acc[3] > 0) { out.data[o] = acc[0] / acc[3]; out.data[o + 1] = acc[1] / acc[3]; out.data[o + 2] = acc[2] / acc[3]; }
    out.data[o + 3] = acc[3] * 255;
  };
  for (let i = 0; i < cols; i++) {
    const a = angles[Math.min(i, angles.length - 1)], nx = -Math.sin(a), ny = Math.cos(a);
    for (let j = 0; j < rows; j++) {
      const off = j - HALF_WIDTH;
      // soften the strip's long edges so pieces blend where they meet
      sample(points[i][0] + nx * off, points[i][1] + ny * off, (j * cols + i) * 4);
      const edge = Math.min(1, (HALF_WIDTH + 0.5 - Math.abs(off)) / 2.5);
      // and taper the free end so a vine never ends in a square cut
      const end = Math.min(1, (cols - 1 - i) / 5);
      out.data[(j * cols + i) * 4 + 3] *= edge * end;
    }
  }
  strip.getContext('2d')!.putImageData(out, 0, 0);
  return { name, anchor, points, angles, lengths, strip };
}

// ---- the choreography ----------------------------------------------------------

type ArmPose = {
  reveal: number;        // how much of the arm is shown, outward from the knot (0..1)
  curl: number;          // how far it has curled into its final curve (0..1)
  scale: number;         // size about its knot point (loops tighten inward)
  sway: number;          // tiny rotation about its knot point (radians)
  spread: number;        // leaf spread across the whole strip (blooming)
  z: number;             // drawing order
};

const KNOT_RADIUS = 14;
const FEATHER = 10;                // length of the soft reveal front, in strip columns
const BLOOM = 16;                  // how far behind the front leaves finish spreading

function poses(t: number) {
  // the bow pulls itself snug: loops draw in a few pixels, the knot compresses
  const tighten = smooth(phase(t, 0.8, 1.05));
  const squeeze = Math.sin(Math.PI * phase(t, 0.8, 1.05));
  const loop = (start: number, end: number, z: number): ArmPose => {
    const p = phase(t, start, end);
    return {
      reveal: easeOut(p),
      curl: mix(0.95, 1, smooth(p)),
      scale: mix(1.02, 1, tighten),
      sway: 0,
      spread: mix(0.92, 1, smooth(phase(t, 1.2, 1.65))),
      z,
    };
  };
  const tail = (start: number, end: number, side: number, z: number): ArmPose => {
    const p = phase(t, start, end);
    return {
      reveal: easeOut(p),
      curl: mix(0.9, 1, smooth(p)),
      scale: 1,
      // a whisper of movement as each tail grows, easing to rest
      sway: side * 0.035 * Math.sin(Math.PI * smooth(p)) * (1 - p * 0.5),
      spread: mix(0.92, 1, smooth(phase(t, 1.2, 1.65))),
      z,
    };
  };
  return {
    arms: {
      leftLoop: loop(0.15, 0.75, 2),
      rightLoop: loop(0.3, 0.9, 2),
      leftTail: tail(0.9, 1.4, -1, 1),
      rightTail: tail(1.0, 1.5, 1, 1),
    } as Record<ArmName, ArmPose>,
    knot: {
      opacity: smooth(phase(t, 0, 0.2)),
      scale: mix(0.8, 1, easeOut(phase(t, 0, 0.22))) * (1 - 0.06 * squeeze),
    },
  };
}

// ---- rendering -----------------------------------------------------------------

function armCentreline(arm: Arm, pose: ArmPose) {
  // integrate the blended segment angles outward from the knot point; at
  // curl = 1 this reproduces the traced centreline exactly
  const first = arm.angles[0];
  const pts: Pt[] = [arm.anchor];
  const angs: number[] = [];
  let [x, y] = arm.anchor;
  for (let i = 0; i < arm.lengths.length; i++) {
    const dir = first + (arm.angles[i] - first) * pose.curl + pose.sway;
    x += Math.cos(dir) * arm.lengths[i] * pose.scale;
    y += Math.sin(dir) * arm.lengths[i] * pose.scale;
    pts.push([x, y]);
    angs.push(dir);
  }
  return { pts, angs };
}

export class BowTie {
  private arms: Arm[];
  private knot: HTMLCanvasElement;

  constructor(bow: HTMLImageElement) {
    const c = document.createElement('canvas');
    c.width = BOW_SIZE.width; c.height = BOW_SIZE.height;
    const x = c.getContext('2d')!;
    x.drawImage(bow, 0, 0);
    const image = x.getImageData(0, 0, c.width, c.height);
    this.arms = (['leftTail', 'rightTail', 'leftLoop', 'rightLoop'] as ArmName[]).map((name) => buildArm(name, image));
    // the painted knot, feathered at its edge
    const r = KNOT_RADIUS, size = r * 2 + 2;
    this.knot = document.createElement('canvas'); this.knot.width = size; this.knot.height = size;
    const kx = this.knot.getContext('2d')!;
    kx.drawImage(bow, KNOT[0] - r - 1, KNOT[1] - r - 1, size, size, 0, 0, size, size);
    kx.globalCompositeOperation = 'destination-in';
    const g = kx.createRadialGradient(r + 1, r + 1, r * 0.55, r + 1, r + 1, r + 1);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    kx.fillStyle = g; kx.fillRect(0, 0, size, size);
  }

  /** Draws the bow at `seconds` into a context whose transform maps bow pixels. */
  draw(ctx: CanvasRenderingContext2D, seconds: number) {
    const t = Math.max(0, seconds);
    const { arms, knot } = poses(t);
    // one extremely restrained settle of the whole, finished bow
    const settle = 1 + 0.015 * Math.sin(Math.PI * phase(t, 1.6, 1.75)) - 0.003 * Math.sin(Math.PI * phase(t, 1.75, 1.88));
    ctx.save();
    ctx.translate(KNOT[0], KNOT[1]); ctx.scale(settle, settle); ctx.translate(-KNOT[0], -KNOT[1]);
    const order = this.arms.map((arm) => ({ arm, pose: arms[arm.name] })).sort((a, b) => a.pose.z - b.pose.z);
    for (const { arm, pose } of order) {
      if (pose.reveal <= 0) continue;
      const { pts, angs } = armCentreline(arm, pose);
      const front = pose.reveal * (angs.length + FEATHER);
      for (let i = 0; i < angs.length; i++) {
        const alpha = clamp01((front - i) / FEATHER);
        if (alpha <= 0) break;
        // leaves open out just behind the advancing front
        const bloom = mix(0.72, 1, smooth((front - i) / BLOOM)) * pose.spread;
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0) + 0.9;      // slight overlap: no seams at bends
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x0, y0);
        ctx.rotate(angs[i]);
        ctx.scale(1, bloom);
        ctx.drawImage(arm.strip, i, 0, 1, HALF_WIDTH * 2 + 1, 0, -HALF_WIDTH - 0.5, len, HALF_WIDTH * 2 + 1);
        ctx.restore();
      }
    }
    // the knot sits over the loops and tails, as in the painting
    if (knot.opacity > 0) {
      const size = this.knot.width;
      ctx.save();
      ctx.globalAlpha = knot.opacity;
      ctx.translate(KNOT[0], KNOT[1]); ctx.scale(knot.scale, knot.scale);
      ctx.drawImage(this.knot, -size / 2, -size / 2);
      ctx.restore();
    }
    ctx.restore();
  }

  /** The formation's length; the static painting takes over at the end. */
  static readonly DURATION = 2.0;
}
