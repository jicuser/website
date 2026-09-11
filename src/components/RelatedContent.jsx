import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SwipeRail from '@/components/SwipeRail';

const SECTIONS = {
  about: { to: '/about', title: 'About JIC', text: 'Meet the centre and our community.' },
  services: { to: '/services', title: 'Services', text: 'Explore religious and community support.' },
  projects: { to: '/projects', title: 'Masjid Building Works', text: 'View and support the works at JIC.' },
  gallery: { to: '/projects/gallery', title: 'Updates & Gallery', text: 'See the latest progress at the masjid.' },
  support: { to: '/projects/how-to-support', title: 'Support the Works', text: 'Find ways to help the building project.' },
  extension: { to: '/projects/masjid-extension', title: 'Masjid Extension', text: 'Explore the prayer hall, facilities and timeline.' },
  education: { to: '/education', title: 'Education', text: 'Find classes and learning opportunities.' },
  youth: { to: '/youth', title: 'Youth', text: 'Discover activities and ways to get involved.' },
  community: { to: '/services/community', title: 'Community', text: 'Find support and community services.' },
  events: { to: '/youth/trips-events', title: 'Trips & Events', text: 'Explore youth trips and events.' },
  prayer: { to: '/prayer-times', title: 'Prayer Times', text: 'Plan your next visit to the masjid.' },
  contact: { to: '/contact', title: 'Visit the Centre', text: 'Find our address and contact details.' },
};
const RELATED = {
  about: ['services', 'projects', 'contact'], services: ['education', 'community', 'contact'],
  projects: ['extension', 'gallery', 'support', 'contact'], education: ['youth', 'events', 'contact'],
  youth: ['events', 'education', 'community'], community: ['youth', 'services', 'contact'],
  events: ['youth', 'education', 'community'], prayer: ['services', 'education', 'contact'],
};

export default function RelatedContent() {
  const { pathname } = useLocation();
  const root = pathname.split('/')[1];
  const group = pathname === '/services/community' ? 'community'
    : pathname === '/youth/trips-events' ? 'events'
    : ['team', 'contact', 'financial-history'].includes(root) ? 'about'
    : root === 'madrassah' ? 'education'
    : root === 'funerals' ? 'services'
    : ['worship', 'prayer-times'].includes(root) ? 'prayer' : root;
  const links = (RELATED[group] || []).map(key => SECTIONS[key]).filter(item => item.to !== pathname);
  if (!links.length) return null;
  return <SwipeRail className="jic-related" title="Explore more at JIC">
    {links.map(item => <Link key={item.to} to={item.to}>
      <h3>{item.title}</h3><p>{item.text}</p><span>Explore <ArrowRight size={16} aria-hidden="true"/></span>
    </Link>)}
  </SwipeRail>;
}
