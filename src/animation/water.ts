// Flip this while tuning the river outline. Debug mode draws the exact mask
// and increases the ripple to about 10 displayed pixels.
export const DEBUG_WATER = false;

const IMAGE_WIDTH = 1024;
const WATER_BAND_TOP = 1380;
const WATER_BAND_HEIGHT = 156;
const STRIP_HEIGHT = 3; // source-image pixels

// Points are in the original 1024 × 1536 artwork coordinate system.
// Edit these pairs to tune the water boundary; the outline in debug mode
// traces this same polygon. The top follows the bank below the bridge and
// the narrowing sides avoid the foreground flowers.
export const WATER_MASK_POINTS: ReadonlyArray<readonly [number, number]> = [
  [122, 1407], [158, 1398], [222, 1392], [318, 1388],
  [429, 1385], [540, 1385], [654, 1386], [766, 1390],
  [853, 1396], [925, 1406],
  [915, 1423], [897, 1444], [870, 1465], [840, 1487],
  [813, 1511], [784, 1536], [342, 1536], [313, 1514],
  [278, 1491], [235, 1468], [191, 1444], [153, 1423],
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
  return 2.35 * Math.sin(seconds * 0.47 + row * 0.102)
    + 1.3 * Math.sin(seconds * -0.72 + row * 0.235)
    + 0.72 * Math.sin(seconds * 0.31 + row * 0.438)
    + 0.35 * Math.sin(seconds * -1.03 + row * 0.612);
}

function drawLightShimmer(context: CanvasRenderingContext2D, seconds: number, pixelsToSource: number) {
  // A broad, low-opacity band follows the same displacement as the strips.
  // It sits over the existing golden sunset reflection, without point lights.
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let y = 0; y <= WATER_BAND_HEIGHT; y += 6) {
    const shift = waveOffset(WATER_BAND_TOP + y, seconds) * pixelsToSource * 0.5;
    const center = 403 + shift + 9 * Math.sin(seconds * 0.31);
    const width = 75 + y * 0.43
      + 6 * Math.sin(y * 0.17 + seconds * 0.63);
    left.push([center - width, y]);
    right.push([center + width, y]);
  }

  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = (DEBUG_WATER ? 0.13 : 0.078)
    * (0.76 + 0.24 * Math.sin(seconds * (DEBUG_WATER ? 1.4 : 0.57))
      * Math.sin(seconds * 0.22 + 0.7));
  const glow = context.createLinearGradient(275, 0, 555, 0);
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
      const bankFade = Math.max(0, Math.min(1, (sourceY - 1390) / 24));
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
