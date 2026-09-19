import { writeFileSync, mkdirSync } from 'node:fs';
import { Art, T, d, el, r1, reseed, jit, rnd } from './lib.mjs';
import { PAL, W, g, leaf, leaflet, marigold, jasmine, bud, rose, lotus, jhumka, pine, hatch, water, stem, curl } from './motifs.mjs';

const OUT = process.argv[2] || new URL('../dist/assets/art', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

function foil(a) {
  const run = Math.max(a.w, a.h);
  a.gold = a.grad(0, 0, run, run * 0.58, [[0, '#a37a34'], [0.25, '#c39c56'], [0.5, '#d9bd7e'], [0.75, '#b58c45'], [1, '#a47a34']]);
  a.goldFill = a.grad(0, 0, run * 0.5, run * 0.3, [[0, '#ecd497'], [0.45, '#c79f55'], [0.7, '#e7cd8f'], [1, '#b98f45']]);
}

// A small spray used to "root" the landscape corners.
function spray(a, x, y, dir = 1, kind = 'marigold') {
  const f = (dx) => x + dx * dir;
  const ang = (deg) => (dir > 0 ? deg : 180 - deg);
  const out = [];
  // tall mango leaves fan upward behind the flowers, lifting the corner toward the vine above
  out.push(leaf(a, f(6), y - 10, ang(-82), 86, 15), leaf(a, f(10), y - 8, ang(-54), 94, 16));
  out.push(leaf(a, f(16), y - 5, ang(-24), 92, 15), leaf(a, f(40), y - 5, ang(-6), 70, 13));
  if (kind === 'marigold') {
    out.push(rose(a, f(76), y - 26, 21, 10));
    out.push(marigold(a, f(34), y - 30, 34, 5));
    out.push(jasmine(a, f(70), y - 58, 10, 12), bud(a, f(88), y - 60, dir * 40, 12), bud(a, f(18), y - 78, dir * -12, 12));
  } else {
    out.push(marigold(a, f(16), y - 52, 17, 12));
    out.push(lotus(a, f(44), y - 16, 50, dir * 16));
    out.push(rose(a, f(90), y - 22, 18, 40));
    out.push(jasmine(a, f(80), y - 54, 9, 20), bud(a, f(100), y - 50, dir * 50, 11));
  }
  return out;
}

// ---------------- Florals: top corners (two sibling variants) ----------------
const lerpY = (pts, x) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
};

function florals(variant) {
  const B = variant === 'right';
  reseed(B ? 17 : 5);
  const a = new Art(400, 520, B ? 'Marigold, rose, lotus and jasmine corner (right)' : 'Marigold, rose, lotus and jasmine corner');
  foil(a);
  const L = [];

  // A gently sagging swag along the top and a cascading vine down the side
  const top = [[70, 30], [150, 39], [230, 42], [300, 37], [354, 27]];
  const side = B ? [[30, 70], [38, 150], [40, 220], [36, 300], [30, 380], [24, 450]] : [[30, 70], [39, 150], [42, 230], [38, 310], [32, 400], [26, 478]];
  const sideX = (y) => lerpY(side.map(([x, yy]) => [yy, x]), y);
  L.push(stem(top), stem(side));
  L.push(curl(354, 27, -18, 10, 1), B ? curl(24, 450, 108, 10, -1) : curl(26, 478, 108, 10, -1));

  // Hanging strands (toran) — lengths and positions differ between siblings
  const strand = (x, len, endFlower) => {
    const y0 = lerpY(top, x) - 1;
    const out = [el('path', { d: `M${x} ${r1(y0)}Q${x + 2} ${r1(y0 + len / 2)} ${x} ${r1(y0 + len)}`, fill: 'none', 'stroke-width': W.fine })];
    for (let yy = y0 + 10; yy < y0 + len - 6; yy += 10) out.push(bud(a, x + (((yy / 10) | 0) % 2 ? 2.5 : -2.5), yy + 8, 180 + jit(14), 9.5));
    if (endFlower) { out.push(marigold(a, x, y0 + len * 0.55, 7.5, 10)); out.push(marigold(a, x, y0 + len + 9, 11, 20)); }
    return out;
  };
  const jx = B ? 204 : 292;
  if (B) { L.push(strand(270, 52, true), strand(322, 30, false)); }
  else { L.push(strand(242, 84, true), strand(196, 40, false)); }
  L.push(jhumka(a, jx, lerpY(top, jx) - 1, B ? 64 : 44, 1));
  // tiny blossoms riding the swag
  for (const xx of B ? [240, 344] : [226, 330]) {
    L.push(leaflet(a, xx - 6, lerpY(top, xx) + 1, -150, 16), leaflet(a, xx + 6, lerpY(top, xx), -30, 16));
    L.push(jasmine(a, xx, lerpY(top, xx) - 2, 6.5, xx));
  }

  // Cascade down the side vine: blooms get smaller as they fall
  const cascade = B
    ? [[208, 'jas', 9], [238, 'mari', 11.5], [268, 'jas', 7], [298, 'rose', 9], [328, 'bud', 10], [358, 'mari', 8], [388, 'jas', 6.5], [418, 'bud', 9]]
    : [[218, 'mari', 13], [252, 'rose', 10.5], [282, 'jas', 8], [312, 'mari', 9], [342, 'bud', 10], [372, 'jas', 7], [404, 'mari', 7], [438, 'bud', 9]];
  cascade.forEach(([yy, kind, r], i) => {
    const x = sideX(yy);
    const dx = i % 2 ? -1 : 1;
    L.push(leaflet(a, x, yy - 4, dx > 0 ? 30 : 150, 20 + r * 0.6));
    L.push(leaflet(a, x, yy + 6, dx > 0 ? 70 : 110, 16 + r * 0.4));
    const fx = x + dx * (r * 0.9 + 3);
    if (kind === 'mari') L.push(marigold(a, fx, yy, r, i * 20));
    else if (kind === 'rose') L.push(rose(a, fx, yy, r, i * 30));
    else if (kind === 'jas') L.push(jasmine(a, fx, yy, r, i * 15));
    else L.push(bud(a, x + 2, yy, 160, r), bud(a, x - 2, yy + 4, 200, r * 0.85));
  });

  // Mango leaves radiating from the cluster
  L.push(leaf(a, 96, 36, -2, 124, 21));
  L.push(leaf(a, 36, 96, 92, 124, 21));
  L.push(leaf(a, 112, 72, 18, 98, 18));
  L.push(leaf(a, 72, 112, 72, 98, 18));
  L.push(leaf(a, 120, 120, 45, 74, 15));
  L.push(leaf(a, 58, 40, -14, 72, 13), leaf(a, 40, 58, 104, 72, 13));

  // Flowers, back to front — the two corners rhyme rather than repeat
  if (B) {
    L.push(lotus(a, 150, 52, 56, 142));
    L.push(rose(a, 50, 150, 22, 5));
    L.push(rose(a, 122, 120, 31, 40));
    L.push(marigold(a, 72, 72, 50, 9));
    L.push(jasmine(a, 210, 44, 12, 10), jasmine(a, 46, 204, 12, 35), jasmine(a, 176, 104, 9, 20), jasmine(a, 96, 176, 9, 50));
    L.push(bud(a, 228, 58, 70, 12), bud(a, 30, 176, 110, 10), bud(a, 184, 24, 80, 10));
  } else {
    L.push(rose(a, 152, 52, 30, 8));
    L.push(rose(a, 52, 152, 28, 30));
    L.push(lotus(a, 118, 118, 64, 135));
    L.push(marigold(a, 74, 74, 52, 0));
    L.push(jasmine(a, 198, 62, 13, 10), jasmine(a, 62, 198, 13, 35), jasmine(a, 172, 100, 9, 20), jasmine(a, 100, 172, 9, 50));
    L.push(bud(a, 216, 46, 60, 12), bud(a, 46, 216, 120, 12), bud(a, 184, 28, 80, 10), bud(a, 28, 184, 110, 10));
  }

  const inner = L.join('');
  // The right-hand sibling is drawn as its own composition, then flipped to face inward.
  a.add(g(a, B ? el('g', { transform: 'matrix(-1 0 0 1 400 0)' }, inner) : inner));
  return a;
}

// ---------------- Yosemite (Tunnel View): bottom-left corner ----------------
function yosemite() {
  reseed(9);
  const a = new Art(400, 260, 'Yosemite Valley from Tunnel View: El Capitan, Half Dome and Bridalveil Fall');
  foil(a);
  const L = [];
  const rock = '#f5ecda';

  // Far ridge line
  const ridge = 'M130 196C160 182 186 176 210 180C236 170 262 170 286 178C300 172 314 172 330 178L330 212L130 212Z';
  L.push(el('path', { d: ridge, fill: '#f7efe2', stroke: 'none' }));
  L.push(el('path', { d: 'M130 196C160 182 186 176 210 180C236 170 262 170 286 178C300 172 314 172 330 178', fill: 'none', 'stroke-width': W.fine }));
  L.push(hatch(a, ridge, { angle: 60, gap: 5, box: [130, 168, 330, 212], opacity: 0.35 }));

  // Half Dome: rounded back, sheer north-west face
  const dome = 'M200 204C200 158 238 118 290 110C298 109 304 110 307 113C307 140 309 172 313 204Z';
  L.push(el('path', { d: dome, fill: rock }));
  L.push(hatch(a, 'M200 204C200 158 238 118 290 110C286 140 282 172 282 204Z', { angle: -60, gap: 4, box: [200, 106, 314, 204], opacity: 0.45 }));
  L.push(hatch(a, 'M290 110C298 109 304 110 307 113C307 140 309 172 313 204L282 204C282 172 286 140 290 110Z', { angle: 89, gap: 1.9, box: [280, 106, 316, 204], opacity: 0.9 }));
  L.push(el('path', { d: 'M222 160C238 138 260 124 286 118M212 184C228 160 252 142 280 134M290 110C286 140 282 172 282 204', fill: 'none', 'stroke-width': W.hair }));
  L.push(el('path', { d: dome.replace(/Z$/, ''), fill: 'none' }));

  // Cathedral Rocks with Bridalveil Fall
  const cath = 'M316 212L322 192L327 182L331 170L336 162L340 150L345 144L349 150L353 140L358 132L363 138L368 128L374 124L379 131L385 122L391 126L396 120L400 122L400 212Z';
  L.push(el('path', { d: cath, fill: rock }));
  L.push(hatch(a, cath, { angle: -58, gap: 4.2, box: [316, 118, 400, 212], opacity: 0.45 }));
  L.push(el('path', { d: 'M345 144L343 176M368 128L365 160M385 122L384 150', fill: 'none', 'stroke-width': W.hair }));
  L.push(el('path', { d: cath.replace(/L400 212Z$/, ''), fill: 'none' }));
  L.push(el('path', { d: 'M357 138C356 162 359 184 356 206', fill: 'none', stroke: '#fffdf8', 'stroke-width': 4.4 }));
  L.push(el('path', { d: 'M355 138C354 162 357 184 354 206M359 138C359 162 361 184 359 206', fill: 'none', 'stroke-width': W.hair }));
  L.push(el('path', { d: 'M348 207q4 -5 8 0q4 -5 9 0', fill: 'none', 'stroke-width': W.hair }));

  // El Capitan from Tunnel View: a broad, nearly flat summit, a rounded brow and a blunt, sheer prow (the Nose)
  const elcapTop = 'M0 62C24 55 54 50 84 48C98 47 110 47 118 48C125 49 129 54 130 62C131 70 130 78 129 88C129 124 132 172 138 216';
  const elcap = elcapTop + 'L0 216Z';
  L.push(el('path', { d: elcap, fill: rock, stroke: 'none' }));
  // the shaded south-east face gets dense engraving; the lit wall gets a few long streaks
  L.push(hatch(a, 'M118 48C125 49 129 54 130 62C131 70 130 78 129 88C129 124 132 172 138 216L104 216C105 150 110 92 118 48Z', { angle: 90, gap: 1.8, box: [100, 44, 140, 216], opacity: 0.9 }));
  L.push(el('path', { d: 'M118 48C111 92 106 150 104 216', fill: 'none', 'stroke-width': W.fine }));
  L.push(el('path', { d: 'M30 60C31 90 29 120 30 150M58 52C60 80 58 118 59 140M84 50C86 74 85 102 86 128M100 49C101 70 100 96 101 116', fill: 'none', 'stroke-width': W.hair, opacity: 0.7 }));
  L.push(el('path', { d: elcapTop, fill: 'none' }));

  // A distant forest band along the valley floor, then three engraved firs in the foreground
  let forest = 'M150 222L150 212';
  for (let fx = 150; fx < 398;) { const w = 5 + rnd() * 5, h = 5 + rnd() * 8; forest += `Q${r1(fx + w * 0.2)} ${r1(212 - h)} ${r1(fx + w * 0.5)} ${r1(210 - h)}Q${r1(fx + w * 0.8)} ${r1(212 - h)} ${r1(fx + w)} ${r1(212 - rnd() * 2)}`; fx += w; }
  forest += 'L400 222Z';
  L.push(el('path', { d: forest, fill: '#efe5cf', stroke: 'none' }));
  L.push(el('path', { d: forest.replace(/L400 222Z$/, '').replace(/^M150 222L150 212/, 'M150 212'), fill: 'none', 'stroke-width': W.hair }));
  for (const [px, py, ph] of [[102, 224, 84], [122, 223, 68], [142, 222, 52]]) L.push(pine(a, px, py, ph, '#efe5cf'));
  L.push(el('path', { d: 'M0 224C80 220 200 216 400 212', fill: 'none', 'stroke-width': W.fine }));

  // Merced River
  L.push(water(a, 40, 390, 230, 5, 5.5));

  // Rooting spray at the corner
  L.push(spray(a, 24, 242, 1, 'marigold'));

  a.add(g(a, L.join('')));
  return a;
}

// ---------------- New York: bottom-right corner ----------------
function newYork() {
  reseed(21);
  const a = new Art(400, 260, 'New York skyline with the Brooklyn Bridge');
  foil(a);
  const L = [];
  const BASE = 206;
  const paper = '#fcf7ee';

  // Crescent moon + stars
  L.push(el('path', { d: 'M132 44a17 17 0 1 0 14 26a13 13 0 1 1 -14 -26Z', fill: 'none', 'stroke-width': W.fine }));

  const bldg = (x, top, w, { win = true, fill = paper } = {}) => {
    const dd = `M${x} ${BASE}L${x} ${top}L${x + w} ${top}L${x + w} ${BASE}`;
    let s = el('path', { d: dd + 'Z', fill });
    if (win) {
      let wdd = '';
      for (let yy = top + 6; yy < BASE - 4; yy += 6) for (let xx = x + 3; xx < x + w - 3; xx += 4.5) if (rnd() > 0.35) wdd += `M${r1(xx)} ${yy}l2 0`;
      s += el('path', { d: wdd, fill: 'none', 'stroke-width': W.hair });
    }
    return s + el('path', { d: dd, fill: 'none', 'stroke-width': W.fine });
  };

  // Back row
  const back = [[150, 150, 16], [196, 132, 14], [238, 146, 18], [300, 128, 16], [316, 140, 14], [384, 120, 16]];
  for (const [x, top, w] of back) L.push(el('g', { opacity: 0.55 }, bldg(x, top, w, { win: false })));

  // Chrysler: stacked sunburst arches pierced by triangular windows, then the needle
  {
    const x = 207, w = 22, top = 104, cx = x + w / 2;
    L.push(bldg(x, top, w, { fill: '#f5ecda' }));
    let base = top;
    for (let i = 0; i < 5; i++) {
      const hw = (w / 2) * (1 - i * 0.17), peak = base - hw * 1.05;
      L.push(el('path', { d: `M${r1(cx - hw)} ${r1(base + 3)}L${r1(cx - hw)} ${r1(base)}Q${r1(cx - hw)} ${r1(peak)} ${cx} ${r1(peak)}Q${r1(cx + hw)} ${r1(peak)} ${r1(cx + hw)} ${r1(base)}L${r1(cx + hw)} ${r1(base + 3)}Z`, fill: '#f5ecda', 'stroke-width': W.fine }));
      let tri = '';
      const nwin = Math.max(2, 5 - i);
      for (let j = 0; j < nwin; j++) {
        const angle = Math.PI * (0.18 + 0.64 * (j / Math.max(1, nwin - 1)));
        const px = cx - Math.cos(angle) * hw * 0.6, py = base - Math.sin(angle) * hw * 0.6;
        tri += `M${r1(px - 0.9)} ${r1(py + 1.1)}L${r1(px)} ${r1(py - 1.3)}L${r1(px + 0.9)} ${r1(py + 1.1)}Z`;
      }
      L.push(el('path', { d: tri, fill: '#e9d3a0', 'stroke-width': W.hair }));
      base = base - hw * 0.62;
    }
    const spireBase = base;
    L.push(el('path', { d: `M${cx} ${r1(spireBase - 2)}L${cx} ${r1(spireBase - 24)}`, fill: 'none', 'stroke-width': W.fine }));
  }

  // Mid buildings
  for (const [x, top, w] of [[160, 168, 20], [182, 150, 18], [232, 160, 16], [288, 150, 14], [372, 138, 22]]) L.push(bldg(x, top, w));

  // Empire State Building
  {
    const cx = 262;
    const tiers = [[34, 118], [26, 92], [18, 78], [12, 66], [7, 58]];
    let prev = BASE;
    for (const [w, top] of tiers) {
      L.push(el('path', { d: `M${cx - w / 2} ${prev}L${cx - w / 2} ${top}L${cx + w / 2} ${top}L${cx + w / 2} ${prev}Z`, fill: '#f5ecda' }));
      let pin = '';
      for (let xx = cx - w / 2 + 3; xx < cx + w / 2 - 1; xx += 3) pin += `M${r1(xx)} ${top + 2}L${r1(xx)} ${prev - 1}`;
      L.push(el('path', { d: pin, fill: 'none', 'stroke-width': W.hair, opacity: 0.8 }));
      L.push(el('path', { d: `M${cx - w / 2} ${prev}L${cx - w / 2} ${top}L${cx + w / 2} ${top}L${cx + w / 2} ${prev}`, fill: 'none' }));
      prev = top;
    }
    L.push(el('path', { d: `M${cx} 58L${cx} 30`, fill: 'none', 'stroke-width': W.fine }));
  }

  // One World Trade Center
  {
    const cx = 340, bw = 30, tw = 14, top = 44;
    const body = `M${cx - bw / 2} ${BASE}L${cx - bw / 2} 176L${cx - tw / 2} ${top}L${cx + tw / 2} ${top}L${cx + bw / 2} 176L${cx + bw / 2} ${BASE}Z`;
    L.push(el('path', { d: body, fill: '#f5ecda' }));
    L.push(hatch(a, `M${cx - bw / 2} 176L${cx - tw / 2} ${top}L${cx} ${top}L${cx} 176Z`, { angle: 90, gap: 2.6, box: [cx - bw / 2, top, cx, 176], opacity: 0.55 }));
    L.push(el('path', { d: `M${cx - bw / 2} 176L${cx + tw / 2} ${top}M${cx + bw / 2} 176L${cx - tw / 2} ${top}M${cx - bw / 2} 176L${cx + bw / 2} 176`, fill: 'none', 'stroke-width': W.hair }));
    L.push(el('path', { d: body, fill: 'none' }));
    L.push(el('path', { d: `M${cx - 4} ${top}L${cx - 4} ${top - 5}L${cx + 4} ${top - 5}L${cx + 4} ${top}M${cx} ${top - 5}L${cx} ${top - 34}`, fill: 'none', 'stroke-width': W.fine }));
  }

  // Front row
  for (const [x, top, w] of [[146, 184, 20], [196, 176, 14], [240, 180, 12], [296, 170, 22], [320, 184, 10], [358, 160, 16]]) L.push(bldg(x, top, w));

  // Brooklyn Bridge
  {
    const deck = 200, tx = 74, tw = 26, ttop = 112;
    // cables
    const cab = `M-10 ${deck - 12}Q${tx - 30} ${deck - 20} ${tx - tw / 2 + 2} ${ttop + 6}M${tx + tw / 2 - 2} ${ttop + 6}Q${tx + 70} ${deck - 6} 190 ${deck - 2}`;
    L.push(el('path', { d: cab, fill: 'none', 'stroke-width': W.fine }));
    let hang = '';
    for (let xx = 4; xx < tx - tw / 2; xx += 5) { const tt = (xx + 10) / (tx - tw / 2 + 12); const y = (1 - tt) * (1 - tt) * (deck - 12) + 2 * (1 - tt) * tt * (deck - 20) + tt * tt * (ttop + 6); hang += `M${r1(xx)} ${r1(y)}L${r1(xx)} ${deck}`; }
    for (let xx = tx + tw / 2 + 3; xx < 186; xx += 5) { const tt = (xx - (tx + tw / 2 - 2)) / (190 - (tx + tw / 2 - 2)); const y = (1 - tt) * (1 - tt) * (ttop + 6) + 2 * (1 - tt) * tt * (deck - 6) + tt * tt * (deck - 2); hang += `M${r1(xx)} ${r1(y)}L${r1(xx)} ${deck}`; }
    L.push(el('path', { d: hang, fill: 'none', 'stroke-width': W.hair, opacity: 0.8 }));
    // diagonal stays
    let stays = '';
    for (let i = 1; i <= 5; i++) { stays += `M${tx - tw / 2 + 2} ${ttop + 10}L${tx - tw / 2 - i * 9} ${deck}M${tx + tw / 2 - 2} ${ttop + 10}L${tx + tw / 2 + i * 9} ${deck}`; }
    L.push(el('path', { d: stays, fill: 'none', 'stroke-width': W.hair }));
    // tower with gothic arches
    const tower = `M${tx - tw / 2} ${deck + 14}L${tx - tw / 2} ${ttop}L${tx + tw / 2} ${ttop}L${tx + tw / 2} ${deck + 14}Z`;
    L.push(el('path', { d: tower, fill: paper, 'stroke-width': W.line }));
    const arch = (ax) => `M${ax - 4} ${deck}L${ax - 4} ${ttop + 30}Q${ax - 4} ${ttop + 18} ${ax} ${ttop + 14}Q${ax + 4} ${ttop + 18} ${ax + 4} ${ttop + 30}L${ax + 4} ${deck}`;
    L.push(el('path', { d: arch(tx - 6) + arch(tx + 6), fill: '#fbf1dd', 'stroke-width': W.fine }));
    L.push(el('path', { d: `M${tx - tw / 2 - 2} ${ttop}L${tx + tw / 2 + 2} ${ttop}M${tx - tw / 2} ${ttop + 6}L${tx + tw / 2} ${ttop + 6}`, fill: 'none', 'stroke-width': W.fine }));
    // deck
    L.push(el('path', { d: `M0 ${deck}L200 ${deck}M0 ${deck + 4}L200 ${deck + 4}`, fill: 'none', 'stroke-width': W.fine }));
  }

  L.push(el('path', { d: `M130 ${BASE}L400 ${BASE}`, fill: 'none', 'stroke-width': W.fine }));
  L.push(water(a, 10, 360, 218, 6, 5.5));

  // Rooting spray, mirrored toward the corner
  L.push(spray(a, 376, 242, -1, 'lotus'));

  a.add(g(a, L.join('')));
  return a;
}

for (const [name, fn] of [['florals', () => florals('left')], ['florals-right', () => florals('right')], ['yosemite', yosemite], ['new-york', newYork]]) {
  writeFileSync(`${OUT}/${name}.svg`, fn().toString());
}
console.log('wrote', OUT);
