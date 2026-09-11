import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Keeps admin routes protected without swapping to a different black page while
 * Supabase restores a session. Using the same admin surface avoids a visible
 * colour flash on mobile Safari.
 */
export default function ProtectedAdminRoute({ children, permission }) {
  const { loading, isAdmin, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="admin-console min-h-screen grid place-items-center"
        aria-label="Loading administration"
      >
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (permission && !can(permission)) return <Navigate to="/admin" replace />;
  return children;
}
