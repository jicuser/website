import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { withRequestTimeout } from '@/lib/requestTimeout';

export default function AccountRecoveryPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy || sent) return;
    setBusy(true);
    setError('');
    try {
      const { error: failure } = await withRequestTimeout(
        () =>
          supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: new URL('/admin/setup', window.location.origin).href,
          }),
        { timeoutMs: 15000 },
      );
      if (failure) throw failure;
      setSent(true);
      setEmail('');
    } catch {
      setError('The email request could not be completed. Please wait a moment and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card jic-popup-surface" aria-labelledby="recovery-title">
        <h1 id="recovery-title">Reset your password</h1>
        {sent ? (
          <p role="status">
            If an account matches that email address, you will receive a password reset link. Check
            your inbox and spam folder.
          </p>
        ) : (
          <form className="admin-login-form" onSubmit={submit}>
            <p>Enter the email address used for your account.</p>
            <label>
              <span>Email address</span>
              <input
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button disabled={busy}>{busy ? 'Requesting email…' : 'Send reset link'}</button>
          </form>
        )}
        <Link className="admin-login-back" to="/portal">
          Student and guardian sign in
        </Link>
        <Link className="admin-login-back" to="/admin/login">
          Staff sign in
        </Link>
        <Link className="admin-login-back" to="/">
          Back to website
        </Link>
      </section>
    </main>
  );
}
