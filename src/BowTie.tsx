import { useEffect, useRef, useState } from 'react';
import bowUrl from './assets/bow/bow.png';
import { BOW_SIZE, BowTie as BowTieAnimation } from './animation/bowTie';
import './bow.css';

// Where the approved bow sits in the 1024 x 1536 artwork, and the wider area
// (in bow pixels) the loose vines move through while it ties.
const ART = { width: 1024, height: 1536 };
const BOW = { x: 448.75, y: 530, width: 142 };
const SCALE = BOW.width / BOW_SIZE.width;
const VIEW = { x0: -290, x1: 490, y0: -50, y1: 165 };
const HANDOFF = { start: 1.95, end: 2.1 };   // the painting takes over from the drawn vines

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(4)}%`;

type Props = { play: boolean };

export function BowTie({ play }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintingRef = useRef<HTMLImageElement>(null);
  const [done, setDone] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tieRef = useRef<BowTieAnimation | null>(null);
  const [ready, setReady] = useState(false);

  // Prepare the vine strips once, from the approved painting.
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => { if (!cancelled) { tieRef.current = new BowTieAnimation(image); setReady(true); } };
    image.onerror = () => { if (!cancelled) setDone(true); };
    image.src = bowUrl;
    return () => { cancelled = true; };
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current, tie = tieRef.current;
    if (reduced || !ready || !canvas || !tie) return;
    let frame = 0;

    const draw = (seconds: number) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * ratio)), h = Math.max(1, Math.round(rect.height * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const k = w / (VIEW.x1 - VIEW.x0);
      ctx.setTransform(k, 0, 0, k, -VIEW.x0 * k, -VIEW.y0 * k);
      ctx.imageSmoothingQuality = 'high';
      tie.draw(ctx, seconds);
    };

    if (!play) { draw(0); return; }                  // the loose vines, waiting
    const began = performance.now();
    const tick = (now: number) => {
      const seconds = (now - began) / 1000;
      draw(seconds);
      const handoff = Math.min(1, Math.max(0, (seconds - HANDOFF.start) / (HANDOFF.end - HANDOFF.start)));
      if (paintingRef.current) paintingRef.current.style.opacity = String(handoff);
      if (seconds < HANDOFF.end) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, ready, reduced]);

  const showPainting = reduced || done;
  return (
    <div className="bow" aria-hidden="true">
      {!reduced && !done && (
        <canvas
          ref={canvasRef}
          className="bow__vines"
          style={{
            left: pct(BOW.x + VIEW.x0 * SCALE, ART.width),
            top: pct(BOW.y + VIEW.y0 * SCALE, ART.height),
            width: pct((VIEW.x1 - VIEW.x0) * SCALE, ART.width),
            height: pct((VIEW.y1 - VIEW.y0) * SCALE, ART.height),
          }}
        />
      )}
      <img
        ref={paintingRef}
        className="bow__painting"
        src={bowUrl}
        alt=""
        draggable={false}
        style={{
          left: pct(BOW.x, ART.width),
          top: pct(BOW.y, ART.height),
          width: pct(BOW.width, ART.width),
          height: pct(BOW_SIZE.height * SCALE, ART.height),
          // hidden by CSS until the handoff (set directly, so renders never reset it)
          opacity: showPainting ? 1 : undefined,
        }}
      />
    </div>
  );
}
