import React from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { SITE } from '@/content/site';
import CommunityProgrammeList from '@/features/home/CommunityProgrammeList';
import PublishedPageLinks from '@/features/content/PublishedPageLinks';
import ServiceExplorer from './ServiceExplorer';

export default function ServicesLanding() {
  return (
    <>
      <ServiceExplorer />
      <div className="hub-contact-row">
        <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
          <Phone size={17} aria-hidden="true" /> {SITE.phone}
        </a>
        <Link to="/contact">Visit or contact JIC</Link>
      </div>
      <div className="hub-programmes">
        <CommunityProgrammeList placementPath="/services" />
      </div>
      <PublishedPageLinks />
    </>
  );
}
