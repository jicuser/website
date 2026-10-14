import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SECTIONS = {
  about: { to: '/about', title: 'About JIC' },
  services: {
    to: '/services',
    title: 'Services',
  },
  projects: {
    to: '/projects',
    title: 'Masjid Building Works',
  },
  gallery: {
    to: '/projects/gallery',
    title: 'Updates & Gallery',
  },
  support: {
    to: '/projects/how-to-support',
    title: 'Support the Works',
  },
  extension: {
    to: '/projects/masjid-extension',
    title: 'Masjid Extension',
  },
  education: {
    to: '/education',
    title: 'Education',
  },
  youth: { to: '/youth', title: 'Youth' },
  community: {
    to: '/services/community',
    title: 'Community',
  },
  events: {
    to: '/youth/trips-events',
    title: 'Trips & Events',
  },
  prayer: {
    to: '/prayer-times',
    title: 'Prayer Times',
  },
  contact: {
    to: '/contact',
    title: 'Visit the Centre',
  },
};
const RELATED = {
  about: ['services', 'projects', 'contact'],
  services: ['education', 'community', 'contact'],
  projects: ['extension', 'gallery', 'support', 'contact'],
  education: ['youth', 'events', 'contact'],
  youth: ['events', 'education', 'community'],
  community: ['youth', 'services', 'contact'],
  events: ['youth', 'education', 'community'],
  prayer: ['services', 'education', 'contact'],
};

export default function RelatedContent() {
  const { pathname } = useLocation();
  const root = pathname.split('/')[1];
  const group =
    pathname === '/services/community'
      ? 'community'
      : pathname === '/youth/trips-events'
        ? 'events'
        : ['team', 'contact', 'financial-history'].includes(root)
          ? 'about'
          : root === 'madrassah'
            ? 'education'
            : root === 'funerals'
              ? 'services'
              : ['worship', 'prayer-times'].includes(root)
                ? 'prayer'
                : root;
  const links = (RELATED[group] || [])
    .map((key) => SECTIONS[key])
    .filter((item) => item.to !== pathname);
  if (!links.length) return null;
  return (
    <nav className="jic-related jic-rail-section" aria-label="Related pages">
      <p>Explore JIC</p>
      <ul>
        {links.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>
              {item.title} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
