import React, { lazy } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Users } from 'lucide-react';
import AboutMasthead from '@/components/about/AboutMasthead';
import AboutDetails from '@/components/about/AboutDetails';
import HistorySection from '@/components/about/HistorySection';
import FinancialSection from '@/components/about/FinancialSection';
import SocialLinks from '@/components/about/SocialLinks';
import ContactSection from '@/components/about/ContactSection';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { ABOUT_SECTIONS, aboutSectionLink } from '@/content/aboutSections';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import { isPageVisible, visibleNavigation } from '@/lib/pageVisibility';
import { navigationName } from '@/lib/navigationConfiguration';

const TeamDirectory = lazy(() => import('@/components/about/TeamDirectory'));
const SocialChannels = lazy(() => import('@/components/about/SocialChannels'));

function Section({ path, id, name, children }) {
  return (
    <section id={id} aria-label={name} tabIndex={-1} className={`about-section about-${id}`}>
      {children}
      {path !== '/about/history' && (
        <ManagedPageContent pagePath={path} optional headingLevel={2} className="is-unframed" />
      )}
      <ManagedPageSections pagePath={path} />
    </section>
  );
}

export default function AboutPage() {
  const { pathname, search, hash, state } = useLocation();
  const { getContent } = useContent();
  const { isAdmin } = useAuth();
  const addedPages = usePublishedPages();
  const preview = new URLSearchParams(search).get('preview') === '1';
  const destination = aboutSectionLink(pathname, hash);
  if (pathname !== '/about' && (!preview || !hash)) {
    const [path, anchor] = destination.split('#');
    return (
      <Navigate
        to={{ pathname: preview ? pathname : path, search, hash: `#${anchor}` }}
        state={state}
        replace
      />
    );
  }
  const visible = (path) => isAdmin || isPageVisible(getContent, path);
  const navigation = visibleNavigation(PUBLIC_MENU_GROUPS, getContent, addedPages).find(
    ({ path }) => path === '/about',
  );
  // The configured menu leads; moved built-in sections retain their shared anchors.
  const aboutChildren = navigation?.children || [];
  const sectionLinks = [
    ...aboutChildren,
    ...ABOUT_SECTIONS.filter(
      ({ path }) => visible(path) && !aboutChildren.some((child) => child.path === path),
    ),
  ];
  const anchor = hash.slice(1);
  const selectedId =
    anchor === 'map'
      ? 'contact'
      : SOCIAL_CHANNELS.some((channel) => channel.id === anchor)
        ? 'social'
        : anchor === 'other-team-members'
          ? 'team'
          : anchor;
  const orderedSections = sectionLinks
    .map(({ path }) => ABOUT_SECTIONS.find((section) => section.path === path))
    .filter((section) => section && section.id === selectedId && visible(section.path));
  const sectionContent = {
    history: <HistorySection />,
    team: (
      <>
        <div className="about-section-intro">
          <p className="about-eyebrow">People of JIC</p>
          <h2>The people of JIC.</h2>
          <p>Founder members, trustees, committee and staff.</p>
        </div>
        <AboutDetails label="Meet the team" anchors={['team']}>
          <TeamDirectory />
        </AboutDetails>
      </>
    ),
    finances: <FinancialSection />,
    social: (
      <>
        <div className="about-section-intro">
          <p className="about-eyebrow">A closer community</p>
          <h2>Stay connected.</h2>
        </div>
        <SocialLinks />
        <AboutDetails label="Channel previews & notices" anchors={['social']}>
          <SocialChannels />
        </AboutDetails>
      </>
    ),
    contact: <ContactSection />,
  };
  return (
    <article id="overview" tabIndex={-1} className="about-page about-overview about-combined">
      <AboutMasthead title="About JIC">
        <p>
          Worship, learning and community at Jamatia Islamic Centre on Woodlands Road, Sparkhill,
          Birmingham.
        </p>
      </AboutMasthead>
      <nav className="about-jump-links" aria-label="About JIC topics">
        {sectionLinks
          .filter(({ path }) => path !== '/about')
          .map(({ path, name }) => (
            <Link
              key={path}
              to={aboutSectionLink(path)}
              aria-current={
                ABOUT_SECTIONS.find((section) => section.path === path)?.id === selectedId
                  ? 'page'
                  : undefined
              }
            >
              {navigationName(
                getContent,
                path,
                ABOUT_SECTIONS.find((section) => section.path === path)?.name || name,
              )}
            </Link>
          ))}
      </nav>
      <ManagedPageContent pagePath="/about" optional headingLevel={2} className="is-unframed" />
      <ManagedPageSections pagePath="/about" />
      {!selectedId && (
        <nav className="about-purpose-links" aria-label="Life at the centre">
          {[
            [Heart, 'Prayer & worship', 'Daily salah & Jummah', '/prayer-times'],
            [BookOpen, 'Learning', 'Classes & Madrassah', '/education'],
            [Users, 'Community services', 'Support & care', '/services'],
          ]
            .filter(([, , , path]) => visible(path))
            .map(([Icon, name, description, to]) => (
              <Link key={to} to={to}>
                <span className="about-purpose-symbol" aria-hidden="true">
                  <svg viewBox="0 0 80 84" fill="none">
                    <path d="M8 80V37C8 20 23 9 40 4C57 9 72 20 72 37V80" />
                    <path d="M1 80H79M15 73V38C15 25 27 16 40 11C53 16 65 25 65 38V73" />
                  </svg>
                  <Icon size={27} strokeWidth={1.5} />
                </span>
                <span className="about-purpose-copy">
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
        </nav>
      )}
      {orderedSections.map((section) => (
        <Section
          key={section.path}
          {...section}
          name={navigationName(getContent, section.path, section.name)}
        >
          {sectionContent[section.id]}
        </Section>
      ))}
    </article>
  );
}
