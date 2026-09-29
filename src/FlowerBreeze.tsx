import topLeft from './assets/flowers/top-left.webp';
import topRight from './assets/flowers/top-right.webp';
import left from './assets/flowers/left.webp';
import right from './assets/flowers/right.webp';
import bottomLeft from './assets/flowers/bottom-left.webp';
import bottomRight from './assets/flowers/bottom-right.webp';
import './flowers.css';

// The artwork's own corner flowers, cut out as pixel-exact layers over the
// painting (so at rest nothing changes) with a little sky around them. Each
// group sways very gently from the corner or edge it grows from, on its own
// timing, once the invitation has nearly finished fading in.
const ART = { width: 1024, height: 1536 };
const GROUPS = [
  { name: 'top-left', src: topLeft, x: 0, y: 0, w: 520, h: 714 },
  { name: 'top-right', src: topRight, x: 541, y: 0, w: 483, h: 714 },
  { name: 'left', src: left, x: 0, y: 685, w: 142, h: 511 },
  { name: 'right', src: right, x: 919, y: 685, w: 105, h: 511 },
  { name: 'bottom-left', src: bottomLeft, x: 0, y: 1168, w: 341, h: 368 },
  { name: 'bottom-right', src: bottomRight, x: 769, y: 1168, w: 255, h: 368 },
] as const;

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(4)}%`;

export function FlowerBreeze() {
  return (
    <div className="flowers" aria-hidden="true">
      {GROUPS.map((group) => (
        <img
          key={group.name}
          className={`flowers__group flowers__group--${group.name}`}
          src={group.src}
          alt=""
          draggable={false}
          style={{
            left: pct(group.x, ART.width),
            top: pct(group.y, ART.height),
            width: pct(group.w, ART.width),
            height: pct(group.h, ART.height),
          }}
        />
      ))}
    </div>
  );
}
