import React from 'react';
import ContactHeroSection from '@/components/sections/contact/ContactHeroSection';
import ContactFormSection from '@/components/sections/contact/ContactFormSection';

const ContactPage = () => (
  <div className="page-transition pt-24">
    <ContactHeroSection />
    <ContactFormSection />
  </div>
);

export default ContactPage;
