import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import '@/styles/workspace.css';

const roles = [
  ['parent_guardian', 'Parent or guardian'],
  ['student', 'Student'],
  ['teacher', 'Teacher'],
  ['volunteer', 'Volunteer'],
  ['imam', 'Imam or religious lead'],
  ['office', 'Office or centre team'],
];

const features = [
  ['family_updates', 'Family updates and student information'],
  ['learning', 'Courses, classes and learning'],
  ['teacher_tools', 'Teacher registers and progress tools'],
  ['forms', 'Forms, registrations and replies'],
  ['community', 'Community notices and events'],
];

export default function AccountRequestPage() {
  const [form, setForm] = useState({
    display_name: '',
    email: '',
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
        body: form,
      });
      if (invokeError || !data?.ok)
        throw new Error(invokeError?.message || data?.error || 'Request failed.');
      setSent(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="community-workspace">
      <div className="workspace-wrap workspace-request-layout">
        <header className="workspace-header">
          <div>
            <p className="workspace-kicker">JIC community portal</p>
            <h1>Request an account</h1>
            <p className="workspace-lead">
              Tell us how you are connected to JIC and what you need. An authorised team member will
              review the request before access is enabled.
            </p>
          </div>
          <Link to="/portal">Back to portal</Link>
        </header>
        {import.meta.env.VITE_ENABLE_ACCOUNT_REQUESTS !== 'true' ? (
          <section className="workspace-card">
            <h2>Ask the JIC team for access</h2>
            <p>Online account requests are not available yet.</p>
            <Link to="/contact">Contact JIC</Link>
            <p>
              Already have an account? <Link to="/portal">Sign in</Link>
            </p>
          </section>
        ) : sent ? (
          <section className="workspace-card">
            <h2>Request sent</h2>
            <p>
              Thank you. The JIC team will review your request. If you need a new account, look out
              for an invitation email.
            </p>
            <Link className="workspace-button" to="/portal">
              Return to sign in
            </Link>
          </section>
        ) : (
          <form className="workspace-card workspace-form" onSubmit={submit}>
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
            {error && <p role="alert">{error}</p>}
            <button disabled={busy}>{busy ? 'Sending…' : 'Send account request'}</button>
            <p className="workspace-meta">
              Already approved? <Link to="/portal">Sign in to the portal</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
