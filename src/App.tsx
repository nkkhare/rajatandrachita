import { useEffect, useRef, useState } from 'react';
import { EnvelopeIntro, INVITATION_FADE_START_MS, REVEAL_DURATION_MS, type InvitationState } from './EnvelopeIntro';
import { BowTie } from './BowTie';
import { Countdown } from './Countdown';
import { MusicToggle } from './MusicToggle';
import { Soundtrack } from './soundtrack';

const imageUrl = `${import.meta.env.BASE_URL}save-the-date-tie.png`;
const soundtrack = new Soundtrack();

export function App() {
  const [invitationState, setInvitationState] = useState<InvitationState>('closed');
  // The water, foliage and sky start as soon as the invitation begins to fade in, so
  // they appear with it; the petals start once it is fully visible.
  const [ambient, setAmbient] = useState(false);
  const openedAt = useRef(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const ambientRef = useRef<HTMLCanvasElement>(null);
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
    if (invitationState === 'revealed') { setAmbient(true); return; }
    if (invitationState !== 'opening') return;
    openedAt.current = performance.now();
    const timer = window.setTimeout(() => setAmbient(true), INVITATION_FADE_START_MS);
    return () => window.clearTimeout(timer);
  }, [invitationState]);

  useEffect(() => {
    if (invitationState !== 'opening') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setInvitationState('revealed'),
      reduced ? 1900 : REVEAL_DURATION_MS + 120);
    return () => window.clearTimeout(timer);
  }, [invitationState]);

  // The envelope covers the screen until the card is revealed; keep the page
  // behind it from scrolling in the meantime.
  useEffect(() => {
    if (invitationState === 'revealed') return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [invitationState]);

  useEffect(() => {
    void import('./animation/ambient').then((m) => m.ambientMaps()).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ambient) return;
    const image = imageRef.current;
    const ambientCanvas = ambientRef.current;
    const petalsCanvas = petalsRef.current;
    if (!image || !ambientCanvas || !petalsCanvas) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let generation = 0;
    let stopAnimation: (() => void) | undefined;

    async function start() {
      const currentGeneration = ++generation;
      stopAnimation?.();
      stopAnimation = undefined;
      if (motionPreference.matches || document.hidden || !image || !ambientCanvas || !petalsCanvas) return;

      if (!image.complete || image.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
      if (disposed || currentGeneration !== generation || motionPreference.matches || document.hidden || image.naturalWidth === 0) return;

      const { createSceneAnimation } = await import('./animation/scene');
      if (disposed || currentGeneration !== generation || motionPreference.matches || document.hidden) return;
      // Petals wait until the invitation has fully faded in.
      const petalsDelay = Math.max(0, openedAt.current + REVEAL_DURATION_MS - performance.now());
      const stop = await createSceneAnimation(image, ambientCanvas, petalsCanvas, petalsDelay);
      if (disposed || currentGeneration !== generation) { stop(); return; }
      stopAnimation = stop;
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
  }, [ambient]);

  return (
    <main className="scene">
      <div className="scene__background" aria-hidden="true" />
      <h1 className="visually-hidden">Save the date for Rachita and Rajat, May 14–15, 2027, in Philadelphia, Pennsylvania. Invitation to follow.</h1>
      <EnvelopeIntro state={invitationState} onOpen={openEnvelope} onTap={() => soundtrack.start()}>
        <div
          className="invitation"
          aria-hidden={invitationState !== 'revealed'}
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
          <canvas ref={ambientRef} className="invitation__ambient" aria-hidden="true" />
          <Countdown />
          <BowTie play={invitationState === 'revealed'} />
          <canvas ref={petalsRef} className="invitation__petals" aria-hidden="true" />
        </div>
      </EnvelopeIntro>
      <MusicToggle soundtrack={soundtrack} visible={invitationState === 'revealed'} />
    </main>
  );
}
