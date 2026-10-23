import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { supplementalContentPaths } from '@/content/editablePages';
import UnifiedHeader from '@/components/shell/UnifiedHeader';
import FloatingPageTools from '@/components/shell/FloatingPageTools';
import RelatedContent from '@/components/RelatedContent';
import ProgrammePosters from '@/components/ProgrammePosters';
import PublishedPageLinks from '@/features/content/PublishedPageLinks';
import { PublishedPagesProvider } from '@/context/PublishedPagesContext';
import { ProgrammeJourneyProvider } from '@/context/ProgrammeJourneyContext';
import DailyReminder from '@/components/shell/DailyReminder';
import PublicBackdrop from '@/components/shell/PublicBackdrop';
import SpiritualOverlays from '@/components/shell/SpiritualOverlays';
import Footer from '@/components/shell/Footer';
import PageTitle from '@/components/shell/PageTitle';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import AdminBar from '@/components/shell/AdminBar';
import { useAuth } from '@/context/AuthContext';
import { PublicPrayerTimesProvider } from '@/context/PrayerTimesContext';

export default function MainLayout() {
  return (
    <PublicPrayerTimesProvider>
      <PublishedPagesProvider>
        <ProgrammeJourneyProvider>
          <PublicLayout />
        </ProgrammeJourneyProvider>
      </PublishedPagesProvider>
    </PublicPrayerTimesProvider>
  );
}

function PublicLayout() {
  const { pathname, search } = useLocation();
  const { isAdmin } = useAuth();
  const { getContent } = useContent();
  const visible = isPageVisible(getContent, pathname) || isAdmin;
  const preview = new URLSearchParams(search).get('preview') === '1';
  const isHome = pathname === '/';
  const showReminder =
    isHome ||
    pathname.startsWith('/worship') ||
    (pathname.startsWith('/prayer-times') && pathname !== '/prayer-times/reminders');
  const isDiscovery = ['/search', '/social-media'].includes(pathname);
  const isTask =
    pathname.startsWith('/forms/') ||
    pathname.startsWith('/ramadan') ||
    pathname === '/donate' ||
    pathname.startsWith('/fundraise') ||
    pathname.startsWith('/get-involved') ||
    ['/contact', '/prayer-times/reminders', '/services/hall-booking'].includes(pathname);

  return (
    <div
      className={`jic-public-route flex flex-col min-h-screen ${isHome ? 'jic-home-route' : 'jic-inner-route'} ${preview ? 'is-admin-preview' : ''}`}
    >
      <a className="jic-skip-link" href="#main-content">
        Skip to content
      </a>
      <PageTitle />
      {isHome && <PublicBackdrop />}
      <UnifiedHeader />
      <FloatingPageTools />
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-grow jic-public-main ${!isHome ? 'jic-inner-page' : ''}`}
      >
        {showReminder && <DailyReminder />}
        {visible ? (
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
            {supplementalContentPaths.has(pathname) && (
              <ManagedPageContent optional headingLevel={2} className="jic-page-addition" />
            )}
            <ManagedPageSections key={pathname} />
            {!isHome && !isDiscovery && !isTask && <ProgrammePosters />}
            {!isDiscovery && !isTask && <PublishedPageLinks />}
            {!isDiscovery && !isTask && <RelatedContent />}
          </div>
        ) : (
          <section className="jic-page-loading">
            <h1>Page unavailable</h1>
            <p>Contact the centre if you need information from this page.</p>
            <a href="/">Return home</a>
          </section>
        )}
      </main>
      <Footer />
      <ScrollToTop />
      {!preview && !isTask && <SpiritualOverlays />}
      {isAdmin && !preview && <AdminBar />}
    </div>
  );
}
