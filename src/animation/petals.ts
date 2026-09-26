type Petal = {
  originX: number;
  originY: number;
  age: number;
  size: number;
  speed: number;
  drift: number;
  sway: number;
  swayRate: number;
  phase: number;
  rotation: number;
  spin: number;
  opacity: number;
  blur: number;
  sprite: HTMLCanvasElement;
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

function makePetalSprite(light: string, middle: string, edge: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 112;
  const context = canvas.getContext('2d')!;
  context.translate(40, 56);

  context.beginPath();
  context.moveTo(-3, -48);
  context.bezierCurveTo(17, -42, 31, -22, 27, 2);
  context.bezierCurveTo(24, 25, 7, 45, -7, 49);
  context.bezierCurveTo(-20, 32, -29, 8, -24, -14);
  context.bezierCurveTo(-20, -31, -11, -43, -3, -48);
  context.closePath();

  const gradient = context.createLinearGradient(-24, -42, 26, 38);
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.47, middle);
  gradient.addColorStop(1, edge);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = 'rgba(135, 30, 66, .33)';
  context.lineWidth = 1.2;
  context.stroke();

  context.beginPath();
  context.moveTo(-3, -39);
  context.bezierCurveTo(-8, -11, -4, 18, -7, 39);
  context.strokeStyle = 'rgba(255, 224, 208, .5)';
  context.lineWidth = 1.5;
  context.stroke();
  return canvas;
}

const SPRITES = [
  makePetalSprite('#ffd0c6', '#f87691', '#cd395f'),
  makePetalSprite('#ffacaf', '#ef5a7a', '#b72555'),
  makePetalSprite('#fbd6c4', '#ee7b89', '#cc4a69'),
  makePetalSprite('#ffb4b7', '#f26080', '#d13a60'),
];

export class PetalField {
  private context: CanvasRenderingContext2D | null;
  private resizeObserver: ResizeObserver;
  private petals: Petal[] = [];
  private width = 0;
  private height = 0;
  private pixelRatio = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  private createPetal(initial: boolean): Petal {
    const depth = Math.random();
    const foreground = depth > 0.87;
    const background = depth < 0.3;
    const size = foreground ? random(24, 37) : background ? random(9, 15) : random(14, 25);
    const originX = random(0, this.width);

    return {
      originX,
      originY: initial ? random(-this.height * 0.12, this.height + 20) : random(-90, -size),
      age: initial ? 0 : -random(0, 2.2),
      size,
      speed: foreground ? random(53, 83) : background ? random(24, 39) : random(36, 61),
      drift: random(-8, 8),
      sway: random(9, foreground ? 34 : 24),
      swayRate: random(0.5, 1.25),
      phase: random(0, Math.PI * 2),
      rotation: random(-Math.PI, Math.PI),
      spin: (Math.random() < 0.5 ? -1 : 1) * random(0.25, 0.95),
      opacity: foreground ? random(0.56, 0.79) : background ? random(0.47, 0.68) : random(0.59, 0.83),
      blur: foreground ? random(1.1, 2.2) : background ? random(0.2, 0.75) : 0,
      sprite: SPRITES[Math.floor(Math.random() * SPRITES.length)],
    };
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    // Petals are intentionally soft. A capped backing resolution avoids
    // clearing millions of unnecessary pixels on high-density phones.
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.context?.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowPower = (memory !== undefined && memory <= 4) || (navigator.hardwareConcurrency || 4) <= 4;
    const count = lowPower ? (this.width < 430 ? 8 : 11) : (this.width < 430 ? 11 : 15);
    this.petals = Array.from({ length: count }, () => this.createPetal(true));
  }

  render(deltaSeconds: number, seconds: number) {
    const context = this.context;
    if (!context) return;
    context.clearRect(0, 0, this.width, this.height);

    // The breeze changes direction slowly, so the drift never reads as a
    // rigid diagonal translation across the illustration.
    const breeze = 11 * Math.sin(seconds * 0.34) + 6 * Math.sin(seconds * 0.13 + 1.3);
    for (let index = 0; index < this.petals.length; index++) {
      let petal = this.petals[index];
      petal.age += deltaSeconds;
      if (petal.age < 0) continue;

      const y = petal.originY + petal.age * petal.speed;
      if (y > this.height + petal.size * 2) {
        petal = this.createPetal(false);
        this.petals[index] = petal;
        continue;
      }

      const x = petal.originX + petal.drift * petal.age
        + petal.sway * Math.sin(petal.age * petal.swayRate + petal.phase)
        + breeze * (petal.size / 20);
      if (x < -petal.size * 3 || x > this.width + petal.size * 3) continue;

      const rotation = petal.rotation + petal.spin * petal.age
        + 0.18 * Math.sin(petal.age * 1.7 + petal.phase);
      const flutter = 0.72 + 0.28 * Math.cos(petal.age * 1.4 + petal.phase);
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(flutter, 1);
      context.globalAlpha = petal.opacity;
      if (petal.blur > 0) context.filter = `blur(${petal.blur}px)`;
      context.drawImage(petal.sprite, -petal.size / 2, -petal.size * 0.7, petal.size, petal.size * 1.4);
      context.restore();
    }
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.context?.clearRect(0, 0, this.width, this.height);
  }
}
