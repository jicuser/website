import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Users,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Tasks, { Notifications } from '@/components/workspace/Tasks';
import Learning from '@/components/workspace/Learning';
import Manage from '@/components/workspace/Manage';
import CustomFormsWorkspace from '@/components/workspace/CustomFormsWorkspace';
import { SermonManager } from '@/components/workspace/Sermons';
import FeeLedger from '@/components/workspace/FeeLedger';
import { ActionForm, TextField, checked } from '@/components/workspace/shared';
import '@/styles/workspace.css';

export const WORKSPACE_ENABLED = import.meta.env.VITE_ENABLE_WORKSPACE === 'true';
const tables = [
  'learning_courses',
  'learning_staff',
  'learning_students',
  'learning_guardians',
  'learning_department_heads',
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
  const [signInError, setSignInError] = useState('');

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
            <Link to="/account/recovery">Forgot your password?</Link>
            <button
              type="button"
              onClick={async () => {
                setSignInError('');
                try {
                  await auth.signInWithGoogle();
                } catch (error) {
                  setSignInError(error.message);
                }
              }}
            >
              Continue with Google
            </button>
            {signInError && <p role="alert">{signInError}</p>}
            <p className="workspace-meta">
              Need access? <Link to="/account/request">Request a JIC account</Link>
            </p>
          </ActionForm>
        ) : !auth.profile?.is_active ? (
          <div>
            <p role="alert">
              {auth.profileError || 'This account does not have active portal access.'}
            </p>
            <button onClick={auth.refreshProfile}>Check again</button>
            <button onClick={auth.signOut}>Sign out</button>
          </div>
        ) : !WORKSPACE_ENABLED ? (
          <section className="workspace-card">
            <h2>My account</h2>
            <p>Signed in as {auth.profile.display_name || auth.user.email}.</p>
            <p>
              Learning and family tools are not available yet. You can use the website and any
              approved staff areas.
            </p>
            <div className="workspace-actions">
              {auth.isAdmin && <Link to="/admin">Open administration</Link>}
              <Link to="/account/request">Request access</Link>
              <Link to="/education">Browse courses</Link>
              <button onClick={auth.signOut}>Sign out</button>
            </div>
          </section>
        ) : (
          <Workspace key={auth.user.id} auth={auth} />
        )}
      </div>
    </div>
  );
}
function WorkspaceSummary({ data }) {
  const unread = data.user_notifications.filter((row) => !row.read_at).length;
  const openTasks = data.work_tasks.filter(
    (row) => !['done', 'completed', 'closed'].includes(String(row.status || '').toLowerCase()),
  ).length;
  const upcoming = data.learning_sessions.filter((row) => {
    const value = row.starts_at;
    return value ? new Date(value).getTime() >= Date.now() : false;
  }).length;
  const items = [
    [BookOpen, data.learning_courses.length, 'Courses'],
    [CalendarDays, upcoming, 'Upcoming sessions'],
    [ClipboardList, openTasks, 'Open actions'],
    [Bell, unread, 'Unread updates'],
  ];
  return (
    <section className="workspace-summary" aria-label="Workspace summary">
      {items.map(([Icon, value, label]) => (
        <div className="workspace-summary-card" key={label}>
          <span className="workspace-summary-icon">
            <Icon size={17} />
          </span>
          <span>
            <strong>{value}</strong>
            <small>{label}</small>
          </span>
        </div>
      ))}
    </section>
  );
}

function WorkspaceOverview({ data, auth, onTabChange }) {
  const userId = auth.user?.id;
  const teaching =
    auth.isOwner ||
    data.learning_staff.some((row) => row.user_id === userId) ||
    (data.learning_department_heads || []).some((row) => row.user_id === userId);
  const family =
    data.learning_students.some((row) => row.user_id === userId || row.guardian_id === userId) ||
    (data.learning_guardians || []).some((row) => row.user_id === userId);

  const cards = [
    ...(family
      ? [[Users, 'My family', 'Open children, attendance, progress and fees.', 'learning']]
      : []),
    ...(teaching
      ? [
          [
            BookOpen,
            'Teaching workspace',
            'Take registers, add progress and manage classes.',
            'learning',
          ],
        ]
      : []),
    ...(auth.isAdmin
      ? [[CheckCircle2, 'Administration', 'Review tasks, forms, content and staff work.', 'admin']]
      : []),
  ];
  return (
    <section className="workspace-overview" aria-label="Workspace overview">
      <div className="workspace-overview-heading">
        <div>
          <p className="workspace-kicker">Your JIC workspace</p>
          <h2>Choose where to start</h2>
        </div>
        <span className="workspace-status">
          <span /> Secure account
        </span>
      </div>
      <div className="workspace-overview-grid">
        {cards.map(([Icon, title, text, tab]) => (
          <button
            type="button"
            className="workspace-overview-card workspace-overview-action"
            key={title}
            aria-label={title}
            onClick={() => (tab === 'admin' ? window.location.assign('/admin') : onTabChange(tab))}
          >
            <span className="workspace-overview-icon">
              <Icon size={19} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}
function Workspace({ auth }) {
  const [params] = useSearchParams();
  const formId = params.get('form');
  const [tab, setTab] = useState(
    formId
      ? 'tasks'
      : ['forms', 'fees'].includes(params.get('tab'))
        ? params.get('tab')
        : 'learning',
  );
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
                    'learning_guardians',
                    'learning_department_heads',
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
  const userId = auth.user?.id;
  const isTeacher =
    auth.isOwner ||
    data.learning_staff.some((row) => row.user_id === userId) ||
    (data.learning_department_heads || []).some((row) => row.user_id === userId);
  const hasFamily =
    data.learning_students.some((row) => row.user_id === userId || row.guardian_id === userId) ||
    (data.learning_guardians || []).some((row) => row.user_id === userId);
  const options = [
    ['learning', isTeacher ? 'Learning & teaching' : 'My learning'],
    ['tasks', 'My actions'],
    ['notifications', 'Updates'],
    ['forms', 'Forms & replies'],
    ...(hasFamily || auth.isOwner ? [['fees', 'Fees']] : []),
    ...(auth.isOwner ? [['manage', 'Manage learning']] : []),
    ...(auth.isOwner ? [['talks', 'Talks']] : []),
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
      <WorkspaceSummary data={data} />
      <WorkspaceOverview data={data} auth={auth} onTabChange={setTab} />
      <p className="workspace-nav-label">Your areas</p>
      <nav className="workspace-tabs" aria-label="Workspace areas">
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
          <Notifications
            rows={data.user_notifications}
            reload={reload}
            onError={report}
            onOpen={setTab}
          />
        )}
        {tab === 'forms' && (
          <CustomFormsWorkspace auth={auth} initialMine={params.get('mine') === 'true'} />
        )}
        {tab === 'talks' && auth.isOwner && <SermonManager />}
        {tab === 'fees' && <FeeLedger canManage={auth.isOwner} />}
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
