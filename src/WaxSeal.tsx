import type { CSSProperties, ReactNode } from 'react';
import monogramUrl from './assets/embossed-rr.webp';

// The seal has real thickness. As the lid tips toward the viewer, the
// embossed face rises off its base by the wax's depth (projected for the lid
// angle), and a band of darker wax fills the gap, so the side wall comes into
// view instead of the seal flattening like a sticker. The face is a greyscale
// height map (white = raised wax) lit by SVG lighting filters; a second
// lighting pass, faded in as the lid tilts, slides the highlights across it.
// Every layer is rasterised once and only moved, so the flip never repaints.
const SEAL_RADIUS = 120;
const VIEW_BOX = '-132 -132 264 264';
export const SEAL_DEPTH_RATIO = 0.065; // wax thickness as a fraction of the seal's width

function blobPath() {
  const steps = 216;
  let d = '';
  for (let index = 0; index <= steps; index++) {
    const angle = (index / steps) * Math.PI * 2;
    // A nearly perfect round pressed seal, with just a touch of irregularity.
    const radius = SEAL_RADIUS - 4
      + 0.9 * Math.sin(angle * 7 + 0.4)
      + 0.6 * Math.sin(angle * 3 + 1.3);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    d += `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

const BLOB = blobPath();

type Light = { azimuth: number; elevation: number; specularElevation: number };

function ReliefFilter({ id, light }: { id: string; light: Light }) {
  return (
    <filter id={id} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="height" />
      <feGaussianBlur in="height" stdDeviation="10" result="dome" />
      <feGaussianBlur in="height" stdDeviation="1.3" result="crisp" />
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="noise" />
      <feComposite in="dome" in2="crisp" operator="arithmetic" k2="0.5" k3="0.5" result="shape" />
      <feComposite in="shape" in2="noise" operator="arithmetic" k2="1" k3="0.012" result="relief" />
      <feDiffuseLighting in="relief" surfaceScale="6" diffuseConstant="0.9" lightingColor="#ffffff" result="diffuse">
        <feDistantLight azimuth={light.azimuth} elevation={light.elevation} />
      </feDiffuseLighting>
      <feSpecularLighting in="relief" surfaceScale="6" specularConstant="1.2" specularExponent="20" lightingColor="#ffffff" result="spec">
        <feDistantLight azimuth={light.azimuth} elevation={light.specularElevation} />
      </feSpecularLighting>
      <feFlood floodColor="#f1e5d7" result="wax" />
      <feComposite in="wax" in2="diffuse" operator="arithmetic" k1="1.02" k4="0.1" result="lit" />
      <feComposite in="lit" in2="spec" operator="arithmetic" k2="1" k3="0.55" result="glossy" />
      <feComposite in="glossy" in2="SourceAlpha" operator="in" />
    </filter>
  );
}

export function WaxSealDefs() {
  return (
    <>
      <ReliefFilter id="wax-relief" light={{ azimuth: 235, elevation: 56, specularElevation: 28 }} />
      {/* Light as seen once the lid has tipped toward the viewer: it rakes
          across the face from above, brightening the upper rim. */}
      <ReliefFilter id="wax-relief-tilted" light={{ azimuth: 262, elevation: 50, specularElevation: 20 }} />
      {/* The rim rounds off gently toward the paper instead of a hard drop. */}
      <radialGradient id="seal-rim" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="118">
        <stop offset=".72" stopColor="#ffffff" />
        <stop offset=".9" stopColor="#e6e6e6" />
        <stop offset="1" stopColor="#9a9a9a" />
      </radialGradient>
      <filter id="wax-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id="monogram-height" colorInterpolationFilters="sRGB">
        <feColorMatrix values="0 0 0 0 .97  0 0 0 0 .97  0 0 0 0 .97  0 0 0 1 0" />
      </filter>
      {/* The seal's side is the same wax as its rim: a rounded edge that
          catches a line of light along the bottom as the lid tips. */}
      <linearGradient id="wax-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset=".5" stopColor="#cdbfac" />
        <stop offset=".82" stopColor="#ddd1bf" />
        <stop offset=".94" stopColor="#f3ece1" />
        <stop offset="1" stopColor="#bcae9a" />
      </linearGradient>
    </>
  );
}

// Rose-and-leaf garlands arching above and below the monogram, as on the
// reference seal. Drawn into the height map, so they are embossed in the wax.
function Garland({ from, to }: { from: number; to: number }) {
  const items: ReactNode[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    const x = Math.cos(a) * 64, y = Math.sin(a) * 64;
    const tangent = (a * 180) / Math.PI + 90;
    if (i % 2 === 1) {
      items.push(
        <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
          <circle r="8" fill="#cfcfcf" />
          <path d="M-5 0 A5 5 0 1 1 0 5 A3 3 0 1 1 -2 -1.2 A1.4 1.4 0 1 1 0.6 0.6" fill="none" stroke="#8a8a8a" strokeWidth="1.2" />
        </g>,
      );
    } else {
      for (const tilt of [-28, 28]) {
        items.push(<ellipse key={`${i}${tilt}`} cx={x.toFixed(1)} cy={y.toFixed(1)} rx="8" ry="3.2" fill="#bebebe"
          transform={`rotate(${(tangent + tilt).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`} />);
      }
    }
  }
  return <g>{items}</g>;
}

function Face({ filter }: { filter: string }) {
  return (
    <g filter={`url(#${filter})`}>
      <path d={BLOB} fill="url(#seal-rim)" />
      <circle r="82" fill="#6a6a6a" />
      <circle r="80" fill="none" stroke="#a9a9a9" strokeWidth="2.4" />
      <Garland from={-150} to={-30} />
      <Garland from={30} to={150} />
      <image
        href={monogramUrl}
        x="-122"
        y="-55"
        width="244"
        height="110"
        preserveAspectRatio="xMidYMid meet"
        filter="url(#monogram-height)"
      />
    </g>
  );
}

type Props = { size: number; top: string };

export function WaxSeal({ size, top }: Props) {
  const box = size * (264 / 240);
  const style = {
    width: `${box}px`,
    height: `${box}px`,
    top,
    '--seal-depth': `${(size * SEAL_DEPTH_RATIO).toFixed(2)}px`,
  } as CSSProperties;

  return (
    <div className="seal" style={style}>
      <svg className="seal__layer" viewBox={VIEW_BOX}>
        <ellipse cx="5" cy="9" rx="114" ry="110" fill="#2f3c52" opacity=".24" filter="url(#wax-shadow)" />
        <ellipse cx="1" cy="3" rx="117" ry="115" fill="#2f3c52" opacity=".2" filter="url(#wax-shadow)" />
        <path d={BLOB} fill="url(#wax-wall)" />
      </svg>
      <div className="seal__wall" />
      <svg className="seal__layer seal__face" viewBox={VIEW_BOX}>
        <Face filter="wax-relief" />
      </svg>
      <svg className="seal__layer seal__face seal__face--tilted" viewBox={VIEW_BOX}>
        <Face filter="wax-relief-tilted" />
      </svg>
    </div>
  );
}
