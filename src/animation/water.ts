// Flip this while tuning the river outline. Debug mode draws the exact mask
// and increases the ripple to about 10 displayed pixels.
export const DEBUG_WATER = false;

const IMAGE_WIDTH = 1024;
const WATER_BAND_TOP = 1400;
const WATER_BAND_HEIGHT = 136;
const STRIP_HEIGHT = 3; // source-image pixels

// Points are in the original 1024 × 1536 artwork coordinate system.
// Edit these pairs to tune the water boundary; the outline in debug mode
// traces this same polygon. The top follows the bank below the bridge and
// the narrowing sides avoid the foreground flowers.
export const WATER_MASK_POINTS: ReadonlyArray<readonly [number, number]> = [
  [118, 1412], [166, 1409], [260, 1407], [365, 1408],
  [475, 1410], [590, 1410], [710, 1408], [820, 1408],
  [906, 1413], [900, 1431], [886, 1450], [861, 1471],
  [832, 1492], [805, 1515], [780, 1536], [330, 1536],
  [304, 1516], [272, 1494], [235, 1472], [196, 1451],
  [158, 1432],
];

function maskPath() {
  const path = new Path2D();
  WATER_MASK_POINTS.forEach(([x, y], index) => {
    if (index === 0) path.moveTo(x, y - WATER_BAND_TOP);
    else path.lineTo(x, y - WATER_BAND_TOP);
  });
  path.closePath();
  return path;
}

const WATER_PATH = maskPath();

function waveOffset(y: number, seconds: number) {
  const row = y - WATER_BAND_TOP;
  if (DEBUG_WATER) {
    return 5.2 * Math.sin(seconds * 2.15 + row * 0.115)
      + 3.2 * Math.sin(seconds * -3.05 + row * 0.282)
      + 1.6 * Math.sin(seconds * 1.42 + row * 0.49);
  }
  return 2.65 * Math.sin(seconds * 0.47 + row * 0.102)
    + 1.48 * Math.sin(seconds * -0.72 + row * 0.235)
    + 0.82 * Math.sin(seconds * 0.31 + row * 0.438)
    + 0.38 * Math.sin(seconds * -1.03 + row * 0.612);
}

function drawLightShimmer(context: CanvasRenderingContext2D, seconds: number, pixelsToSource: number) {
  // A broad, low-opacity band follows the same displacement as the strips.
  // It sits over the existing golden sunset reflection, without point lights.
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let y = 0; y <= WATER_BAND_HEIGHT; y += 6) {
    const shift = waveOffset(WATER_BAND_TOP + y, seconds) * pixelsToSource * 0.5;
    const center = 420 + shift + 9 * Math.sin(seconds * 0.31);
    const width = 82 + y * 0.43
      + 6 * Math.sin(y * 0.17 + seconds * 0.63);
    left.push([center - width, y]);
    right.push([center + width, y]);
  }

  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = (DEBUG_WATER ? 0.13 : 0.10)
    * (0.76 + 0.24 * Math.sin(seconds * (DEBUG_WATER ? 1.4 : 0.57))
      * Math.sin(seconds * 0.22 + 0.7));
  const glow = context.createLinearGradient(285, 0, 570, 0);
  glow.addColorStop(0, 'rgba(255, 221, 162, 0)');
  glow.addColorStop(0.45, 'rgba(255, 216, 139, 1)');
  glow.addColorStop(1, 'rgba(255, 221, 162, 0)');
  context.fillStyle = glow;
  context.beginPath();
  left.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  for (let index = right.length - 1; index >= 0; index--) {
    context.lineTo(right[index][0], right[index][1]);
  }
  context.closePath();
  context.fill();
  context.restore();
}

export class WaterRenderer {
  private context: CanvasRenderingContext2D | null;
  private resizeObserver: ResizeObserver;
  private displayedWidth = 0;

  constructor(private image: HTMLImageElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.displayedWidth = rect.width;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(seconds: number) {
    const context = this.context;
    if (!context || this.displayedWidth <= 0) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(this.canvas.width / IMAGE_WIDTH, 0, 0,
      this.canvas.height / WATER_BAND_HEIGHT, 0, 0);
    context.imageSmoothingEnabled = true;

    context.save();
    context.clip(WATER_PATH);

    const pixelsToSource = IMAGE_WIDTH / this.displayedWidth;
    for (let localY = 0; localY < WATER_BAND_HEIGHT; localY += STRIP_HEIGHT) {
      const height = Math.min(STRIP_HEIGHT, WATER_BAND_HEIGHT - localY);
      const sourceY = WATER_BAND_TOP + localY;
      const bankFade = Math.max(0, Math.min(1, (sourceY - 1407) / 20));
      const offset = waveOffset(sourceY, seconds) * pixelsToSource * bankFade;
      const stretch = 1 + (DEBUG_WATER ? 0.004 : 0.0017)
        * Math.sin(seconds * (DEBUG_WATER ? 2.0 : 0.43) + localY * 0.13);
      const width = IMAGE_WIDTH * stretch;
      context.drawImage(this.image,
        0, sourceY, IMAGE_WIDTH, height,
        offset - (width - IMAGE_WIDTH) / 2, localY,
        width, height + 0.22);
    }

    drawLightShimmer(context, seconds, pixelsToSource);
    context.restore();

    if (DEBUG_WATER) {
      context.fillStyle = 'rgba(0, 238, 255, 0.12)';
      context.fill(WATER_PATH);
      context.strokeStyle = '#00f5ff';
      context.lineWidth = 4;
      context.stroke(WATER_PATH);
    }
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.context?.setTransform(1, 0, 0, 1, 0, 0);
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
