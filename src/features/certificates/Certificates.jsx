import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowLeft, CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { CERTIFICATES_ENABLED, CERTIFICATE_KINDS, certificateKind, certificateDate, verificationPath } from '@/lib/certificates';
import '@/styles/certificates.css';

function useRows({ table, userId, staff, filter, page, revision }) {
  const [result, setResult] = useState({ loading: true, rows: [], total: 0, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setResult({ loading: true, rows: [], total: 0, error: '' });
    let query = supabase.from(table).select('*', { count: 'exact' })
      .order(table === 'certificates' ? 'issued_at' : 'created_at', { ascending: false })
      .order('id').range(page * 25, page * 25 + 24);
    if (!staff) query = query.eq(table === 'certificates' ? 'recipient_id' : 'applicant_id', userId);
    if (filter) query = query.eq('status', filter);
    query.abortSignal(controller.signal).then(({ data, count, error }) => {
      if (!controller.signal.aborted) setResult({
        loading: false, rows: error ? [] : data || [], total: count || 0,
        error: error ? 'Certificates could not be loaded. Please try again.' : '',
      });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ loading: false, rows: [], total: 0, error: 'Certificates could not be loaded. Please try again.' });
    });
    return () => controller.abort();
  }, [table, userId, staff, filter, page, revision]);
  return result;
}

function RequestForm({ onSaved, onCancel }) {
  const key = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="certificate-card certificate-form" onSubmit={async (event) => {
      event.preventDefault();
      if (sending.current) return;
      const data = new FormData(event.currentTarget);
      sending.current = true;
      setBusy(true);
      setError('');
      try {
        const result = await supabase.rpc('request_certificate', {
          p_kind: data.get('kind'), p_recipient_name: data.get('recipient_name'),
          p_event_date: data.get('event_date') || null, p_notes: data.get('notes'),
          p_client_key: key.current,
        });
        if (result.error) throw result.error;
        onSaved();
      } catch {
        setError('The request could not be sent. Check the details and try again. Repeating this request will not create a second copy.');
      } finally {
        sending.current = false;
        setBusy(false);
      }
    }}>
      <h2>Request a certificate</h2>
      <p>Staff will check the record before issuing. Your certificate will appear in this account.</p>
      <fieldset disabled={busy}>
        <label>Certificate type<select name="kind" required>{CERTIFICATE_KINDS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Names to appear on the certificate<input name="recipient_name" required minLength={2} maxLength={240} autoComplete="name" /></label>
        <label>Event or completion date (if known)<input name="event_date" type="date" /></label>
        <label>Details for the office<textarea name="notes" rows={3} maxLength={2000} placeholder="For example, the course and teacher or the ceremony details." /></label>
        <p className="certificate-help">Please do not include identity documents or payment details here.</p>
        <div className="certificate-actions">
          <button className="certificate-primary" type="submit">{busy ? 'Sending…' : 'Send request'}</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function ReviewRequest({ request, onDone }) {
  const [decision, setDecision] = useState('issue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  return (
    <form className="certificate-card certificate-form" onSubmit={async (event) => {
      event.preventDefault();
      if (sending.current) return;
      const data = new FormData(event.currentTarget);
      sending.current = true;
      setBusy(true);
      setError('');
      try {
        const result = await supabase.rpc('review_certificate_request', {
          p_request_id: request.id, p_decision: decision,
          p_statement: data.get('statement') || '', p_note: data.get('note') || '',
        });
        if (result.error) throw result.error;
        onDone();
      } catch {
        setError('The decision could not be saved. Check your permission and refresh the request before trying again. You cannot approve your own request.');
      } finally {
        sending.current = false;
        setBusy(false);
      }
    }}>
      <h3>Review this request</h3>
      <fieldset disabled={busy}>
        <label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="issue">Approve and issue</option><option value="decline">Decline request</option>
        </select></label>
        {decision === 'issue' && <label>Approved wording<textarea name="statement" required minLength={10} maxLength={4000} rows={4} placeholder="Enter the wording approved by the issuing staff member." /></label>}
        <label>Message to the applicant<textarea name="note" required={decision === 'decline'} minLength={decision === 'decline' ? 3 : undefined} maxLength={1000} rows={2} /></label>
        {decision === 'issue' && <label className="certificate-check"><input type="checkbox" required />I have checked the names, date and source record. I understand issued details cannot be edited.</label>}
        <button className="certificate-primary" type="submit">{busy ? 'Saving…' : decision === 'issue' ? 'Issue certificate' : 'Decline request'}</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function RevokeForm({ certificate, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  return <details className="certificate-revoke"><summary>Revoke this certificate</summary>
    <form className="certificate-form" onSubmit={async (event) => {
      event.preventDefault();
      if (sending.current) return;
      const form = new FormData(event.currentTarget);
      sending.current = true; setBusy(true); setError('');
      try {
        const result = await supabase.rpc('revoke_certificate', { p_certificate_id: certificate.id, p_reason: form.get('reason') });
        if (result.error) throw result.error;
        onDone();
      } catch { setError('Revocation could not be saved. Please refresh and try again.'); }
      finally { sending.current = false; setBusy(false); }
    }}>
      <fieldset disabled={busy}>
        <p>The verification link will immediately show Revoked. The original record will be retained.</p>
        <label>Reason (visible to the recipient)<textarea name="reason" required minLength={3} maxLength={1000} rows={3} /></label>
        <label className="certificate-check"><input type="checkbox" required />I confirm this certificate should no longer be valid.</label>
        <button type="submit">{busy ? 'Saving…' : 'Confirm revocation'}</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  </details>;
}

export function CertificateDocument({ certificate }) {
  return <article className="certificate-document" aria-label="Certificate">
    <Award size={36} aria-hidden="true" />
    <p className="certificate-kicker">{certificate.issuer_name}</p>
    <h2>{certificateKind(certificate.kind)} certificate</h2>
    <p className="certificate-recipient">{certificate.recipient_name}</p>
    <p className="certificate-statement">{certificate.statement}</p>
    <dl className="certificate-facts">
      {certificate.event_date && <><dt>Event date</dt><dd>{certificateDate(certificate.event_date)}</dd></>}
      <dt>Issued</dt><dd>{certificateDate(certificate.issued_at)}</dd>
      <dt>Approved by</dt><dd>{certificate.approved_by_name}</dd>
      <dt>Reference</dt><dd>{certificate.reference}</dd>
    </dl>
    <p className={certificate.revoked_at ? 'certificate-badge is-revoked' : 'certificate-badge'}>
      {certificate.revoked_at ? 'Revoked' : <><CheckCircle2 size={16} aria-hidden="true" /> Issued by JIC</>}
    </p>
    {certificate.revoked_at && <p>{certificate.revocation_reason}</p>}
    <p className="certificate-help">Community record issued by Jamatia Islamic Centre.</p>
  </article>;
}

function CertificateDetail({ id, staff, onBack }) {
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setCertificate(null); setError('');
    supabase.from('certificates').select('*').eq('id', id).maybeSingle().abortSignal(controller.signal)
      .then(({ data, error: failure }) => {
        if (controller.signal.aborted) return;
        if (failure || !data) setError('This certificate is unavailable for your account.');
        else setCertificate(data);
      }).catch(() => { if (!controller.signal.aborted) setError('This certificate could not be loaded.'); });
    return () => controller.abort();
  }, [id, revision]);
  const path = verificationPath(certificate?.verification_token);
  return <div className="certificate-detail">
    <button type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back to certificates</button>
    {error ? <p role="alert">{error} <button type="button" onClick={() => setRevision((v) => v + 1)}>Try again</button></p> :
      !certificate ? <p role="status">Loading certificate…</p> : <>
        <CertificateDocument certificate={certificate} />
        {path && <section className="certificate-card">
          <h3><ShieldCheck size={18} aria-hidden="true" /> Share verification</h3>
          <p>Anyone with this link can check the certificate reference, type, issuing centre, issue date and validity. Names and the full certificate stay private.</p>
          <div className="certificate-actions">
            <Link to={path}>Open verification</Link>
            <button type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setCopied('Verification link copied.'); }
              catch { setCopied('Copy is unavailable. Open verification and copy its address.'); }
            }}><Copy size={16} aria-hidden="true" /> Copy verification link</button>
          </div>
          {copied && <p role="status">{copied}</p>}
        </section>}
        {staff && !certificate.revoked_at && <RevokeForm certificate={certificate} onDone={() => setRevision((v) => v + 1)} />}
      </>}
  </div>;
}

export function CertificateWorkspace({ staff = false }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(staff ? 'requests' : 'certificates');
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const data = useRows({ table: tab === 'requests' ? 'certificate_requests' : 'certificates',
    userId: user.id, staff, filter: staff && tab === 'requests' ? filter : '', page, revision });
  const refresh = () => setRevision((v) => v + 1);
  if (selected) return <div className="certificate-area"><CertificateDetail key={selected} id={selected} staff={staff} onBack={() => { setSelected(''); refresh(); }} /></div>;
  return <section className="certificate-area">
    <div className="certificate-toolbar">
      <div><h2>{staff ? 'Certificates' : 'My certificates'}</h2><p>{staff ? 'Review requests and manage issued records.' : 'View issued certificates and follow your requests.'}</p></div>
      {!staff && !requesting && <button type="button" className="certificate-primary" onClick={() => setRequesting(true)}>Request a certificate</button>}
    </div>
    {notice && <p role="status">{notice}</p>}
    {requesting && <RequestForm onCancel={() => setRequesting(false)} onSaved={() => {
      setRequesting(false); setTab('requests'); setPage(0); setNotice('Request sent. The office will review the details.'); refresh();
    }} />}
    <div className="certificate-tabs" role="group" aria-label="Certificate views">
      {[['certificates', 'Issued certificates'], ['requests', 'Requests']].map(([id, label]) =>
        <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setPage(0); setNotice(''); }}>{label}</button>)}
    </div>
    {staff && tab === 'requests' && <label className="certificate-filter">Request status
      <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}>
        <option value="pending">Awaiting review</option><option value="issued">Issued</option><option value="declined">Declined</option><option value="">All requests</option>
      </select></label>}
    {data.loading ? <p role="status">Loading certificates…</p> :
      data.error ? <p role="alert">{data.error} <button type="button" onClick={refresh}>Try again</button></p> :
        !data.rows.length ? <div className="certificate-empty"><Award size={30} aria-hidden="true" /><h3>{tab === 'requests' ? 'No requests here' : 'No certificates yet'}</h3><p>{staff ? 'New requests and issued records will appear here.' : 'Once the office issues a certificate, you can open it here.'}</p></div> :
          <div className="certificate-list">{data.rows.map((row) => <article className="certificate-card" key={row.id}>
            <div className="certificate-row-title"><h3>{certificateKind(row.kind)}</h3><span className={row.revoked_at || row.status === 'declined' ? 'certificate-badge is-revoked' : 'certificate-badge'}>{tab === 'certificates' ? (row.revoked_at ? 'Revoked' : 'Issued') : row.status === 'pending' ? 'Awaiting review' : row.status}</span></div>
            <p><strong>{row.recipient_name}</strong></p>
            <p className="certificate-help">{certificateDate(row.issued_at || row.created_at)}{row.reference ? ` · ${row.reference}` : ''}</p>
            {tab === 'certificates' ? <button type="button" onClick={() => setSelected(row.id)}>View certificate</button> : <>
              {row.event_date && <p>Event date: {certificateDate(row.event_date)}</p>}
              {row.notes && <p className="certificate-statement">{row.notes}</p>}
              {row.review_note && <p>Office response: {row.review_note}</p>}
              {staff && row.status === 'pending' && <details><summary>Review request</summary><ReviewRequest request={row} onDone={() => { setNotice('Decision saved.'); refresh(); }} /></details>}
            </>}
          </article>)}</div>}
    <div className="certificate-pagination">
      <button type="button" disabled={page === 0 || data.loading} onClick={() => setPage((v) => v - 1)}>Previous</button>
      <span>Page {page + 1}</span>
      <button type="button" disabled={data.loading || (page + 1) * 25 >= data.total} onClick={() => setPage((v) => v + 1)}>Next</button>
    </div>
  </section>;
}

export default function CertificatesManager() {
  const { user, can } = useAuth();
  if (!CERTIFICATES_ENABLED || !can('certificates')) return <p>Certificate management is unavailable for this account.</p>;
  return <CertificateWorkspace key={user.id} staff />;
}
