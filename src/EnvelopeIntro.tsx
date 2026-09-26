import { useLayoutEffect, useRef, type ReactNode } from 'react';

export type InvitationState = 'closed' | 'opening' | 'revealed';

// Set to true to slow the reveal to five seconds and label its layers.
export const DEBUG_ENVELOPE = false;
export const REVEAL_DURATION_MS = DEBUG_ENVELOPE ? 5000 : 2100;

type Props = {
  state: InvitationState;
  onOpen: () => void;
  children: ReactNode;
};

export function EnvelopeIntro({ state, onOpen, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const back = backRef.current;
    if (!stage || !back) return;

    const updateGeometry = () => {
      const card = stage.getBoundingClientRect();
      const envelope = back.getBoundingClientRect();
      if (!card.width || !envelope.width) return;

      // The full-size invitation stays in this stage throughout the reveal.
      // These values place its scaled version just inside the envelope, then
      // lift roughly 45% of that smaller card above the envelope's top edge.
      const scale = envelope.width * 0.72 / card.width;
      const smallCardHeight = card.height * scale;
      const insertedY = (smallCardHeight - envelope.height) / 2 + envelope.height * 0.1;
      const emergedY = insertedY - envelope.height * 0.9;
      stage.style.setProperty('--insert-scale', String(scale));
      stage.style.setProperty('--insert-y', `${insertedY}px`);
      stage.style.setProperty('--emerged-y', `${emergedY}px`);
    };

    const observer = new ResizeObserver(updateGeometry);
    observer.observe(stage);
    observer.observe(back);
    updateGeometry();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={stageRef}
      className="experience"
      data-state={state}
      data-debug-envelope={DEBUG_ENVELOPE}
      style={{ '--reveal-duration': `${REVEAL_DURATION_MS}ms` } as React.CSSProperties}
    >
      <div ref={backRef} className="envelope__back envelope-piece" data-layer="back" aria-hidden="true" />
      {children}
      <div className="envelope__front envelope-piece" data-layer="front" aria-hidden="true" />
      <div className="envelope__flap envelope-piece" data-layer="flap" aria-hidden="true" />
      <div className="envelope__seal" data-layer="seal" aria-hidden="true">R<span>&amp;</span>R</div>
      <button
        className="envelope__hit-area envelope-piece"
        type="button"
        aria-label="Open the save-the-date invitation"
        disabled={state !== 'closed'}
        onClick={onOpen}
      />
      <span className="envelope__instruction" aria-hidden="true">Tap to open</span>
    </div>
  );
}
