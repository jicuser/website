import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import GoogleSignInButton from '@/components/account/GoogleSignInButton';
import { magicLinkOptions } from './model';

export default function PortalSignIn({ auth, returnTo = '' }) {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const lastSent = useRef(0);
  const changeMode = (value) => {
    setMode(value);
    setError('');
    setNotice('');
  };
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'password') {
        await auth.signInMember(email.trim(), String(form.get('password') || ''));
      } else {
        if (Date.now() - lastSent.current < 60000)
          throw new Error('Please wait a minute before requesting another link.');
        const options = magicLinkOptions(email, window.location.origin, returnTo);
        if (mode === 'create') {
          options.options.shouldCreateUser = true;
          options.options.data = { display_name: name.trim() };
        }
        const result = await supabase.auth.signInWithOtp(options);
        if (result.error) throw new Error('Unable to send a sign-in link. Please try again later.');
        lastSent.current = Date.now();
        setNotice(
          mode === 'create'
            ? 'Check your email to verify your address and open your account. Staff and family access are reviewed separately.'
            : 'If this email has an eligible account, a sign-in link will arrive shortly.',
        );
      }
    } catch (failure) {
      setError(
        mode === 'password'
          ? 'Sign-in failed. Check your details or use password recovery.'
          : failure.message,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="portal-signin workspace-card" aria-labelledby="portal-signin-title">
      <h2 id="portal-signin-title">
        {mode === 'create' ? 'Create your JIC account' : 'Sign in to your Portal'}
      </h2>
      <p>
        {mode === 'create'
          ? 'Use your email to get started.'
          : 'Access your records, invoices and requests.'}
      </p>
      {mode !== 'create' && (
        <div className="portal-signin-modes" aria-label="Sign-in method">
          {[
            ['password', 'Password'],
            ['email', 'Email sign-in link'],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              disabled={busy || auth.loading}
              aria-pressed={mode === id}
              onClick={() => changeMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <form className="workspace-form" onSubmit={submit} aria-label="Portal sign in">
        <fieldset disabled={busy || auth.loading}>
          {mode === 'create' && (
            <label className="workspace-field">
              <span>Your name</span>
              <input
                name="display_name"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="workspace-field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode === 'password' && (
            <label className="workspace-field">
              <span>Password</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
          )}
          <button type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'password'
                ? 'Sign in'
                : mode === 'create'
                  ? 'Email my account link'
                  : 'Email me a sign-in link'}
          </button>
        </fieldset>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <GoogleSignInButton returnTo={returnTo} disabled={busy || auth.loading} />
      <div className="portal-signin-help">
        {mode === 'password' && <Link to="/account/recovery">Forgot password?</Link>}
        <Link to="/account/request" state={{ email }}>
          Need access? Contact the office
        </Link>
      </div>
      <div className="portal-signin-account">
        <span>{mode === 'create' ? 'Already have an account?' : 'New to the portal?'}</span>
        <button
          type="button"
          disabled={busy || auth.loading}
          onClick={() => changeMode(mode === 'create' ? 'password' : 'create')}
        >
          {mode === 'create' ? 'Back to sign in' : 'Create account'}
        </button>
      </div>
      {mode === 'create' && (
        <p className="workspace-meta">
          We’ll email a secure link to verify your address. Family and staff access are approved
          separately. Read our <Link to="/privacy">privacy information</Link>.
        </p>
      )}
      {returnTo && (
        <p className="workspace-meta">After signing in, you will return to your certificates.</p>
      )}
      <p className="workspace-meta">
        You can <Link to="/services">make a service enquiry</Link> without signing in.
      </p>
    </section>
  );
}
