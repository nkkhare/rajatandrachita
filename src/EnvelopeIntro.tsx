import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import monogramUrl from './assets/embossed-rr.webp';
import { WaxSeal, WaxSealDefs } from './WaxSeal';
import './envelope.css';

export type InvitationState = 'closed' | 'opening' | 'revealed';

// Timing follows the reference intro: the lid lifts for 3.58 s, the envelope
// fades out over the final 0.8 s, then the card fades up 20 px over 0.8 s
// after a 0.2 s pause.
const LID_SECONDS = 3.583;
const FADE_SECONDS = 0.8;
const CARD_DELAY_SECONDS = 0.2;
const TOTAL_SECONDS = LID_SECONDS + CARD_DELAY_SECONDS + 0.8;
export const REVEAL_DURATION_MS = Math.round(TOTAL_SECONDS * 1000);

// Lid angle (degrees) over time, fitted to the reference seal's position,
// foreshortening, and growth: the lid hinges on the top edge of the screen
// and tips toward the viewer with a perspective of ~4 screen heights.
const LID_ANGLE: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.25, 7.2], [0.5, 13.2], [0.75, 17.8], [1, 21.9], [1.25, 26.1],
  [1.5, 30.1], [1.75, 33.9], [2, 37.6], [2.25, 41.3], [2.5, 44.8],
  [2.75, 48.1], [3, 51.9], [3.25, 55.3], [LID_SECONDS, 59.6],
];
const PERSPECTIVE_HEIGHTS = 4.06;
const SEAL_MAX_RISE = 0.1 + Math.tan((62 * Math.PI) / 180);

// Envelope geometry in a coordinate space 960 units tall; the width follows
// the viewport so the envelope fills the screen without stretching.
const H = 960;
const LID_TIP_Y = 545;
const LID_SLOPE = 0.917;
const SIDE_MEET_Y = 567;
const SIDE_SLOPE = 1.119;
const SEAL_Y = 501;
const SEAL_SIZE = 240;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
// CSS `ease`, the default tween the reference uses for its fade-up.
function ease(value: number) {
  const x = clamp(value);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const t = (lo + hi) / 2;
    const bx = 3 * (1 - t) ** 2 * t * 0.25 + 3 * (1 - t) * t * t * 0.25 + t ** 3;
    if (bx < x) lo = t; else hi = t;
  }
  const t = (lo + hi) / 2;
  return 3 * (1 - t) ** 2 * t * 0.1 + 3 * (1 - t) * t * t + t ** 3;
}

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
  const fadeStart = LID_SECONDS - FADE_SECONDS;
  const cardStart = LID_SECONDS + CARD_DELAY_SECONDS;
  const card = ease((seconds - cardStart) / 0.8);
  const style = element.style;
  style.setProperty('--lid-angle', `${angle.toFixed(3)}deg`);
  style.setProperty('--lid-shadow-angle', `${(angle * 0.62).toFixed(3)}deg`);
  style.setProperty('--lid-shadow-shift', `${(0.4 + lift * 2.6).toFixed(3)}%`);
  style.setProperty('--lid-shadow-opacity', (0.34 - lift * 0.16).toFixed(3));
  style.setProperty('--lid-sheen', (lift * 0.55).toFixed(3));
  style.setProperty('--seal-tilt', clamp(lift * 1.1).toFixed(3));
  // How far the seal's face stands off its base in the lid's own plane: the
  // wax depth seen at this angle (tan θ undoes the lid's foreshortening),
  // plus a sliver at rest so the closed seal already reads as raised.
  const rise = 0.1 + Math.tan((angle * Math.PI) / 180);
  style.setProperty('--seal-rise', rise.toFixed(4));
  style.setProperty('--seal-band', (rise / SEAL_MAX_RISE).toFixed(4));
  // The reference seal is domed, so it holds its height a little longer
  // than the flat lid; this matches its measured proportions as it tips.
  style.setProperty('--seal-stretch', (1 + 0.17 * lift ** 3).toFixed(4));
  style.setProperty('--hint-opacity', (1 - clamp(seconds / 0.35)).toFixed(3));
  style.setProperty('--envelope-opacity', (1 - easeInOut((seconds - fadeStart) / FADE_SECONDS)).toFixed(3));
  style.setProperty('--backdrop-opacity', easeInOut((seconds - LID_SECONDS) / 0.8).toFixed(3));
  style.setProperty('--card-opacity', card.toFixed(3));
  style.setProperty('--card-shift', `${(20 * (1 - card)).toFixed(2)}px`);
}

function preload(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

// Soft blush paper. Each panel is a slightly different shade, as folded paper
// catches the light differently. The tooth of the paper is generated
// (seamless at any screen size) and lit from the upper left.
const TONES = { lid: '#f6dcd8', side: '#f1d2cd', bottom: '#efcec9' } as const;

function PaperFilter({ id, seed, width }: { id: string; seed: number; width: number }) {
  // The region is the visible screen only; the panel paths reach far beyond it.
  return (
    <filter
      id={id}
      filterUnits="userSpaceOnUse"
      x="-8"
      y="-8"
      width={(width + 16).toFixed(1)}
      height={H + 16}
      colorInterpolationFilters="sRGB"
    >
      <feTurbulence type="fractalNoise" baseFrequency="0.38" numOctaves="2" seed={seed} result="grain" />
      <feGaussianBlur in="grain" stdDeviation="0.45" result="tooth" />
      <feTurbulence type="fractalNoise" baseFrequency="0.009 0.016" numOctaves="3" seed={seed + 5} result="cloud" />
      <feComposite in="tooth" in2="cloud" operator="arithmetic" k2="0.55" k3="0.7" result="surface" />
      <feDiffuseLighting in="surface" surfaceScale="0.95" diffuseConstant="1.19" lightingColor="#ffffff" result="light">
        <feDistantLight azimuth="235" elevation="58" />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" result="paper" />
      <feComposite in="paper" in2="SourceAlpha" operator="in" />
    </filter>
  );
}

function geometry(width: number) {
  const cx = width / 2;
  const far = 4000;
  const lidY = (d: number) => LID_TIP_Y - LID_SLOPE * d;
  const lid = `M${cx - far} ${lidY(far)} L${cx - 16} ${lidY(16)} Q${cx} ${LID_TIP_Y + 3} ${cx + 16} ${lidY(16)}`
    + ` L${cx + far} ${lidY(far)} L${cx + far} -${far} L${cx - far} -${far} Z`;
  const sideY = SIDE_MEET_Y - SIDE_SLOPE * far;
  const leftSide = `M${cx - far} ${sideY} L${cx} ${SIDE_MEET_Y} L${cx} ${H + 60} L${cx - far} ${H + 60} Z`;
  const rightSide = `M${cx + far} ${sideY} L${cx} ${SIDE_MEET_Y} L${cx} ${H + 60} L${cx + far} ${H + 60} Z`;
  const reach = (H + 60 - 519) / 0.92;
  const bottom = `M${cx - 66 - reach} ${H + 60} L${cx - 66} 519 C${cx - 36} 491 ${cx + 36} 491 ${cx + 66} 519`
    + ` L${cx + 66 + reach} ${H + 60} Z`;
  return { lid, leftSide, rightSide, bottom };
}

type Props = {
  state: InvitationState;
  onOpen: () => void;
  children: ReactNode;
};

export function EnvelopeIntro({ state, onOpen, children }: Props) {
  const experienceRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pendingOpen = useRef(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [viewport, setViewport] = useState({ width: 390, height: 844 });

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const measure = () => {
      const rect = scene.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const invitation = experienceRef.current?.querySelector<HTMLImageElement>('.invitation__art');
    void Promise.all([
      preload(monogramUrl),
      invitation?.decode().catch(() => undefined) ?? Promise.resolve(),
      import('./animation/scene').catch(() => undefined),
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
    if (assetsReady) onOpen();
    else pendingOpen.current = true;
  };

  const width = (H * viewport.width) / viewport.height;
  const { lid, leftSide, rightSide, bottom } = geometry(width);
  const viewBox = `0 0 ${width.toFixed(2)} ${H}`;

  return (
    <div ref={experienceRef} className="experience" data-state={state}>
      {children}
      <div
        ref={sceneRef}
        className="envelope-scene"
        aria-hidden="true"
        style={{ perspective: `${(PERSPECTIVE_HEIGHTS * viewport.height).toFixed(1)}px` }}
      >
        <svg className="envelope__defs" width="0" height="0" focusable="false">
          <defs>
            <PaperFilter id="paper-base" seed={3} width={width} />
            <PaperFilter id="paper-lid" seed={11} width={width} />
            <linearGradient id="envelope-inside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e6d2cf" />
              <stop offset=".35" stopColor="#f0e2df" />
              <stop offset=".6" stopColor="#f7eeec" />
            </linearGradient>
            <linearGradient id="lid-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff9f7" stopOpacity=".9" />
              <stop offset=".55" stopColor="#fff9f7" stopOpacity=".25" />
              <stop offset="1" stopColor="#b88a88" stopOpacity=".35" />
            </linearGradient>
            <radialGradient id="envelope-light" cx=".3" cy=".18" r="1.1">
              <stop offset="0" stopColor="#fff" stopOpacity=".16" />
              <stop offset=".6" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#5c2c33" stopOpacity=".1" />
            </radialGradient>
            <filter id="fold-shadow" filterUnits="userSpaceOnUse" x="-8" y="-8" width={(width + 16).toFixed(1)} height={H + 16}>
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
            <filter id="lid-shadow-blur" filterUnits="userSpaceOnUse" x="-8" y="-8" width={(width + 16).toFixed(1)} height={H + 16}>
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <WaxSealDefs />
          </defs>
        </svg>

        <svg className="envelope__base" viewBox={viewBox} preserveAspectRatio="none">
          <rect x="-10" y="-10" width={width + 20} height={H + 20} fill="url(#envelope-inside)" />
          <path d={leftSide} fill="#6d3a40" opacity=".22" filter="url(#fold-shadow)" transform="translate(0 3)" />
          <path d={rightSide} fill="#6d3a40" opacity=".22" filter="url(#fold-shadow)" transform="translate(0 3)" />
          <g filter="url(#paper-base)">
            <path d={leftSide} fill={TONES.side} />
            <path d={rightSide} fill={TONES.side} />
          </g>
          <path d={bottom} fill="#6d3a40" opacity=".26" filter="url(#fold-shadow)" transform="translate(0 -2)" />
          <path d={bottom} fill={TONES.bottom} filter="url(#paper-base)" />
          <rect x="-10" y="-10" width={width + 20} height={H + 20} fill="url(#envelope-light)" />
        </svg>
        <p className="envelope__hint">Tap to open</p>

        <div className="envelope__lid-shadow">
          <svg viewBox={viewBox} preserveAspectRatio="none">
            <path d={lid} fill="#8e5860" filter="url(#lid-shadow-blur)" />
          </svg>
        </div>

        {/* The sheen and the seal are separate layers inside the lid, so the
            changing light and the seal's rising face never repaint the paper. */}
        <div className="envelope__lid">
          <svg viewBox={viewBox} preserveAspectRatio="none">
            <path d={lid} fill={TONES.lid} filter="url(#paper-lid)" />
            <path d={lid} fill="url(#envelope-light)" />
          </svg>
          <div className="envelope__lid-sheen">
            <svg viewBox={viewBox} preserveAspectRatio="none">
              <path d={lid} fill="url(#lid-sheen)" />
            </svg>
          </div>
          <WaxSeal size={(SEAL_SIZE / H) * viewport.height} top={`${((SEAL_Y / H) * 100).toFixed(3)}%`} />
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
