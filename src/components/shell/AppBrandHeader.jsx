import React, { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JamatiaLogo from './JamatiaLogo';
import { useContent } from '@/context/ContentContext';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { activeNavigation } from '@/lib/publicNavigation';
import { visibleNavigation, isPageVisible, pageSectionKey } from '@/lib/pageVisibility';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import AppHomeRadio from '@/components/home/AppHomeRadio';
import { isSalahRoute } from '@/lib/salahRoute';

export default function AppBrandHeader({ home = false }) {
  const { pathname } = useLocation();
  const sectionLinks = useRef(null);
  const { getContent } = useContent();
  const addedPages = usePublishedPages();
  const original = activeNavigation(pathname);
  const groups = visibleNavigation(PUBLIC_MENU_GROUPS, getContent, addedPages);
  const section =
    groups.find((group) => group.path === getContent(pageSectionKey(pathname), '')) ||
    groups.find((group) => group.path === original?.path) ||
    original;
  const links =
    pathname === '/' || pathname === '/services' || isSalahRoute(pathname)
      ? []
      : (section?.children || []).filter((page) => isPageVisible(getContent, page.path));
  const selected =
    links
      .filter(
        (item) =>
          pathname === item.path ||
          (item.path !== section?.path && pathname.startsWith(`${item.path}/`)),
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.path || original?.current?.path;
  useLayoutEffect(() => {
    const rail = sectionLinks.current;
    const current = rail?.querySelector('[aria-current]');
    if (!current) return;
    rail.scrollLeft = current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2;
  }, [selected, links.length]);
  const Header = home ? 'div' : 'header';
  return (
    <Header className={`jic-app-brand-header${home ? ' is-home' : ''}`}>
      <Link to="/" aria-label="Jamatia Islamic Centre home">
        <JamatiaLogo variant="wordmark" />
      </Link>
      {home && <AppHomeRadio compact />}
      {links.length > 0 && (
        <div className="jic-app-section-navigation">
          <div className="jic-app-section-caption">
            <span>{section.name}</span>
            {!['/prayer-times', '/services'].includes(section.path) && (
              <Link to="/services">Community Hub ↗</Link>
            )}
          </div>
          <nav
            ref={sectionLinks}
            className="jic-app-section-links"
            aria-label={`${section.name} pages`}
          >
            {links.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={
                  selected === item.path
                    ? pathname === item.path
                      ? 'page'
                      : 'location'
                    : undefined
                }
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </Header>
  );
}
