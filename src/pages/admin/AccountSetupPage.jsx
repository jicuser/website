import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { passwordError } from '@/lib/accountSetup';

export default function AccountSetupPage() {
  const { refreshProfile, isAdmin } = useAuth();
  const [account, setAccount] = useState(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkLink() {
      try {
        const params = new URLSearchParams(window.location.hash.slice(1));
        // Supabase consumes invitation/recovery tokens during client initialization.
        // Await it before verifying the resulting account with the auth server.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (params.has('error') || params.has('error_code') || sessionError || !data.session)
          throw new Error(
            'This setup link has expired or has already been used. Ask a JIC administrator to send a new setup email.',
          );
        const { data: verified, error: userError } = await supabase.auth.getUser();
        if (userError || !verified.user)
          throw new Error('Your account could not be verified. Please open a new setup email.');
        if (active) setAccount(verified.user);
      } catch (err) {
        if (active) setError(err.message || 'Your setup link could not be checked.');
      } finally {
        if (active) {
          window.history.replaceState(window.history.state, '', '/admin/setup');
          setChecking(false);
        }
      }
    }
    checkLink();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy || !account) return;
    const problem = passwordError(password, confirmation);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Recheck identity so a changed browser session cannot update another account.
      const { data, error: identityError } = await supabase.auth.getUser();
      if (identityError || data.user?.id !== account.id)
        throw new Error('Your session changed. Please reopen your setup email.');
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmation('');
      setSaved(true);
      await refreshProfile().catch(() => {});
    } catch (err) {
      setError(err.message || 'Your password could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card jic-popup-surface" aria-labelledby="account-setup-title">
        <div className="admin-login-topline">
          <Link to="/" className="admin-login-back">
            <ArrowLeft size={16} />
            Website
          </Link>
          <span className="admin-login-secure">
            <ShieldCheck size={15} />
            JIC staff
          </span>
        </div>
        <div className="admin-login-brand">
          <Link to="/" className="admin-login-logo" aria-label="Jamatia Islamic Centre home">
            <JamatiaLogo variant="wordmark" />
          </Link>
          <div>
            <p>JAMATIA ISLAMIC CENTRE</p>
            <h1 id="account-setup-title">Set your password</h1>
          </div>
        </div>
        {checking ? (
          <p role="status">Checking your setup link…</p>
        ) : saved ? (
          <div role="status">
            <p>Your password is saved.</p>
            <Link className="admin-button" to={isAdmin ? '/admin' : '/admin/login'}>
              {isAdmin ? 'Continue to Admin' : 'Continue to sign in'}
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="admin-login-error" role="alert">
                {error}
              </div>
            )}
            {account ? (
              <form onSubmit={submit} className="admin-login-form">
                <p>
                  Set a password for <strong>{account.email}</strong>. Use at least 12 characters.
                </p>
                <label>
                  <span>New password</span>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label>
                  <span>Confirm password</span>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </label>
                <button disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
              </form>
            ) : (
              <Link className="admin-login-back" to="/admin/login">
                Already have a password? Sign in
              </Link>
            )}
          </>
        )}
      </section>
    </main>
  );
}
