import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { overviewPaths } from '@/content/editablePages';
import UnifiedHeader from '@/components/shell/UnifiedHeader';
import PublicBackdrop from '@/components/shell/PublicBackdrop';
import RelatedContent from '@/components/RelatedContent';
import ProgrammePosters from '@/components/ProgrammePosters';
import ContentPageCards from '@/features/content/ContentPageCards';
import { ContentPagesProvider } from '@/features/content/ContentPagesContext';
import '@/styles/content-workflow.css';
import DailyReminder from '@/components/shell/DailyReminder';
import SpiritualOverlays from '@/components/shell/SpiritualOverlays';
import Footer from '@/components/shell/Footer';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import AdminBar from '@/components/shell/AdminBar';
import { useAuth } from '@/context/AuthContext';
import { PublicPrayerTimesProvider } from '@/context/PrayerTimesContext';

export default function MainLayout() {
  return (
    <PublicPrayerTimesProvider>
      <ContentPagesProvider>
        <PublicLayout />
      </ContentPagesProvider>
    </PublicPrayerTimesProvider>
  );
}

function PublicLayout() {
  const { pathname, search } = useLocation();
  const { isAdmin } = useAuth();
  const preview = new URLSearchParams(search).get('preview') === '1';
  const isHome = pathname === '/';
  const isDiscovery = ['/search', '/social-media'].includes(pathname);

  return (
    <div
      className={`jic-public-route flex flex-col min-h-screen ${isHome ? 'jic-home-route' : 'jic-inner-route'} ${preview ? 'is-admin-preview' : ''}`}
    >
      <PublicBackdrop />
      <UnifiedHeader />
      <main className={`flex-grow jic-public-main ${!isHome ? 'jic-inner-page' : ''}`}>
        <DailyReminder />
        <div>
          <Suspense
            fallback={
              <p className="jic-page-loading" role="status">
                Loading page…
              </p>
            }
          >
            <Outlet />
          </Suspense>
          {overviewPaths.has(pathname) && (
            <div className="mx-auto max-w-5xl px-4 py-8">
              <ManagedPageContent optional />
            </div>
          )}
          <ManagedPageSections key={pathname} />
          <ContentPageCards />
          {!isHome && !isDiscovery && <ProgrammePosters />}
          {!isDiscovery && <RelatedContent />}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
      {!preview && <SpiritualOverlays />}
      {isAdmin && !preview && <AdminBar />}
    </div>
  );
}
