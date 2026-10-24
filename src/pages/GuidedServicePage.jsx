import React from 'react';
import { useLocation } from 'react-router-dom';
import ServiceJourney from '@/components/services/ServiceJourney';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import FuneralPage from '@/features/funerals/FuneralPage';

export default function GuidedServicePage() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/funerals')) return <FuneralPage />;
  return <ServiceJourney journey={SERVICE_JOURNEYS.nikah} />;
}
