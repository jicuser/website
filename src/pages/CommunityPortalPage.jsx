import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Award, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { portalDestination } from '@/lib/portalDestination';
import PortalSignIn from '@/features/portal/PortalSignIn';
import PortalWorkspace from '@/features/portal/PortalWorkspace';
import PortalAccountHome from '@/features/portal/PortalAccountHome';
import '@/styles/workspace.css';
import '@/styles/portal.css';
import '@/styles/operations.css';

export const WORKSPACE_ENABLED = import.meta.env.VITE_ENABLE_WORKSPACE === 'true';
export default function CommunityPortalPage() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const next = portalDestination(params.get('next'));
  if (!auth.loading && auth.user && auth.profile?.is_active && next)
    return <Navigate to={next} replace />;
  const signOut = () =>
    auth.signOut().catch(() => setError('Sign out could not be confirmed. Please try again.'));
  return (
    <div className="community-workspace jic-member-portal">
      <div className="workspace-wrap">
        <header className="workspace-header">
          <div>
            <p className="workspace-kicker">Jamatia Islamic Centre</p>
            <h1>{auth.user ? 'My JIC account' : 'JIC Portal'}</h1>
          </div>
          <div className="workspace-actions">
            <Link to="/">Website</Link>
          </div>
        </header>
        {auth.user && auth.profile?.is_active && (
          <nav className="portal-workspace-switch" aria-label="Account area">
            {!WORKSPACE_ENABLED && (
              <Link to="/portal" aria-current="page">
                Portal home
              </Link>
            )}
            {auth.isAdmin && <Link to="/admin">Staff home</Link>}
            <Link to="/admin/setup?mode=change">Change password</Link>
          </nav>
        )}
        {error && <p role="alert">{error}</p>}
        {!auth.user ? (
          <div className="portal-entry-layout">
            <div>
              {auth.loading && <p role="status">Checking your account…</p>}
              <PortalSignIn auth={auth} returnTo={next} />
            </div>
            <aside className="portal-entry-intro" aria-label="About your portal">
              <h2>After you sign in</h2>
              <p>See the records shared with your account.</p>
              <ul>
                <li>
                  <Wallet aria-hidden="true" />
                  <span>
                    <strong>Invoices & payments</strong>
                    <small>View your invoices and payment records.</small>
                  </span>
                </li>
                {WORKSPACE_ENABLED && (
                  <li>
                    <Users aria-hidden="true" />
                    <span>
                      <strong>Family & learning</strong>
                      <small>Linked children, classes and published progress.</small>
                    </span>
                  </li>
                )}
                <li>
                  <Award aria-hidden="true" />
                  <span>
                    <strong>Your certificates</strong>
                    <small>Open certificates shared by the centre.</small>
                  </span>
                </li>
                <li>
                  <ShieldCheck aria-hidden="true" />
                  <span>
                    <strong>Private to you</strong>
                    <small>Only records linked to your account appear here.</small>
                  </span>
                </li>
              </ul>
            </aside>
          </div>
        ) : auth.loading ? (
          <p role="status">Checking your account…</p>
        ) : !auth.profile?.is_active ? (
          <section className="workspace-card">
            <h2>Account access</h2>
            <p role="alert">
              {auth.profileError || 'This account does not have active portal access.'}
            </p>
            <div className="workspace-actions">
              <button type="button" onClick={() => auth.refreshProfile().catch(() => {})}>
                Check again
              </button>
              <Link to="/account/request">Request access</Link>
              <button type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          </section>
        ) : !WORKSPACE_ENABLED ? (
          <PortalAccountHome auth={auth} onSignOut={signOut} />
        ) : (
          <PortalWorkspace key={auth.user.id} auth={auth} />
        )}
      </div>
    </div>
  );
}
