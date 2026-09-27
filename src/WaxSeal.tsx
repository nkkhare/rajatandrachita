import type { CSSProperties } from 'react';
import monogramUrl from './assets/embossed-rr.webp';

// The seal rides the lid but keeps facing the viewer, so it stays a round,
// embossed disc through the whole opening instead of flattening into an oval.
// The face is a greyscale height map (white = raised wax) lit by SVG lighting
// filters; a second lighting pass, faded in as the lid lifts, slides the
// highlights across it. Layers are rasterised once and only transformed.
const SEAL_RADIUS = 120;
const VIEW_BOX = '-132 -132 264 264';

function blobPath() {
  const steps = 216;
  let d = '';
  for (let index = 0; index <= steps; index++) {
    const angle = (index / steps) * Math.PI * 2;
    const radius = SEAL_RADIUS - 4
      + 4.6 * Math.sin(angle * 9 + 0.4)
      + 2.1 * Math.sin(angle * 5 + 1.3)
      + 1.2 * Math.sin(angle * 14 + 2.1)
      + 0.9 * Math.sin(angle * 3 + 0.2);
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
      <feGaussianBlur in="height" stdDeviation="8" result="dome" />
      <feGaussianBlur in="height" stdDeviation="1.3" result="crisp" />
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="noise" />
      <feComposite in="dome" in2="crisp" operator="arithmetic" k2="0.5" k3="0.5" result="shape" />
      <feComposite in="shape" in2="noise" operator="arithmetic" k2="1" k3="0.012" result="relief" />
      <feDiffuseLighting in="relief" surfaceScale="7.5" diffuseConstant="1.02" lightingColor="#ffffff" result="diffuse">
        <feDistantLight azimuth={light.azimuth} elevation={light.elevation} />
      </feDiffuseLighting>
      <feSpecularLighting in="relief" surfaceScale="7.5" specularConstant="1.15" specularExponent="28" lightingColor="#ffe9e4" result="spec">
        <feDistantLight azimuth={light.azimuth} elevation={light.specularElevation} />
      </feSpecularLighting>
      <feFlood floodColor="#86192f" result="wax" />
      <feComposite in="wax" in2="diffuse" operator="arithmetic" k1="1.02" k4="0.035" result="lit" />
      <feComposite in="lit" in2="spec" operator="arithmetic" k2="1" k3="0.75" result="glossy" />
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
      <ReliefFilter id="wax-relief-tilted" light={{ azimuth: 262, elevation: 38, specularElevation: 16 }} />
      <filter id="wax-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id="monogram-height" colorInterpolationFilters="sRGB">
        <feColorMatrix values="0 0 0 0 .97  0 0 0 0 .97  0 0 0 0 .97  0 0 0 1 0" />
      </filter>
    </>
  );
}

function Face({ filter }: { filter: string }) {
  return (
    <g filter={`url(#${filter})`}>
      <path d={BLOB} fill="#ffffff" />
      <circle r="86" fill="#727272" />
      <circle r="84" fill="none" stroke="#b9b9b9" strokeWidth="3" />
      <image
        href={monogramUrl}
        x="-98"
        y="-45"
        width="196"
        height="89"
        preserveAspectRatio="xMidYMid meet"
        filter="url(#monogram-height)"
      />
    </g>
  );
}

type Props = { size: number };

export function WaxSeal({ size }: Props) {
  const box = size * (264 / 240);
  const style: CSSProperties = { width: `${box}px`, height: `${box}px` };

  return (
    <div className="seal" style={style}>
      <svg className="seal__layer" viewBox={VIEW_BOX}>
        <ellipse cx="5" cy="9" rx="114" ry="110" fill="#4a1622" opacity=".24" filter="url(#wax-shadow)" />
        <ellipse cx="1" cy="3" rx="117" ry="115" fill="#4a1622" opacity=".22" filter="url(#wax-shadow)" />
        <Face filter="wax-relief" />
      </svg>
      <svg className="seal__layer seal__layer--tilted" viewBox={VIEW_BOX}>
        <Face filter="wax-relief-tilted" />
      </svg>
    </div>
  );
}
