import React from 'react';
import { useAppearance } from '@/context/AppearanceContext';

/** Use JIC's actual entrance and minarets, not a generic mosque symbol. */
export default function MosqueIcon({ className }) {
  const { theme } = useAppearance();
  return <img className={className} src={`/brand/jic-entrance-${theme === 'light' ? 'light' : 'dark'}.svg?v=stone-glass-1`} alt="" aria-hidden="true"/>;
}
