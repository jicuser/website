import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import { standaloneSections } from '@/content/sectionRoutes';
import MainLayout from '@/layouts/MainLayout';

// Public pages
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import FinancialHistoryPage from '@/pages/FinancialHistoryPage';
import HallBookingPage from '@/pages/HallBookingPage';
import HomePage from '@/pages/HomePage';
import MadrassahPage from '@/pages/MadrassahPage';
import NotFoundPage from '@/pages/NotFoundPage';
import PrayerTimesPage from '@/pages/PrayerTimesPage';
import PrivacyPage from '@/pages/PrivacyPage';
import ProjectsPage from '@/pages/ProjectsPage';
import SectionPage from '@/pages/SectionPage';
import ServicesPage from '@/pages/ServicesPage';
import TeamPage from '@/pages/TeamPage';
import YouthPage from '@/pages/YouthPage';

// Admin pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminPage from '@/pages/admin/AdminPage';
import TileContentAdminPage from '@/pages/admin/TileContentAdminPage';

/** Central URL -> page map. Keep all top-level routes here. */
export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
        <Route
          path="/admin/home-tiles"
          element={<ProtectedAdminRoute permission="content"><TileContentAdminPage /></ProtectedAdminRoute>}
        />

        {/* Public site */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />

          {/* About */}
          <Route path="about" element={<AboutPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="financial-history" element={<FinancialHistoryPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          {/* Prayer times */}
          <Route path="prayer-times" element={<PrayerTimesPage key="today" initialTab="today" />} />
          <Route path="prayer-times/monthly" element={<PrayerTimesPage key="monthly" initialTab="daily" />} />
          <Route path="prayer-times/jummah" element={<PrayerTimesPage key="jummah" initialTab="jummah" />} />

          {/* Main sections */}
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/hall-booking" element={<HallBookingPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="madrassah" element={<MadrassahPage />} />
          <Route path="youth" element={<YouthPage />} />
          <Route path="youth/itikaf" element={<YouthPage view="itikaf" />} />

          {/* Smaller pages configured in content/sectionRoutes.js */}
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
