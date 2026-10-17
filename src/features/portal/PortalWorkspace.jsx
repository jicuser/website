import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminSaveProvider } from '@/context/AdminSaveContext';
import Tasks, { Notifications } from '@/components/workspace/Tasks';
import { portalArea, portalAreas, portalSearch } from './model';
import usePortalData from './usePortalData';
import PortalHome from './PortalHome';
import FamilyDashboard from './FamilyDashboard';
const Learning = lazy(() => import('@/components/workspace/Learning'));
const Manage = lazy(() => import('@/components/workspace/Manage'));
const CustomFormsWorkspace = lazy(() => import('@/components/workspace/CustomFormsWorkspace'));
const FeeLedger = lazy(() => import('@/components/workspace/FeeLedger'));
const SermonManager = lazy(() =>
  import('@/components/workspace/Sermons').then((module) => ({ default: module.SermonManager })),
);

export default function PortalWorkspace({ auth }) {
  const [params, setParams] = useSearchParams();
  const { data, failures, busy, reload } = usePortalData();
  const [actionError, setActionError] = useState('');
  const areas = portalAreas(data, auth);
  const area = portalArea(params, areas);
  const changeArea = (next) => {
    setActionError('');
    setParams(portalSearch(params, next));
  };
  useEffect(() => {
    const refresh = () => auth.refreshProfile().catch(() => {});
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [auth.refreshProfile]);
  return (
    <>
      <div className="workspace-actions portal-account-actions">
        <button type="button" disabled={busy} onClick={reload}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={() =>
            auth
              .signOut()
              .catch(() => setActionError('Sign out could not be confirmed. Please try again.'))
          }
        >
          Sign out
        </button>
      </div>
      <nav className="workspace-tabs portal-navigation" aria-label="Workspace areas">
        {areas.map(([id, title]) => (
          <Link
            key={id}
            to={`/portal?${portalSearch(params, id)}`}
            aria-current={area === id ? 'page' : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {failures.length > 0 && (
        <p role="alert" className="workspace-card">
          Some records could not be loaded. Available areas remain usable; refresh to try the
          missing records again.
        </p>
      )}
      {actionError && <p role="alert">{actionError}</p>}
      <Suspense fallback={<p role="status">Opening your area…</p>}>
        {area === 'home' && (
          <PortalHome
            data={data}
            auth={auth}
            params={params}
            areas={areas}
            busy={busy}
            failures={failures}
          />
        )}
        {area === 'family' && (
          <FamilyDashboard data={data} auth={auth} reload={reload} failures={failures} />
        )}
        {area === 'learning' && (
          <Learning data={data} auth={auth} reload={reload} onError={setActionError} />
        )}
        {area === 'tasks' && (
          <Tasks
            rows={data.work_tasks}
            notifications={data.user_notifications}
            reload={reload}
            formId={params.get('form')}
            onError={setActionError}
          />
        )}
        {area === 'notifications' && (
          <Notifications
            rows={data.user_notifications}
            reload={reload}
            onError={setActionError}
            onOpen={changeArea}
          />
        )}
        {area === 'forms' && (
          <AdminSaveProvider>
            <CustomFormsWorkspace
              key={params.get('mine') || 'mine'}
              auth={auth}
              initialMine={params.get('mine') !== 'false'}
            />
          </AdminSaveProvider>
        )}
        {area === 'fees' && <FeeLedger canManage={auth.isOwner} />}
        {area === 'manage' && auth.isOwner && (
          <Manage data={data} reload={reload} onError={setActionError} />
        )}
        {area === 'talks' && auth.isOwner && <SermonManager />}
      </Suspense>
      <p className="workspace-meta">
        Learning summaries use up to 500 authorised records per area. Fees and forms use their own
        paginated lists.
      </p>
    </>
  );
}
