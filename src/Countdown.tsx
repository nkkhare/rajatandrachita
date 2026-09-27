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
  const centers = [91, 273, 455];

  return (
    <svg
      className="invitation__countdown"
      viewBox="0 0 546 122"
      preserveAspectRatio="none"
      role="timer"
      aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes until May 14, 2027`}
    >
      <defs>
        <radialGradient id="countdown-paper" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#fff4ea" stopOpacity=".42" />
          <stop offset="100%" stopColor="#fbe3d6" stopOpacity=".3" />
        </radialGradient>
      </defs>
      <path
        d="M13 1 H533 C533 14 538 21 545 26 V96 C538 101 533 109 533 121 H13 C13 109 8 101 1 96 V26 C8 21 13 14 13 1 Z"
        fill="url(#countdown-paper)"
        stroke="#b07a5a"
        strokeWidth="1.5"
      />
      <path d="M182 22 V100 M364 22 V100" stroke="#b98463" strokeWidth="1.2" />
      {centers.map((x, index) => (
        <g key={labels[index]} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif">
          <text x={x} y="64" fontSize="45.6" fontWeight="400" fill="#a05253">{values[index]}</text>
          <text x={x} y="100" fontSize="19" letterSpacing="3" fill="#b06e6c">{labels[index]}</text>
        </g>
      ))}
    </svg>
  );
}
