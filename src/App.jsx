import React, { lazy, Suspense } from 'react';
import PageLoadBoundary from '@/components/PageLoadBoundary';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import { AdminSaveProvider } from '@/context/AdminSaveContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { standaloneSections } from '@/content/sectionRoutes';
import { PAGE_ALIASES } from '@/content/pageAliases';
import { ABOUT_PATHS } from '@/content/aboutSections';
import MainLayout from '@/layouts/MainLayout';
import CanonicalPageRedirect from '@/components/shell/CanonicalPageRedirect';
import RouteScrollReset from '@/components/shell/RouteScrollReset';
import PageTitle from '@/components/shell/PageTitle';
const HomePage = lazy(() => import('@/pages/HomePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const RamadanPage = lazy(() => import('@/features/ramadan/RamadanPage'));
const RamadanDisplayPage = lazy(() => import('@/pages/RamadanDisplayPage'));

const CommunityPortalPage = lazy(() => import('@/pages/CommunityPortalPage'));
const CertificatesPage = lazy(() => import('@/pages/CertificatesPage'));
const VerifyCertificatePage = lazy(() => import('@/pages/VerifyCertificatePage'));
const SermonArchive = lazy(() =>
  import('@/components/workspace/Sermons').then((module) => ({ default: module.SermonArchive })),
);
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const PublicFormPage = lazy(() => import('@/pages/PublicFormPage'));
const ContentPage = lazy(() => import('@/pages/ContentPage'));
const AdultCoursesPage = lazy(() => import('@/pages/AdultCoursesPage'));
const EventsPage = lazy(() => import('@/pages/EventsPage'));
const EducationPage = lazy(() => import('@/pages/EducationPage'));
const ProgrammesPage = lazy(() => import('@/pages/ProgrammesPage'));
const EducationEnrolmentPage = lazy(() => import('@/pages/EducationEnrolmentPage'));
const ClassesCoursesPage = lazy(() => import('@/pages/ClassesCoursesPage'));
const HallBookingPage = lazy(() => import('@/pages/HallBookingPage'));
const MadrassahEnrolmentPage = lazy(() => import('@/pages/MadrassahEnrolmentPage'));
const MadrassahPage = lazy(() => import('@/pages/MadrassahPage'));
const MasjidExtensionPage = lazy(() => import('@/pages/MasjidExtensionPage'));
const PrayerTimesPage = lazy(() => import('@/pages/PrayerTimesPage'));
const SalahRemindersPage = lazy(() => import('@/pages/SalahRemindersPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const DonationsPage = lazy(() => import('@/features/operations/Donations'));
const GetInvolvedPage = lazy(() => import('@/pages/GetInvolvedPage'));
const VolunteerPage = lazy(() =>
  import('@/pages/GetInvolvedPage').then((m) => ({ default: m.VolunteerPage })),
);
const CampaignsPage = lazy(() =>
  import('@/features/operations/Donations').then((m) => ({ default: m.CampaignsPage })),
);
const CampaignPage = lazy(() =>
  import('@/features/operations/Donations').then((m) => ({ default: m.CampaignPage })),
);
const MyFundraisingPage = lazy(() =>
  import('@/features/operations/Donations').then((m) => ({ default: m.MyFundraisingPage })),
);
const MyInvoicesPage = lazy(() =>
  import('@/features/operations/Finance').then((m) => ({ default: m.MyInvoicesPage })),
);
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SectionPage = lazy(() => import('@/pages/SectionPage'));
const GuidedServicePage = lazy(() => import('@/pages/GuidedServicePage'));
const CertificatesGuidePage = lazy(() => import('@/pages/CertificatesGuidePage'));
const CommunityGuidancePage = lazy(() => import('@/pages/CommunityGuidancePage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const WorshipPage = lazy(() => import('@/pages/WorshipPage'));
const RadioPlayerPage = lazy(() => import('@/pages/RadioPlayerPage'));
const TvDisplayPage = lazy(() => import('@/pages/TvDisplayPage'));
const YouthPage = lazy(() => import('@/pages/YouthPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AccountSetupPage = lazy(() => import('@/pages/admin/AccountSetupPage'));
const AccountRecoveryPage = lazy(() => import('@/pages/AccountRecoveryPage'));
const AccountRequestPage = lazy(() => import('@/pages/AccountRequestPage'));
const ShareDevicePage = lazy(() => import('@/pages/admin/ShareDevicePage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const TileContentAdminPage = lazy(() => import('@/pages/admin/TileContentAdminPage'));

export default function App() {
  return (
    <NavigationProvider>
      <AppRoutes />
    </NavigationProvider>
  );
}

function AppRoutes() {
  return (
    <PageLoadBoundary>
      <Suspense
        fallback={
          <p className="jic-page-loading" role="status">
            Loading page…
          </p>
        }
      >
        <RouteScrollReset />
        <PageTitle />
        <Routes>
          <Route path="/portal" element={<CommunityPortalPage />} />
          <Route path="/account/invoices" element={<MyInvoicesPage />} />
          <Route path="/account/certificates" element={<CertificatesPage />} />
          <Route path="/verify/:token" element={<VerifyCertificatePage />} />
          <Route path="/radio" element={<RadioPlayerPage />} />
          <Route path="/tv179" element={<TvDisplayPage />} />
          <Route path="/ramadan/display" element={<RamadanDisplayPage />} />
          <Route path="/tv179/:screenId" element={<TvDisplayPage />} />
          <Route path="/tv" element={<Navigate to="/tv179" replace />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/setup" element={<AccountSetupPage />} />
          <Route path="/account/recovery" element={<AccountRecoveryPage />} />
          <Route path="/account/request" element={<AccountRequestPage />} />
          <Route
            path="/admin/share/:screenId"
            element={
              <ProtectedAdminRoute permission="tv">
                <ShareDevicePage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminSaveProvider>
                  <AdminPage />
                </AdminSaveProvider>
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/home-tiles"
            element={
              <ProtectedAdminRoute permission="content">
                <TileContentAdminPage />
              </ProtectedAdminRoute>
            }
          />

          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />

            {ABOUT_PATHS.map((path) => (
              <Route key={path} path={path.slice(1)} element={<AboutPage />} />
            ))}
            <Route path="talks" element={<SermonArchive />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="events" element={<EventsPage />} />

            <Route
              path="prayer-times"
              element={<PrayerTimesPage key="today" initialTab="today" />}
            />
            <Route
              path="prayer-times/monthly"
              element={<PrayerTimesPage key="monthly" initialTab="daily" />}
            />
            <Route
              path="prayer-times/jummah"
              element={<PrayerTimesPage key="jummah" initialTab="jummah" />}
            />
            <Route path="prayer-times/reminders" element={<SalahRemindersPage />} />

            <Route path="worship" element={<WorshipPage />} />
            <Route path="worship/quran" element={<WorshipPage />} />
            <Route path="worship/dalail-al-khayrat" element={<WorshipPage />} />
            <Route path="worship/daily-duas" element={<WorshipPage />} />
            <Route path="worship/prayer-guide" element={<WorshipPage />} />
            <Route path="worship/janazah-guide" element={<WorshipPage />} />
            <Route path="worship/daily-salah" element={<WorshipPage />} />

            <Route path="services" element={<ServicesPage />} />
            <Route path="services/support" element={<CommunityGuidancePage kind="support" />} />
            <Route
              path="services/marriage-family"
              element={<CommunityGuidancePage kind="family" />}
            />
            <Route
              path="services/skills-careers"
              element={<CommunityGuidancePage kind="careers" />}
            />
            <Route path="services/certificates" element={<CertificatesGuidePage />} />
            <Route path="services/religious" element={<ServicesPage />} />
            <Route path="services/education" element={<ServicesPage />} />
            <Route path="services/community" element={<ServicesPage />} />
            <Route path="services/hall-booking" element={<HallBookingPage />} />
            <Route path="ramadan" element={<RamadanPage key="overview" />} />
            <Route path="ramadan/suhoor" element={<RamadanPage key="suhoor" kind="suhoor" />} />
            <Route path="ramadan/iftar" element={<RamadanPage key="iftar" kind="iftar" />} />
            <Route path="ramadan/daily-giving" element={<RamadanPage key="daily" kind="daily" />} />
            <Route path="donate" element={<DonationsPage />} />
            <Route path="get-involved" element={<GetInvolvedPage />} />
            <Route path="get-involved/volunteer" element={<VolunteerPage />} />
            <Route path="fundraise" element={<CampaignsPage />} />
            <Route path="fundraise/new" element={<MyFundraisingPage />} />
            <Route path="fundraise/:slug" element={<CampaignPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/masjid-extension" element={<MasjidExtensionPage />} />
            {Object.keys(PAGE_ALIASES).map((path) => (
              <Route key={path} path={path.slice(1)} element={<CanonicalPageRedirect />} />
            ))}

            <Route path="education" element={<EducationPage />} />
            <Route path="education/programmes" element={<ProgrammesPage />} />
            <Route path="education/courses" element={<AdultCoursesPage />} />
            <Route path="education/enrolment" element={<EducationEnrolmentPage />} />
            <Route path="forms/:slug" element={<PublicFormPage />} />
            <Route path="pages/:slug" element={<ContentPage />} />
            <Route path="madrassah" element={<MadrassahPage />} />
            <Route path="madrassah/classes-courses" element={<ClassesCoursesPage />} />
            <Route path="madrassah/enrolment" element={<MadrassahEnrolmentPage />} />

            <Route path="youth" element={<YouthPage />} />
            <Route path="youth/itikaf" element={<YouthPage view="itikaf" />} />

            {standaloneSections
              .filter(([path]) => path !== 'about/history')
              .map(([path, eyebrow, title, backTo]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    path.startsWith('projects/') ? (
                      ['projects/current-appeals', 'projects/how-to-support'].includes(path) ? (
                        <DonationsPage />
                      ) : (
                        <ProjectsPage />
                      )
                    ) : [
                        'services/nikah',
                        'funerals',
                        'funerals/what-to-do',
                        'funerals/contact-support',
                      ].includes(path) ? (
                      <GuidedServicePage />
                    ) : (
                      <SectionPage
                        eyebrow={eyebrow}
                        title={title}
                        backTo={backTo}
                        backLabel={`Back to ${eyebrow}`}
                      />
                    )
                  }
                />
              ))}

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </PageLoadBoundary>
  );
}
