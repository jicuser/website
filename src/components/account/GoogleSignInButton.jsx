import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGoogleSignInAvailability } from '@/config/supabase';

export default function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getGoogleSignInAvailability(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setAvailable(value);
      })
      .catch(() => {}); // Email sign-in remains usable when provider discovery fails.
    return () => controller.abort();
  }, []);

  if (!available) return null;
  return (
    <div className="workspace-google-signin">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await signInWithGoogle();
          } catch (failure) {
            setError(failure.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Connecting…' : 'Continue with Google'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
