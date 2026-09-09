/**
 * LoginModal  —  src/components/shell/LoginModal.jsx
 * Shown when the admin clicks "Admin Login" in the navbar.
 */
import React, { useState } from 'react';
import { X, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginModal({ onClose }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="jic-popup-overlay fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="jic-popup-panel w-full max-w-sm rounded-[28px] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="jic-popup-kicker">JIC ADMIN</p>
            <h2 className="jic-popup-title mt-1 text-lg font-bold">Admin Login</h2>
            <p className="jic-popup-muted mt-1 text-xs">Sign in to edit page content</p>
          </div>
          <button onClick={onClose} className="jic-popup-icon" aria-label="Close admin login">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="jic-popup-label mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/70 transition"
              placeholder="admin@jicmasjid.org"
            />
          </div>

          <div>
            <label className="jic-popup-label mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/70 transition"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="jic-popup-error rounded-xl border px-3 py-2 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="jic-popup-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
