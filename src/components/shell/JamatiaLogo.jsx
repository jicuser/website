import React from 'react';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/context/AppearanceContext';

// Match the SVG viewBoxes so the browser reserves space before either theme image loads.
const dimensions = {
  horizontal: [2620, 1144],
  centred: [1286, 1223],
  compact: [1056, 760],
  wordmark: [680, 265],
  entrance: [926, 1064],
  minaret: [210, 1144],
  'minaret-compact': [132, 702],
  pillars: [1650, 1144],
  arch: [614, 665],
};

export default function JamatiaLogo({ className, variant = 'horizontal' }) {
  const { theme } = useAppearance();
  const safeVariant = Object.hasOwn(dimensions, variant) ? variant : 'horizontal';
  const [width, height] = dimensions[safeVariant];
  return (
    <div className={cn('brand-lockup', `brand-${safeVariant}`, className)}>
      <img
        className="jic-brand-image"
        src={`/brand/jic-${safeVariant}-${theme === 'light' ? 'light' : 'dark'}.svg?v=stone-glass-1`}
        alt="Jamatia Islamic Centre"
        width={width}
        height={height}
        decoding="async"
        fetchpriority="high"
      />
    </div>
  );
}
