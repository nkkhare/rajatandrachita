import { useEffect, useRef, useState } from 'react';
import { EnvelopeIntro, REVEAL_DURATION_MS, type InvitationState } from './EnvelopeIntro';
import { Countdown } from './Countdown';

const imageUrl = `${import.meta.env.BASE_URL}save-the-date.png`;

export function App() {
  const [invitationState, setInvitationState] = useState<InvitationState>('closed');
  const imageRef = useRef<HTMLImageElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<HTMLCanvasElement>(null);
  const openingRequested = useRef(false);

  const openEnvelope = () => {
    if (invitationState !== 'closed' || openingRequested.current) return;
    const image = imageRef.current;
    if (!image) return;
    openingRequested.current = true;
    if (image.complete && image.naturalWidth > 0) {
      setInvitationState('opening');
    } else {
      void image.decode().then(() => setInvitationState('opening')).catch(() => {
        openingRequested.current = false;
      });
    }
  };

  useEffect(() => {
    if (invitationState !== 'opening') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setInvitationState('revealed'),
      reduced ? 240 : REVEAL_DURATION_MS + 120);
    return () => window.clearTimeout(timer);
  }, [invitationState]);

  useEffect(() => {
    if (invitationState !== 'revealed') return;
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
  }, [invitationState]);

  return (
    <main className="scene">
      <div className="scene__background" aria-hidden="true" />
      <h1 className="visually-hidden">Save the date for Rachita and Rajat, May 14–15, 2027, in Philadelphia, Pennsylvania. Invitation to follow.</h1>
      <EnvelopeIntro state={invitationState} onOpen={openEnvelope}>
        <div
          className="invitation"
          aria-hidden={invitationState !== 'revealed'}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && invitationState === 'opening') {
              setInvitationState('revealed');
            }
          }}
        >
          <img
            ref={imageRef}
            className="invitation__art"
            src={imageUrl}
            width="1024"
            height="1536"
            alt="Save-the-date invitation for Rachita and Rajat, May 14–15, 2027, with the Philadelphia skyline at sunset. Invitation to follow."
            decoding="async"
            fetchPriority="high"
          />
          <Countdown />
          <canvas ref={waterRef} className="invitation__water" aria-hidden="true" />
          <canvas ref={petalsRef} className="invitation__petals" aria-hidden="true" />
        </div>
      </EnvelopeIntro>
    </main>
  );
}
