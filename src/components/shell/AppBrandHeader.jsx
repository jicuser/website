import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import JamatiaLogo from './JamatiaLogo';
import { useContent } from '@/context/ContentContext';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { visibleNavigation } from '@/lib/pageVisibility';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';

export default function AppBrandHeader() {
  const { pathname } = useLocation();
  const { getContent } = useContent();
  const addedPages = usePublishedPages();
  const prayerPage = pathname === '/prayer-times' || pathname.startsWith('/prayer-times/');
  const links = prayerPage
    ? visibleNavigation(PUBLIC_MENU_GROUPS, getContent, addedPages)
        .find((group) => group.path === '/prayer-times')?.children || []
    : [];
  return (
    <header className="jic-app-brand-header">
      <Link to="/" aria-label="Jamatia Islamic Centre home">
        <JamatiaLogo variant="wordmark" />
      </Link>
      {links.length > 0 && (
        <nav className="jic-app-section-links" aria-label="Salah pages">
          {links.map((item) => (
            <Link key={item.path} to={item.path} aria-current={pathname === item.path ? 'page' : undefined}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
