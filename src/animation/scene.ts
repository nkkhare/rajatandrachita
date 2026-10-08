import { AmbientRenderer, ambientMaps } from './ambient';
import { PetalField } from './petals';

export async function createSceneAnimation(
  image: HTMLImageElement,
  ambientCanvas: HTMLCanvasElement,
  petalsCanvas: HTMLCanvasElement,
  petalsDelayMs = 0,
) {
  let mapsError = '';
  const maps = await ambientMaps().catch((error) => { mapsError = String(error?.type ?? error); return null; });
  // flowing water, swaying foliage and drifting sky (skipped without WebGL)
  const ambient = maps ? AmbientRenderer.create(image, maps, ambientCanvas) : null;
  // ?debug=1 shows why the living layer did or didn't start
  if (new URLSearchParams(location.search).has('debug')) {
    const note = document.createElement('div');
    note.style.cssText = 'position:fixed;z-index:99;left:8px;right:8px;bottom:8px;padding:8px;font:12px/1.4 monospace;background:#000c;color:#fff;border-radius:6px';
    note.textContent = ambient ? 'ambient: running' : maps ? `ambient: failed - ${AmbientRenderer.lastError}` : `ambient: maps failed to load (${mapsError})`;
    document.body.append(note);
  }
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
