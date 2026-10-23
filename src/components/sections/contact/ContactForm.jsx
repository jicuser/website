import React from 'react';
import { Mail, Phone } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import BuiltInForm from '@/components/sections/BuiltInForm';
import { SITE } from '@/content/site';
import useCommunityLink from '@/hooks/useCommunityLink';

export default function ContactForm({ subject = '', title }) {
  const whatsapp = useCommunityLink();
  return (
    <>
      <BuiltInForm slug="contact-us" subject={subject} title={title} />
      <div className="mt-5 grid gap-2 border-t pt-5 text-sm">
        <a
          href={`mailto:${SITE.email}`}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <Mail size={16} />
          {SITE.email}
        </a>
        <a
          href={`tel:${SITE.phone.replace(/\s+/g, '')}`}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <Phone size={16} />
          {SITE.phone}
        </a>
        <a
          href={whatsapp}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <WhatsAppIcon size={20} />
          Join WhatsApp Community
        </a>
      </div>
    </>
  );
}
