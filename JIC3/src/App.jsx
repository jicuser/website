/**
 * Route table (react-router). Every path here renders inside `layouts/MainLayout.jsx`
 * (navbar + footer + scroll-to-top). Think of this as the URL → page component map.
 */

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
import AdminPage from '@/pages/admin/AdminPage';
import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';

function App() {
	return (
		<AnimatePresence mode="wait">
			<Routes>
                <Route path="/admin" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
				<Route path="/" element={<MainLayout />}>
					<Route index element={<HomePage />} />
					<Route path="about" element={<AboutPage />} />
					<Route path="contact" element={<ContactPage />} />
					<Route path="financial-history" element={<FinancialHistoryPage />} />
					<Route path="madrassah" element={<MadrassahPage />} />
					<Route path="prayer-times" element={<PrayerTimesPage />} />
					<Route path="privacy" element={<PrivacyPage />} />
					<Route path="projects" element={<ProjectsPage />} />
					<Route path="services" element={<ServicesPage />} />
					<Route path="team" element={<TeamPage />} />
					<Route path="youth" element={<YouthPage />} />
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</AnimatePresence>
	);
}

export default App;
