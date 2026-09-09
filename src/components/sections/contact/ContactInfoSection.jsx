/**
 * ContactInfoSection — address/phone from src/content/site.js
 */
import React from 'react';
import ContactInfoCard from '@/components/sections/contact/ContactInfoCard';
import { MapPin, Phone, Clock } from 'lucide-react';
import { SITE } from '@/content/site';

const contactInfoItems = [
  { icon: <MapPin className="h-10 w-10 text-primary" />, title: 'Our Location',  details: [SITE.address.line1, SITE.address.line2] },
  { icon: <Phone className="h-10 w-10 text-primary" />, title: 'Phone Number',   details: [SITE.phone] },
  { icon: <Clock className="h-10 w-10 text-primary" />, title: 'Opening Hours',  details: [SITE.hours] },
];

const ContactInfoSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {contactInfoItems.map((item, index) => (
          <ContactInfoCard key={index} {...item} index={index} />
        ))}
      </div>
    </div>
  </section>
);

export default ContactInfoSection;
