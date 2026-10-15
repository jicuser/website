import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CERTIFICATES_ENABLED } from '@/lib/certificates';
import PortalSignIn from '@/features/portal/PortalSignIn';
import PortalWorkspace from '@/features/portal/PortalWorkspace';
import '@/styles/workspace.css';
import '@/styles/portal.css';

export const WORKSPACE_ENABLED = import.meta.env.VITE_ENABLE_WORKSPACE === 'true';
export default function CommunityPortalPage() {
  const auth = useAuth();
  return (
    <div className="community-workspace jic-member-portal">
      <div className="workspace-wrap">
        <header className="workspace-header">
          <h1>JIC Portal</h1>
          <div className="workspace-actions">
            {CERTIFICATES_ENABLED && auth.user && auth.profile?.is_active && <Link to="/account/certificates">My certificates</Link>}
            <Link to="/">Website</Link>
          </div>
        </header>
        {auth.loading ? <p role="status">Checking your account…</p> : !auth.user ? <PortalSignIn auth={auth} /> :
          !auth.profile?.is_active ? <section className="workspace-card">
            <h2>Account access</h2><p role="alert">{auth.profileError || 'This account does not have active portal access.'}</p>
            <div className="workspace-actions"><button type="button" onClick={auth.refreshProfile}>Check again</button>
              <button type="button" onClick={auth.signOut}>Sign out</button></div>
          </section> : !WORKSPACE_ENABLED ? <section className="workspace-card">
            <h2>My account</h2><p>Signed in as {auth.profile.display_name || auth.user.email}.</p>
            <p>Family and learning records are not available on this website yet.</p>
            <div className="workspace-actions"><Link to="/account/request">Request access</Link>
              <Link to="/services">Enquiries and services</Link><Link to="/education">Browse courses</Link>
              <button type="button" onClick={auth.signOut}>Sign out</button></div>
          </section> : <PortalWorkspace key={auth.user.id} auth={auth} />}
      </div>
    </div>
  );
}
