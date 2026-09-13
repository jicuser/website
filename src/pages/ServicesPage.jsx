import React from 'react';
import ServiceCategoriesSection from '@/components/sections/services/ServiceCategoriesSection';
import SpecialServicesSection from '@/components/sections/services/SpecialServicesSection';

export default function ServicesPage() {
  return (
    <div className="page-transition">
      <ServiceCategoriesSection />
      <SpecialServicesSection />
    </div>
  );
}
