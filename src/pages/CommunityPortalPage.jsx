import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Tasks, { Notifications } from '@/components/workspace/Tasks';
import Learning from '@/components/workspace/Learning';
import Manage from '@/components/workspace/Manage';
import FormsInbox from '@/components/admin/FormsInbox';
import { ActionForm, TextField, checked } from '@/components/workspace/shared';
import '@/styles/workspace.css';

export const WORKSPACE_ENABLED = import.meta.env.VITE_ENABLE_WORKSPACE === 'true';
const tables = [
  'learning_courses',
  'learning_staff',
  'learning_students',
  'learning_enrolments',
  'learning_sessions',
  'learning_attendance',
  'learning_records',
  'learning_meetings',
  'student_contributions',
  'work_tasks',
  'user_notifications',
  'form_workflows',
];
const empty = () => Object.fromEntries(tables.map((name) => [name, []]));
export default function CommunityPortalPage() {
  const auth = useAuth();
  if (!WORKSPACE_ENABLED)
    return (
      <div className="community-workspace">
        <div className="workspace-wrap">
          <h1>Community portal</h1>
          <p>The student and staff workspace is being prepared.</p>
          <Link to="/education">Back to education</Link>
        </div>
      </div>
    );
  return (
    <div className="community-workspace">
      <div className="workspace-wrap">
        <header className="workspace-header">
          <h1>Community portal</h1>
          <Link to="/">Website</Link>
        </header>
        {auth.loading ? (
          <p role="status">Checking your account…</p>
        ) : !auth.user ? (
          <ActionForm
            title="Sign in"
            button="Sign in"
            onSubmit={async (form) => {
              await auth.signInMember(form.get('email'), form.get('password'));
            }}
          >
            <TextField name="email" label="Email" type="email" autoComplete="username" />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          </ActionForm>
        ) : !auth.profile?.is_active ? (
          <div>
            <p role="alert">
              {auth.profileError || 'This account does not have active portal access.'}
            </p>
            <button onClick={auth.refreshProfile}>Check again</button>
            <button onClick={auth.signOut}>Sign out</button>
          </div>
        ) : (
          <Workspace key={auth.user.id} auth={auth} />
        )}
      </div>
    </div>
  );
}
function Workspace({ auth }) {
  const [params] = useSearchParams();
  const formId = params.get('form');
  const [tab, setTab] = useState(formId ? 'tasks' : 'learning');
  useEffect(() => {
    if (formId) setTab('tasks');
  }, [formId]);
  const [data, setData] = useState(empty);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const report = useCallback((message) => setError(message), []);
  const reload = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const results = await Promise.all(
        tables.map(async (name) => {
          let query = supabase.from(name).select('*').limit(500);
          const order =
            name === 'learning_meetings'
              ? 'requested_at'
              : [
                    'learning_staff',
                    'learning_enrolments',
                    'learning_attendance',
                    'form_workflows',
                  ].includes(name)
                ? null
                : 'created_at';
          if (order) query = query.order(order, { ascending: false });
          return [name, await checked(query)];
        }),
      );
      setData(Object.fromEntries(results));
    } catch (e) {
      setData(empty());
      setError('The workspace could not be loaded. ' + e.message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    const refresh = () => auth.refreshProfile();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [auth.refreshProfile]);
  const options = [
    ['learning', 'My learning'],
    ['tasks', 'Actions'],
    ['notifications', 'Notifications'],
    ...(auth.can('forms') ? [['forms', 'Forms inbox']] : []),
    ...(auth.isOwner ? [['manage', 'Manage learning']] : []),
  ];
  return (
    <>
      <div className="workspace-actions">
        <span>{auth.profile.display_name}</span>
        <button disabled={busy} onClick={reload}>
          Refresh
        </button>
        <button onClick={auth.signOut}>Sign out</button>
        {auth.isAdmin && <Link to="/admin">Website admin</Link>}
      </div>
      <nav className="workspace-tabs" aria-label="Workspace">
        {options.map(([id, title]) => (
          <button
            key={id}
            aria-current={id === tab ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {title}
          </button>
        ))}
      </nav>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading workspace…</p>}
      <>
        {tab === 'learning' && (
          <Learning data={data} auth={auth} reload={reload} onError={report} />
        )}
        {tab === 'tasks' && (
          <Tasks
            rows={data.work_tasks}
            notifications={data.user_notifications}
            reload={reload}
            formId={formId}
            onError={report}
          />
        )}
        {tab === 'notifications' && (
          <Notifications rows={data.user_notifications} reload={reload} onError={report} />
        )}
        {tab === 'forms' && auth.can('forms') && <FormsInbox />}
        {tab === 'manage' && auth.isOwner && (
          <Manage data={data} reload={reload} onError={report} />
        )}
        <p className="workspace-meta">
          Showing up to 500 records in each area. All records are restricted to your current access.
        </p>
      </>
    </>
  );
}
