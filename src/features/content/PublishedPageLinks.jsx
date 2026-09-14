import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import usePosters from '@/hooks/usePosters';
import { pageUrl } from '@/lib/pageContent';

export default function PublishedPageLinks() {
  const { pathname } = useLocation();
  const pages = usePublishedPages();
  const posters = usePosters();
  const group = pathname.split('/')[1];
  const listed = pages.filter(page => page.placement === pathname && !posters.some(poster =>
    poster.id === page.source_poster_id && poster.groups.includes(group),
  ));
  if (!listed.length) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 py-6" aria-label="Pages in this section">
      <h2 className="text-xl font-semibold">Explore this section</h2>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {listed.map(page => (
          <Link key={page.id} to={pageUrl(page)} className="rounded-2xl border border-border bg-card/80 p-5">
            <strong>{page.title}</strong>
            {page.schedule && <p className="text-sm mt-2">{page.schedule}</p>}
            <span className="text-sm">View details →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
