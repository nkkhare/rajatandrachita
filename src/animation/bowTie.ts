// The flowering-vine bow ties itself.
//
// The approved bow is a painting, so it is "skinned": each section of vine
// (two tails, two loops) has a traced centreline, and the painting along that
// line, with its leaves and blossoms, is copied into a flexible strip. Each
// frame the strips are bent along animated centrelines and drawn in depth
// order, so the vines can cross in front of and behind one another. Every arm
// starts at its vine's point in the knot and is built by integrating segment
// angles, so it can curl continuously from a loose strand into its final
// curve. At full curl it lies exactly on the traced line, so the last frame
// coincides with the approved painting, which then takes over.
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
// accelerate into a pull, then stop quickly at tension
const pull = (t: number) => { const x = clamp01(t); return x < 0.6 ? 0.55 * (x / 0.6) ** 2 : 1 - 0.45 * ((1 - x) / 0.4) ** 2; };
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
  anchor: Pt;            // where the arm starts (its vine's knot point)
  base: number;          // direction of the straight, uncurled arm (radians)
  curl: number;          // 0 = straight along `base`, 1 = the final curve
  scale: number;         // size about the anchor (loops start loose, then tighten)
  offset: Pt;            // extra drift
  sway: number;          // whole-arm rotation about the anchor (radians)
  spread: number;        // leaf spread across the strip (unfolding)
  visible: number;       // fraction of the arm's length shown, from the anchor
  z: number;             // drawing order
};

const deg = Math.PI / 180;

function poses(t: number): Record<ArmName, ArmPose> {
  // Each vine's knot point slides in from its own side and meets at the knot.
  // gentle start, speeding up toward the crossing, then easing into place
  const approachL = smooth(phase(t, 0, 0.66));
  const approachR = smooth(phase(t, 0.03, 0.7));
  const anchorL: Pt = [mix(-62, 90, approachL), mix(58, 52, approachL) + 3 * Math.sin(approachL * Math.PI)];
  const anchorR: Pt = [mix(252, 100, approachR), mix(46, 52, approachR) - 2.5 * Math.sin(approachR * Math.PI)];

  // Tails: lead in pointing at each other, cross (left over right), then the
  // left end wraps under and around the right vine and both drop downward.
  const crossL = phase(t, 0.25, 0.45), wrapL = smooth(phase(t, 0.45, 0.78));
  const crossR = phase(t, 0.28, 0.48), wrapR = smooth(phase(t, 0.5, 0.84));
  // tension from the tightening lifts the tails toward the knot, then releases
  const tension = Math.sin(Math.PI * phase(t, 1.4, 1.66));
  const releaseL = phase(t, 1.55, 1.8), releaseR = phase(t, 1.62, 1.88);
  const swingL = 0.05 * Math.sin(releaseL * Math.PI * 1.5) * (1 - releaseL);
  const swingR = -0.05 * Math.sin(releaseR * Math.PI * 1.5) * (1 - releaseR);
  const leftTail: ArmPose = {
    anchor: anchorL,
    base: mix(mix(-4, 18, crossL) * deg, 120 * deg, wrapL),
    curl: mix(0.15, 1, wrapL),
    scale: 1 - 0.07 * tension,
    offset: [0, 0],
    sway: -10 * deg * tension + swingL,
    spread: mix(0.82, 1, smooth(phase(t, 0.5, 1.8))),
    visible: 1,
    // over the right vine while crossing, behind it mid-wrap, then in front
    z: t < 0.5 ? 4 : t < 0.68 ? 1 : 3,
  };
  const rightTail: ArmPose = {
    anchor: anchorR,
    base: mix(mix(184, 160, crossR) * deg, 60 * deg, wrapR),
    curl: mix(0.15, 1, wrapR),
    scale: 1 - 0.07 * tension,
    offset: [0, 0],
    sway: 10 * deg * tension + swingR,
    spread: mix(0.82, 1, smooth(phase(t, 0.55, 1.88))),
    visible: 1,
    z: 2,
  };

  // First loop: the left vine's long end folds back on itself into a loop,
  // a little loose at first, pulled out and tightened later.
  // a uniform curl from straight-left: the end sweeps down, round and back
  // up into the loop, never rising above the bow's own top
  const fold = smooth(phase(t, 0.6, 1.02));
  const tighten = pull(phase(t, 1.4, 1.7));
  const relax = Math.sin(Math.PI * phase(t, 1.72, 2.08));
  const leftLoop: ArmPose = {
    anchor: anchorL,
    base: -180 * deg,                      // straight left (same turn direction as the loop)
    curl: fold,
    scale: mix(1.1, 1, tighten),
    offset: [mix(3.5, -1.2, tighten) + 1.2 * smooth(phase(t, 1.7, 2.05)) + 0.8 * relax, mix(-1, 0, tighten)],
    sway: 0,
    spread: mix(0.8, 1, smooth(phase(t, 0.7, 1.75))),
    visible: 1,
    z: 2,
  };

  // Second loop: the right vine's long end swings up and across the front of
  // the first loop's base, passes round behind the knot, and its folded
  // section is pulled through as a growing loop.
  const swing = smooth(phase(t, 0.88, 1.08));            // across the front
  const around = smooth(phase(t, 1.03, 1.2));            // behind the knot
  const through = easeOut(phase(t, 1.15, 1.47));         // pulled through
  let base = mix(-6, -186, swing) * deg;                 // up, over, to the left
  base = mix(base, -330 * deg, around);                  // down and round behind
  base = mix(base, -40 * deg, through);                  // emerging on the right
  const rightLoop: ArmPose = {
    anchor: anchorR,
    base,
    curl: mix(mix(mix(0.05, 0.3, swing), 0.35, around), 1, through),
    // shortened while it swings over, so it passes close above the knot
    scale: mix(mix(mix(1, 0.5, swing), 0.45, around), 1.1, through) * mix(1, 1 / 1.1, tighten),
    offset: [mix(-3.5, 1.2, tighten) - 1.2 * smooth(phase(t, 1.7, 2.05)) - 0.8 * relax, mix(-1, 0, tighten)],
    sway: 0,
    spread: mix(0.8, 1, smooth(phase(t, 1.15, 1.8))),
    // while being pulled through, only the emerging fold is visible
    visible: t < 1.03 ? 1 : mix(mix(1, 0.3, around), 1, through),
    // in front while crossing the first loop's base, behind the knot after
    z: t < 1.06 ? 5 : 1,
  };
  return { leftTail, rightTail, leftLoop, rightLoop };
}

// ---- rendering -----------------------------------------------------------------

function armCentreline(arm: Arm, pose: ArmPose) {
  // integrate the blended segment angles outward from the anchor
  const first = arm.angles[0];
  const pts: Pt[] = [pose.anchor];
  const angs: number[] = [];
  let [x, y] = pose.anchor;
  const n = Math.max(1, Math.round(arm.lengths.length * clamp01(pose.visible)));
  for (let i = 0; i < n; i++) {
    // As the arm curls, its starting direction blends from `base` to the final
    // one and each segment's bend grows to its final value; at curl = 1 this
    // reproduces the traced centreline exactly.
    const dir = mix(pose.base, first, pose.curl) + (arm.angles[i] - first) * pose.curl + pose.sway;
    x += Math.cos(dir) * arm.lengths[i] * pose.scale;
    y += Math.sin(dir) * arm.lengths[i] * pose.scale;
    pts.push([x + pose.offset[0] * (i / n), y + pose.offset[1] * (i / n)]);
    angs.push(dir);
  }
  return { pts, angs };
}

export class BowTie {
  private arms: Arm[];

  constructor(bow: HTMLImageElement) {
    const c = document.createElement('canvas');
    c.width = BOW_SIZE.width; c.height = BOW_SIZE.height;
    const x = c.getContext('2d')!;
    x.drawImage(bow, 0, 0);
    const image = x.getImageData(0, 0, c.width, c.height);
    this.arms = (['leftTail', 'rightTail', 'leftLoop', 'rightLoop'] as ArmName[]).map((name) => buildArm(name, image));
  }

  /** Draws the bow at `seconds` into a context whose transform maps bow pixels. */
  draw(ctx: CanvasRenderingContext2D, seconds: number) {
    const t = Math.max(0, seconds);
    const all = poses(t);
    // the final, extremely restrained settle of the whole bow
    const settle = t < 1.8 ? 1 : 1 + 0.015 * Math.sin(Math.PI * phase(t, 1.8, 1.95)) - 0.005 * Math.sin(Math.PI * phase(t, 1.95, 2.1));
    ctx.save();
    ctx.translate(KNOT[0], KNOT[1]); ctx.scale(settle, settle); ctx.translate(-KNOT[0], -KNOT[1]);
    const order = this.arms.map((arm) => ({ arm, pose: all[arm.name] })).sort((a, b) => a.pose.z - b.pose.z);
    for (const { arm, pose } of order) {
      const { pts, angs } = armCentreline(arm, pose);
      for (let i = 0; i < angs.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0) + 0.9;      // slight overlap: no seams at bends
        ctx.save();
        ctx.translate(x0, y0);
        ctx.rotate(angs[i]);
        ctx.scale(1, pose.spread);
        ctx.drawImage(arm.strip, i, 0, 1, HALF_WIDTH * 2 + 1, 0, -HALF_WIDTH - 0.5, len, HALF_WIDTH * 2 + 1);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /** The tie's length; after this the static painting takes over. */
  static readonly DURATION = 2.1;
}
