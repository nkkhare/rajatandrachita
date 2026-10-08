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
// Water samples the artwork through layered, drifting ripple noise, and its
// existing golden reflections shimmer as independent horizontal fragments.
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

  // Water: hundreds of small horizontal ripples. Three layers of noise,
  // stretched wide and thin, drift different ways at different speeds (about
  // 5 s, 2.5 s and 2 s), so each band of the river moves on its own. Ripples
  // are finer and calmer by the far bank, a little wider toward the viewer.
  float depth = clamp((px.y - 1404.0) / 132.0, 0.0, 1.0);
  float ripple = mix(1.9, 1.0, depth);                      // finer far away
  vec2 q = vec2(px.x * 0.022, px.y * 0.30) * ripple;
  float n1 = noise(q + vec2(t * 0.20, t * 0.05));                   // slow drift right
  float n2 = noise(q * vec2(1.9, 1.6) + vec2(-t * 0.42, 7.3));      // quicker drift left
  float n3 = noise(q * vec2(3.1, 2.4) + vec2(13.1, t * 0.5));       // fine, changing shape
  float wa = uRamp * m.r * mix(0.6, 1.0, depth);
  vec2 water = wa * vec2(
    13.5 * (0.55 * n1 + 0.30 * n2 + 0.15 * n3),
    3.9 * (0.6 * n2 + 0.4 * n3));
  // Foliage: a slow sway of whole sprays, with gusts, plus a lighter flutter
  // whose phase changes across the card so neighbouring blooms move apart.
  float gust = 0.7 + 0.3 * sin(t * 0.13 + 1.1);
  float sway = sin(t * 0.55 + px.y * 0.006 + px.x * 0.004) * 0.7 + sin(t * 0.31 + px.x * 0.009 + 2.0) * 0.3;
  float fx = sin(t * 1.7 + px.x * 0.07 + px.y * 0.05) * 0.35 + sin(t * 2.6 + px.x * 0.13 - px.y * 0.11) * 0.15;
  float fy = sin(t * 1.9 + px.y * 0.08 - px.x * 0.04) * 0.3;
  vec2 foliage = 10.8 * uRamp * m.g * gust * vec2(sway + fx, 0.35 * sway + fy);

  vec2 uv = vUv - (water + foliage) / SIZE;
  vec3 base = texture2D(uArt, uv).rgb;

  // Golden reflections: only the existing bright streaks shimmer. Their
  // brightness is broken into short horizontal fragments that drift, stretch,
  // part and rejoin independently, in the painting's own colours.
  if (m.r > 0.0) {
    float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float glow = smoothstep(0.5, 0.82, lum) * m.r * uRamp;
    vec2 s = vec2(px.x * 0.05, px.y * 0.42) * ripple;
    float f1 = noise(s + vec2(t * 0.55, 0.0));
    float f2 = noise(s * vec2(0.6, 1.3) + vec2(-t * 0.35, t * 0.22 + 4.7));
    float shimmer = 0.6 * f1 + 0.4 * f2;                      // -1..1, smooth
    // dimmer gaps between streaks, brighter crests; stays within the palette
    base *= 1.0 + glow * (0.32 * shimmer + 0.04);
    // the darker water between reflections breathes very slightly
    base *= 1.0 - (1.0 - smoothstep(0.35, 0.6, lum)) * m.r * uRamp * 0.06 * f2;
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
