import React from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';

    const ContactCallToActionSection = () => (
      <section className="py-20 prayer-time-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Connect With Our Community</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Join us for prayers, events, and activities. Everyone is welcome at Jamatia Islamic Centre.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary">
                Visit Us Today
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
                Subscribe to Newsletter
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );

    export default ContactCallToActionSection;