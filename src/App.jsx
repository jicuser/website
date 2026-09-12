import React, { lazy, Suspense } from 'react';
import PageLoadBoundary from '@/components/PageLoadBoundary';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import { AdminSaveProvider } from '@/context/AdminSaveContext';
import { standaloneSections } from '@/content/sectionRoutes';
import MainLayout from '@/layouts/MainLayout';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';

const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ClassesCoursesPage = lazy(() => import('@/pages/ClassesCoursesPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const EducationPage = lazy(() => import('@/pages/EducationPage'));
const FinancialHistoryPage = lazy(() => import('@/pages/FinancialHistoryPage'));
const HallBookingPage = lazy(() => import('@/pages/HallBookingPage'));
const MadrassahEnrolmentPage = lazy(() => import('@/pages/MadrassahEnrolmentPage'));
const MadrassahPage = lazy(() => import('@/pages/MadrassahPage'));
const MasjidExtensionPage = lazy(() => import('@/pages/MasjidExtensionPage'));
const PrayerTimesPage = lazy(() => import('@/pages/PrayerTimesPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SectionPage = lazy(() => import('@/pages/SectionPage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const WorshipPage = lazy(() => import('@/pages/WorshipPage'));
const RadioPlayerPage = lazy(() => import('@/pages/RadioPlayerPage'));
const TvDisplayPage = lazy(() => import('@/pages/TvDisplayPage'));
const YouthPage = lazy(() => import('@/pages/YouthPage'));

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const TileContentAdminPage = lazy(() => import('@/pages/admin/TileContentAdminPage'));

export default function App() {
  return (
    <PageLoadBoundary>
      <Suspense
        fallback={
          <p className="jic-page-loading" role="status">
            Loading page…
          </p>
        }
      >
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/radio" element={<RadioPlayerPage />} />
            <Route path="/tv179" element={<TvDisplayPage />} />
            <Route path="/tv179/:screenId" element={<TvDisplayPage />} />
            <Route path="/tv" element={<Navigate to="/tv179" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
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

              <Route path="about" element={<AboutPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="financial-history" element={<FinancialHistoryPage />} />
              <Route path="privacy" element={<PrivacyPage />} />

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

              <Route path="worship" element={<WorshipPage />} />
              <Route path="worship/quran" element={<WorshipPage />} />
              <Route path="worship/dalail-al-khayrat" element={<WorshipPage />} />
              <Route path="worship/daily-duas" element={<WorshipPage />} />
              <Route path="worship/prayer-guide" element={<WorshipPage />} />
              <Route path="worship/janazah-guide" element={<WorshipPage />} />
              <Route path="worship/daily-salah" element={<WorshipPage />} />

              <Route path="services" element={<ServicesPage />} />
              <Route path="services/religious" element={<ServicesPage />} />
              <Route path="services/education" element={<ServicesPage />} />
              <Route path="services/community" element={<ServicesPage />} />
              <Route path="services/hall-booking" element={<HallBookingPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/masjid-extension" element={<MasjidExtensionPage />} />

              <Route path="education" element={<EducationPage />} />
              <Route path="madrassah" element={<MadrassahPage />} />
              <Route path="madrassah/classes-courses" element={<ClassesCoursesPage />} />
              <Route path="madrassah/enrolment" element={<MadrassahEnrolmentPage />} />

              <Route path="youth" element={<YouthPage />} />
              <Route path="youth/itikaf" element={<YouthPage view="itikaf" />} />

              {standaloneSections.map(([path, eyebrow, title, backTo]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <SectionPage
                      eyebrow={eyebrow}
                      title={title}
                      backTo={backTo}
                      backLabel={`Back to ${eyebrow}`}
                    />
                  }
                />
              ))}

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </Suspense>
    </PageLoadBoundary>
  );
}
