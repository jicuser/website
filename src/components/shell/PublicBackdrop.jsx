import React from 'react';
import { IMAGES } from '@/content/images';

export default function PublicBackdrop() {
  return (
    <div className="jic-page-backdrop" aria-hidden="true">
      <img src={IMAGES.homeHero} alt="" fetchpriority="high" width="1150" height="1098" />
    </div>
  );
}
