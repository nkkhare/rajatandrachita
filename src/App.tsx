import { useEffect, useRef } from 'react';

const imageUrl = `${import.meta.env.BASE_URL}save-the-date.png`;

export function App() {
  const imageRef = useRef<HTMLImageElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    const waterCanvas = waterRef.current;
    const petalsCanvas = petalsRef.current;
    if (!image || !waterCanvas || !petalsCanvas) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let stopAnimation: (() => void) | undefined;

    async function start() {
      const currentGeneration = ++generation;
      stopAnimation?.();
      stopAnimation = undefined;
      if (motionPreference.matches || document.hidden || !image || !waterCanvas || !petalsCanvas) return;

      if (!image.complete || image.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
      if (disposed || currentGeneration !== generation || motionPreference.matches || document.hidden || image.naturalWidth === 0) return;

      const { createSceneAnimation } = await import('./animation/scene');
      if (disposed || currentGeneration !== generation || motionPreference.matches || document.hidden) return;
      stopAnimation = createSceneAnimation(image, waterCanvas, petalsCanvas);
    }

    const handleChange = () => { void start(); };
    motionPreference.addEventListener('change', handleChange);
    document.addEventListener('visibilitychange', handleChange);
    void start();

    return () => {
      disposed = true;
      generation++;
      stopAnimation?.();
      motionPreference.removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleChange);
    };
  }, []);

  return (
    <main className="scene">
      <div className="scene__background" aria-hidden="true" />
      <h1 className="visually-hidden">Save the date for Rachita and Rajat, May 14–15, 2027, in Philadelphia, Pennsylvania. Invitation to follow.</h1>
      <div className="invitation">
        <img
          ref={imageRef}
          className="invitation__art"
          src={imageUrl}
          width="1024"
          height="1536"
          alt="Floral save-the-date invitation for Rachita and Rajat, May 14–15, 2027, Philadelphia, Pennsylvania. Invitation to follow."
          decoding="async"
          fetchPriority="high"
        />
        <canvas ref={waterRef} className="invitation__water" aria-hidden="true" />
      </div>
      <canvas ref={petalsRef} className="scene__petals" aria-hidden="true" />
    </main>
  );
}
