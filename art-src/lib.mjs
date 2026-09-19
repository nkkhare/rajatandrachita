// Tiny geometry + SVG helpers for hand-authored "gold foil" line art.
// All shapes are emitted in absolute coordinates (no transforms), so a single
// userSpaceOnUse gold gradient reads as one continuous foil sheen.

export const r1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};
export const deg = (d) => (d * Math.PI) / 180;

let seed = 11;
export const reseed = (s) => { seed = s; };
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const jit = (a) => (rnd() * 2 - 1) * a;

// Affine: translate (x,y), rotate a (degrees), uniform scale s, optional mirror.
export const T = (x = 0, y = 0, a = 0, s = 1, flip = 1) => {
  const c = Math.cos(deg(a)), n = Math.sin(deg(a));
  const f = (px, py) => {
    px *= flip;
    return [x + s * (px * c - py * n), y + s * (px * n + py * c)];
  };
  f.s = s; f.x = x; f.y = y; f.a = a; f.flip = flip;
  return f;
};

// Build a path string from segments of local points: ['M',[x,y]], ['C',[..],[..],[..]], ['Q',..], ['L',..], ['Z']
export const d = (t, segs) => segs.map(([cmd, ...pts]) => cmd + pts.map(([x, y]) => {
  const [X, Y] = t(x, y);
  return `${r1(X)} ${r1(Y)}`;
}).join(' ')).join('');

export const el = (tag, attrs, inner) => {
  const a = Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`).join(' ');
  return inner === undefined ? `<${tag} ${a}/>` : `<${tag} ${a}>${inner}</${tag}>`;
};

export class Art {
  constructor(w, h, title) {
    this.w = w; this.h = h; this.title = title;
    this.defs = []; this.body = []; this.n = 0;
  }
  id(p = 'g') { return `${p}${this.n++}`; }
  add(...s) { this.body.push(...s.flat(Infinity)); return this; }
  grad(x1, y1, x2, y2, stops) {
    const id = this.id('lg');
    this.defs.push(el('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2) },
      stops.map(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op })).join('')));
    return `url(#${id})`;
  }
  clip(pathD) {
    const id = this.id('cp');
    this.defs.push(el('clipPath', { id }, el('path', { d: pathD })));
    return `url(#${id})`;
  }
  toString() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}">`
      + `<title>${this.title}</title><defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>\n`;
  }
}
