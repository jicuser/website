import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import { CertificateWorkspace } from '@/features/certificates/Certificates';

export default function CertificatesPage() {
  const auth = useAuth();
  return <main className="certificate-page">
    <Helmet><title>My certificates · JIC</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <div className="certificate-wrap">
      <header className="certificate-page-header"><h1>My certificates</h1><Link to="/portal">My account</Link></header>
      {!CERTIFICATES_ENABLED ? <section className="certificate-card"><h2>Certificate requests are not open yet</h2><p>Please contact the office for help with an existing certificate.</p><Link to="/contact">Contact the office</Link></section> :
        auth.loading ? <p role="status">Checking your account…</p> :
          !auth.user ? <section className="certificate-card"><h2>Sign in to view your certificates</h2><p>Your full certificates are only available through your account.</p><Link to="/portal">Sign in</Link></section> :
            !auth.profile?.is_active ? <section className="certificate-card"><p role="alert">{auth.profileError || 'Your account needs active access to view certificates.'}</p><button type="button" onClick={auth.refreshProfile}>Check again</button><Link to="/account/request">Request access</Link></section> :
              <CertificateWorkspace key={auth.user.id} />}
    </div>
  </main>;
}
