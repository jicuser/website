/** URL → page component map. */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import MainLayout from '@/layouts/MainLayout';
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
import ServicesPage from '@/pages/ServicesPage';
import TeamPage from '@/pages/TeamPage';
import YouthPage from '@/pages/YouthPage';
import SectionPage from '@/pages/SectionPage';
import AdminPage from '@/pages/admin/AdminPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import TileContentAdminPage from '@/pages/admin/TileContentAdminPage';
import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';

import { standaloneSections } from '@/content/sectionRoutes';

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
        <Route path="/admin/home-tiles" element={<ProtectedAdminRoute permission="content"><TileContentAdminPage /></ProtectedAdminRoute>} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="financial-history" element={<FinancialHistoryPage />} />
          <Route path="madrassah" element={<MadrassahPage />} />
          <Route path="prayer-times/monthly" element={<PrayerTimesPage key="monthly" initialTab="daily" />} />
          <Route path="prayer-times/jummah" element={<PrayerTimesPage key="jummah" initialTab="jummah" />} />
          <Route path="prayer-times" element={<PrayerTimesPage key="today" initialTab="today" />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/hall-booking" element={<HallBookingPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="youth" element={<YouthPage />} />
          <Route path="youth/itikaf" element={<YouthPage view="itikaf" />} />
          {standaloneSections.map(([path,eyebrow,title,backTo]) => (
            <Route key={path} path={path} element={<SectionPage eyebrow={eyebrow} title={title} backTo={backTo} backLabel={`Back to ${eyebrow}`} />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
