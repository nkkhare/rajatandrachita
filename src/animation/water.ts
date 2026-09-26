/* The source image is 1024 × 1536. Only its bottom 156 pixels are redrawn. */
const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform float u_time;

  float leftEdge(float y) {
    if (y < 1410.0) return mix(350.0, 130.0, clamp((y - 1389.0) / 21.0, 0.0, 1.0));
    if (y < 1440.0) return mix(130.0, 156.0, (y - 1410.0) / 30.0);
    if (y < 1470.0) return mix(156.0, 222.0, (y - 1440.0) / 30.0);
    if (y < 1500.0) return mix(222.0, 275.0, (y - 1470.0) / 30.0);
    return mix(275.0, 346.0, clamp((y - 1500.0) / 36.0, 0.0, 1.0));
  }

  float rightEdge(float y) {
    if (y < 1410.0) return mix(705.0, 922.0, clamp((y - 1389.0) / 21.0, 0.0, 1.0));
    if (y < 1440.0) return mix(922.0, 900.0, (y - 1410.0) / 30.0);
    if (y < 1470.0) return mix(900.0, 858.0, (y - 1440.0) / 30.0);
    if (y < 1500.0) return mix(858.0, 825.0, (y - 1470.0) / 30.0);
    return mix(825.0, 783.0, clamp((y - 1500.0) / 36.0, 0.0, 1.0));
  }

  void main() {
    float x = v_uv.x * 1024.0;
    float y = 1380.0 + v_uv.y * 156.0;

    // This top edge follows the near bank, just below the bridge. The side
    // edges move inward around the flowers in the two lower corners.
    float waterline = 1389.0 + 0.000085 * (x - 540.0) * (x - 540.0);
    float mask = smoothstep(waterline, waterline + 6.0, y)
      * smoothstep(leftEdge(y), leftEdge(y) + 7.0, x)
      * (1.0 - smoothstep(rightEdge(y) - 7.0, rightEdge(y), x));

    if (mask <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // Three low-amplitude, differently paced ripples keep the motion from
    // repeating as a single obvious wave. Displacement fades at the bank.
    float depth = smoothstep(waterline + 2.0, waterline + 29.0, y);
    float broad = sin(y * 0.105 + u_time * 0.55 + sin(y * 0.021 + u_time * 0.19));
    float fine = sin(y * 0.31 - u_time * 1.05 + sin(y * 0.045) * 0.6);
    float thread = sin(y * 0.67 + u_time * 0.77);
    float displacement = depth * (1.25 * broad + 0.85 * fine + 0.32 * thread);
    float vertical = depth * 0.22 * sin(y * 0.21 - u_time * 0.55);
    vec2 sampleAt = vec2(
      clamp((x + displacement) / 1024.0, 0.0, 1.0),
      clamp((y + vertical) / 1536.0, 0.0, 1.0)
    );
    vec4 reflection = texture2D(u_image, sampleAt);

    // Light in the central gold reflection varies by less than two percent.
    float gold = exp(-pow((x - (402.0 + (y - 1390.0) * 0.13)) / 128.0, 2.0));
    float warmth = smoothstep(0.08, 0.37, reflection.r - reflection.b);
    float flicker = 0.009 * sin(y * 0.38 - u_time * 1.21)
      + 0.005 * sin(y * 0.71 + u_time * 0.83);
    reflection.rgb *= 1.0 + gold * warmth * flicker * depth;
    gl_FragColor = vec4(reflection.rgb, mask);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Water shader unavailable:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class WaterRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private buffer: WebGLBuffer | null = null;
  private timeLocation: WebGLUniformLocation | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(image: HTMLImageElement, private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Water shader link unavailable:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture) {
      gl.deleteProgram(program);
      return;
    }

    this.gl = gl;
    this.program = program;
    this.buffer = buffer;
    this.texture = texture;
    this.timeLocation = gl.getUniformLocation(program, 'u_time');

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    gl.clearColor(0, 0, 0, 0);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private resize() {
    if (!this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  render(seconds: number) {
    const gl = this.gl;
    if (!gl || !this.program) return;
    gl.useProgram(this.program);
    gl.uniform1f(this.timeLocation, seconds);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    if (!this.gl) return;
    if (this.texture) this.gl.deleteTexture(this.texture);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    if (this.program) this.gl.deleteProgram(this.program);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}
