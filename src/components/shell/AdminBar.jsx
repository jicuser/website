import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EDITABLE_PAGES } from '@/content/editablePages';

export default function AdminBar() {
  const { can, signOut } = useAuth();
  const { pathname } = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const editable = can('content') && EDITABLE_PAGES.some((page) => page.path === pathname);
  async function handleSignOut() {
    setSigningOut(true);
    setError('');
    try {
      await signOut();
    } catch (err) {
      setError(err.message || 'Could not sign out. Please try again.');
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
          <Link to={`/admin?section=content&page=${encodeURIComponent(pathname)}&mode=edit`}>
            <Pencil size={17} />
            Edit page
          </Link>
        )}
        {pathname === '/team' && can('team') && (
          <Link to="/admin?section=team">
            <Users size={17} />
            Team profiles
          </Link>
        )}
        <button type="button" onClick={handleSignOut} disabled={signingOut} aria-busy={signingOut}>
          <LogOut size={17} aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        {error && (
          <p className="jic-admin-bar-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
