import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MosqueSymbol from '@/components/icons/MosqueSymbol';

const NotFoundPage = () => {
  return (
    <div className="page-transition pt-24">
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="mb-6 flex justify-center">
              <MosqueSymbol className="h-24 w-24 text-primary" />
            </div>
            
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Page Not Found</h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/">Return Home</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
            
            <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Looking for something specific?</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>
                  <Link to="/prayer-times" className="text-primary hover:underline">Prayer Times</Link>
                </li>
                <li>
                  <Link to="/madrassah" className="text-primary hover:underline">Madrassah Information</Link>
                </li>
                <li>
                  <Link to="/services" className="text-primary hover:underline">Our Services</Link>
                </li>
                <li>
                  <Link to="/team" className="text-primary hover:underline">Meet Our Team</Link>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default NotFoundPage;