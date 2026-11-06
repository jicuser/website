import React from 'react';

export default function PublicBackdrop({ src }) {
  return (
    <div className="jic-page-backdrop" aria-hidden="true">
      <img
        src={src}
        decoding="async"
        alt=""
        fetchpriority="high"
        width="1150"
        height="1098"
      />
    </div>
  );
}
