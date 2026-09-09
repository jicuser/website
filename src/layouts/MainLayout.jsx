import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import {overviewPaths} from '@/content/editablePages';
import Navbar from '@/components/shell/Navbar';
import Footer from '@/components/shell/Footer';
import { ScrollToTop } from '@/components/shell/ScrollToTop';
import AdminBar from '@/components/shell/AdminBar';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout() {
  const { pathname, search } = useLocation();
  const { isAdmin }  = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const preview = new URLSearchParams(search).get('preview') === '1';

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`flex flex-col min-h-screen ${preview?'is-admin-preview':''}`}>
      <Navbar isScrolled={isScrolled} />
      <main className="flex-grow">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
          {overviewPaths.has(pathname) && <div className="mx-auto max-w-5xl px-4 py-8"><ManagedPageContent optional/></div>}
          <ManagedPageSections />
        </motion.div>
      </main>
      <Footer />
      <ScrollToTop />
      {isAdmin && !preview && <AdminBar />}
    </div>
  );
}
