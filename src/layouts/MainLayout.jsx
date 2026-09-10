import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import {overviewPaths} from '@/content/editablePages';
import UnifiedHeader from '@/components/shell/UnifiedHeader';
import Footer from '@/components/shell/Footer';
import CornerBrand from '@/components/shell/CornerBrand';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import AdminBar from '@/components/shell/AdminBar';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout() {
  const { pathname, search } = useLocation();
  const { isAdmin } = useAuth();
  const preview = new URLSearchParams(search).get('preview') === '1';
  const isHome = pathname === '/';

  return (
    <div className={`flex flex-col min-h-screen ${isHome ? 'jic-home-route' : 'jic-inner-route'} ${preview?'is-admin-preview':''}`}>
      <UnifiedHeader />
      <main className={`flex-grow jic-public-main ${!isHome ? 'jic-inner-page' : ''}`}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Outlet />
          {overviewPaths.has(pathname) && <div className="mx-auto max-w-5xl px-4 py-8"><ManagedPageContent optional/></div>}
          <ManagedPageSections />
        </motion.div>
      </main>
      {!isHome && <CornerBrand />}
      <Footer />
      <ScrollToTop />
      {isAdmin && !preview && <AdminBar />}
    </div>
  );
}
