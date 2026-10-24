import HumanCheck from '@/components/HumanCheck';
import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '@/styles/operations.css';
import { supabase } from '@/lib/supabaseClient';
import '@/styles/workspace.css';

const roles = [
  ['parent_guardian', 'Parent or guardian'],
  ['student', 'Student'],
  ['teacher', 'Teacher'],
  ['volunteer', 'Volunteer'],
  ['imam', 'Imam or religious lead'],
  ['office', 'Office or centre team'],
  ['treasurer', 'Treasurer'],
  ['secretary', 'Secretary'],
  ['trustee', 'Trustee'],
  ['safeguarding_lead', 'Safeguarding lead'],
];

const features = [
  ['family_updates', 'Family updates and student information'],
  ['learning', 'Courses, classes and learning'],
  ['teacher_tools', 'Teacher registers and progress tools'],
  ['forms', 'Forms, registrations and replies'],
  ['community', 'Community notices and events'],
  ['finance', 'Invoices and finance'],
  ['fundraising', 'Review fundraising pages'],
  ['staff', 'Staff or volunteer tools'],
];

export default function AccountRequestPage() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const protection = useRef(null);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    email: user?.email || location.state?.email || '',
    website: '',
    consent: false,
    requested_role: '',
    requested_features: [],
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function toggleFeature(value) {
    setForm((current) => ({
      ...current,
      requested_features: current.requested_features.includes(value)
        ? current.requested_features.filter((item) => item !== value)
        : [...current.requested_features, value],
    }));
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('request-access', {
        body: { ...form, security: protection.current.proof() },
      });
      if (invokeError || !data?.ok) {
        let detail;
        try {
          detail = await invokeError?.context?.json();
        } catch {
          /* Use the clear fallback. */
        }
        throw new Error(
          detail?.error || data?.error || 'Your request could not be saved. Please try again.',
        );
      }
      setSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      protection.current?.reset();
      setBusy(false);
    }
  }

  return (
    <div className="community-workspace">
      <div className="workspace-wrap workspace-request-layout">
        <header className="workspace-header">
          <div>
            <p className="workspace-kicker">JIC community portal</p>
            <h1>Request portal access</h1>
            <p className="workspace-lead">
              Tell us how you are connected to JIC and what you need. An authorised team member will
              review the request before access is enabled.
            </p>
          </div>
          <Link to="/portal">Back to portal</Link>
        </header>
        <ol className="ops-steps">
          <li>
            <b>01</b>
            <span>Tell us what you need</span>
          </li>
          <li>
            <b>02</b>
            <span>The team reviews access</span>
          </li>
          <li>
            <b>03</b>
            <span>Use your JIC account</span>
          </li>
        </ol>
        {sent ? (
          <section className="workspace-card">
            <h2>Request sent</h2>
            <p>
              Thank you. The JIC team will review your request. If you need a new account, look out
              for an invitation email. If you already have an account, approved access appears after
              you sign in again.
            </p>
            <Link className="workspace-button" to="/portal">
              Return to sign in
            </Link>
          </section>
        ) : (
          <form className="workspace-card workspace-form" onSubmit={submit}>
            <p>
              For a personal account, you can also{' '}
              <Link to="/portal">create one with your email</Link>. Staff access is reviewed
              separately. Teaching and family tools are enabled when available.
            </p>
            <div className="ops-trap" aria-hidden="true">
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => change('website', e.target.value)}
                />
              </label>
            </div>
            <label className="workspace-field">
              <span>Your name</span>
              <input
                required
                maxLength={120}
                value={form.display_name}
                onChange={(event) => change('display_name', event.target.value)}
              />
            </label>
            <label className="workspace-field">
              <span>Email address</span>
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={(event) => change('email', event.target.value)}
              />
            </label>
            <label className="workspace-field">
              <span>How are you connected to JIC?</span>
              <select
                required
                value={form.requested_role}
                onChange={(event) => change('requested_role', event.target.value)}
              >
                <option value="">Choose one</option>
                {roles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>What would you like to use?</legend>
              {features.map(([value, label]) => (
                <label className="workspace-check" key={value}>
                  <input
                    type="checkbox"
                    checked={form.requested_features.includes(value)}
                    onChange={() => toggleFeature(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <label className="workspace-field">
              <span>
                Anything we should know? <small>(optional)</small>
              </span>
              <textarea
                rows="4"
                maxLength={2000}
                value={form.message}
                onChange={(event) => change('message', event.target.value)}
              />
            </label>
            <label className="workspace-check">
              <input
                required
                type="checkbox"
                checked={form.consent}
                onChange={(e) => change('consent', e.target.checked)}
              />
              <span>
                I agree that JIC can use these details to review and respond to this request.{' '}
                <Link to="/privacy">Privacy information</Link>.
              </span>
            </label>
            <p className="workspace-meta">
              Do not include DBS certificate details, safeguarding concerns or children’s private
              information in this form.
            </p>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy}>{busy ? 'Sending…' : 'Send account request'}</button>
            <p className="workspace-meta">
              Already approved? <Link to="/portal">Sign in to the portal</Link>.
            </p>
            <HumanCheck ref={protection} />
          </form>
        )}
      </div>
    </div>
  );
}
