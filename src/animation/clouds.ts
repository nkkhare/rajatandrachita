// Slow drift for the painted clouds on either side of the lettering. Rows of
// the artwork's own sky are displaced horizontally by a few pixels on long,
// out-of-phase cycles, so the clouds appear to move on a light breeze while
// the gold arch, flowers, and text stay untouched.
export const DEBUG_CLOUDS = false;

const IMAGE_WIDTH = 1024;
export const CLOUD_BAND_TOP = 340; // source-image pixels
export const CLOUD_BAND_HEIGHT = 580;
const STRIP_HEIGHT = 3;
const FEATHER = 18;

// Open sky inside the arch, left and right of the centred lettering.
const REGIONS: ReadonlyArray<{ x: number; y: number; width: number; height: number }> = [
  { x: 112, y: 372, width: 172, height: 520 },
  { x: 740, y: 372, width: 172, height: 520 },
];

function driftOffset(y: number, seconds: number) {
  const scale = DEBUG_CLOUDS ? 4 : 1;
  return scale * (7 * Math.sin(seconds * 0.15 + y * 0.006)
    + 3.5 * Math.sin(seconds * -0.09 + y * 0.015 + 1.3)
    + 1.4 * Math.sin(seconds * 0.23 + y * 0.031 + 2.2));
}

export class CloudRenderer {
  private context: CanvasRenderingContext2D | null;
  private mask = document.createElement('canvas');
  private resizeObserver: ResizeObserver;
  private lastRender = -Infinity;

  constructor(private image: HTMLImageElement, private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.mask.width = width;
    this.mask.height = height;
    const mask = this.mask.getContext('2d');
    if (!mask) return;
    const sx = width / IMAGE_WIDTH;
    const sy = height / CLOUD_BAND_HEIGHT;
    mask.clearRect(0, 0, width, height);
    mask.filter = `blur(${(FEATHER * 0.5 * sx).toFixed(1)}px)`;
    mask.fillStyle = '#000';
    for (const region of REGIONS) {
      mask.fillRect((region.x + FEATHER) * sx, (region.y - CLOUD_BAND_TOP + FEATHER) * sy,
        (region.width - FEATHER * 2) * sx, (region.height - FEATHER * 2) * sy);
    }
    this.lastRender = -Infinity;
  }

  render(seconds: number) {
    const context = this.context;
    // The motion is slow, so ~30 fps is indistinguishable and halves the work.
    if (!context || seconds - this.lastRender < 1 / 30) return;
    this.lastRender = seconds;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(this.canvas.width / IMAGE_WIDTH, 0, 0,
      this.canvas.height / CLOUD_BAND_HEIGHT, 0, -CLOUD_BAND_TOP * this.canvas.height / CLOUD_BAND_HEIGHT);
    context.imageSmoothingEnabled = true;

    for (const region of REGIONS) {
      for (let y = region.y; y < region.y + region.height; y += STRIP_HEIGHT) {
        const height = Math.min(STRIP_HEIGHT, region.y + region.height - y);
        const offset = driftOffset(y, seconds);
        context.drawImage(this.image,
          region.x - offset, y, region.width, height,
          region.x, y, region.width, height + 0.25);
      }
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(this.mask, 0, 0);
    context.globalCompositeOperation = 'source-over';

    if (DEBUG_CLOUDS) {
      const sx = this.canvas.width / IMAGE_WIDTH;
      const sy = this.canvas.height / CLOUD_BAND_HEIGHT;
      context.strokeStyle = '#00f5ff';
      context.lineWidth = 2;
      for (const region of REGIONS) {
        context.strokeRect(region.x * sx, (region.y - CLOUD_BAND_TOP) * sy, region.width * sx, region.height * sy);
      }
    }
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.context?.setTransform(1, 0, 0, 1, 0, 0);
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
