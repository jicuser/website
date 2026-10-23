import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import RamadanBoard from '@/features/ramadan/RamadanBoard';
export default function RamadanDisplayPage() {
  const [params, setParams] = useSearchParams(),
    kind = params.get('kind') === 'daily' ? 'daily' : 'iftar',
    portrait = params.get('shape') === 'portrait';
  const update = (key, value) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(key, value);
      return next;
    });
  return (
    <main className="ramadan-screen">
      <nav className="ramadan-screen-controls" aria-label="Ramadan screen controls">
        <button aria-pressed={kind === 'iftar'} onClick={() => update('kind', 'iftar')}>
          Iftar sponsorships
        </button>
        <button aria-pressed={kind === 'daily'} onClick={() => update('kind', 'daily')}>
          Daily Giving
        </button>
        <button
          aria-pressed={portrait}
          onClick={() => update('shape', portrait ? 'landscape' : 'portrait')}
        >
          {portrait ? 'Portrait' : 'Landscape'}
        </button>
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
          Full screen
        </button>
        <Link to="/ramadan">Website</Link>
      </nav>
      <RamadanBoard kind={kind} portrait={portrait} />
    </main>
  );
}
