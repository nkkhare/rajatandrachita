import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import paperUrl from './assets/ivory-paper.webp';
import linerUrl from './assets/champagne-liner.webp';
import monogramUrl from './assets/embossed-rr.webp';
import './envelope.css';

export type InvitationState = 'closed' | 'opening' | 'revealed';

const DEBUG_ENVELOPE = false;
const OPENING_DURATION_MS = 3800;
export const REVEAL_DURATION_MS = OPENING_DURATION_MS * (DEBUG_ENVELOPE ? 4 : 1);

type Props = {
  state: InvitationState;
  onOpen: () => void;
  children: ReactNode;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const phase = (progress: number, start: number, end: number) => smooth((progress - start) / (end - start));
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

// The flap tip was tracked against the fixed lower envelope in the 100 ms
// samples of the supplied recording. Values are fractions of scene height.
const flapMarks = [
  [0, 0], [.053, .036], [.105, .06], [.158, .09], [.211, .15],
  [.263, .213], [.316, .302], [.368, .401], [.421, .497],
  [.474, .624], [.526, .767], [.579, .90], [1, .90],
] as const;

function travel(marks: readonly (readonly [number, number])[], progress: number) {
  const x = clamp(progress);
  for (let index = 0; index < marks.length - 1; index++) {
    const [x0, y0] = marks[index];
    const [x1, y1] = marks[index + 1];
    if (x > x1) continue;
    const previous = marks[Math.max(0, index - 1)];
    const next = marks[Math.min(marks.length - 1, index + 2)];
    const startSlope = index === 0 ? (y1 - y0) / (x1 - x0) : (y1 - previous[1]) / (x1 - previous[0]);
    const endSlope = index === marks.length - 2
      ? (y1 - y0) / (x1 - x0)
      : (next[1] - y0) / (next[0] - x0);
    const t = (x - x0) / (x1 - x0);
    const t2 = t * t;
    const t3 = t2 * t;
    const distance = x1 - x0;
    return (2 * t3 - 3 * t2 + 1) * y0
      + (t3 - 2 * t2 + t) * distance * startSlope
      + (-2 * t3 + 3 * t2) * y1
      + (t3 - t2) * distance * endSlope;
  }
  return marks[marks.length - 1][1];
}

function setFrame(element: HTMLDivElement, progress: number) {
  const styles = element.style;
  styles.setProperty('--flap-y', `${-100 * travel(flapMarks, progress)}vh`);
  styles.setProperty('--wash-opacity', String(phase(progress, .66, .91)));
  styles.setProperty('--envelope-opacity', String(1 - phase(progress, .91, 1)));
  styles.setProperty('--card-opacity', String(phase(progress, .94, 1)));
  styles.setProperty('--card-scale', String(mix(.985, 1, phase(progress, .92, 1))));
  styles.setProperty('--neutral-opacity', String(1 - phase(progress, .94, 1)));
}

function preload(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

export function EnvelopeIntro({ state, onOpen, children }: Props) {
  const experienceRef = useRef<HTMLDivElement>(null);
  const pendingOpen = useRef(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const invitation = experienceRef.current?.querySelector<HTMLImageElement>('.invitation__art');
    void Promise.all([
      preload(paperUrl), preload(linerUrl), preload(monogramUrl),
      invitation?.decode().catch(() => undefined) ?? Promise.resolve(),
      import('./animation/scene').catch(() => undefined),
      document.fonts?.ready ?? Promise.resolve(),
    ]).then(() => {
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
    if (DEBUG_ENVELOPE && scrubbing) {
      setFrame(element, debugProgress);
      return;
    }
    if (state === 'closed') {
      setFrame(element, 0);
      return;
    }
    if (state === 'revealed') {
      setFrame(element, 1);
      return;
    }

    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = clamp((now - began) / REVEAL_DURATION_MS);
      setFrame(element, progress);
      if (DEBUG_ENVELOPE) setDebugProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, scrubbing]);

  const requestOpen = () => {
    if (state !== 'closed') return;
    setScrubbing(false);
    setDebugProgress(0);
    if (assetsReady) onOpen();
    else pendingOpen.current = true;
  };

  const onScrub = (progress: number) => {
    setScrubbing(true);
    setDebugProgress(progress);
    if (experienceRef.current) setFrame(experienceRef.current, progress);
  };

  return (
    <div
      ref={experienceRef}
      className="experience"
      data-state={state}
      data-debug-envelope={DEBUG_ENVELOPE}
      style={{ '--flap-y': '0vh' } as CSSProperties}
    >
      {children}
      <div className="envelope-scene" aria-hidden="true">
        <div className="envelope-camera" data-layer="camera">
          <div className="envelope__back" data-layer="back" />
          <div className="envelope__liner" data-layer="liner" />
          <div className="envelope__lower" data-layer="lower">
            <div className="envelope__lower-left" />
            <div className="envelope__lower-right" />
            <div className="envelope__lower-center" />
          </div>
          <div className="envelope__flap" data-layer="flap">
            <div className="envelope__flap-paper" />
            <div className="envelope__monogram" data-layer="monogram" />
          </div>
        </div>
        <div className="envelope__wash" />
      </div>
      <button
        className="envelope__hit-area"
        type="button"
        aria-label="Open the save-the-date invitation"
        disabled={state !== 'closed'}
        onClick={requestOpen}
      />
      {DEBUG_ENVELOPE && (
        <div className="envelope-debug">
          <label htmlFor="envelope-progress">Envelope progress: {debugProgress.toFixed(3)}</label>
          <input
            id="envelope-progress"
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={debugProgress}
            onChange={(event) => onScrub(Number(event.target.value))}
          />
        </div>
      )}
    </div>
  );
}
