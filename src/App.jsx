import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import { AdminSaveProvider } from '@/context/AdminSaveContext';
import { standaloneSections } from '@/content/sectionRoutes';
import MainLayout from '@/layouts/MainLayout';

import AboutPage from '@/pages/AboutPage';
import ClassesCoursesPage from '@/pages/ClassesCoursesPage';
import ContactPage from '@/pages/ContactPage';
import FinancialHistoryPage from '@/pages/FinancialHistoryPage';
import HallBookingPage from '@/pages/HallBookingPage';
import HomePage from '@/pages/HomePage';
import MadrassahEnrolmentPage from '@/pages/MadrassahEnrolmentPage';
import MadrassahPage from '@/pages/MadrassahPage';
import MasjidExtensionPage from '@/pages/MasjidExtensionPage';
import NotFoundPage from '@/pages/NotFoundPage';
import PrayerTimesPage from '@/pages/PrayerTimesPage';
import PrivacyPage from '@/pages/PrivacyPage';
import ProjectsPage from '@/pages/ProjectsPage';
import SectionPage from '@/pages/SectionPage';
import ServicesPage from '@/pages/ServicesPage';
import TeamPage from '@/pages/TeamPage';
import WorshipPage from '@/pages/WorshipPage';
import YouthPage from '@/pages/YouthPage';

import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminPage from '@/pages/admin/AdminPage';
import TileContentAdminPage from '@/pages/admin/TileContentAdminPage';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={(
            <ProtectedAdminRoute>
              <AdminSaveProvider><AdminPage /></AdminSaveProvider>
            </ProtectedAdminRoute>
          )}
        />
        <Route
          path="/admin/home-tiles"
          element={<ProtectedAdminRoute permission="content"><TileContentAdminPage /></ProtectedAdminRoute>}
        />

        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />

          <Route path="about" element={<AboutPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="financial-history" element={<FinancialHistoryPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          <Route path="prayer-times" element={<PrayerTimesPage key="today" initialTab="today" />} />
          <Route path="prayer-times/monthly" element={<PrayerTimesPage key="monthly" initialTab="daily" />} />
          <Route path="prayer-times/jummah" element={<PrayerTimesPage key="jummah" initialTab="jummah" />} />

          <Route path="worship" element={<WorshipPage />} />
          <Route path="worship/quran" element={<WorshipPage />} />
          <Route path="worship/dalail-al-khayrat" element={<WorshipPage />} />
          <Route path="worship/daily-duas" element={<WorshipPage />} />
          <Route path="worship/prayer-guide" element={<WorshipPage />} />
          <Route path="worship/janazah-guide" element={<WorshipPage />} />
          <Route path="worship/daily-salah" element={<WorshipPage />} />

          <Route path="services" element={<ServicesPage />} />
          <Route path="services/hall-booking" element={<HallBookingPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/masjid-extension" element={<MasjidExtensionPage />} />
          <Route path="madrassah" element={<MadrassahPage />} />
          <Route path="madrassah/classes-courses" element={<ClassesCoursesPage />} />
          <Route path="madrassah/enrolment" element={<MadrassahEnrolmentPage />} />
          <Route path="youth" element={<YouthPage />} />
          <Route path="youth/itikaf" element={<YouthPage view="itikaf" />} />

          {standaloneSections.map(([path, eyebrow, title, backTo]) => (
            <Route
              key={path}
              path={path}
              element={(
                <SectionPage
                  eyebrow={eyebrow}
                  title={title}
                  backTo={backTo}
                  backLabel={`Back to ${eyebrow}`}
                />
              )}
            />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
