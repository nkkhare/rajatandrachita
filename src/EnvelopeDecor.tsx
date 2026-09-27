// Decoration for the powder-blue envelope: a blind-embossed damask on every
// panel, and a dusty-blue lace trim with a satin ribbon along the lid's edges.
// Both are drawn as SVG and lit with lighting filters, so they read as paper
// relief and real threads rather than flat illustration. Everything here is
// static, rasterised once, and moved only with the lid.

const MOTIF_W = 240;
const MOTIF_H = 300;
const MOTIF_SCALE = 1.3;
const TILE_W = 390;
const TILE_H = 470;

// A teardrop leaf/petal pointing along +x, from (0,0) to (len,0).
function leaf(x: number, y: number, len: number, wid: number, angle: number) {
  const a = (angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const p = (u: number, v: number) => `${(x + u * c - v * s).toFixed(1)} ${(y + u * s + v * c).toFixed(1)}`;
  return `M${p(0, 0)} C${p(len * 0.3, -wid)} ${p(len * 0.75, -wid * 0.8)} ${p(len, 0)} C${p(len * 0.75, wid * 0.8)} ${p(len * 0.3, wid)} ${p(0, 0)} Z`;
}

// Points and tangents along a cubic Bézier.
function along(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// A sweeping acanthus stem with leaves along it, ending in a curl.
function stem(p0: number[], p1: number[], p2: number[], p3: number[], leaves: number, size: number, curl: number) {
  const out: string[] = [];
  for (let i = 1; i <= leaves; i++) {
    const t = i / (leaves + 1), { x, y, angle } = along(p0, p1, p2, p3, t);
    const side = i % 2 ? 1 : -1, len = size * (1.1 - t * 0.5);
    out.push(leaf(x, y, len, len * 0.4, angle + side * 55));
  }
  const end = along(p0, p1, p2, p3, 1);
  const r = size * 0.35;
  out.push(`M${end.x.toFixed(1)} ${end.y.toFixed(1)} a${r} ${r} 0 1 ${curl} ${(r * 1.4).toFixed(1)} ${(r * 0.6).toFixed(1)}`);
  return { stemPath: `M${p0.join(' ')} C${p1.join(' ')} ${p2.join(' ')} ${p3.join(' ')}`, leaves: out };
}

function buildMotif() {
  const cx = MOTIF_W / 2, cy = 150;
  const fills: string[] = [];
  const lines: string[] = [];
  // central rosette
  for (let i = 0; i < 10; i++) fills.push(leaf(cx, cy, 30, 10, i * 36 + 18));
  for (let i = 0; i < 6; i++) fills.push(leaf(cx, cy, 15, 6, i * 60));
  // palmettes above and below
  for (const [baseY, dir] of [[cy - 40, -1], [cy + 40, 1]] as const) {
    for (let i = -3; i <= 3; i++) {
      const angle = dir * 90 + i * 20, len = 44 - Math.abs(i) * 6;
      fills.push(leaf(cx, baseY, len, len * 0.3, angle));
    }
    fills.push(leaf(cx, baseY + dir * 50, 26, 8, dir * 90));
  }
  // sweeping stems, mirrored left and right, up and down
  for (const side of [-1, 1]) {
    for (const up of [-1, 1]) {
      const X = (v: number) => cx + side * v, Y = (v: number) => cy + up * v;
      const { stemPath, leaves } = stem([X(16), Y(10)], [X(58), Y(8)], [X(82), Y(48)], [X(58), Y(88)], 5, 26, side * up > 0 ? 1 : 0);
      lines.push(stemPath);
      fills.push(...leaves);
      const small = stem([X(34), Y(24)], [X(52), Y(38)], [X(50), Y(54)], [X(38), Y(60)], 3, 14, side * up > 0 ? 0 : 1);
      lines.push(small.stemPath);
      fills.push(...small.leaves);
    }
  }
  return { fills: fills.join(' '), lines: lines.join(' ') };
}

const MOTIF = buildMotif();

function Motif({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${MOTIF_SCALE})`}>
      <path d={MOTIF.fills} fill="#fff" />
      <path d={MOTIF.lines} fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
    </g>
  );
}

export function DamaskDefs({ width, height }: { width: number; height: number }) {
  return (
    <>
      <pattern id="damask" patternUnits="userSpaceOnUse" width={TILE_W} height={TILE_H} x="-30" y="-70">
        <Motif x={(TILE_W - MOTIF_W * MOTIF_SCALE) / 2} y={(TILE_H - MOTIF_H * MOTIF_SCALE) / 2} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => (
          <Motif key={`${dx}${dy}`} x={(TILE_W - MOTIF_W * MOTIF_SCALE) / 2 + (dx * TILE_W) / 2} y={(TILE_H - MOTIF_H * MOTIF_SCALE) / 2 + (dy * TILE_H) / 2} />
        ))}
      </pattern>
      {/* Blind embossing: only the light and shadow of the relief, no ink. */}
      <filter id="emboss" filterUnits="userSpaceOnUse" x="-8" y="-8" width={width + 16} height={height + 16} colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="height" />
        <feDiffuseLighting in="height" surfaceScale="2.2" diffuseConstant="1" lightingColor="#fff" result="light">
          <feDistantLight azimuth="235" elevation="45" />
        </feDiffuseLighting>
        <feColorMatrix in="light" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.2 0 0 0 -1.556" result="highlight" />
        <feColorMatrix in="light" values="0 0 0 0 .55  0 0 0 0 .62  0 0 0 0 .72  -1.1 0 0 0 .778" result="shade" />
        <feMerge>
          <feMergeNode in="shade" />
          <feMergeNode in="highlight" />
        </feMerge>
      </filter>
    </>
  );
}


// ---- Lace trim --------------------------------------------------------------

const LACE_HALF = 47; // half the width of the trim, in envelope units
const SCALLOP = 22;
const DEPTH = 11; // how far each rounded scallop bulges past the lace body

export function LaceDefs() {
  return (
    <>
      <pattern id="lace-net" patternUnits="userSpaceOnUse" width="5" height="5">
        <path d="M0 2.5 L2.5 0 L5 2.5 L2.5 5 Z" fill="none" stroke="#cdd7e5" strokeWidth=".7" />
      </pattern>
      <linearGradient id="satin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7f8ea6" />
        <stop offset=".3" stopColor="#bcc8d9" />
        <stop offset=".5" stopColor="#eef3f9" />
        <stop offset=".75" stopColor="#b3c0d2" />
        <stop offset="1" stopColor="#7a89a1" />
      </linearGradient>
      <filter id="lace-shadow" x="-5%" y="-60%" width="110%" height="220%" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" />
        <feOffset dx="1.5" dy="3" result="drop" />
        <feFlood floodColor="#2f3f58" floodOpacity=".32" />
        <feComposite in2="drop" operator="in" result="shadow" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="soft" />
        <feSpecularLighting in="soft" surfaceScale="2.4" specularConstant=".55" specularExponent="18" lightingColor="#ffffff" result="spec">
          <feDistantLight azimuth="235" elevation="24" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="gloss" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="gloss" />
        </feMerge>
      </filter>
    </>
  );
}

function petal(r: number) {
  return `M${r * 0.1} 0 C${r * 0.3} ${-r * 0.62} ${r * 0.95} ${-r * 0.6} ${r} 0 C${r * 0.95} ${r * 0.6} ${r * 0.3} ${r * 0.62} ${r * 0.1} 0 Z`;
}

function Flower({ x, y, r, turn }: { x: number; y: number; r: number; turn: number }) {
  const petals = 7;
  const ring = Array.from({ length: petals }, (_, i) => (i / petals) * 360);
  const innerRing = ring.map((a) => a + 180 / petals);
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path d={leafShape(r)} fill="#9aabc3" transform={`rotate(-150) translate(${r * 0.7} 0)`} />
      <path d={leafShape(r)} fill="#9aabc3" transform={`rotate(30) translate(${r * 0.7} 0)`} />
      {ring.map((a) => <path key={`s${a}`} d={petal(r)} fill="#7f91ab" transform={`translate(0.9 1.4) rotate(${a})`} />)}
      {ring.map((a) => <path key={a} d={petal(r)} fill="#c7d2e2" stroke="#eef3fa" strokeWidth=".9" transform={`rotate(${a})`} />)}
      {ring.map((a) => <path key={`h${a}`} d={`M${r * 0.3} 0 L${r * 0.8} 0`} stroke="#f7f9fd" strokeWidth=".8" strokeLinecap="round" transform={`rotate(${a - 8})`} />)}
      {innerRing.map((a) => <path key={`i${a}`} d={petal(r * 0.62)} fill="#d6dfeb" stroke="#f4f7fb" strokeWidth=".7" transform={`rotate(${a})`} />)}
      <circle r={r * 0.24} fill="#a8b7cc" stroke="#f1f5fa" strokeWidth=".8" />
      <circle r={r * 0.1} cx={-r * 0.06} cy={-r * 0.06} fill="#eef3f9" />
    </g>
  );
}

function leafShape(r: number) {
  return `M0 0 C${r * 0.3} ${-r * 0.35} ${r * 0.8} ${-r * 0.3} ${r * 1.05} 0 C${r * 0.8} ${r * 0.3} ${r * 0.3} ${r * 0.35} 0 0 Z`;
}

/** A length of lace running along +x, centred on y=0. */
export function LaceTrim({ length }: { length: number }) {
  // Scalloped outline of the lace body, top and bottom.
  const inner = LACE_HALF - 10;
  let top = `M0 ${-inner}`;
  let bottom = `M0 ${inner}`;
  const picots: Array<[number, number]> = [];
  for (let x = 0; x < length; x += SCALLOP) {
    top += ` A${SCALLOP / 2} ${DEPTH} 0 0 1 ${x + SCALLOP} ${-inner}`;
    bottom += ` A${SCALLOP / 2} ${DEPTH} 0 0 0 ${x + SCALLOP} ${inner}`;
    for (const side of [-1, 1]) {
      picots.push([x + SCALLOP / 2, side * (inner + DEPTH + 2.5)], [x + SCALLOP * 0.15, side * (inner + DEPTH * 0.6)], [x + SCALLOP * 0.85, side * (inner + DEPTH * 0.6)]);
    }
  }
  const end = Math.ceil(length / SCALLOP) * SCALLOP;
  // Closed body: top edge left to right, down, bottom edge right to left.
  let back = '';
  for (let x = end; x > 0; x -= SCALLOP) back += ` A${SCALLOP / 2} ${DEPTH} 0 0 1 ${x - SCALLOP} ${inner}`;
  const outline = `${top} L${end} ${inner}${back} Z`;

  const flowers: Array<{ x: number; y: number; r: number; turn: number }> = [];
  for (let x = 26, i = 0; x < length; x += 50, i++) {
    flowers.push({ x, y: i % 2 ? 17 : -17, r: 17 + (i % 3) * 1.6, turn: (i * 41) % 360 });
  }
  const bars: number[] = [];
  for (let x = 2; x < length; x += 46) bars.push(x);

  return (
    <g filter="url(#lace-shadow)">
      <path d={outline} fill="#9cafc8" />
      <path d={outline} fill="url(#lace-net)" />
      <path d={top} fill="none" stroke="#d0dae8" strokeWidth="3" />
      <path d={bottom} fill="none" stroke="#d0dae8" strokeWidth="3" />
      <path d={`M0 ${-inner + 4} H${length} M0 ${inner - 4} H${length}`} stroke="#b9c6d8" strokeWidth="1.4" strokeDasharray="3 2" />
      <g fill="#e3eaf4">{picots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" />)}</g>
      <rect x="0" y="-6" width={length} height="12" fill="url(#satin)" />
      <g fill="#a9b8cd" stroke="#dfe7f1" strokeWidth=".7">
        {bars.map((x) => <rect key={x} x={x} y="-7.5" width="7" height="15" rx="3" />)}
      </g>
      {flowers.map((f, i) => <Flower key={i} {...f} />)}
    </g>
  );
}
