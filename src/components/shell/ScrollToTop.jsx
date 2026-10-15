import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let footerVisible = false;
    const toggleVisibility = () => setIsVisible(window.pageYOffset > 300 && !footerVisible);
    const footer = document.querySelector('.jic-site-footer');
    const observer = footer && window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => {
          footerVisible = entry.isIntersecting;
          toggleVisibility();
        })
      : null;
    observer?.observe(footer);
    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 rounded-full shadow-lg focus:outline-none z-50 jic-scroll-top"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
