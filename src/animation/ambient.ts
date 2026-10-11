// The living parts of the painting: flowing water, foliage swaying in the
// wind, and clouds drifting across the sky. One WebGL pass redraws the card
// each frame from the artwork and three precomputed maps:
//
//   sky     the sky inside the arch with the lettering, lotus dividers and arch
//           line painted out, so the whole sky can drift as one body
//   fg      those painted-out elements as a layer, redrawn exactly on top
//   masks   R water, G foliage (stronger further from where it grows),
//           B the moving sky (fading out above the skyline)
//
// Water ripples in a seamless 10 s loop of irregular travelling ripples, and
// its existing golden reflections shimmer as independent horizontal streaks.
// Foliage samples it through a wind field: a slow branch sway plus faster flutter that varies across the card, so each
// blossom and leaf moves on its own. The sky drifts as a whole beneath the
// lettering. Everything else is drawn untouched.
import skyUrl from '../assets/ambient/sky.webp';
import fgUrl from '../assets/ambient/fg.webp';
import masksUrl from '../assets/ambient/masks.webp';

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
uniform sampler2D uArt, uSky, uFg, uMasks;
uniform float uTime, uRamp;
varying vec2 vUv;
const vec2 SIZE = vec2(1024.0, 1536.0);

// smooth value noise, so motion is organic and never one repeating sine
// (inputs wrapped to a small range so it stays precise on mobile GPUs)
float hash(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y) * 2.0 - 1.0;
}

void main() {
  vec2 px = vUv * SIZE;
  vec4 m = texture2D(uMasks, vUv);
  float t = uTime;

  // Water: a seamless 10 s loop. Every motion runs at a whole number of
  // cycles per loop (1, 2, 3, 4 or 6), so the last frame flows into the
  // first. Thin horizontal ripples travel mostly left to right, with one
  // layer going the other way. A fixed noise pattern bends each into
  // irregular, broken shapes, and a slow regional envelope lets ripples
  // build up and flatten. Finer and tighter near the bridge, wider in front.
  const float TAU = 6.2831853;
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
  float wa = uRamp * m.r * mix(0.6, 1.0, depth) * env;
  vec2 water = wa * vec2(
    9.0 * (0.42 * sin(r1) + 0.24 * sin(r2) + 0.14 * sin(r3) + 0.20 * sin(r4)),
    2.6 * (0.5 * sin(r2 + 1.3) + 0.5 * sin(r3 + 0.6)));
  // light and shade on the ripple slopes, so the bands read as travelling
  float slope = 0.5 * cos(r1) + 0.3 * cos(r4) + 0.2 * cos(r3);

  // Foliage: whole sprays sway together like branches in a breeze. The weight
  // is smoothed over the region (so outlines move with their flowers), grows
  // toward the tips, and the wind is a slow wave across the card, so the left
  // and right corners swing out of step. Only a whisper of flutter.
  float wg = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    wg += texture2D(uMasks, vUv + vec2(float(i), float(j)) * 22.0 / SIZE).g;
  }
  wg /= 9.0;
  // The gold arch stays perfectly still: no pixel near it moves, so it can
  // never be pulled along (the sway reaches ~14 px, the guard 18 px).
  float arch = texture2D(uFg, vUv).a;
  for (int k = 0; k < 8; k++) {
    float ang = float(k) * 0.7854;
    vec2 dir = vec2(cos(ang), sin(ang)) / SIZE;
    arch = max(arch, texture2D(uFg, vUv + dir * 9.0).a);
    arch = max(arch, 0.85 * texture2D(uFg, vUv + dir * 18.0).a);
  }
  wg *= 1.0 - smoothstep(0.15, 0.6, arch);
  // anchored at the card's edge, where the plants grow from (and nothing is
  // ever sampled from outside the painting)
  wg *= smoothstep(0.0, 26.0, px.x) * smoothstep(0.0, 26.0, SIZE.x - px.x) * smoothstep(0.0, 26.0, px.y) * smoothstep(0.0, 26.0, SIZE.y - px.y);
  float gust = 0.75 + 0.25 * sin(t * 0.17 + 1.1);
  float phase = px.x * 0.004 + px.y * 0.0018;
  float sway = 0.75 * sin(t * 0.9 + phase) + 0.25 * sin(t * 0.53 + phase * 1.7 + 2.0);
  float flutter = 0.08 * sin(t * 2.1 + px.x * 0.035 + px.y * 0.028);
  vec2 foliage = 15.84 * uRamp * wg * gust * vec2(sway + flutter, 0.18 * sway * sway - 0.06);

  vec2 uv = vUv - (water + foliage) / SIZE;
  vec3 base = texture2D(uArt, uv).rgb;

  // Golden reflections: the painting's own bright streaks shimmer. Their
  // brightness follows the same ripples, so streaks widen, narrow, part and
  // rejoin as the water moves; the brightest flicks appear briefly where two
  // ripples crest together. Only the existing colours get lighter or darker.
  if (m.r > 0.0) {
    float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float glow = smoothstep(0.5, 0.82, lum) * m.r * uRamp;
    float shimmer = 0.5 * sin(r1 + 0.8) + 0.3 * sin(r3 + 2.1) + 0.2 * sin(r2 + 0.4);
    float crest = pow(max(0.0, sin(r1) * sin(r4)), 3.0);
    base *= 1.0 + glow * (0.26 * shimmer * env + 0.22 * crest + 0.04);
    // the darker water between reflections breathes very slightly
    base *= 1.0 - (1.0 - smoothstep(0.35, 0.6, lum)) * m.r * uRamp * 0.05 * sin(r2 + 2.5);
    // light and shade on each ripple's slope
    base *= 1.0 + m.r * uRamp * 0.09 * slope * env;
  }

  // Sky: drifts slowly as one body, with a faint rise and fall.
  float band = px.y * 0.004;
  vec2 drift = vec2(16.0 * sin(t * 0.157 + band) + 5.0 * sin(t * 0.091 - band * 1.7),
                    2.5 * sin(t * 0.11 + band * 2.0));
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
export const ambientMaps = () => Promise.all([loadImage(skyUrl), loadImage(fgUrl), loadImage(masksUrl)]);

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
    ['uArt', 'uSky', 'uFg', 'uMasks'].forEach((name, unit) => {
      const texture = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
