import React from 'react';
import { cn } from '@/lib/utils';

export default function JamatiaLogo({ className, compact = false }) {
  return (
    <div className={cn('brand-lockup', className)}>
      <img
        src={compact ? '/jic-minaret-wordmark.svg' : '/jic-arch-logo.svg'}
        alt="Jamatia Islamic Centre"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
