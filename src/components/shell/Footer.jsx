import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Menu, MapPin, Phone, Mail } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { SITE } from '@/content/site';
import useCommunityLink from '@/hooks/useCommunityLink';
import JamatiaLogo from '@/components/shell/JamatiaLogo';

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.63-.28-1.2-.65-1.76-1.02-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.45 3.98-2.14 6.15-1.73.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
  </svg>
);

const QUICK_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Prayer Times', to: '/prayer-times' },
  { label: 'Services', to: '/services' },
  { label: 'Masjid Building Works', to: '/projects' },
  { label: 'Madrassah', to: '/madrassah' },
  { label: 'Youth', to: '/youth' },
  { label: 'Contact', to: '/contact' },
];

export default function Footer() {
  const whatsapp = useCommunityLink();
  const year = new Date().getFullYear();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${SITE.address.full}`)}`;
  const phoneUrl = `tel:${SITE.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`;
  const openDonation = () => window.dispatchEvent(new CustomEvent('jic-open-donation'));
  const openMenu = () => window.dispatchEvent(new CustomEvent('jic-open-menu'));
  return (
    <footer className="jic-site-footer jic-site-footer-compact jic-footer-refined">
      <div className="container mx-auto">
        <div className="jic-footer-compact-grid">
          <nav className="jic-footer-links-inline" aria-label="Footer links">
            <button type="button" className="jic-footer-menu-toggle" onClick={openMenu} aria-haspopup="dialog" aria-controls="jic-site-menu"><Menu size={18} aria-hidden="true"/>Menu</button>
            {QUICK_LINKS.map(({ label, to }) => <Link key={to} to={to}>{label}</Link>)}
          </nav>
          <div className="jic-footer-actions-compact">
            <nav className="jic-footer-socials" aria-label="Social media and contact links">
              <a href={whatsapp} className="jic-whatsapp-action" aria-label="WhatsApp Community"><WhatsAppIcon size={22}/></a>
              {SITE.socials.facebook && <a href={SITE.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18}/></a>}
              {SITE.socials.x && <a href={SITE.socials.x} target="_blank" rel="noopener noreferrer" aria-label="X"><XIcon className="h-[18px] w-[18px]"/></a>}
              {SITE.socials.instagram && <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18}/></a>}
              {SITE.socials.youtube && <a href={SITE.socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={18}/></a>}
              {SITE.socials.tiktok && <a href={SITE.socials.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon className="h-[18px] w-[18px]"/></a>}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open map to ${SITE.name}, ${SITE.address.full}`} title={SITE.address.full}><MapPin size={20} aria-hidden="true"/></a>
              <a href={phoneUrl} aria-label={`Call ${SITE.phone}`} title={`Call ${SITE.phone}`}><Phone size={20} aria-hidden="true"/></a>
              <a href={`mailto:${SITE.email}`} aria-label={`Email ${SITE.email}`} title={`Email ${SITE.email}`}><Mail size={20} aria-hidden="true"/></a>
            </nav>
            <button type="button" onClick={openDonation} className="jic-footer-donate inline-flex">Donate</button>
          </div>
        </div>
      </div>
      <div className="jic-footer-bottom">
        <Link to="/" className="jic-footer-signature" aria-label="Jamatia Islamic Centre home"><JamatiaLogo variant="pillars-outline"/></Link>
        <p className="jic-footer-legal"><span>© {year} {SITE.name}</span><span aria-hidden="true">·</span><Link to="/privacy">Privacy</Link></p>
      </div>
    </footer>
  );
}
