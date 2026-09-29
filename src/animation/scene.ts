import { CloudRenderer } from './clouds';
import { PetalField } from './petals';
import { WaterRenderer } from './water';

export function createSceneAnimation(
  image: HTMLImageElement,
  waterCanvas: HTMLCanvasElement,
  cloudsCanvas: HTMLCanvasElement,
  petalsCanvas: HTMLCanvasElement,
  petalsDelayMs = 0,
) {
  const water = new WaterRenderer(image, waterCanvas);
  const clouds = new CloudRenderer(image, cloudsCanvas);
  // The petals begin to fall only once the invitation is fully visible.
  const petalsAt = performance.now() + petalsDelayMs;
  let petals: PetalField | undefined;
  let frameId = 0;
  let previous = performance.now();

  const frame = (now: number) => {
    const deltaSeconds = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    water.render(now / 1000);
    clouds.render(now / 1000);
    if (!petals && now >= petalsAt) petals = new PetalField(petalsCanvas);
    petals?.render(deltaSeconds, now / 1000);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    water.dispose();
    clouds.dispose();
    petals?.dispose();
  };
}
