import React from 'react';
import ContactForm from '@/components/sections/contact/ContactForm';
import MapSection from '@/components/sections/contact/MapSection';

export default function ContactFormSection() {
  return (
    <div className="about-contact-layout">
      <section className="about-contact-form" aria-label="Send an enquiry">
        <ContactForm />
      </section>
      <aside className="about-contact-map" aria-label="Visit JIC">
        <MapSection />
      </aside>
    </div>
  );
}
