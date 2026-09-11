import React from 'react';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/context/AppearanceContext';

export default function JamatiaLogo({ className, variant = 'wordmark' }) {
  const { theme } = useAppearance();
  const safeVariant = ['horizontal','centred','compact','wordmark','entrance','minaret','pillars'].includes(variant) ? variant : 'wordmark';
  return (
    <div className={cn('brand-lockup', `brand-${safeVariant}`, className)}>
      <img
        className="jic-brand-image"
        src={`/brand/jic-${safeVariant}-${theme === 'light' ? 'light' : 'dark'}.svg`}
        alt="Jamatia Islamic Centre"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
