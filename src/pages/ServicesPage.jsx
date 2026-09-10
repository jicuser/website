import React from 'react';
import ServiceCategoriesTabs from '@/components/sections/services/ServiceCategoriesTabs';
import SpecialServicesSection from '@/components/sections/services/SpecialServicesSection';

export default function ServicesPage() {
  return (
    <div className="page-transition">
      <ServiceCategoriesTabs />
      <SpecialServicesSection />
    </div>
  );
}
