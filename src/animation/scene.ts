import { AmbientRenderer, ambientMaps } from './ambient';
import { PetalField } from './petals';

export async function createSceneAnimation(
  image: HTMLImageElement,
  ambientCanvas: HTMLCanvasElement,
  petalsCanvas: HTMLCanvasElement,
  petalsDelayMs = 0,
) {
  const maps = await ambientMaps().catch(() => null);
  // flowing water, swaying foliage and drifting sky (skipped without WebGL)
  const ambient = maps ? AmbientRenderer.create(image, maps, ambientCanvas) : null;
  // The petals begin to fall only once the invitation is fully visible.
  const petalsAt = performance.now() + petalsDelayMs;
  let petals: PetalField | undefined;
  let frameId = 0;
  let previous = performance.now();

  const frame = (now: number) => {
    const deltaSeconds = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    ambient?.render(now / 1000);
    if (!petals && now >= petalsAt) petals = new PetalField(petalsCanvas);
    petals?.render(deltaSeconds, now / 1000);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    ambient?.dispose();
    petals?.dispose();
  };
}
