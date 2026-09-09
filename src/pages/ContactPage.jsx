import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ContactHeroSection from '@/components/sections/contact/ContactHeroSection';
import ContactInfoSection from '@/components/sections/contact/ContactInfoSection';
import ContactFormSection from '@/components/sections/contact/ContactFormSection';
import FaqSection from '@/components/sections/contact/FaqSection';
import ContactCallToActionSection from '@/components/sections/contact/ContactCallToActionSection';
import { SITE } from '@/content/site';

const ContactPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hash]);

  const mapQuery = encodeURIComponent(`Jamatia Islamic Centre, ${SITE.address.line1}, ${SITE.address.line2}`);

  return (
    <div className="page-transition pt-24">
      <ContactHeroSection />
      <ContactInfoSection />

      <section id="location" className="jic-anchor-target py-6 sm:py-10">
        <div className="container mx-auto px-4">
          <div className="jic-contact-map jic-glass overflow-hidden rounded-3xl border">
            <div className="jic-contact-map-copy">
              <span className="jic-popup-kicker">VISIT JIC</span>
              <h2>Find Jamatia Islamic Centre</h2>
              <p>{SITE.address.line1}<br />{SITE.address.line2}</p>
            </div>
            <iframe
              title="Map showing Jamatia Islamic Centre"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <ContactFormSection />
      <FaqSection />
      <ContactCallToActionSection />
    </div>
  );
};

export default ContactPage;
