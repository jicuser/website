import React from 'react';
import CommunityProgrammeList from '@/features/home/CommunityProgrammeList';
import PublishedPageLinks from '@/features/content/PublishedPageLinks';
import CommunityHub from './CommunityHub';
import '@/styles/services.css';

export default function ServicesLanding() {
  return (
    <>
      <CommunityHub />
      <div className="hub-programmes"><CommunityProgrammeList placementPath="/services" /></div>
      <PublishedPageLinks />
    </>
  );
}
