import { T, d, el, r1, deg, jit, rnd } from './lib.mjs';

export const PAL = {
  ivory: '#fffaf1',
  paper: '#fbf7ee',
  saffron: ['#efcd8c', '#e7bc72', '#dcaa5c', '#cb9446'],
  burg: ['#b56f80', '#a45d70', '#8e4b60', '#723a4d'],
  blush: ['#f9eee8', '#f0d6cf', '#e1b5b2', '#d09a9d'],
  sage: '#aeb28f',
  sageLight: '#f2e9d2',
  ink: '#9b7234',
};

export const W = { line: 1.35, fine: 0.85, hair: 0.55 };

// A stroke group: every child inherits the gold line.
export const g = (art, inner, extra = {}) => el('g', {
  stroke: art.gold, 'stroke-width': W.line, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
}, inner);

const P = (tt, segs, attrs) => el('path', { d: d(tt, segs), ...attrs });

// Petal pointing -y from base (0,0). round=0 pointed, 1 rounded.
export const petalSegs = (L, Wd, round = 0, bend = 0) => [
  ['M', [0, 0]],
  ['C', [Wd * 1.05 + bend, -L * 0.22], [Wd * (0.85 + round * 0.35) + bend, -L * (0.78 + round * 0.12)], [bend, -L]],
  ['C', [-Wd * (0.85 + round * 0.35) + bend, -L * (0.78 + round * 0.12)], [-Wd * 1.05 + bend, -L * 0.22], [0, 0]],
  ['Z'],
];

// ---------- Leaves ----------
export function leaf(art, x, y, a, L, Wd = L * 0.2, { fill = PAL.sageLight, bend = 0.12, veins = true } = {}) {
  const t = T(x, y, a);
  const b = L * bend;
  const shape = d(t, [
    ['M', [0, 0]],
    ['C', [L * 0.28, -Wd * 1.2 + b * 0.4], [L * 0.72, -Wd * 0.9 + b], [L, b * 1.3]],
    ['C', [L * 0.7, Wd * 0.55 + b], [L * 0.28, Wd * 1.05 + b * 0.3], [0, 0]],
    ['Z'],
  ]);
  const body = el('path', { d: shape, fill });
  const rib = P(t, [['M', [0, 0]], ['Q', [L * 0.5, b * 0.55 - Wd * 0.08], [L * 0.97, b * 1.25]]], { fill: 'none', 'stroke-width': W.fine });
  let vs = '';
  if (veins) {
    for (const k of [0.2, 0.34, 0.48, 0.62, 0.76]) {
      const mx = L * k, my = b * k * k * 1.1 - Wd * 0.05 * k;
      vs += P(t, [['M', [mx, my]], ['Q', [mx + Wd * 0.45, my - Wd * 0.35], [mx + Wd * 0.95, my - Wd * 0.62]]], { fill: 'none', 'stroke-width': W.hair });
      vs += P(t, [['M', [mx, my]], ['Q', [mx + Wd * 0.4, my + Wd * 0.3], [mx + Wd * 0.85, my + Wd * 0.5]]], { fill: 'none', 'stroke-width': W.hair });
    }
  }
  return body + rib + (vs ? el('g', { 'clip-path': art.clip(shape) }, vs) : '');
}

// Small rounded leaf used on sprigs.
export function leaflet(art, x, y, a, L) {
  return leaf(art, x, y, a, L, L * 0.34, { bend: 0.05, veins: false });
}

// ---------- Marigold (genda): individually cut outer petals + ruffled inner rows ----------
export function marigold(art, x, y, R, rot = 0) {
  let out = '';
  const sw = Math.min(W.line, 0.45 + R * 0.028);
  const small = R <= 16;
  // outer skirt: separate petals, each a little different in length, width and angle
  const n0 = small ? 11 : Math.round(15 + R * 0.08);
  for (let i = 0; i < n0; i++) {
    const a = rot + (360 / n0) * i + jit(9);
    const L = R * (0.88 + rnd() * 0.22), w = R * 0.27 * (0.8 + rnd() * 0.4), t = T(x, y, a);
    out += P(t, [
      ['M', [-w * 0.4, -R * 0.4]],
      ['C', [-w * 0.95, -L * 0.6], [-w * 1.1, -L * 0.86], [-w * 0.55, -L * 0.97]],
      ['Q', [-w * 0.28, -L * 1.05], [0, -L * 0.93]],
      ['Q', [w * 0.28, -L * 1.05], [w * 0.55, -L * 0.97]],
      ['C', [w * 1.1, -L * 0.86], [w * 0.95, -L * 0.6], [w * 0.4, -R * 0.4]],
      ['Z'],
    ], { fill: rnd() > 0.5 ? PAL.saffron[0] : PAL.saffron[1], 'stroke-width': sw });
    if (!small) out += P(t, [['M', [0, -L * 0.6]], ['L', [jit(w * 0.1), -L * 0.84]]], { fill: 'none', 'stroke-width': W.hair });
  }
  // inner ruffles: continuous scalloped rows with uneven lobes
  const rows = small ? [[0.68, 9, 1], [0.42, 7, 2]] : [[0.74, 15, 1], [0.58, 13, 1], [0.44, 11, 2], [0.3, 9, 3]];
  rows.forEach(([k, n, tone]) => {
    const r = R * k, t = T(x, y, rot + rnd() * 360);
    const step = (Math.PI * 2) / n;
    const pt = (rr, ang) => [rr * Math.cos(ang), rr * Math.sin(ang)];
    const segs = [['M', pt(r * 0.78, 0)]];
    for (let i = 0; i < n; i++) {
      const a0 = i * step, rr = r * (0.92 + rnd() * 0.18);
      segs.push(['Q', pt(rr * 1.1, a0 + step * (0.18 + jit(0.06))), pt(rr * 0.9, a0 + step * 0.5)]);
      segs.push(['Q', pt(rr * 1.12, a0 + step * (0.82 + jit(0.06))), pt(r * 0.78, a0 + step)]);
    }
    segs.push(['Z']);
    out += P(t, segs, { fill: PAL.saffron[tone], 'stroke-width': sw });
  });
  const t0 = T(x, y, rot);
  out += P(t0, [['M', [-R * 0.1, 0]], ['Q', [0, -R * 0.14], [R * 0.1, 0]], ['Q', [0, R * 0.14], [-R * 0.1, 0]]], { fill: PAL.saffron[3], 'stroke-width': W.fine });
  return out;
}

// ---------- Jasmine (mogra) ----------
export function jasmine(art, x, y, R, rot = 0, n = 6) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = T(x, y, rot + (360 / n) * i + jit(4));
    out += P(t, petalSegs(R * (1 + jit(0.06)), R * 0.34, 0.55, R * 0.06), { fill: PAL.ivory });
    out += P(t, [['M', [0, -R * 0.2]], ['Q', [R * 0.05, -R * 0.55], [R * 0.02, -R * 0.78]]], { fill: 'none', 'stroke-width': W.hair });
  }
  out += el('circle', { cx: r1(x), cy: r1(y), r: r1(R * 0.17), fill: '#e9cf8f', 'stroke-width': W.fine });
  return out;
}

export function bud(art, x, y, a, L) {
  const t = T(x, y, a);
  const Wd = L * 0.26;
  return P(t, [['M', [0, 0]], ['C', [Wd, -L * 0.3], [Wd * 0.8, -L * 0.82], [0, -L]], ['C', [-Wd * 0.8, -L * 0.82], [-Wd, -L * 0.3], [0, 0]], ['Z']], { fill: PAL.ivory })
    + P(t, [['M', [-Wd * 0.7, L * 0.02]], ['Q', [0, -L * 0.28], [Wd * 0.7, L * 0.02]]], { fill: 'none', 'stroke-width': W.fine })
    + P(t, [['M', [0, 0]], ['L', [0, L * 0.35]]], { fill: 'none', 'stroke-width': W.fine });
}

// ---------- Rose (gulab), top view: four rings of cupped petals ----------
const cupPetal = (L, Wd) => [
  ['M', [0, 0]],
  ['C', [Wd * 0.95, -L * 0.18], [Wd * 1.12, -L * 0.8], [Wd * 0.5, -L * 0.97]],
  ['Q', [0, -L * 0.9], [-Wd * 0.5, -L * 0.97]],
  ['C', [-Wd * 1.12, -L * 0.8], [-Wd * 0.95, -L * 0.18], [0, 0]],
  ['Z'],
];
export function rose(art, x, y, R, rot = 0) {
  let out = '';
  const rings = [
    { n: 6, L: 1.0, Wd: 0.44, fill: PAL.burg[0], off: 0 },
    { n: 5, L: 0.8, Wd: 0.42, fill: '#ab6677', off: 30 },
    { n: 5, L: 0.6, Wd: 0.38, fill: PAL.burg[1], off: 8 },
    { n: 4, L: 0.42, Wd: 0.36, fill: PAL.burg[2], off: 40 },
  ];
  for (const { n, L, Wd, fill, off } of rings) {
    for (let i = 0; i < n; i++) {
      const t = T(x, y, rot + off + (360 / n) * i + jit(6));
      const l = R * L * (1 + jit(0.05));
      out += P(t, cupPetal(l, R * Wd), { fill, 'stroke-width': Math.min(W.line, 0.45 + R * 0.03) });
      // rolled lip: a lighter hairline just inside the petal edge
      if (R > 14) out += P(t, [['M', [-R * Wd * 0.62, -l * 0.84]], ['Q', [0, -l * 0.74], [R * Wd * 0.62, -l * 0.84]]], { fill: 'none', stroke: '#ecc9cf', 'stroke-width': W.hair });
    }
  }
  // tight bud at the heart
  const t = T(x, y, rot);
  const s = R * 0.24;
  out += P(t, [['M', [-s, s * 0.2]], ['C', [-s * 1.1, -s], [s * 1.1, -s * 1.05], [s, s * 0.1]], ['C', [s * 0.8, s * 0.9], [-s * 0.8, s * 0.95], [-s, s * 0.2]], ['Z']], { fill: PAL.burg[3], 'stroke-width': W.fine });
  out += P(t, [['M', [-s * 0.55, s * 0.25]], ['C', [-s * 0.5, -s * 0.5], [s * 0.5, -s * 0.55], [s * 0.45, 0]], ['C', [s * 0.4, s * 0.45], [-s * 0.2, s * 0.5], [-s * 0.15, 0]]], { fill: 'none', 'stroke-width': W.hair });
  return out;
}

// ---------- Lotus (kamal), side view, pointing -y ----------
export function lotus(art, x, y, S, a = 0) {
  const base = T(x, y, a);
  const petals = [
    { ang: -30, L: 0.9, Wd: 0.2, tone: 1 },
    { ang: 30, L: 0.9, Wd: 0.2, tone: 1 },
    { ang: -64, L: 0.72, Wd: 0.22, tone: 0, bend: -0.06 },
    { ang: 64, L: 0.72, Wd: 0.22, tone: 0, bend: 0.06 },
    { ang: -17, L: 0.92, Wd: 0.25, tone: 0 },
    { ang: 17, L: 0.92, Wd: 0.25, tone: 0 },
    { ang: 0, L: 1.0, Wd: 0.27, tone: 0 },
  ];
  let out = '';
  for (const p of petals) {
    const t = T(base.x, base.y, a + p.ang, 1);
    const fill = p.tone ? '#e8c6c1' : '#f5e5df';
    out += P(t, petalSegs(S * p.L, S * p.Wd, 0.1, S * (p.bend || 0)), { fill });
    out += P(t, [['M', [0, -S * 0.08]], ['Q', [S * 0.02, -S * p.L * 0.5], [0, -S * p.L * 0.8]]], { fill: 'none', 'stroke-width': W.hair });
  }
  // receptacle
  out += P(base, [['M', [-S * 0.3, -S * 0.02]], ['Q', [0, S * 0.2], [S * 0.3, -S * 0.02]], ['Q', [0, S * 0.07], [-S * 0.3, -S * 0.02]], ['Z']], { fill: PAL.sageLight, 'stroke-width': W.fine });
  return out;
}

// ---------- Jhumka (bell earring) hanging from (x,y) ----------
export function jhumka(art, x, y, L, s = 1) {
  const t = T(x, y, 0, s);
  const gf = art.goldFill;
  let out = '';
  // chain of tiny beads
  const beads = Math.floor(L / 5);
  for (let i = 1; i < beads; i++) {
    const [cx, cy] = t(0, i * 5);
    out += el('circle', { cx: r1(cx), cy: r1(cy), r: r1(1.1 * s), fill: gf, stroke: 'none' });
  }
  const top = L;
  out += (() => { const [cx, cy] = t(0, top + 2); return el('circle', { cx: r1(cx), cy: r1(cy), r: r1(3 * s), fill: PAL.ivory, 'stroke-width': W.fine }); })();
  out += P(t, [['M', [-3.5, top + 6]], ['Q', [0, top + 3.5], [3.5, top + 6]], ['L', [3.5, top + 8]], ['L', [-3.5, top + 8]], ['Z']], { fill: gf, 'stroke-width': W.fine });
  // dome
  out += P(t, [['M', [-11, top + 25]], ['C', [-11, top + 13], [-6, top + 8], [0, top + 8]], ['C', [6, top + 8], [11, top + 13], [11, top + 25]], ['Z']], { fill: gf, 'stroke-width': W.fine });
  out += P(t, [['M', [-7.5, top + 19]], ['Q', [0, top + 15.5], [7.5, top + 19]]], { fill: 'none', stroke: PAL.ivory, 'stroke-width': W.hair });
  out += P(t, [['M', [-12, top + 25]], ['Q', [0, top + 28], [12, top + 25]], ['Q', [0, top + 23], [-12, top + 25]], ['Z']], { fill: gf, 'stroke-width': W.fine });
  // pearl fringe
  for (let i = -2; i <= 2; i++) {
    const [ax, ay] = t(i * 4.6, top + 26.5);
    const [px, py] = t(i * 4.6, top + 31 - Math.abs(i) * 0.8);
    out += el('path', { d: `M${r1(ax)} ${r1(ay)}L${r1(px)} ${r1(py - 1.8 * s)}`, fill: 'none', 'stroke-width': W.hair });
    out += el('circle', { cx: r1(px), cy: r1(py), r: r1(1.9 * s), fill: PAL.ivory, 'stroke-width': W.fine });
  }
  return out;
}

// ---------- Conifer, engraved: a pale silhouette carrying an irregular spray of branch strokes ----------
export function pine(art, x, y, H, fill = PAL.sageLight) {
  const t = T(x, y, jit(2.5));
  const rows = Math.max(7, Math.round(H / 5.5));
  const sil = [['M', [0, -H]]], back = [], br = [];
  for (let i = 1; i <= rows; i++) {
    const k = i / rows, yy = -H + H * 0.84 * k;
    const wl = H * (0.035 + 0.2 * Math.pow(k, 0.85)) * (0.7 + rnd() * 0.6);
    const wr = H * (0.035 + 0.2 * Math.pow(k, 0.85)) * (0.7 + rnd() * 0.6);
    const dr = H * (0.03 + 0.04 * k);
    sil.push(['L', [wr, yy + dr]], ['L', [wr * 0.45, yy + dr * 0.6]]);
    back.unshift(['L', [-wl * 0.45, yy + dr * 0.6]], ['L', [-wl, yy + dr]]);
    br.push(['M', [0, yy - dr * 0.4]], ['Q', [-wl * 0.5, yy + dr * 0.1], [-wl, yy + dr]]);
    br.push(['M', [0, yy - dr * 0.4]], ['Q', [wr * 0.5, yy + dr * 0.1], [wr, yy + dr]]);
  }
  sil.push(['L', [H * 0.02, -H * 0.1]], ['L', [-H * 0.02, -H * 0.1]], ...back, ['Z']);
  return P(t, sil, { fill, stroke: 'none' })
    + P(t, [['M', [0, 0]], ['L', [0, -H * 1.02]]], { fill: 'none', 'stroke-width': W.fine })
    + P(t, br, { fill: 'none', 'stroke-width': W.hair });
}

// ---------- Hatching clipped to a region ----------
export function hatch(art, clipD, { angle = 30, gap = 4, box, width = W.hair, opacity = 0.7, color } = {}) {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  const c = Math.cos(deg(angle)), s = Math.sin(deg(angle));
  let dd = '';
  for (let k = -R; k <= R; k += gap) {
    // line perpendicular offset k, direction (c,s)
    const px = cx - s * k, py = cy + c * k;
    dd += `M${r1(px - c * R)} ${r1(py - s * R)}L${r1(px + c * R)} ${r1(py + s * R)}`;
  }
  return el('g', { 'clip-path': art.clip(clipD), opacity }, el('path', { d: dd, fill: 'none', 'stroke-width': width, stroke: color }));
}

// Horizontal water lines, tapering
export function water(art, x0, x1, y0, rows, gap = 5) {
  let dd = '';
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * gap;
    let x = x0 + jit(6) + i * 3;
    while (x < x1 - 8) {
      const len = 10 + rnd() * 26;
      const e = Math.min(x + len, x1);
      dd += `M${r1(x)} ${r1(y + jit(0.4))}L${r1(e)} ${r1(y + jit(0.4))}`;
      x = e + 4 + rnd() * 9;
    }
  }
  return el('path', { d: dd, fill: 'none', 'stroke-width': W.hair });
}

// Smooth stem through points (Catmull-Rom → cubic)
export function stem(points, width = W.line) {
  let dd = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    dd += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return el('path', { d: dd, fill: 'none', 'stroke-width': width });
}

// Tendril curl ending at (x,y) heading angle a
export function curl(x, y, a, r, dir = 1) {
  const t = T(x, y, a, 1, dir);
  return el('path', { d: d(t, [['M', [0, 0]], ['C', [r * 0.8, 0], [r * 1.3, -r * 0.6], [r * 0.9, -r * 1.1]], ['C', [r * 0.6, -r * 1.4], [r * 0.2, -r * 1.0], [r * 0.45, -r * 0.7]]]), fill: 'none', 'stroke-width': W.fine });
}
