import React, { lazy, Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import usePortalData from '../portal/usePortalData';
import FamilyDashboard from '../portal/FamilyDashboard';
import { learningAreas } from './model';
import './learning.css';
const Learning = lazy(() => import('@/components/workspace/Learning'));
const Manage = lazy(() => import('@/components/workspace/Manage'));
const Admissions = lazy(() => import('./Admissions'));
const FeeLedger = lazy(() => import('@/components/workspace/FeeLedger'));

export default function LearningPortal({ auth }) {
  const [params] = useSearchParams();
  const { data, failures, busy, reload } = usePortalData(true);
  const [error, setError] = useState('');
  const areas = learningAreas(data, auth);
  const requested = params.get('tab');
  const area = areas.some(([id]) => id === requested) ? requested : 'learning';
  return (
    <main className="connected-learning">
      <nav className="workspace-tabs portal-navigation" aria-label="Learning areas">
        {areas.map(([id, label]) => (
          <Link key={id} to={`/portal?tab=${id}`} aria-current={area === id ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="workspace-actions">
        <button type="button" disabled={busy} onClick={reload}>
          {busy ? 'Loading records…' : 'Refresh records'}
        </button>
        <Link to="/portal">Back to my account</Link>
      </div>
      {failures.length > 0 && (
        <p role="alert">
          Some learning records could not be loaded. Refresh before making changes.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {busy ? (
        <p role="status">Loading your learning records…</p>
      ) : (
        <Suspense fallback={<p role="status">Opening learning…</p>}>
          {area === 'learning' && (
            <Learning data={data} auth={auth} reload={reload} onError={setError} />
          )}
          {area === 'family' && (
            <FamilyDashboard data={data} auth={auth} reload={reload} failures={failures} />
          )}
          {area === 'fees' && <FeeLedger canManage={auth.isOwner || auth.can?.('finance')} />}
          {area === 'manage' &&
            auth.isOwner &&
            (failures.length ? (
              <p>Management is unavailable until all learning records load.</p>
            ) : (
              <Manage connected data={data} reload={reload} onError={setError} />
            ))}
          {area === 'admissions' &&
            auth.isOwner &&
            (failures.length ? (
              <p>Admissions is unavailable until all learning records load.</p>
            ) : (
              <Admissions data={data} reloadLearning={reload} />
            ))}
        </Suspense>
      )}
      <p className="workspace-meta">
        Learning summaries show up to 500 records per area. Contact the centre for older records.
        Payments and class places are confirmed separately.
      </p>
    </main>
  );
}
