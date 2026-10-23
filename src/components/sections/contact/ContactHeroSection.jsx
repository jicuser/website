import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import AboutMasthead from '@/components/about/AboutMasthead';
import { SITE } from '@/content/site';

export default function ContactHeroSection() {
  return (
    <AboutMasthead
      title="Contact Us"
      eyebrow="Come and meet us"
      graphic
      actions={
        <>
          <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`}>
            <Phone size={16} aria-hidden="true" /> Call JIC
          </a>
          <a href={`mailto:${SITE.email}`}>
            <Mail size={16} aria-hidden="true" /> Email us
          </a>
          <a href="#map">
            <MapPin size={16} aria-hidden="true" /> Find us
          </a>
        </>
      }
    >
      <p>
        Ask about prayer, classes, bookings or support. Send a message, call or visit us on
        Woodlands Road.
      </p>
    </AboutMasthead>
  );
}
