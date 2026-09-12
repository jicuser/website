import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, MapPin, Phone, Mail } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import { SITE } from '@/content/site';
import useCommunityLink from '@/hooks/useCommunityLink';
import JamatiaLogo from '@/components/shell/JamatiaLogo';

const QUICK_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Prayer Times', to: '/prayer-times' },
  { label: 'Services', to: '/services' },
  { label: 'Masjid Building Works', to: '/projects' },
  { label: 'Madrassah', to: '/madrassah' },
  { label: 'Youth', to: '/youth' },
  { label: 'Contact', to: '/contact' },
  { label: 'Social Media', to: '/social-media' },
];

export default function Footer() {
  const whatsapp = useCommunityLink();
  const year = new Date().getFullYear();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${SITE.address.full}`)}`;
  const phoneUrl = `tel:${SITE.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`;
  const openDonation = () => window.dispatchEvent(new CustomEvent('jic-open-donation'));
  const openMenu = () => window.dispatchEvent(new CustomEvent('jic-open-menu'));
  return (
    <footer className="jic-site-footer">
      <div className="container mx-auto">
        <div className="jic-footer-compact-grid">
          <nav className="jic-footer-links-inline" aria-label="Footer links">
            <button
              type="button"
              className="jic-footer-menu-toggle"
              onClick={openMenu}
              aria-haspopup="dialog"
              aria-controls="jic-site-menu"
            >
              <Menu size={18} aria-hidden="true" />
              Menu
            </button>
            {QUICK_LINKS.map(({ label, to }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="jic-footer-actions-compact">
        <nav className="jic-footer-socials" aria-label="Social media and contact links">
          <a href={whatsapp} aria-label="WhatsApp Community">
            <WhatsAppIcon size={22} />
          </a>
          {SOCIAL_CHANNELS.map(({ id, name, url }) => {
            const Icon = SOCIAL_ICONS[id];
            return (
              <a key={id} href={url} target="_blank" rel="noopener noreferrer" aria-label={name}>
                <Icon width={18} height={18} />
              </a>
            );
          })}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open map to ${SITE.name}, ${SITE.address.full}`}
            title={SITE.address.full}
          >
            <MapPin size={20} aria-hidden="true" />
          </a>
          <a href={phoneUrl} aria-label={`Call ${SITE.phone}`} title={`Call ${SITE.phone}`}>
            <Phone size={20} aria-hidden="true" />
          </a>
          <a
            href={`mailto:${SITE.email}`}
            aria-label={`Email ${SITE.email}`}
            title={`Email ${SITE.email}`}
          >
            <Mail size={20} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <div className="jic-footer-bottom">
        <Link to="/" className="jic-footer-signature" aria-label="Jamatia Islamic Centre home">
          <JamatiaLogo variant="compact" />
        </Link>
        <div className="jic-footer-donation-copy">
          <button type="button" onClick={openDonation} className="jic-footer-donate">
            Donate
          </button>
          <p className="jic-footer-legal">
            <span>
              © {year} {SITE.name}
            </span>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">Privacy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
