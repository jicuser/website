import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import GoogleSignInButton from '@/components/account/GoogleSignInButton';
import { magicLinkOptions } from './model';

export default function PortalSignIn({ auth, returnTo = '' }) {
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const lastSent = useRef(0);
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
        const result = await supabase.auth.signInWithOtp(
          magicLinkOptions(email, window.location.origin, returnTo),
        );
        if (result.error) throw new Error('Unable to send a sign-in link. Please try again later.');
        lastSent.current = Date.now();
        setNotice('If this email has an eligible account, a sign-in link will arrive shortly.');
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
      <p className="workspace-kicker">Your connection to JIC</p>
      <h2 id="portal-signin-title">Sign in to your Portal</h2>
      <p>Sign in to see the JIC services and records available to your account.</p>
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
            onClick={() => {
              setMode(id);
              setError('');
              setNotice('');
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <form className="workspace-form" onSubmit={submit} aria-label="Portal sign in">
        <fieldset disabled={busy || auth.loading}>
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
            {busy ? 'Please wait…' : mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}
          </button>
        </fieldset>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <GoogleSignInButton returnTo={returnTo} disabled={busy || auth.loading} />
      <div className="workspace-actions">
        <Link to="/account/recovery">Forgot your password?</Link>
        <Link to="/account/request">Request a JIC account</Link>
      </div>
      {returnTo && (
        <p className="workspace-meta">After signing in, you will return to your certificates.</p>
      )}
      <p className="workspace-meta">
        You can <Link to="/services">make a service enquiry</Link> without signing in.
      </p>
    </section>
  );
}
