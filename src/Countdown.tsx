import { useEffect, useState } from 'react';

// Midnight in Philadelphia on May 14, 2027 (Eastern Daylight Time).
const EVENT_TIME = new Date('2027-05-14T00:00:00-04:00').getTime();

type Remaining = { days: number; hours: number; minutes: number };

function getRemaining(): Remaining {
  const totalMinutes = Math.max(0, Math.floor((EVENT_TIME - Date.now()) / 60_000));
  return {
    days: Math.floor(totalMinutes / 1_440),
    hours: Math.floor((totalMinutes % 1_440) / 60),
    minutes: totalMinutes % 60,
  };
}

export function Countdown() {
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    let timer: number;
    const update = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      setRemaining(getRemaining());
      // Align the update with the next minute boundary so the displayed
      // minutes change promptly without rendering the component every second.
      timer = window.setTimeout(update, 60_000 - (Date.now() % 60_000) + 50);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const values = [remaining.days, remaining.hours, remaining.minutes];
  const labels = ['DAYS', 'HOURS', 'MINUTES'];
  const centers = [59.5, 178, 296.5];

  // A compact, secondary panel (about two-thirds the width of the printed
  // box it replaced) so the names, flowers, and skyline stay the focus.
  return (
    <svg
      className="invitation__countdown"
      viewBox="0 0 356 110"
      preserveAspectRatio="none"
      role="timer"
      aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes until May 14, 2027`}
    >
      <defs>
        <radialGradient id="countdown-paper" cx="50%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#fff8f1" stopOpacity=".86" />
          <stop offset="100%" stopColor="#fbe9df" stopOpacity=".78" />
        </radialGradient>
      </defs>
      <path
        d="M10 1 H169 L178 8 L187 1 H346 C346 11 350 17 355 20 V90 C350 93 346 99 346 109 H10 C10 99 6 93 1 90 V20 C6 17 10 11 10 1 Z"
        fill="url(#countdown-paper)"
        stroke="#c9ad76"
        strokeOpacity=".8"
        strokeWidth="1"
      />
      <path d="M118.7 24 V86 M237.3 24 V86" stroke="#cdb383" strokeOpacity=".7" strokeWidth=".8" />
      {centers.map((x, index) => (
        <g key={labels[index]} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif">
          <text x={x} y="60" fontSize="40" fill="#7c3a4b">{values[index]}</text>
          <text x={x} y="87" fontSize="12.5" letterSpacing="2.6" fill="#a4855a">{labels[index]}</text>
        </g>
      ))}
    </svg>
  );
}
