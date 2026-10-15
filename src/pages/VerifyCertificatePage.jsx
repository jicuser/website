import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { CERTIFICATES_ENABLED, certificateKind, certificateDate, isVerificationToken } from '@/lib/certificates';
import '@/styles/certificates.css';

function Verification({ token }) {
  const [result, setResult] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!isVerificationToken(token)) {
      setResult({ loading: false, data: null, error: '' });
      return () => controller.abort();
    }
    setResult({ loading: true, data: null, error: '' });
    supabase.rpc('verify_certificate', { p_token: token }).abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        setResult({ loading: false, data: error ? null : data,
          error: error ? 'Verification is unavailable right now. Please try again.' : '' });
      }).catch(() => { if (!controller.signal.aborted) setResult({ loading: false, data: null, error: 'Verification is unavailable right now. Please try again.' }); });
    return () => controller.abort();
  }, [token, revision]);
  if (result.loading) return <p role="status">Checking the issuing record…</p>;
  if (result.error) return <div className="certificate-card"><p role="alert">{result.error}</p><button type="button" onClick={() => setRevision((v) => v + 1)}>Try again</button></div>;
  if (!result.data || !['valid', 'revoked'].includes(result.data.status)) return <div className="certificate-card"><ShieldAlert aria-hidden="true" /><h2>Certificate not found</h2><p>Check that you have the complete verification link, or contact the issuing office.</p><Link to="/contact">Contact JIC</Link></div>;
  const row = result.data;
  return <article className="certificate-document">
    {row.status === 'valid' ? <ShieldCheck size={40} aria-hidden="true" /> : <ShieldAlert size={40} aria-hidden="true" />}
    <h2>{row.status === 'valid' ? 'Verified issuing record' : 'Certificate revoked'}</h2>
    <p>{row.status === 'valid' ? 'This reference matches a current certificate issued by JIC.' : 'This certificate is no longer valid. Please contact the issuing office.'}</p>
    <dl className="certificate-facts">
      <dt>Reference</dt><dd>{row.reference}</dd>
      <dt>Type</dt><dd>{certificateKind(row.kind)}</dd>
      <dt>Issued by</dt><dd>{row.issuer_name}</dd>
      <dt>Issue date</dt><dd>{certificateDate(row.issued_on)}</dd>
      <dt>Status</dt><dd>{row.status === 'valid' ? 'Valid' : 'Revoked'}</dd>
    </dl>
    <p className="certificate-help">This page verifies the issuing record. It does not display the recipient’s identity or the full certificate.</p>
    <Link to="/contact">Contact the issuing office</Link>
  </article>;
}

export default function VerifyCertificatePage() {
  const { token } = useParams();
  return <main className="certificate-page">
    <Helmet><title>Verify a certificate · JIC</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <div className="certificate-wrap">
      <header className="certificate-page-header"><h1>Certificate verification</h1><Link to="/">JIC website</Link></header>
      {CERTIFICATES_ENABLED ? <Verification key={token} token={token} /> : <section className="certificate-card"><h2>Online verification is not available yet</h2><p>Please contact JIC to check a certificate.</p><Link to="/contact">Contact the office</Link></section>}
    </div>
  </main>;
}
