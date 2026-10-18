import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Heart, Wallet } from 'lucide-react';

const RECORDS = [
  [Wallet, 'My invoices', 'Invoices and payments shared with you.', '/account/invoices'],
  [
    Award,
    'My certificates',
    'Certificates from your ceremonies and learning.',
    '/account/certificates',
  ],
  [Heart, 'My fundraising', 'Start or manage your fundraiser for JIC.', '/fundraise/new'],
];

export default function PortalAccountHome({ auth, onSignOut }) {
  return (
    <main className="portal-account-home" aria-label="Portal home">
      <section className="portal-welcome">
        <p className="workspace-kicker">Your JIC home</p>
        <h2>Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ''}</h2>
        <p>Your records, account and connection to the centre.</p>
      </section>
      <section aria-labelledby="portal-records-title">
        <h3 id="portal-records-title">Your records</h3>
        <div className="portal-card-grid">
          {RECORDS.map(([Icon, title, description, to]) => (
            <Link className="portal-area-card" key={to} to={to}>
              <Icon size={22} aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section className="portal-home-links" aria-labelledby="portal-centre-title">
        <h3 id="portal-centre-title">Around the centre</h3>
        <nav aria-label="Centre links">
          <Link to="/prayer-times">
            Prayer times <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/education">
            Courses & classes <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/services">
            Services & bookings <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </section>
      <footer className="portal-home-help">
        <Link to="/account/request">Need help with your account?</Link>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </footer>
    </main>
  );
}
