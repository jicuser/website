import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedAdminRoute({ children, permission }) {
  const { loading, isAdmin, can, user, profileError, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div
        className="admin-console min-h-screen grid place-items-center"
        aria-label="Loading administration"
      >
        <div role="status">
          <Loader2 className="animate-spin" />
          <p>Restoring your staff access…</p>
        </div>
      </div>
    );
  }

  if (profileError)
    return (
      <main className="admin-console min-h-screen grid place-items-center">
        <section className="admin-panel">
          <p role="alert">{profileError}</p>
          {error && <p role="alert">{error}</p>}
          <button className="admin-button" onClick={() => refreshProfile().catch(() => {})}>
            Retry connection
          </button>
          <button
            className="admin-button"
            onClick={() => signOut().catch((failure) => setError(failure.message))}
          >
            Log out
          </button>
        </section>
      </main>
    );
  if (!isAdmin)
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
    );
  if (permission && !can(permission)) return <Navigate to="/admin" replace />;
  return children;
}
