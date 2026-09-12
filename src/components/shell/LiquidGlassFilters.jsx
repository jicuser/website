import React from 'react';

// Functional displacement maps: neutral centre, smoothly curved outer 14%.
// Filter only the backdrop. Never apply SVG filters to text or foreground images.
function channelMap(vertical = false) {
  const colour = (value) => (vertical ? `rgb(0,${value},0)` : `rgb(${value},0,0)`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="g" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop stop-color="${colour(0)}"/><stop offset=".14" stop-color="${colour(128)}"/><stop offset=".86" stop-color="${colour(128)}"/><stop offset="1" stop-color="${colour(255)}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const HORIZONTAL_MAP = channelMap();
const VERTICAL_MAP = channelMap(true);

export default function LiquidGlassFilters() {
  return (
    <svg
      className="jic-glass-filter-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="jic-liquid-refraction"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={HORIZONTAL_MAP}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="horizontal"
          />
          <feImage
            href={VERTICAL_MAP}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="vertical"
          />
          <feComposite
            in="horizontal"
            in2="vertical"
            operator="arithmetic"
            k2="1"
            k3="1"
            result="edges"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edges"
            scale="20"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
