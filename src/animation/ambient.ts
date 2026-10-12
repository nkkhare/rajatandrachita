// The living parts of the painting: flowing water, foliage swaying in the
// wind, and clouds drifting across the sky. One WebGL pass redraws the card
// each frame from the artwork and precomputed maps:
//
//   sky     the sky inside the arch with the lettering, lotus dividers and arch
//           line painted out, so the whole sky can drift as one body
//   fg      those painted-out elements as a layer, redrawn exactly on top
//   masks   R water, G foliage (stronger further from where it grows),
//           B the moving sky (fading out above the skyline)
//   arch    R the gold frame line, G scenery still-weight, B px to the frame
//   pieces  each flower head, leaf and bud cut out as a rigid piece: the
//           offset to its centre (R, G) and, for flower heads, the radius (B)
//   sway    R where the plants may move, G/B px to the scenery/frame
//
// Water ripples in a seamless 10 s loop of irregular travelling ripples, and
// its existing golden reflections shimmer as independent horizontal streaks.
// Foliage moves only by tiny rigid rotations: thin stems lean about their
// roots and flower heads nod about their stems, so nothing changes shape. The sky drifts as a whole beneath the
// lettering. Everything else is drawn untouched.
import skyUrl from '../assets/ambient/sky.webp';
import fgUrl from '../assets/ambient/fg.webp';
import masksUrl from '../assets/ambient/masks.webp';
import archUrl from '../assets/ambient/arch.webp';
import piecesUrl from '../assets/ambient/pieces.webp';
import swayUrl from '../assets/ambient/sway.webp';

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uArt, uSky, uFg, uMasks, uArch, uPieces, uSway;
uniform float uTime, uRamp;
varying vec2 vUv;
const vec2 SIZE = vec2(1024.0, 1536.0);
const float TAU = 6.2831853;
// largest rotations, in degrees
const float STEM_DEG = 18.7;         // thin outer stems, about their roots
const float HEAD_DEG_SMALL = 4.95;   // small flower heads, about their stems
const float HEAD_DEG_LARGE = 2.97;   // the large peonies

// smooth value noise, so motion is organic and never one repeating sine
// (inputs wrapped to a small range so it stays precise on mobile GPUs)
float hash(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y) * 2.0 - 1.0;
}

// One breeze moves every flower. It always blows the same way across the
// whole card at any moment, on one slow, continuous 24 s swing (its strength
// drifts only gently, between 80% and 100%, so it never falls calm), and it
// reaches the right side ~3 s after the left and the bottom ~2 s after the top
// as it passes through.
// the same breeze a quarter-cycle on: as a stem sways sideways it also dips
// and lifts slightly, so it traces a soft loop and never stops dead
float windQ(vec2 x, float delay) {
  float tt = uTime - delay - x.x * 0.003 - x.y * 0.0012;
  return (0.74 * cos(TAU / 24.0 * tt) + 0.26 * cos(TAU / 37.0 * tt + 1.3))
       * (0.88 + 0.12 * sin(TAU / 61.0 * tt + 0.4));
}
float wind(vec2 x, float delay) {
  float tt = uTime - delay - x.x * 0.003 - x.y * 0.0012;
  // a main 24 s sway, a softer 37 s swing and a slow 61 s gust that never line
  // up, so the breeze never settles into one repeating pendulum
  return (0.74 * sin(TAU / 24.0 * tt) + 0.26 * sin(TAU / 37.0 * tt + 1.3))
       * (0.88 + 0.12 * sin(TAU / 61.0 * tt + 0.4));
}

// How much the breeze turns a garland at x, and which way: each garland pivots
// about the corner it grows from (top ones hang, bottom ones grow up), turned
// by the part of the wind that pushes across it. So hanging vines swing and
// upright sprays lean downwind, while sprays lying along the wind hardly move.
float stemLean(vec2 x, out vec2 q) {
  vec2 root = vec2(x.x < SIZE.x * 0.5 ? 0.0 : SIZE.x, x.y < 740.0 ? 0.0 : SIZE.y);
  float fromTop = 1.0 - smoothstep(620.0, 860.0, x.y);
  vec2 qT = x - vec2(root.x, 0.0), qB = x - vec2(root.x, SIZE.y);
  q = fromTop > 0.5 ? qT : qB;
  // the low sprays along the bottom lie almost flat; they still catch a fair
  // share of the breeze (at least 45%), so they sway too
  return mix(0.45 + 0.55 * (-qB.y / max(length(qB), 1.0)), -qT.y / max(length(qT), 1.0), fromTop);
}

// The thin stems at x: each garland turns as one connected structure, by a
// small angle about the corner it grows from, so every part moves in step
// with its neighbours (nothing slides against anything) and the tips, furthest
// from the root, swing most. Parts near the gold frame, the scenery or the
// card's edge simply swing less (their reach is set by the room they have), so
// nothing is ever carried across them, nothing is drawn in from beyond the
// card, and every part keeps moving smoothly without ever holding still.
vec2 stemField(vec2 x) {
  float fromTop = 1.0 - smoothstep(620.0, 860.0, x.y);
  vec2 rootX = vec2(x.x < SIZE.x * 0.5 ? 0.0 : SIZE.x, 0.0);
  vec2 qT = x - rootX, qB = x - rootX - vec2(0.0, SIZE.y);
  // the vine bends rather than turning stiffly: near the root it barely moves,
  // and the turn builds up toward the tips (curvature grows with length)
  float rT = length(qT), rB = length(qB);
  vec2 turnT = (-qT.y / max(rT, 1.0)) * min(rT / 175.0, 2.5) * vec2(-qT.y, qT.x);
  vec2 turnB = (0.45 + 0.55 * (-qB.y / max(rB, 1.0))) * min(rB / 175.0, 2.5) * vec2(-qB.y, qB.x);
  vec3 sm = texture2D(uSway, x / SIZE).rgb;                    // r: foliage, g/b: px to scenery/frame
  vec2 reach = sm.r * radians(STEM_DEG) * mix(turnB, turnT, fromTop);   // the full swing here
  vec2 room = 3.0 + 0.2 * vec2(min(x.x, SIZE.x - x.x), min(x.y, SIZE.y - x.y));
  reach *= room / sqrt(room * room + reach * reach + 1e-4);
  float lim = 0.25 * max(min(sm.g, sm.b) * 255.0 - 6.0, 0.0);
  reach *= lim / sqrt(lim * lim + dot(reach, reach) + 1e-4);
  // the bend travels out along the vine: the tips answer ~3 s after the root,
  // so when the base reverses the outer vine is still moving
  float lag = mix(rB, rT, fromTop) / 230.0;
  return reach * wind(x, lag) + vec2(0.0, 0.35 * length(reach)) * windQ(x, lag);
}

void main() {
  vec2 px = vUv * SIZE;
  vec4 m = texture2D(uMasks, vUv);
  float t = uTime;

  // Flowers, smoothed over ~22 px: drives the sway, and keeps the water off
  // the petals so the corner flowers stay crisp where they meet the river.
  float wg = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    wg += texture2D(uMasks, vUv + vec2(float(i), float(j)) * 22.0 / SIZE).g;
  }
  wg /= 9.0;
  float onFlowers = smoothstep(0.02, 0.12, wg);
  // For the sway, each flower and a margin around it move as one solid piece:
  // the weight is a dilation that falls off gently 15-60 px out, so leaf tips
  // never stretch or smear; only plain surroundings bend.
  float sw = texture2D(uMasks, vUv).g;
  for (int k = 0; k < 8; k++) {
    float ang = float(k) * 0.7854;
    vec2 dir = vec2(cos(ang), sin(ang)) / SIZE;
    sw = max(sw, 0.97 * texture2D(uMasks, vUv + dir * 15.0).g);
    sw = max(sw, 0.78 * texture2D(uMasks, vUv + dir * 30.0).g);
    sw = max(sw, 0.48 * texture2D(uMasks, vUv + dir * 45.0).g);
    sw = max(sw, 0.20 * texture2D(uMasks, vUv + dir * 60.0).g);
  }

  // Water: a seamless 10 s loop. Every motion runs at a whole number of
  // cycles per loop (1, 2, 3, 4 or 6), so the last frame flows into the
  // first. Thin horizontal ripples travel mostly left to right, with one
  // layer going the other way. A fixed noise pattern bends each into
  // irregular, broken shapes, and a slow regional envelope lets ripples
  // build up and flatten. Finer and tighter near the bridge, wider in front.
  float w = TAU / 10.0;                                       // one loop per 10 s
  float depth = clamp((px.y - 1404.0) / 132.0, 0.0, 1.0);
  float ripple = mix(1.6, 1.0, depth);                        // finer far away
  vec2 rp = px * ripple;
  float p1 = 5.0 * noise(vec2(px.x * 0.006, px.y * 0.040));   // static phase fields
  float p2 = 4.0 * noise(vec2(px.x * 0.009, px.y * 0.055) + 11.0);
  float p3 = 3.0 * noise(vec2(px.x * 0.014, px.y * 0.080) + 23.0);
  float r1 = 0.035 * rp.x + 0.30 * rp.y + p1 - 2.0 * w * t;   // broad, drifts right (5 s)
  float r2 = -0.050 * rp.x + 0.42 * rp.y + p2 - 3.0 * w * t;  // drifts left (3.3 s)
  float r3 = 0.090 * rp.x + 0.70 * rp.y + p3 - 6.0 * w * t;   // fine, right (1.7 s)
  float r4 = 0.060 * rp.x + 0.55 * rp.y - p1 - 4.0 * w * t;   // medium, right (2.5 s)
  float env = 0.65 + 0.35 * sin(w * t + p2 * 1.3);            // ripples grow and fade (10 s)
  // open water only: not on the flowers, nor where the sway carries a leaf
  // tip out over the river (so the tips are never rippled into a blur)
  float wet = m.r * (1.0 - max(onFlowers, smoothstep(0.15, 0.45, sw)));
  float wa = uRamp * wet * mix(0.6, 1.0, depth) * env;
  vec2 water = wa * vec2(
    9.0 * (0.42 * sin(r1) + 0.24 * sin(r2) + 0.14 * sin(r3) + 0.20 * sin(r4)),
    2.6 * (0.5 * sin(r2 + 1.3) + 0.5 * sin(r3 + 0.6)));
  // light and shade on the ripple slopes, so the bands read as travelling
  float slope = 0.5 * cos(r1) + 0.3 * cos(r4) + 0.2 * cos(r3);

  // Foliage: flowers on a nearly windless spring morning. The garlands are
  // cut into pieces (each flower head, leaf and bud, from the pieces map), and
  // every piece moves rigidly, so nothing ever stretches or changes shape:
  //   main branches  still (near where each garland grows from)
  //   thin stems     the outer sprays and vines turn up to ~18.7 deg about the
  //                  garland's root corner; each piece takes the local motion
  //                  as a rigid shift and turn, so only the thin stems and the
  //                  sky between pieces flex
  //   flower heads   each also nods ~3-5 deg about its own stem, following
  //                  its stem's lean a moment later
  // Petals and leaves keep their painted shapes and ride with their piece.
  // All of it is driven by one shared breeze (wind(): a 24 s sway, a 37 s
  // swing and a 61 s gust that never line up). Vines bend more toward their
  // tips, the bend travels out from the root (~3 s), and each part traces a
  // soft loop (windQ) rather than a straight back-and-forth, so nothing stops
  // dead. Outer petals tilt and lift slightly on their own, inside each flower.
  // Which piece is here is looked up where the content comes from (not where
  // it was), so every piece carries its own outline along as it moves and is
  // never clipped. A piece moves rigidly: the local stem motion at its centre,
  // taken as a shift and a turn, then (for a flower head) its nod.
  vec2 s0 = px - uRamp * stemField(px);                         // roughly where this pixel's content was
  vec2 src = s0;
  for (int pass = 0; pass < 2; pass++) {
    vec3 pc = texture2D(uPieces, s0 / SIZE).rgb;
    vec2 c = floor(s0) + (floor(pc.rg * 255.0 + 0.5) - 128.0) + 0.5;   // that piece's centre (exact)
    vec2 D0 = uRamp * stemField(c), Dx = uRamp * stemField(c + vec2(4.0, 0.0)), Dy = uRamp * stemField(c + vec2(0.0, 4.0));
    float turn = 0.5 * ((Dx.y - D0.y) - (Dy.x - D0.x)) / 4.0;   // the local rotation, without any stretch
    vec2 rel = px - D0 - c;
    vec2 s1 = px - D0 - turn * vec2(-rel.y, rel.x);             // undo the piece's shift and turn

    // Flower heads nod as one piece about their stem (which runs toward the
    // edge the plant grows from), following their stem's lean a moment later,
    // larger flowers a little later still. 85% is that shared motion; 15% is
    // the same breeze reaching this flower slightly early or late, so
    // neighbours move together without moving identically.
    float R = pc.b * 255.0;
    if (R > 0.5) {
      float big = smoothstep(12.0, 60.0, R);                    // larger flowers: a little later, smaller
      float id = hash(floor(c));
      vec2 rq;
      float lean = stemLean(c, rq);
      float follow = mix(0.6, 1.2, big);                        // s behind the stem
      // mostly its vine's motion a moment later, plus a gentle nod of its own
      // on cycles that differ from flower to flower
      float own = 0.6 * sin(TAU / 29.0 * t + id * TAU) + 0.4 * sin(TAU / 43.0 * t + id * 17.0);
      float nod = radians(mix(HEAD_DEG_SMALL, HEAD_DEG_LARGE, big)) * lean
                * (0.72 * wind(c, follow) + 0.28 * own);
      vec2 stem = c.y < min(c.x, SIZE.x - c.x) ? vec2(0.0, -1.0) : vec2(c.x < SIZE.x * 0.5 ? -1.0 : 1.0, 0.0);
      vec3 sm = texture2D(uSway, c / SIZE).rgb;
      nod *= uRamp * clamp((min(sm.g, sm.b) * 255.0 - 8.0) / 16.0, 0.0, 1.0);
      vec2 q = s1 - (c + stem * R * 0.9);
      s1 -= nod * vec2(-q.y, q.x);                              // undo the nod
      // petals: the centre stays put; outer petals tilt, lift and settle a
      // little, each part of the flower at its own moment. Small and smooth, so
      // shapes are kept; fades out at the flower's edge so nothing tears.
      vec2 rel = s1 - c;
      float pr = length(rel);
      float outer = smoothstep(0.35 * R, R, pr) * (1.0 - smoothstep(1.0 * R, 1.2 * R, pr));
      if (outer > 0.0) {
        float pa = atan(rel.y, rel.x), sz = clamp(R / 40.0, 0.6, 1.4);
        float breeze = 0.6 + 0.4 * wind(c, follow + 1.0);
        float twist = radians(1.2) * outer * breeze * (0.65 * sin(TAU / 17.0 * t + 3.0 * pa + id * TAU) + 0.35 * sin(TAU / 23.0 * t + 2.0 * pa + id * 9.0));
        float lift = 0.7 * sz * outer * outer * breeze * sin(TAU / 19.0 * t + 3.0 * pa + id * 4.0);
        s1 -= uRamp * (twist * vec2(-rel.y, rel.x) + lift * rel / max(pr, 0.5));
      }
    }
    // keep it only if the piece really does cover this pixel once moved;
    // otherwise look again from there (and in the end let the stems flex)
    vec3 back = texture2D(uPieces, s1 / SIZE).rgb;
    vec2 c1 = floor(s1) + (floor(back.rg * 255.0 + 0.5) - 128.0) + 0.5;
    if (length(c1 - c) < 0.5) { src = s1; break; }
    s0 = s1;
  }
  vec2 foliage = px - src;
  // and, whatever a piece does, nothing comes within reach of the frame or scenery
  vec3 here = texture2D(uSway, vUv).rgb;
  float reachMax = 0.6 * max(min(here.g, here.b) * 255.0 - 4.0, 0.0);
  float fl = length(foliage);
  if (fl > reachMax) foliage *= reachMax / fl;
  // and nothing is ever drawn in from beyond the card's edge: motion that
  // would reach past an edge eases off close to it (whole stems and nodding
  // heads alike)
  vec2 lo = 0.25 * px + 0.5, hi = 0.25 * (SIZE - px) + 0.5;      // room toward each edge
  if (foliage.x > 0.0) foliage.x *= lo.x / sqrt(lo.x * lo.x + foliage.x * foliage.x);
  else foliage.x *= hi.x / sqrt(hi.x * hi.x + foliage.x * foliage.x);
  if (foliage.y > 0.0) foliage.y *= lo.y / sqrt(lo.y * lo.y + foliage.y * foliage.y);
  else foliage.y *= hi.y / sqrt(hi.y * hi.y + foliage.y * foliage.y);

  vec2 uv = vUv - (water + foliage) / SIZE;
  vec3 base = texture2D(uArt, uv).rgb;

  // Golden reflections: the painting's own bright streaks shimmer. Their
  // brightness follows the same ripples, so streaks widen, narrow, part and
  // rejoin as the water moves; the brightest flicks appear briefly where two
  // ripples crest together. Only the existing colours get lighter or darker.
  if (wet > 0.0) {
    float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float glow = smoothstep(0.5, 0.82, lum) * wet * uRamp;
    float shimmer = 0.5 * sin(r1 + 0.8) + 0.3 * sin(r3 + 2.1) + 0.2 * sin(r2 + 0.4);
    float crest = pow(max(0.0, sin(r1) * sin(r4)), 3.0);
    base *= 1.0 + glow * (0.26 * shimmer * env + 0.22 * crest + 0.04);
    // the darker water between reflections breathes very slightly
    base *= 1.0 - (1.0 - smoothstep(0.35, 0.6, lum)) * wet * uRamp * 0.05 * sin(r2 + 2.5);
    // light and shade on each ripple's slope
    base *= 1.0 + wet * uRamp * 0.09 * slope * env;
  }

  // Sky: drifts slowly as one body, with a faint rise and fall.
  float band = px.y * 0.004;
  vec2 drift = vec2(16.0 * sin(t * 0.157 + band) + 5.0 * sin(t * 0.091 - band * 1.7),
                    2.5 * sin(t * 0.11 + band * 2.0));
  // The clouds come to rest as they reach the gold frame (its distance in px
  // is stored in the frame map), so the trim keeps a clean edge and nothing
  // from beyond the frame is ever pulled into the sky.
  drift *= smoothstep(6.0, 110.0, texture2D(uArch, vUv).b * 255.0);
  vec3 sky = texture2D(uSky, vUv - drift / SIZE).rgb;
  vec4 fg = texture2D(uFg, vUv);
  vec3 skyWithLettering = mix(sky, fg.rgb, fg.a);

  gl_FragColor = vec4(mix(base, skyWithLettering, m.b), 1.0);
}`;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

/** Starts fetching the maps early so the renderer is ready when needed. */
export const ambientMaps = () => Promise.all([loadImage(skyUrl), loadImage(fgUrl), loadImage(masksUrl), loadImage(archUrl), loadImage(piecesUrl), loadImage(swayUrl)]);

export class AmbientRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private uTime: WebGLUniformLocation | null;
  private uRamp: WebGLUniformLocation | null;
  private resizeObserver: ResizeObserver;
  private started = -1;
  private lastRender = -Infinity;
  private textures: WebGLTexture[] = [];

  /** Why the last create() returned null, for the ?debug=1 status line. */
  static lastError = '';

  static create(art: HTMLImageElement, maps: HTMLImageElement[], canvas: HTMLCanvasElement) {
    const gl = (canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false })
      ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) { AmbientRenderer.lastError = 'WebGL unavailable'; return null; }
    try { return new AmbientRenderer(gl, art, maps, canvas); } catch (error) {
      AmbientRenderer.lastError = String(error instanceof Error ? error.message : error).slice(0, 300);
      return null;
    }
  }

  private constructor(gl: WebGLRenderingContext, art: HTMLImageElement, maps: HTMLImageElement[], private canvas: HTMLCanvasElement) {
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
    gl.useProgram(program);
    this.program = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    ['uArt', 'uSky', 'uFg', 'uMasks', 'uArch', 'uPieces', 'uSway'].forEach((name, unit) => {
      const texture = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // the pieces map holds exact per-piece values, so it is never blended
      const filter = name === 'uPieces' ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, unit === 0 ? art : maps[unit - 1]);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
      this.textures.push(texture);
    });
    this.uTime = gl.getUniformLocation(program, 'uTime');
    this.uRamp = gl.getUniformLocation(program, 'uRamp');

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
      this.lastRender = -Infinity;
    }
  }

  /** Draws the card at `seconds` (any clock); motion eases in over the first 1.5 s. */
  render(seconds: number) {
    if (this.started < 0) this.started = seconds;
    // render every frame (up to 60 fps) so the water's shimmer stays fluid
    if (seconds - this.lastRender < 1 / 65) return;
    this.lastRender = seconds;
    const t = seconds - this.started, gl = this.gl;
    const ramp = Math.min(1, t / 1.5);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.uniform1f(this.uTime, t);
    gl.uniform1f(this.uRamp, ramp * ramp * (3 - 2 * ramp));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.canvas.dataset.live = 'true';
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.textures.forEach((texture) => this.gl.deleteTexture(texture));
    this.gl.deleteProgram(this.program);
    delete this.canvas.dataset.live;
  }
}
