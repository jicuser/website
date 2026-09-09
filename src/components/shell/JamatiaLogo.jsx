import React from 'react';
import { cn } from '@/lib/utils';
export default function JamatiaLogo({ className }) {
  return <div className={cn('brand-lockup', className)}><img src="/brand-logo.svg" alt="Jamatia Islamic Centre" decoding="async" fetchPriority="high" /></div>;
}
