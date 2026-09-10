import React from 'react';
import HeroSection from '@/components/sections/services/HeroSection';
import ServiceCategoriesTabs from '@/components/sections/services/ServiceCategoriesTabs';
import SpecialServicesSection from '@/components/sections/services/SpecialServicesSection';

export default function ServicesPage() {
  return (
    <div className="page-transition">
      <HeroSection />
      <ServiceCategoriesTabs />
      <SpecialServicesSection />
    </div>
  );
}
