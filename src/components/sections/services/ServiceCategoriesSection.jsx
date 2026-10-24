import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_GROUPS } from '@/content/nav';
import PageHeading from '@/components/PageHeading';
import ServicesLanding from '@/features/services/ServicesLanding';
import ReligiousServicesTab from './ReligiousServicesTab';
import EducationalProgramsTab from './EducationalProgramsTab';
import ServiceJourney from '@/components/services/ServiceJourney';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import SpecialServicesSection from './SpecialServicesSection';

const categories = {
  '/services/religious': ReligiousServicesTab,
  '/services/education': EducationalProgramsTab,
};
const legacyAnchors = {
  '#religious': '/services/religious',
  '#educational': '/services/education',
  '#community': '/services/community',
};
const services = NAV_GROUPS.find((group) => group.path === '/services');

export default function ServiceCategoriesSection() {
  const { pathname, hash } = useLocation();
  const path = legacyAnchors[hash] || pathname.replace(/\/+$/, '');
  if (path === '/services/community')
    return <ServiceJourney journey={SERVICE_JOURNEYS.community} />;
  const Category = categories[path];
  const title =
    services.children.find((page) => page.path === path)?.name ||
    (path === '/services/religious' ? 'Religious services' : 'Educational services');
  if (!Category) return <ServicesLanding />;
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
