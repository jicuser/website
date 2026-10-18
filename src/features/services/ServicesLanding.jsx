import React from 'react';
import CentreVisit from '@/components/services/CentreVisit';
import ServiceExplorer from './ServiceExplorer';

export default function ServicesLanding() {
  return (
    <>
      <ServiceExplorer />
      <div className="service-page service-directory-visit">
        <CentreVisit />
      </div>
    </>
  );
}
