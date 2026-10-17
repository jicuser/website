import React from 'react';
import { useLocation } from 'react-router-dom';
import ServiceJourney from '@/components/services/ServiceJourney';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';

export default function GuidedServicePage() {
  const { pathname } = useLocation();
  const kind = pathname.startsWith('/funerals') ? 'funeral' : 'nikah';
  return <ServiceJourney key={kind} journey={SERVICE_JOURNEYS[kind]} />;
}
