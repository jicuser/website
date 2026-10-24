import React from 'react';

/** Small original diagrams of the reading choices; no decorative religious text. */
export default function ReadingIllustration({ resource }) {
  return (
    <svg
      className={`worship-resource-illustration is-${resource}`}
      viewBox="0 0 160 104"
      fill="none"
      aria-hidden="true"
    >
      {resource === 'adhkar' && (
        <>
          <path className="worship-diagram-wash" d="M16 84a64 64 0 0 1 128 0H16Z" />
          <path d="M21 74h118M39 58a22 22 0 0 1 44 0M61 21v-8M32 29l6 6M84 35l6-6" />
          <path d="M112 29a18 18 0 1 0 22 25 20 20 0 0 1-22-25Z" />
          <circle cx="41" cy="87" r="3" />
          <circle cx="80" cy="87" r="3" />
          <circle cx="119" cy="87" r="3" />
        </>
      )}
      {resource === 'quran' && (
        <>
          <rect className="worship-diagram-wash" x="22" y="17" width="116" height="77" rx="18" />
          <path d="M80 84c-17-11-34-12-53-9V25c19-3 36-2 53 9 17-11 34-12 53-9v50c-19-3-36-2-53 9Zm0 0V34" />
          <path d="m39 39 26 6m-26 8 26 6m-26 8 26 6m30-28 12-3m-12 17 26-6m-26 20 26-6M119 24v23l-6-4-6 4V25" />
        </>
      )}
      {resource === 'janazah' && (
        <>
          <rect className="worship-diagram-wash" x="9" y="20" width="142" height="65" rx="25" />
          <path d="M30 52h100" />
          {[26, 62, 98, 134].map((x, index) => (
            <g key={x}>
              <circle className="worship-diagram-step" cx={x} cy="52" r="14" />
              <text x={x} y="57" textAnchor="middle">
                {index + 1}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
