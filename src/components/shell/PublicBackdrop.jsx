import { OPTIMIZED_IMAGES } from '@/content/optimizedImages';
import React from 'react';
import { IMAGES } from '@/content/images';

export default function PublicBackdrop() {
  return (
    <div className="jic-page-backdrop" aria-hidden="true">
      <img
        src={OPTIMIZED_IMAGES[IMAGES.homeHero] || IMAGES.homeHero}
        decoding="async"
        alt=""
        fetchpriority="high"
        width="1150"
        height="1098"
      />
    </div>
  );
}
