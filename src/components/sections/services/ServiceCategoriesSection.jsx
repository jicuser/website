import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_GROUPS } from '@/content/nav';
import ReligiousServicesTab from '@/components/sections/services/ReligiousServicesTab';
import EducationalProgramsTab from '@/components/sections/services/EducationalProgramsTab';
import CommunityServicesTab from '@/components/sections/services/CommunityServicesTab';

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
const services = NAV_GROUPS.find((group) => group.path === '/services');

// The shared section navigation owns route changes. Render directly from the URL
// so Back/Forward cannot briefly show a stale, separately stored tab selection.
export default function ServiceCategoriesSection() {
  const { pathname, hash } = useLocation();
  const path = legacyAnchors[hash] || pathname;
  const Category = categories[path] || ReligiousServicesTab;
  const title =
    path === '/services'
      ? services.name
      : services.children.find((page) => page.path === path)?.name;

  return (
    <section className="py-16" id="service-categories" aria-labelledby="services-title">
      <div className="container mx-auto px-4">
        <h1 id="services-title" className="text-center font-semibold">
          {title || services.name}
        </h1>
        <div className="space-y-8 pt-4">
          <Category />
        </div>
      </div>
    </section>
  );
}
