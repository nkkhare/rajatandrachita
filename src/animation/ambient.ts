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
const float STEM_DEG = 6.0;         // thin outer stems, about their roots
const float HEAD_DEG_SMALL = 1.5;   // small flower heads, about their stems
const float HEAD_DEG_LARGE = 0.9;   // the large peonies

// smooth value noise, so motion is organic and never one repeating sine
// (inputs wrapped to a small range so it stays precise on mobile GPUs)
float hash(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y) * 2.0 - 1.0;
}

// a breeze that strengthens and fades: from near-calm (0.1) to gentle (1.0),
// over irregular ~30-50 s spells
float breeze(float t, float p) {
  float b = 0.5 + 0.3 * sin(TAU * t / 47.0 + p) + 0.2 * sin(TAU * t / 31.0 + 1.7 * p + 0.6);
  return 0.1 + 0.9 * smoothstep(0.1, 0.95, b);
}

// The breeze on the thin stems at x: each garland turns a fraction of a degree
// about the corner it grows from, building up gradually away from the root.
// The motion toward the gold frame, the scenery or the card's edge is limited
// to a quarter of the distance to it, so nothing is ever carried across them and
// the motion eases off without stretching anything.
vec2 stemField(vec2 x) {
  float t = uTime;
  float side = x.x < SIZE.x * 0.5 ? 1.0 : -1.0;               // +1 leans right (inward) on the left
  float lag = (side > 0.0 ? 0.0 : 1.9) + x.y * 0.00082;        // the sides out of step, ~4 s down a side
  float gust = breeze(t - lag * 3.2, side > 0.0 ? 0.0 : 2.3);
  float period = side > 0.0 ? 22.0 : 26.0;
  float sway = (0.8 * sin(TAU / period * t - lag) + 0.2 * sin(TAU / 29.0 * t - lag * 1.3 - 1.7 + x.x * 0.002)) * gust;
  float fromTop = 1.0 - smoothstep(620.0, 860.0, x.y);         // top garlands hang, bottom ones grow up
  vec2 qT = x - vec2(side > 0.0 ? 0.0 : SIZE.x, 0.0);
  vec2 qB = x - vec2(side > 0.0 ? 0.0 : SIZE.x, SIZE.y);
  vec2 turn = mix(smoothstep(120.0, 420.0, length(qB)) * vec2(-qB.y, qB.x),
                  smoothstep(120.0, 420.0, length(qT)) * vec2(-qT.y, qT.x), fromTop);
  vec3 sm = texture2D(uSway, x / SIZE).rgb;                    // r: foliage, g/b: px to scenery/frame
  vec2 d = sm.r * radians(STEM_DEG) * side * sway * turn;
  vec2 e = vec2(max(min(x.x, SIZE.x - x.x) - 2.0, 0.0), max(min(x.y, SIZE.y - x.y) - 2.0, 0.0)) * 0.25;
  d = clamp(d, -e, e);
  float lim = 0.25 * max(min(sm.g, sm.b) * 255.0 - 6.0, 0.0);
  float len = length(d);
  return len > lim ? d * (lim / len) : d;
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
  //   thin stems     the outer sprays and vines turn up to ~6 deg about the
  //                  garland's root corner; each piece takes the local motion
  //                  as a rigid shift and turn, so only the thin stems and the
  //                  sky between pieces flex
  //   flower heads   each also nods ~1-1.5 deg about its own stem, mostly
  //                  following its stem, a little out of step with neighbours
  // Petals and leaves keep their painted shapes and ride with their piece.
  // Cycles: stems 22 s (left) / 26 s (right), heads 14-22 s.
  vec3 pc = texture2D(uPieces, vUv).rgb;
  vec2 c = floor(px) + (floor(pc.rg * 255.0 + 0.5) - 128.0) + 0.5;   // this piece's centre (exact)
  vec2 D0 = stemField(c), Dx = stemField(c + vec2(4.0, 0.0)), Dy = stemField(c + vec2(0.0, 4.0));
  float turn = 0.5 * ((Dx.y - D0.y) - (Dy.x - D0.x)) / 4.0;     // the local rotation, without any stretch
  vec2 rel = px - c;
  vec2 stems = D0 + turn * vec2(-rel.y, rel.x);

  // Flower heads nod as one piece about their stem, which runs toward the edge
  // the plant grows from.
  float R = pc.b * 255.0;
  vec2 head = vec2(0.0);
  if (R > 0.5) {
    float side = c.x < SIZE.x * 0.5 ? 1.0 : -1.0;
    float lag = (side > 0.0 ? 0.0 : 1.9) + c.y * 0.00082;
    float gust = breeze(t - lag * 3.2, side > 0.0 ? 0.0 : 2.3);
    float id = hash(floor(c));
    float big = smoothstep(12.0, 60.0, R);                      // larger flowers: slower, smaller
    vec2 stem = c.y < min(c.x, SIZE.x - c.x) ? vec2(0.0, -1.0) : vec2(side > 0.0 ? -1.0 : 1.0, 0.0);
    vec2 q = px - (c + stem * R * 0.9);
    float follow = side * 0.8 * sin(TAU / (side > 0.0 ? 22.0 : 26.0) * (t - 1.5) - lag) * gust;
    float own = sin(TAU / mix(14.0, 22.0, big) * t + id * TAU) * breeze(t - 1.5 - id * 6.0, id * 4.0);
    float nod = radians(mix(HEAD_DEG_SMALL, HEAD_DEG_LARGE, big)) * (0.7 * follow + 0.3 * own);
    vec3 sm = texture2D(uSway, c / SIZE).rgb;
    head = nod * vec2(-q.y, q.x) * clamp((min(sm.g, sm.b) * 255.0 - 8.0) / 16.0, 0.0, 1.0);
  }
  vec2 foliage = uRamp * (stems + head);
  // and, whatever a piece does, nothing comes within reach of the frame or scenery
  vec3 here = texture2D(uSway, vUv).rgb;
  float reachMax = 0.6 * max(min(here.g, here.b) * 255.0 - 4.0, 0.0);
  float fl = length(foliage);
  if (fl > reachMax) foliage *= reachMax / fl;

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
