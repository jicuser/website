import React from 'react';
import { useLocation } from 'react-router-dom';
import FuneralPage from '@/features/funerals/FuneralPage';
import NikahPage from '@/features/nikah/NikahPage';

export default function GuidedServicePage() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/funerals')) return <FuneralPage />;
  return <NikahPage />;
}
