/** URL → page component map. */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import MainLayout from '@/layouts/MainLayout';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import FinancialHistoryPage from '@/pages/FinancialHistoryPage';
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

const standaloneSections = [
  ['about/history','About','Our History','/about'],
  ['services/daily-prayers','Services','Daily Prayers','/services'],
  ['services/jummah','Services','Jummah','/services'],
  ['services/quran-classes','Services','Quran Classes','/services'],
  ['services/community-services','Services','Community Support','/services'],
  ['services/nikah','Services','Nikah','/services'],
  ['services/hall-booking','Services','Hall Booking','/services'],
  ['funerals','Funerals','Funeral Services',null],
  ['funerals/what-to-do','Funerals','What to Do When Someone Passes Away','/funerals'],
  ['funerals/contact-support','Funerals','Funeral Contact & Support','/funerals'],
  ['projects/masjid-extension','Masjid Extension','Masjid Extension','/projects'],
  ['projects/masjid-extension/timeline','Masjid Extension','Extension Timeline','/projects/masjid-extension'],
  ['projects/timeline','Masjid Extension','Extension Timeline','/projects/masjid-extension'],
  ['projects/main-prayer-hall','Masjid Extension','Main Prayer Hall','/projects/masjid-extension'],
  ['projects/wudu-area','Masjid Extension','Wudu & Facilities','/projects/masjid-extension'],
  ['projects/community-hall','Masjid Extension','Community Hall','/projects/masjid-extension'],
  ['projects/madrassah-floor','Masjid Extension','Madrassah Floor','/projects/masjid-extension'],
  ['projects/madrassah-building','Masjid Extension','Madrassah Floor','/projects/masjid-extension'],
  ['projects/current-appeals','Projects','Current Appeals','/projects'],
  ['projects/gallery','Projects','Updates & Gallery','/projects'],
  ['projects/how-to-support','Projects','Support Projects','/projects'],
  ['madrassah/programs','Madrassah','Programmes','/madrassah'],
  ['madrassah/classes-courses','Madrassah','Classes & Courses','/madrassah'],
  ['madrassah/special-courses','Madrassah','Special Courses','/madrassah'],
  ['madrassah/enrolment','Madrassah','Enrolment','/madrassah'],
  ['madrassah/policies','Madrassah','Policies','/madrassah'],
  ['madrassah/student-portal','Madrassah','Student Portal','/madrassah'],
  ['youth/projects','Youth','Youth Projects','/youth'],
  ['youth/activities','Youth','Activities','/youth'],
  ['youth/itikaf','Youth',"I'tikaf Program",'/youth'],
  ['youth/trips-events','Youth','Trips & Events','/youth'],
  ['youth/volunteering','Youth','Volunteering','/youth'],
  ['youth/classes-skills','Youth','Classes & Skills','/youth'],
];

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
        <Route path="/admin/home-tiles" element={<ProtectedAdminRoute><TileContentAdminPage /></ProtectedAdminRoute>} />
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
          <Route path="team" element={<TeamPage />} />
          <Route path="youth" element={<YouthPage />} />
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
