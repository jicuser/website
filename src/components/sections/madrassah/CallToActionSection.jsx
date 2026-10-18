import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CallToActionSection = () => (
  <section className="py-20 prayer-time-gradient text-white">
    <div className="container mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Enquire about a Madrassah place
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Apply for a pupil place or contact the Madrassah about classes and admissions.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link to="/madrassah/enrolment">Pupil Enrolment</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/madrassah/contact">Contact Madrassah</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CallToActionSection;
