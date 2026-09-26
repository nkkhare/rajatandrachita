import { PetalField } from './petals';
import { WaterRenderer } from './water';

export function createSceneAnimation(
  image: HTMLImageElement,
  waterCanvas: HTMLCanvasElement,
  petalsCanvas: HTMLCanvasElement,
) {
  const water = new WaterRenderer(image, waterCanvas);
  const petals = new PetalField(petalsCanvas);
  let frameId = 0;
  let previous = performance.now();

  const frame = (now: number) => {
    const deltaSeconds = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    water.render(now / 1000);
    petals.render(deltaSeconds, now / 1000);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    water.dispose();
    petals.dispose();
  };
}
