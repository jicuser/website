import { noticePlacement } from '@/lib/noticePlacement';
import SiteNotice from '@/components/shell/SiteNotice';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl } from '@/lib/video';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import React, { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { supplementalContentPaths } from '@/content/editablePages';
import { ABOUT_PATHS } from '@/content/aboutSections';
import UnifiedHeader from '@/components/shell/UnifiedHeader';
import FloatingPageTools from '@/components/shell/FloatingPageTools';
import RelatedContent from '@/components/RelatedContent';
import ProgrammePosters from '@/components/ProgrammePosters';
import PublishedPageLinks from '@/features/content/PublishedPageLinks';
import { PublishedPagesProvider } from '@/context/PublishedPagesContext';
import { ProgrammeJourneyProvider } from '@/context/ProgrammeJourneyContext';
import DailyReminder from '@/components/shell/DailyReminder';
import SpiritualOverlays from '@/components/shell/SpiritualOverlays';
import Footer from '@/components/shell/Footer';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import { useAuth } from '@/context/AuthContext';
import { PublicPrayerTimesProvider } from '@/context/PrayerTimesContext';
import { isPublicTaskRoute, isPublicReadingRoute } from '@/lib/publicTaskRoute';
import PublicBackdrop from '@/components/shell/PublicBackdrop';

const AdminBar = lazy(() => import('@/components/shell/AdminBar'));

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
  const { pathname: routePath, search } = useLocation();
  const pathname = routePath.replace(/\/+$/, '') || '/';
  const { isAdmin } = useAuth();
  const { announcement, livestream } = useHomeLiveContent({ eventLimit: 1 });
  const { getContent } = useContent();
  const visible = isPageVisible(getContent, pathname) || isAdmin;
  const preview = new URLSearchParams(search).get('preview') === '1';
  const isHome = pathname === '/';
  const isAbout = ABOUT_PATHS.includes(pathname);
  const showReminder =
    isHome ||
    pathname === '/worship' ||
    (pathname.startsWith('/prayer-times') && pathname !== '/prayer-times/reminders');
  const isDiscovery = ['/search', '/social-media', '/education/programmes', '/events'].includes(
    pathname,
  );
  const isTask = isPublicTaskRoute(pathname) || isPublicReadingRoute(pathname);

  return (
    <div
      className={`jic-public-route flex flex-col min-h-screen ${isHome ? 'jic-home-route' : 'jic-inner-route'} ${preview ? 'is-admin-preview' : ''}`}
    >
      {isHome && <PublicBackdrop />}
      <a className="jic-skip-link" href="#main-content">
        Skip to content
      </a>
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
            {!isAbout &&
              supplementalContentPaths.has(pathname) &&
              pathname !== '/services/hall-booking' && (
                <ManagedPageContent optional headingLevel={2} className="jic-page-addition" />
              )}
            {!isAbout && pathname !== '/services/hall-booking' && (
              <ManagedPageSections key={pathname} />
            )}
            {!isHome && !isDiscovery && !isTask && <ProgrammePosters />}
            {!isHome && !isDiscovery && !isTask && <PublishedPageLinks />}
            {!isHome && !isAbout && !isDiscovery && !isTask && <RelatedContent />}
          </div>
        ) : (
          <section className="jic-page-loading">
            <h1>Page unavailable</h1>
            <p>Contact the centre if you need information from this page.</p>
            <a href="/">Return home</a>
          </section>
        )}
      </main>
      {!preview && isHome && <SpiritualOverlays />}
      {!preview &&
        !isTask &&
        (announcement && noticePlacement(announcement.display_settings).notification ? (
          <SiteNotice item={announcement} />
        ) : livestream?.enabled && safeWebUrl(livestream.stream_url) ? (
          <SiteNotice item={livestream} prefix="live" to="/#live" />
        ) : null)}
      <Footer />
      <ScrollToTop />
      {isAdmin && !preview && (
        <Suspense fallback={null}>
          <AdminBar />
        </Suspense>
      )}
    </div>
  );
}
