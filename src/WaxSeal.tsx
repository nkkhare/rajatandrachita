import monogramUrl from './assets/embossed-rr.webp';

// The seal is drawn as a greyscale height map (white = raised wax) and lit
// by SVG lighting filters, so the rim, stamped face, and monogram pick up
// soft highlights like a real pressed seal instead of flat vector fills.
const SEAL_RADIUS = 120;

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

export function WaxSealDefs() {
  return (
    <>
      <filter id="wax-relief" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="height" />
        <feGaussianBlur in="height" stdDeviation="8" result="dome" />
        <feGaussianBlur in="height" stdDeviation="1.3" result="crisp" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="noise" />
        <feComposite in="dome" in2="crisp" operator="arithmetic" k2="0.5" k3="0.5" result="shape" />
        <feComposite in="shape" in2="noise" operator="arithmetic" k2="1" k3="0.012" result="relief" />
        <feDiffuseLighting in="relief" surfaceScale="7.5" diffuseConstant="1.02" lightingColor="#ffffff" result="diffuse">
          <feDistantLight azimuth="235" elevation="56" />
        </feDiffuseLighting>
        <feSpecularLighting in="relief" surfaceScale="7.5" specularConstant="1.15" specularExponent="28" lightingColor="#ffe9e4" result="spec">
          <feDistantLight azimuth="235" elevation="28" />
        </feSpecularLighting>
        <feFlood floodColor="#86192f" result="wax" />
        <feComposite in="wax" in2="diffuse" operator="arithmetic" k1="1.02" k4="0.035" result="lit" />
        <feComposite in="lit" in2="spec" operator="arithmetic" k2="1" k3="0.75" result="glossy" />
        <feComposite in="glossy" in2="SourceAlpha" operator="in" />
      </filter>
      <filter id="wax-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id="monogram-height" colorInterpolationFilters="sRGB">
        <feColorMatrix values="0 0 0 0 .97  0 0 0 0 .97  0 0 0 0 .97  0 0 0 1 0" />
      </filter>
    </>
  );
}

type Props = { cx: number; cy: number; size: number };

export function WaxSeal({ cx, cy, size }: Props) {
  const scale = size / (SEAL_RADIUS * 2);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <ellipse cx="5" cy="9" rx="114" ry="110" fill="#4a1622" opacity=".24" filter="url(#wax-shadow)" />
      <ellipse cx="1" cy="3" rx="117" ry="115" fill="#4a1622" opacity=".22" filter="url(#wax-shadow)" />
      <g filter="url(#wax-relief)">
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
    </g>
  );
}
