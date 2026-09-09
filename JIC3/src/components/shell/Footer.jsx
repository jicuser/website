/**
 * Footer — reads all text/links from src/content/site.js
 * To change address, phone, or socials: edit that file, not this one.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { SITE } from '@/content/site';

const TikTokIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94H10.5c-.45-.48-.88-.98-1.22-1.59-.75-1.31-1.09-2.77-1.2-4.27-.02-1.46-.03-2.92-.02-4.38-.01-1.51.32-2.98 1.05-4.28.72-1.29 1.8-2.3 3.08-2.95V.02z" />
  </svg>
);

const QUICK_LINKS = [
  { label: 'Home',            to: '/' },
  { label: 'About Us',        to: '/about' },
  { label: 'Services',        to: '/services' },
  { label: 'Prayer Times',    to: '/prayer-times' },
  { label: 'Madrassah',       to: '/madrassah' },
  { label: 'Meet the Team',   to: '/team' },
  { label: 'Contact Us',      to: '/contact' },
  { label: 'Privacy Policy',  to: '/privacy' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4">{SITE.name}</h3>
            <p className="text-gray-300 mb-4">{SITE.tagline}</p>
            <div className="flex space-x-4">
              <a href={SITE.socials.facebook}  target="_blank" rel="noopener noreferrer" aria-label="Facebook"  className="text-gray-300 hover:text-primary transition-colors"><Facebook  size={20} /></a>
              <a href={SITE.socials.twitter}   target="_blank" rel="noopener noreferrer" aria-label="Twitter"   className="text-gray-300 hover:text-primary transition-colors"><Twitter   size={20} /></a>
              <a href={SITE.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-300 hover:text-primary transition-colors"><Instagram size={20} /></a>
              <a href={SITE.socials.youtube}   target="_blank" rel="noopener noreferrer" aria-label="YouTube"   className="text-gray-300 hover:text-primary transition-colors"><Youtube   size={20} /></a>
              <a href={SITE.socials.tiktok}    target="_blank" rel="noopener noreferrer" aria-label="TikTok"    className="text-gray-300 hover:text-primary transition-colors"><TikTokIcon className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="text-gray-300 hover:text-primary transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-gray-300">{SITE.address.full}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="text-gray-300 hover:text-primary transition-colors">
                  {SITE.phone}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-xl font-bold mb-4">Opening Hours</h3>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-gray-300">{SITE.hours}</p>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center">
          <p className="text-gray-400">&copy; {year} {SITE.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
