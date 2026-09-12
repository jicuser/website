import React, { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EDITABLE_PAGES } from '@/content/editablePages';
const WebsitePageEditor = lazy(() => import('@/components/admin/WebsitePageEditor'));

export default function AdminBar() {
  const { can, signOut } = useAuth();
  const { pathname } = useLocation();
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const editable = can('content') && EDITABLE_PAGES.some((page) => page.path === pathname);
  async function handleSignOut() {
    setSigningOut(true);
    setError('');
    try {
      await signOut();
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not log out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <>
      <div className="jic-admin-bar" role="group" aria-label="Staff controls">
        <Link to="/admin">
          <LayoutDashboard size={17} />
          Admin
        </Link>
        {editable && (
          <button type="button" onClick={() => setEditing(true)} disabled={signingOut}>
            <Pencil size={17} />
            Edit page
          </button>
        )}
        <button type="button" onClick={handleSignOut} disabled={signingOut} aria-busy={signingOut}>
          <LogOut size={17} aria-hidden="true" />
          {signingOut ? 'Logging out…' : 'Log out'}
        </button>
        {error && (
          <p className="jic-admin-bar-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {editing && (
        <Suspense
          fallback={
            <p className="jic-admin-bar" role="status">
              Opening editor…
            </p>
          }
        >
          <WebsitePageEditor path={pathname} onClose={() => setEditing(false)} />
        </Suspense>
      )}
    </>
  );
}
