import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContentPages } from './ContentPagesContext';
import { pageUrl, REGISTRATION_TYPES } from '@/lib/pageContent';
export default function ContentPageCards() {
  const { pathname } = useLocation();
  const { pages } = useContentPages();
  const shown = pages.filter((page) => page.placement === pathname);
  if (!shown.length) return null;
  return (
    <section className="container mx-auto px-4 py-5">
      <h2 className="text-xl font-semibold mb-4">
        {pathname === '/education/courses' ? 'Current courses & classes' : 'Explore this section'}
      </h2>
      <div className="content-card-grid">
        {shown.map((page) => (
          <Link key={page.id} to={pageUrl(page)} className="content-public-card">
            {page.image_url && <img src={page.image_url} alt="" loading="lazy" />}
            <div>
              <h3>{page.title}</h3>
              {page.schedule && <p>{page.schedule}</p>}
              {page.registration !== 'none' && (
                <span>
                  {page.accepting
                    ? REGISTRATION_TYPES.find(([key]) => key === page.registration)?.[1]
                    : 'Registrations closed'}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
