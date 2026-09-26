import { CloudRenderer } from './clouds';
import { WaterRenderer } from './water';

export function createSceneAnimation(
  image: HTMLImageElement,
  waterCanvas: HTMLCanvasElement,
  cloudsCanvas: HTMLCanvasElement,
) {
  const water = new WaterRenderer(image, waterCanvas);
  const clouds = new CloudRenderer(image, cloudsCanvas);
  let frameId = 0;

  const frame = (now: number) => {
    water.render(now / 1000);
    clouds.render(now / 1000);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    water.dispose();
    clouds.dispose();
  };
}
