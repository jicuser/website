import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { SOCIAL_CHANNELS } from '@/content/socials';
import { SOCIAL_ICONS } from '@/components/icons/SocialIcons';
import { SITE } from '@/content/site';
import { FOOTER_LINKS } from '@/content/nav';
import useCommunityLink from '@/hooks/useCommunityLink';
import JamatiaLogo from '@/components/shell/JamatiaLogo';

export default function Footer() {
  const { getContent } = useContent();
  const whatsapp = useCommunityLink();
  const year = new Date().getFullYear();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${SITE.address.full}`)}`;
  const phoneUrl = `tel:${SITE.phone.replace(/[^\d+]/g, '').replace(/^0/, '+44')}`;
  const openDonation = () => window.dispatchEvent(new CustomEvent('jic-open-donation'));
  return (
    <footer className="jic-site-footer">
      <div className="jic-footer-inner">
        <nav className="jic-footer-links" aria-label="Footer links">
          {FOOTER_LINKS.filter((page) => isPageVisible(getContent, page.path)).map(
            ({ name, path }) => (
              <Link key={path} to={path}>
                {name}
              </Link>
            ),
          )}
        </nav>
        <div className="jic-footer-actions">
          <nav className="jic-footer-icons" aria-label="Social media and contact links">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Community"
              title="WhatsApp Community"
            >
              <WhatsAppIcon size={22} />
            </a>
            {SOCIAL_CHANNELS.map(({ id, name, url }) => {
              const Icon = SOCIAL_ICONS[id];
              return (
                <a
                  key={id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  title={name}
                >
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
          <button type="button" onClick={openDonation} className="jic-footer-donate">
            Donate
          </button>
        </div>
        <div className="jic-footer-bottom">
          <Link to="/" className="jic-footer-signature" aria-label="Jamatia Islamic Centre home">
            <JamatiaLogo variant="compact" />
          </Link>
          <p className="jic-footer-legal">
            <span>
              © {year} {SITE.name}
            </span>
            <span className="jic-footer-privacy">
              <span aria-hidden="true">·</span>
              <Link to="/privacy">Privacy</Link>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
