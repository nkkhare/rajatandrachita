import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import bodyUrl from './assets/envelope-body.webp';
import flapUrl from './assets/envelope-flap.webp';
import flapShadowUrl from './assets/envelope-flap-shadow.webp';
import './envelope.css';

export type InvitationState = 'closed' | 'opening' | 'revealed';

// The lid lifts as in the reference intro, 15% faster, and the envelope fades
// out over the last part of the lift while the flap is still moving. As it
// starts to fade, the whole invitation begins a slow fade in (4.4 s, easing in
// and out) with an almost imperceptible settle from 98.8% to full size. The
// flowers start to stir toward the end of that fade.
const SPEED = 0.85;
const LID_SECONDS = 3.583 * SPEED;
const ENVELOPE_FADE_SECONDS = 0.8 * SPEED;
const CARD_SECONDS = 3.5 * 1.25;
const REVEAL_START = LID_SECONDS - ENVELOPE_FADE_SECONDS;
const BREEZE_START = REVEAL_START + CARD_SECONDS * 0.65;
const TOTAL_SECONDS = REVEAL_START + CARD_SECONDS;
export const REVEAL_DURATION_MS = Math.round(TOTAL_SECONDS * 1000);
/** When the invitation starts to fade in; its ambient motion starts then too. */
export const INVITATION_FADE_START_MS = Math.round(REVEAL_START * 1000);

// Lid angle (degrees) over time, fitted to the reference seal's position,
// foreshortening, and growth: the lid hinges on the top edge of the screen
// and tips toward the viewer with a perspective of ~4 screen heights.
const LID_ANGLE: ReadonlyArray<readonly [number, number]> = ([
  [0, 0], [0.25, 7.2], [0.5, 13.2], [0.75, 17.8], [1, 21.9], [1.25, 26.1],
  [1.5, 30.1], [1.75, 33.9], [2, 37.6], [2.25, 41.3], [2.5, 44.8],
  [2.75, 48.1], [3, 51.9], [3.25, 55.3], [3.583, 59.6],
] as const).map(([t, angle]) => [t * SPEED, angle] as const);
const PERSPECTIVE_HEIGHTS = 4.06;

// The envelope is the approved artwork itself, split into two layers: the
// body (with the paper under the flap painted in) and the flap, which carries
// its gold border, filigree, and soft shadow, and hinges on the top edge.
const ENVELOPE_RATIO = 1427 / 863;
// About a quarter of the screen's area, but never wider than 90% of the
// screen or taller than 80% of it.
function envelopeSize(screenWidth: number, screenHeight: number) {
  let width = Math.sqrt(0.25 * screenWidth * screenHeight * ENVELOPE_RATIO);
  width = Math.min(width, screenWidth * 0.9, screenHeight * 0.8 * ENVELOPE_RATIO);
  return { width, height: width / ENVELOPE_RATIO };
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
// Sine ease-in-out for the invitation: slow to start, slow to settle.
const easeSine = (value: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(value));

function lidAngle(seconds: number) {
  const s = Math.min(Math.max(seconds, 0), LID_SECONDS);
  for (let i = 0; i < LID_ANGLE.length - 1; i++) {
    const [t0, a0] = LID_ANGLE[i];
    const [t1, a1] = LID_ANGLE[i + 1];
    if (s > t1) continue;
    const prev = LID_ANGLE[Math.max(0, i - 1)];
    const next = LID_ANGLE[Math.min(LID_ANGLE.length - 1, i + 2)];
    const m0 = i === 0 ? 0 : (a1 - prev[1]) / (t1 - prev[0]);
    const m1 = (next[1] - a0) / (next[0] - t0 || 1);
    const u = (s - t0) / (t1 - t0);
    const span = t1 - t0;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * a0 + (u ** 3 - 2 * u ** 2 + u) * span * m0
      + (-2 * u ** 3 + 3 * u ** 2) * a1 + (u ** 3 - u ** 2) * span * m1;
  }
  return LID_ANGLE[LID_ANGLE.length - 1][1];
}

/** Paints the sequence at `seconds` after the tap. Exported for visual tests. */
export function renderEnvelopeFrame(element: HTMLElement, seconds: number) {
  const angle = lidAngle(seconds);
  const lift = angle / 60;
  const card = easeSine((seconds - REVEAL_START) / CARD_SECONDS);
  const style = element.style;
  style.setProperty('--lid-angle', `${angle.toFixed(3)}deg`);
  style.setProperty('--lid-shadow-angle', `${(angle * 0.62).toFixed(3)}deg`);
  style.setProperty('--lid-shadow-shift', `${(0.4 + lift * 2.6).toFixed(3)}%`);
  // Zero at rest (the artwork's own shadow is showing), growing as the flap lifts.
  style.setProperty('--lid-shadow-opacity', (0.28 * clamp(lift * 3) * (1 - 0.4 * lift)).toFixed(3));
  style.setProperty('--lid-sheen', (lift * 0.55).toFixed(3));
  // The flap's resting shadow on the envelope fades as the flap lifts away.
  style.setProperty('--rest-shadow', (1 - clamp(lift * 2.2)).toFixed(3));
  style.setProperty('--envelope-opacity', (1 - easeInOut((seconds - REVEAL_START) / ENVELOPE_FADE_SECONDS)).toFixed(3));
  // The whole invitation scene (card and its background) fades in together.
  style.setProperty('--backdrop-opacity', card.toFixed(3));
  style.setProperty('--card-opacity', card.toFixed(3));
  style.setProperty('--card-scale', (0.988 + 0.012 * card).toFixed(4));
  element.dataset.breeze = seconds >= BREEZE_START ? 'on' : 'off';
}

function preload(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

type Props = {
  state: InvitationState;
  onOpen: () => void;
  /** Runs synchronously inside the guest's tap (e.g. to start audio). */
  onTap?: () => void;
  children: ReactNode;
};

export function EnvelopeIntro({ state, onOpen, onTap, children }: Props) {
  const experienceRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pendingOpen = useRef(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [viewport, setViewport] = useState(envelopeSize(390, 844));

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const measure = () => {
      const rect = scene.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setViewport(envelopeSize(rect.width, rect.height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const invitation = experienceRef.current?.querySelector<HTMLImageElement>('.invitation__art');
    const decoded = Promise.all([
      preload(bodyUrl), preload(flapUrl), preload(flapShadowUrl),
      invitation?.decode().catch(() => undefined) ?? Promise.resolve(),
      import('./animation/scene').catch(() => undefined),
    ]);
    // Never leave a guest's tap waiting: some browsers defer decoding.
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 2500));
    void Promise.race([decoded, timeout]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!assetsReady || !pendingOpen.current) return;
    pendingOpen.current = false;
    onOpen();
  }, [assetsReady, onOpen]);

  useEffect(() => {
    const element = experienceRef.current;
    if (!element) return;
    if (state === 'closed') {
      renderEnvelopeFrame(element, 0);
      return;
    }
    if (state === 'revealed' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderEnvelopeFrame(element, TOTAL_SECONDS);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const seconds = (now - began) / 1000;
      renderEnvelopeFrame(element, seconds);
      if (seconds < TOTAL_SECONDS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state]);

  const requestOpen = () => {
    if (state !== 'closed') return;
    try {
      onTap?.();
    } catch {
      // Extras such as music must never stop the envelope from opening.
    }
    if (assetsReady) onOpen();
    else pendingOpen.current = true;
  };

  const flapMask: CSSProperties = {
    WebkitMaskImage: `url(${flapUrl})`, maskImage: `url(${flapUrl})`,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
  };

  return (
    <div ref={experienceRef} className="experience" data-state={state}>
      {children}
      <div ref={sceneRef} className="envelope-scene" aria-hidden="true">
        {/* The envelope itself, centred on the screen. */}
        <div
          className="envelope__body"
          style={{
            width: `${viewport.width.toFixed(1)}px`,
            height: `${viewport.height.toFixed(1)}px`,
            perspective: `${(PERSPECTIVE_HEIGHTS * viewport.height).toFixed(1)}px`,
          }}
        >
          <img className="envelope__base" src={bodyUrl} alt="" draggable={false} />
          <img className="envelope__base envelope__rest-shadow" src={flapShadowUrl} alt="" draggable={false} />
          <div className="envelope__lid-shadow">
            <img src={flapUrl} alt="" draggable={false} />
          </div>
          {/* The sheen is its own layer so the changing light never repaints
              the flap. */}
          <div className="envelope__lid">
            <img src={flapUrl} alt="" draggable={false} />
            <div className="envelope__lid-sheen" style={flapMask} />
          </div>
        </div>
      </div>
      <button
        className="envelope__hit-area"
        type="button"
        aria-label="Open the save-the-date invitation"
        disabled={state !== 'closed'}
        onClick={requestOpen}
      />
    </div>
  );
}
