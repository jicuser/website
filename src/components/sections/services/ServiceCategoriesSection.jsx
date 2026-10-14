import React from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, Heart, Users, CalendarDays, MoonStar } from 'lucide-react';
import { NAV_GROUPS } from '@/content/nav';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';
import ReligiousServicesTab from './ReligiousServicesTab';
import EducationalProgramsTab from './EducationalProgramsTab';
import CommunityServicesTab from './CommunityServicesTab';
import SpecialServicesSection from './SpecialServicesSection';

const categories = {
  '/services/religious': ReligiousServicesTab,
  '/services/education': EducationalProgramsTab,
  '/services/community': CommunityServicesTab,
};
const legacyAnchors = {
  '#religious': '/services/religious',
  '#educational': '/services/education',
  '#community': '/services/community',
};
const choices = [
  {
    path: '/services/religious',
    description: 'Prayer, worship and religious support.',
    icon: MoonStar,
  },
  { path: '/services/education', description: 'Madrassah and adult learning.', icon: BookOpen },
  { path: '/services/community', description: 'Community support and activities.', icon: Users },
  {
    path: '/services/nikah',
    description: 'Ask about Nikah arrangements and availability.',
    icon: Heart,
  },
  { path: '/funerals', description: 'Contact the centre for funeral support.', icon: Heart },
  {
    path: '/services/hall-booking',
    description: 'Check the hall calendar and request a booking.',
    icon: CalendarDays,
  },
];
const services = NAV_GROUPS.find((group) => group.path === '/services');

export default function ServiceCategoriesSection() {
  const { pathname, hash } = useLocation();
  const path = legacyAnchors[hash] || pathname;
  const Category = categories[path];
  const title = services.children.find((page) => page.path === path)?.name;
  if (!Category)
    return (
      <>
        <PageHeading title="Services">Choose the support or service you need.</PageHeading>
        <PageChoices items={choices} label="Services" />
      </>
    );
  return (
    <>
      <PageHeading title={title} />
      <section className="container mx-auto px-4 pb-8" id="service-categories" aria-label={title}>
        <Category />
      </section>
      {path === '/services/religious' && <SpecialServicesSection />}
    </>
  );
}
