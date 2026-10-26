import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import AccountRequestLink from '@/components/account/AccountRequestLink';
import { portalLoginHref } from '@/lib/portalDestination';
import '@/styles/operations.css';

export async function rpc(name, args = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const { data, error } = await supabase.rpc(name, args).abortSignal(controller.signal);
    if (error) throw new Error(error.message || 'Could not save. Please try again.');
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}
export function useRecords(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    setState((s) => ({ ...s, loading: true, error: '' }));
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (current) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (current)
          setState((s) => ({
            ...s,
            loading: false,
            error: error.message || 'Could not load records.',
          }));
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      current = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [loader, revision]);
  return { ...state, refresh: useCallback(() => setRevision((r) => r + 1), []) };
}
export async function rows(table, signal, setup = (query) => query) {
  const { data, error } = await setup(supabase.from(table).select('*')).abortSignal(signal);
  if (error) throw new Error(error.message || 'Could not load records.');
  return data || [];
}
export function Field({ label, children, hint }) {
  return (
    <label className="ops-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Notice({ error, message }) {
  return error ? (
    <p className="ops-notice ops-error" role="alert">
      {error}
    </p>
  ) : message ? (
    <p className="ops-notice" role="status">
      {message}
    </p>
  ) : null;
}
export function LoadState({ state }) {
  return (
    <>
      {state.loading && <p role="status">Loading records…</p>}
      {state.error && (
        <div className="ops-notice ops-error" role="alert">
          {state.error}{' '}
          <button type="button" onClick={state.refresh}>
            Try again
          </button>
        </div>
      )}
    </>
  );
}
export function PortalGate({ destination, children }) {
  const auth = useAuth();
  if (auth.loading)
    return (
      <div className="ops-page">
        <p role="status">Opening your account…</p>
      </div>
    );
  if (!auth.user)
    return (
      <div className="ops-page">
        <div className="ops-panel">
          <p className="ops-eyebrow">Your JIC account</p>
          <h1>One account, your community.</h1>
          <p>Sign in or create an account with your email to continue.</p>
          <Link className="ops-button" to={portalLoginHref(destination)}>
            Sign in or create an account
          </Link>
        </div>
      </div>
    );
  if (!auth.profile?.is_active)
    return (
      <div className="ops-page">
        <h1>Account access</h1>
        <Notice error={auth.profileError || 'This account does not have active access.'} />
        <AccountRequestLink />
      </div>
    );
  return children;
}
export function Stats({ items }) {
  return (
    <div className="ops-stats">
      {items.map(([label, value, detail]) => (
        <div className="ops-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail && <small>{detail}</small>}
        </div>
      ))}
    </div>
  );
}
