import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const { signIn, signOut, loading, isAdmin, user, profileError, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = location.state?.from;
  const destination =
    typeof from === 'string' && /^\/admin(?:[/?]|$)/.test(from) && !from.startsWith('/admin/login')
      ? from
      : '/admin';

  useEffect(() => {
    if (!loading && isAdmin) navigate(destination, { replace: true });
  }, [loading, isAdmin, destination, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to sign in.');
      setBusy(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-orb admin-login-orb-one" />
      <div className="admin-login-orb admin-login-orb-two" />
      <section className="admin-login-card jic-popup-surface" aria-labelledby="admin-login-title">
        <div className="admin-login-topline">
          <Link to="/" className="admin-login-back">
            <ArrowLeft size={16} /> Website
          </Link>
          <span className="admin-login-secure">
            <ShieldCheck size={15} /> JIC staff
          </span>
        </div>
        <div className="admin-login-brand">
          <Link
            to="/"
            className="admin-login-logo"
            aria-label="Return to Jamatia Islamic Centre website"
          >
            <JamatiaLogo variant="entrance" />
          </Link>
          <div>
            <p>JAMATIA ISLAMIC CENTRE</p>
            <h1 id="admin-login-title">Administration</h1>
          </div>
        </div>
        {error && (
          <div className="admin-login-error" role="alert">
            {error}
          </div>
        )}
        {profileError && (
          <div className="admin-login-error" role="alert">
            <p>{profileError}</p>
            <button
              type="button"
              className="admin-button"
              disabled={loading}
              onClick={() => {
                setError('');
                refreshProfile().catch(() => {});
              }}
            >
              Retry connection
            </button>
          </div>
        )}
        {user && !isAdmin && !loading && !profileError && (
          <p className="admin-login-error" role="alert">
            This account does not have JIC administration access.
          </p>
        )}
        {user ? (
          <button
            type="button"
            className="admin-button"
            disabled={loading}
            onClick={() => {
              setError('');
              signOut().catch((failure) => setError(failure.message));
            }}
          >
            Log out
          </button>
        ) : (
          <form onSubmit={submit} className="admin-login-form">
            <label>
              <span>Email address</span>
              <input
                type="email"
                required
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
            </label>
            <label>
              <span>Password</span>
              <div className="admin-login-password">
                <LockKeyhole size={17} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
            </label>
            <button disabled={busy || loading}>
              <LogIn size={18} />
              {busy ? 'Signing in…' : loading ? 'Restoring login…' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
