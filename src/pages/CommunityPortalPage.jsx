import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, ShieldCheck, Users, Wallet, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { portalDestination } from '@/lib/portalDestination';
import PortalSignIn from '@/features/portal/PortalSignIn';
import PortalWorkspace from '@/features/portal/PortalWorkspace';
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
  if (!auth.loading && auth.isAdmin && !next && params.get('workspace') !== 'personal')
    return <Navigate to="/admin" replace />;
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
            {auth.isAdmin && <Link to="/admin">Staff workspace</Link>}
            {auth.user && auth.profile?.is_active && (
              <Link to="/account/certificates">My certificates</Link>
            )}
            <Link to="/">Website</Link>
          </div>
        </header>
        {auth.isAdmin && (
          <nav className="portal-workspace-switch" aria-label="Account area">
            <Link to="/admin">Staff workspace</Link>
            <Link to="/portal?workspace=personal" aria-current="page">
              My account
            </Link>
          </nav>
        )}
        {error && <p role="alert">{error}</p>}
        {!auth.user ? (
          <div className="portal-entry-layout">
            <section className="portal-entry-intro">
              <p className="workspace-kicker">Welcome to your centre</p>
              <h2>
                Your JIC records.
                <br />
                One place to begin.
              </h2>
              <p>Sign in for your available records, invoices and requests.</p>
              <ul>
                <li>
                  <Users aria-hidden="true" />
                  <span>
                    <strong>Family & learning</strong>
                    <small>
                      {WORKSPACE_ENABLED
                        ? 'Linked children, classes and published progress.'
                        : 'Family and learning records are not currently available here.'}
                    </small>
                  </span>
                </li>
                <li>
                  <Award aria-hidden="true" />
                  <span>
                    <strong>Your certificates</strong>
                    <small>Find guidance, request a record and view available certificates.</small>
                  </span>
                </li>
                <li>
                  <ShieldCheck aria-hidden="true" />
                  <span>
                    <strong>Your own records</strong>
                    <small>View the records shared with your account.</small>
                  </span>
                </li>
              </ul>
              <Link to="/services/certificates">
                Explore certificates <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
            <div>
              {auth.loading && <p role="status">Checking your account…</p>}
              <PortalSignIn auth={auth} returnTo={next} />
            </div>
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
          <>
            <section className="portal-welcome">
              <p className="workspace-kicker">My account</p>
              <h2>Welcome{auth.profile.display_name ? `, ${auth.profile.display_name}` : ''}</h2>
              <p>Choose what you need help with today.</p>
            </section>
            <div className="portal-card-grid">
              {[
                [
                  Wallet,
                  'My invoices',
                  'View shared invoices and recorded payments.',
                  '/account/invoices',
                ],
                [
                  Heart,
                  'My fundraising',
                  'Create a personal campaign and follow its review.',
                  '/fundraise/new',
                ],
                [
                  Award,
                  'My certificates',
                  'Find certificate guidance and your available records.',
                  '/account/certificates',
                ],
                [
                  BookOpen,
                  'Courses & classes',
                  'Find current learning opportunities at JIC.',
                  '/education',
                ],
                [
                  Users,
                  'Services & bookings',
                  'Plan a visit, ceremony or hall enquiry.',
                  '/services',
                ],
              ].map(([Icon, title, text, to]) => (
                <Link className="portal-area-card" key={to} to={to}>
                  <Icon size={22} aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <section className="workspace-card">
              <h3>Family and learning records</h3>
              <p>
                These records are not available on this website yet. The office can help with your
                enrolment or linked family access.
              </p>
              <div className="workspace-actions">
                <Link to="/account/request">Account help</Link>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </section>
          </>
        ) : (
          <PortalWorkspace key={auth.user.id} auth={auth} />
        )}
      </div>
    </div>
  );
}
