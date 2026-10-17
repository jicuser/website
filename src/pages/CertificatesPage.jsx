import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import { CertificateWorkspace } from '@/features/certificates/Certificates';
import { portalLoginHref } from '@/lib/portalDestination';

export default function CertificatesPage() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  return (
    <main className="certificate-page">
      <Helmet>
        <title>My certificates · JIC</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="certificate-wrap">
        <header className="certificate-page-header">
          <h1>My certificates</h1>
          <Link to="/portal">My account</Link>
        </header>
        <p className="certificate-intro">
          Request a record, follow the office review and keep your issued certificates together.{' '}
          <Link to="/services/certificates">How certificates work</Link>
        </p>
        {!CERTIFICATES_ENABLED ? (
          <section className="certificate-card">
            <h2>Certificate requests are not open yet</h2>
            <p>
              The office can help with a Nikah, Shahadah, course completion or Ijazah record. Have
              the relevant names and date ready if known.
            </p>
            <div className="certificate-actions">
              <Link to="/services/certificates#certificate-help">Ask about a certificate</Link>
              <Link to="/services/certificates">View the certificate guide</Link>
            </div>
          </section>
        ) : auth.loading ? (
          <p role="status">Checking your account…</p>
        ) : !auth.user ? (
          <section className="certificate-card">
            <h2>Sign in to view your certificates</h2>
            <p>
              Your full certificates are only available through your account. After signing in, you
              will return here to continue.
            </p>
            <Link to={portalLoginHref(pathname + search)}>Sign in</Link>
          </section>
        ) : !auth.profile?.is_active ? (
          <section className="certificate-card">
            <p role="alert">
              {auth.profileError || 'Your account needs active access to view certificates.'}
            </p>
            <button type="button" onClick={auth.refreshProfile}>
              Check again
            </button>
            <Link to="/account/request">Request access</Link>
          </section>
        ) : (
          <CertificateWorkspace key={auth.user.id} />
        )}
      </div>
    </main>
  );
}
