import { useSyncExternalStore } from 'react';
import type { Soundtrack } from './soundtrack';

type Props = { soundtrack: Soundtrack; visible: boolean };

export function MusicToggle({ soundtrack, visible }: Props) {
  const snapshot = useSyncExternalStore(
    (listener) => soundtrack.subscribe(listener),
    () => `${soundtrack.available}:${soundtrack.isMuted}`,
  );
  const [available, muted] = snapshot.split(':').map((value) => value === 'true');
  if (!available) return null;

  return (
    <button
      className="music-toggle"
      type="button"
      data-visible={visible}
      aria-pressed={muted}
      aria-label={muted ? 'Play music' : 'Mute music'}
      onClick={() => soundtrack.setMuted(!muted)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 17.5V6.2l10-2.2v11.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <ellipse cx="6.7" cy="17.6" rx="2.4" ry="1.9" fill="currentColor" />
        <ellipse cx="16.7" cy="15.4" rx="2.4" ry="1.9" fill="currentColor" />
        {muted && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
      </svg>
    </button>
  );
}
