import React from 'react';
    import ContactHeroSection from '@/components/sections/contact/ContactHeroSection';
    import ContactInfoSection from '@/components/sections/contact/ContactInfoSection';
    import ContactFormSection from '@/components/sections/contact/ContactFormSection';
    import FaqSection from '@/components/sections/contact/FaqSection';
    import ContactCallToActionSection from '@/components/sections/contact/ContactCallToActionSection';

    const ContactPage = () => {
      return (
        <div className="page-transition pt-24">
          <ContactHeroSection />
          <ContactInfoSection />
          <ContactFormSection />
          <FaqSection />
          <ContactCallToActionSection />
        </div>
      );
    };

    export default ContactPage;