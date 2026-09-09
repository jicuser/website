import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import ContactForm from '@/components/sections/contact/ContactForm';
import MapSection from '@/components/sections/contact/MapSection';

const ContactFormSection = () => (
  <section className="pb-12 sm:pb-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <Card className="h-full overflow-hidden rounded-3xl">
            <CardContent className="p-5 sm:p-7">
              <MapSection />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Card className="h-full rounded-3xl">
            <CardContent className="p-5 sm:p-7">
              <ContactForm />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ContactFormSection;
