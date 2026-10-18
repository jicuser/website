import { IMAGE_ACCEPT } from '@/lib/images';
import { createImageUploader } from '@/lib/imageUpload';
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  Radio,
  Megaphone,
  FileText,
  Users,
  ShieldCheck,
  LogOut,
  Home,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Upload,
  Activity,
  X,
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  MessageSquare,
  Wallet,
  Heart,
  Building2,
  ChevronDown,
} from 'lucide-react';
import AdminOverview from '@/features/admin/AdminOverview';
import FormsManager from '@/features/forms/FormsManager';
import StaffAccess from '@/components/admin/StaffAccess';
import StreamSetup from '@/components/admin/StreamSetup';
import MobileContentEditor from '@/components/admin/MobileContentEditor';
import PostersEditor from '@/components/admin/PostersEditor';
import PrayerEditor from '@/components/admin/PrayerEditor';
import ContentPages from '@/features/content/ContentPages';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { displayTime } from '@/lib/timetable';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/dateTime';
import TeamEditor from '@/components/admin/TeamEditor';
import FormsInbox from '@/components/admin/FormsInbox';
import { ADMIN_SECTIONS, ADMIN_GROUPS } from '@/content/adminNavigation';
import { getAdminEntrySections } from '@/features/admin/taskNavigation';
import {
  activityActionLabel,
  activityAreaLabel,
  loadAdminActivity,
} from '@/features/admin/activity';

const FinanceManager = lazy(() => import('@/features/operations/Finance'));
const FundraisingManager = lazy(() => import('@/features/operations/FundraisingManager'));
const Safeguarding = lazy(() => import('@/features/operations/Safeguarding'));
const ProjectEditor = lazy(() => import('@/features/projects/ProjectEditor'));
const CertificatesManager = lazy(() => import('@/features/certificates/Certificates'));

const input = 'admin-editor-input w-full rounded-lg border px-3 py-2 outline-none';
const label = 'admin-field-label mb-1 block text-sm font-semibold';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50';
const primary = `${btn} admin-editor-primary`;
const ghost = `${btn} admin-editor-secondary`;
const danger = `${btn} admin-editor-danger`;

const SECTION_ICONS = {
  finance: Wallet,
  fundraising: Heart,
  safeguarding: ShieldCheck,
  projects: Building2,
  app_content: FileText,
  dashboard: Activity,
  prayer: Clock3,
  events: CalendarDays,
  posters: FileText,
  announcements: Megaphone,
  livestream: Radio,
  tv: Monitor,
  content: FileText,
  team: Users,
  messages: MessageSquare,
  forms: FileText,
  certificates: ShieldCheck,
  users: ShieldCheck,
  audit: Activity,
};
const SECTIONS = ADMIN_SECTIONS.map(({ id, name, permission }) => [
  id,
  name,
  SECTION_ICONS[id],
  permission,
]);
const SECTION_GROUPS = ADMIN_GROUPS.map((group) => [
  group,
  ADMIN_SECTIONS.filter((section) => section.group === group).map((section) => section.id),
]);

function Field({ title, children, className = '' }) {
  return (
    <label className={className}>
      <span className={label}>{title}</span>
      {children}
    </label>
  );
}
function Notice({ message, error }) {
  if (!message) return null;
  return (
    <div
      className={`admin-feedback ${error ? 'is-error' : 'is-success'}`}
      role={error ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
}
function Empty({ children }) {
  return (
    <div className="admin-empty rounded-xl border border-dashed p-8 text-center text-sm">
      {children}
    </div>
  );
}
function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
}
async function uploadImage(file, folder = 'admin') {
  if (!file) return null;
  return createImageUploader(supabase)(file, folder);
}

function TvSection({ registerBack }) {
  return <StreamSetup registerBack={registerBack} />;
}

function EventsSection() {
  const blank = {
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: 'Jamatia Islamic Centre',
    speaker: '',
    poster_url: '',
    registration_url: '',
    livestream_url: '',
    category: 'community',
    featured: false,
    published: false,
  };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty =
    editing !== null || posterFile !== null || JSON.stringify(form) !== JSON.stringify(blank);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) {
      setErr(true);
      setMsg(error.message);
    } else setRows(data || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!form.title.trim() || !form.event_date)
      throw new Error('Add an event title and date first.');
    setBusy(true);
    setMsg('');
    try {
      let posterUrl = form.poster_url;
      if (posterFile) posterUrl = await uploadImage(posterFile, 'events');
      const payload = {
        ...form,
        poster_url: posterUrl || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      };
      const query = editing
        ? supabase.from('events').update(payload).eq('id', editing)
        : supabase.from('events').insert(payload);
      const { error } = await query;
      if (error) throw error;
      setForm(blank);
      setEditing(null);
      setPosterFile(null);
      setMsg('Event saved.');
      setErr(false);
      await load();
    } catch (error) {
      setErr(true);
      setMsg(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [form, editing, posterFile, load]);
  useRegisterAdminSave(save, dirty && !busy, editing ? 'Save event' : 'Save event');

  const submit = async (event) => {
    event.preventDefault();
    await save().catch(() => {});
  };
  const edit = (row) => {
    setEditing(row.id);
    setPosterFile(null);
    setForm({
      ...blank,
      ...row,
      start_time: row.start_time?.slice(0, 5) || '',
      end_time: row.end_time?.slice(0, 5) || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const del = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      setErr(true);
      setMsg(error.message);
    } else load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold">Events</h2>
      <Notice message={msg} error={err} />
      <form onSubmit={submit} className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-between">
          <h3 className="font-bold">{editing ? 'Edit event' : 'New event'}</h3>
          {editing && (
            <button
              type="button"
              className={ghost}
              onClick={() => {
                setEditing(null);
                setForm(blank);
                setPosterFile(null);
              }}
            >
              <X size={14} />
              Cancel
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field title="Title">
            <input
              className={input}
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field title="Date">
            <input
              type="date"
              className={input}
              required
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </Field>
          <Field title="Start time">
            <input
              type="time"
              className={input}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </Field>
          <Field title="End time">
            <input
              type="time"
              className={input}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </Field>
          <Field title="Location">
            <input
              className={input}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field title="Speaker">
            <input
              className={input}
              value={form.speaker}
              onChange={(e) => setForm({ ...form, speaker: e.target.value })}
            />
          </Field>
          <Field title="Category">
            <input
              className={input}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field title="Poster">
            <div className="flex gap-2">
              <input
                className={input}
                value={posterFile ? '' : form.poster_url || ''}
                placeholder={posterFile ? posterFile.name : 'Image URL'}
                onChange={(e) => {
                  setPosterFile(null);
                  setForm({ ...form, poster_url: e.target.value });
                }}
              />
              <label className={`${ghost} cursor-pointer`}>
                <Upload size={15} />
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </Field>
          <Field title="Registration URL">
            <input
              className={input}
              value={form.registration_url}
              onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
            />
          </Field>
          <Field title="Livestream URL">
            <input
              className={input}
              value={form.livestream_url}
              onChange={(e) => setForm({ ...form, livestream_url: e.target.value })}
            />
          </Field>
          <Field title="Description" className="md:col-span-2">
            <textarea
              rows="3"
              className={input}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm">
          <label>
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />{' '}
            Published
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />{' '}
            Featured
          </label>
        </div>
        <button disabled={busy || !dirty} className={`${primary} mt-4`}>
          <Save size={15} />
          {busy ? 'Saving…' : 'Save event'}
        </button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <Empty>No events yet.</Empty>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {row.title}{' '}
                  {!row.published && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Draft
                    </span>
                  )}
                </div>
                <div className="admin-muted text-sm">
                  {row.event_date} {row.start_time ? displayTime(row.start_time) : ''} ·{' '}
                  {row.location}
                </div>
              </div>
              <div className="flex gap-2">
                <button className={ghost} onClick={() => edit(row)}>
                  Edit
                </button>
                <button
                  className={danger}
                  aria-label={`Delete ${row.title}`}
                  onClick={() => del(row.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AnnouncementsSection() {
  const makeBlank = () => ({
    title: '',
    body: '',
    kind: 'info',
    published: true,
    starts_at: toDateTimeLocal(),
    expires_at: '',
  });
  const [form, setForm] = useState(makeBlank);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const dirty = Boolean(form.title.trim() || form.body.trim());
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setRows(data || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const save = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) throw new Error('Add a title and message first.');
    const payload = {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error } = await supabase.from('announcements').insert(payload);
    if (error) {
      setMsg(error.message);
      throw error;
    }
    setMsg('Notice saved.');
    setForm(makeBlank());
    await load();
  }, [form, load]);
  useRegisterAdminSave(save, dirty, 'Save notice');
  const del = async (id) => {
    if (window.confirm('Delete notice?')) {
      await supabase.from('announcements').delete().eq('id', id);
      load();
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold">Notices</h2>
      <Notice message={msg} error={msg && !msg.includes('saved')} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save().catch(() => {});
        }}
        className="mb-6 rounded-2xl border bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field title="Title">
            <input
              required
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field title="Priority">
            <select
              className={input}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="info">Info</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field title="Starts">
            <input
              type="datetime-local"
              className={input}
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </Field>
          <Field title="Expires">
            <input
              type="datetime-local"
              className={input}
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </Field>
          <Field title="Message" className="md:col-span-2">
            <textarea
              className={input}
              rows="3"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </Field>
        </div>
        <button className={`${primary} mt-4`} disabled={!dirty}>
          <Save size={15} />
          Save notice
        </button>
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{row.title}</div>
                <p className="admin-muted text-sm">{row.body}</p>
                <p className="admin-muted mt-1 text-xs">{formatDateTime(row.starts_at)}</p>
              </div>
              <button
                className={danger}
                aria-label={`Delete ${row.title}`}
                onClick={() => del(row.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivestreamSection() {
  const blank = {
    enabled: false,
    provider: 'youtube',
    title: 'JIC Live',
    stream_url: '',
    scheduled_at: '',
  };
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(blank);
  const [savedScheduledAt, setSavedScheduledAt] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    supabase
      .from('livestream_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const next = {
          ...data,
          scheduled_at: toDateTimeLocal(data.scheduled_at),
        };
        setForm(next);
        setSaved(next);
        setSavedScheduledAt(data.scheduled_at);
      });
  }, []);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const save = useCallback(async () => {
    let url = form.stream_url?.trim();
    if (url) {
      const parsed = new URL(url);
      if (
        ![
          'youtube.com',
          'www.youtube.com',
          'youtu.be',
          'm.youtube.com',
          'vimeo.com',
          'www.vimeo.com',
          'facebook.com',
          'www.facebook.com',
        ].includes(parsed.hostname)
      )
        throw new Error('Use a supported livestream URL.');
    }
    const payload = {
      ...form,
      stream_url: url || null,
      scheduled_at: fromDateTimeLocal(form.scheduled_at, savedScheduledAt),
    };
    const { error } = await supabase.from('livestream_settings').update(payload).eq('id', 1);
    if (error) {
      setMsg(error.message);
      throw error;
    }
    setSaved(form);
    setSavedScheduledAt(payload.scheduled_at);
    setMsg('Livestream saved.');
  }, [form, savedScheduledAt]);
  useRegisterAdminSave(save, dirty, 'Save livestream');
  return (
    <div>
      <h2 className="text-2xl font-bold">Livestream</h2>
      <Notice message={msg} error={msg && !msg.includes('saved')} />
      <div className="max-w-2xl rounded-2xl border bg-white p-5">
        <div className="grid gap-4">
          <Field title="Title">
            <input
              className={input}
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field title="Provider">
            <select
              className={input}
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="facebook">Facebook</option>
            </select>
          </Field>
          <Field title="Stream URL">
            <input
              className={input}
              value={form.stream_url || ''}
              onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
            />
          </Field>
          <Field title="Scheduled time">
            <input
              type="datetime-local"
              className={input}
              value={form.scheduled_at || ''}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            />
          </Field>
          <label className="text-sm">
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />{' '}
            Show livestream
          </label>
        </div>
        <button
          onClick={() => save().catch((error) => setMsg(error.message))}
          disabled={!dirty}
          className={`${primary} mt-4`}
        >
          <Save size={15} />
          Save livestream
        </button>
      </div>
    </div>
  );
}

function AuditSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    loadAdminActivity(supabase)
      .then(setRows)
      .catch((failure) => setError(failure.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity log</h2>
        </div>
        <button className={ghost} onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          {loading ? 'Loading…' : error ? 'Try again' : 'Refresh'}
        </button>
      </div>
      {loading ? (
        <Empty>Loading…</Empty>
      ) : error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <Empty>No changes recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="admin-table-heading text-xs uppercase">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Area</th>
                <th className="p-3">Staff member</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{formatDateTime(row.created_at)}</td>
                  <td className="p-3 font-semibold">{activityActionLabel(row.action)}</td>
                  <td className="p-3">{activityAreaLabel(row.table_name)}</td>
                  <td className="p-3">
                    <strong>{row.actor_name || 'Staff'}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, profile, signOut, can } = useAuth();
  const { theme, toggleTheme } = useAppearance();
  const { saveCurrent, dirty, saving, label: saveLabel, status } = useAdminSave();
  const allowed = useMemo(() => SECTIONS.filter(([, , , permission]) => can(permission)), [can]);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [sectionBack, setSectionBack] = useState(null);
  const registerBack = useCallback((handler) => {
    setSectionBack(() => (typeof handler === 'function' ? handler : null));
  }, []);
  const { defaultSection, overviewSection } = getAdminEntrySections(allowed.map(([key]) => key));
  const active = allowed.some((item) => item[0] === params.get('section'))
    ? params.get('section')
    : defaultSection;
  const setActive = (key) => setParams({ section: key });

  const chooseSection = (key) => {
    if (saving) return;
    if (key === active || !allowed.some((item) => item[0] === key)) return;
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setSectionBack(null);
    setActive(key);
  };
  const safeSignOut = async () => {
    if (saving) return;
    if (dirty && !window.confirm('Sign out and discard unsaved changes?')) return;
    await signOut().catch(() => window.alert('Sign out could not be confirmed. Please try again.'));
  };

  const section = {
    finance: (
      <Suspense fallback={<p role="status">Opening finance…</p>}>
        <FinanceManager />
      </Suspense>
    ),
    fundraising: (
      <Suspense fallback={<p role="status">Opening fundraising…</p>}>
        <FundraisingManager />
      </Suspense>
    ),
    safeguarding: (
      <Suspense fallback={<p role="status">Opening reviews…</p>}>
        <Safeguarding />
      </Suspense>
    ),
    projects: (
      <Suspense fallback={<p role="status">Opening timeline…</p>}>
        <ProjectEditor />
      </Suspense>
    ),
    tv: <TvSection registerBack={registerBack} />,
    dashboard: <AdminOverview onChoose={chooseSection} icons={SECTION_ICONS} />,
    prayer: <PrayerEditor />,
    events: <EventsSection />,
    posters: <PostersEditor key={user?.id} registerBack={registerBack} />,
    app_content: <MobileContentEditor />,
    announcements: <AnnouncementsSection />,
    livestream: <LivestreamSection />,
    content: (
      <ContentPages
        key={user?.id}
        initialPath={params.get('page') || '/'}
        registerBack={registerBack}
      />
    ),
    team: <TeamEditor uploadImage={uploadImage} />,
    messages: (
      <FormsInbox
        kind="contact"
        title="Contact messages"
        description="Messages sent through Contact Us. Registration and application responses stay in Forms."
      />
    ),
    forms: <FormsManager key={user?.id} registerBack={registerBack} />,
    certificates: (
      <Suspense fallback={<p role="status">Loading certificates…</p>}>
        <CertificatesManager />
      </Suspense>
    ),
    users: <StaffAccess />,
    audit: <AuditSection />,
  }[active];

  const auditName = user?.user_metadata?.audit_name || profile?.display_name || 'User';
  const sectionName = allowed.find(([key]) => key === active)?.[1] || 'Admin';
  const sectionDescription = ADMIN_SECTIONS.find(({ id }) => id === active)?.description;
  const shortSaveLabel = saveLabel.split(' ')[0];

  return (
    <div className="admin-console min-h-screen">
      <a className="jic-skip-link" href="#staff-content">
        Skip to staff tools
      </a>
      <header className="admin-account-header">
        <div className="admin-toolbar-title">
          <strong>JIC Staff workspace</strong>
          <small>Centre management</small>
        </div>
        <div className="admin-toolbar-actions">
          <button
            className="admin-button"
            aria-label="View website"
            disabled={saving}
            onClick={() => {
              if (!dirty || window.confirm('Discard unsaved changes?')) navigate('/');
            }}
          >
            <ExternalLink size={18} />
            <span className="admin-website-label">View website</span>
          </button>
          <details
            className="admin-account-menu"
            onBlur={(event) => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
                event.currentTarget.open = false;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary>
              <Users size={17} aria-hidden="true" />
              <span>Account</span>
              <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <div className="admin-account-menu-panel">
              <div className="admin-account-identity">
                <strong>{auditName}</strong>
                <small>{profile?.is_owner ? 'Centre owner' : 'Staff account'}</small>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (!dirty || window.confirm('Discard unsaved changes?'))
                    navigate('/portal?workspace=personal');
                }}
              >
                <Users size={17} aria-hidden="true" />
                My account
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (!dirty || window.confirm('Discard unsaved changes?'))
                    navigate('/admin/setup?mode=change');
                }}
              >
                <KeyRound size={17} aria-hidden="true" />
                Change password
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={17} aria-hidden="true" />
                ) : (
                  <Moon size={17} aria-hidden="true" />
                )}
                {theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
              </button>
              <button type="button" disabled={saving} onClick={safeSignOut}>
                <LogOut size={17} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      <div className="admin-toolbar">
        <div className="admin-desktop-current">
          <strong>{sectionName}</strong>
          {sectionDescription && <small>{sectionDescription}</small>}
        </div>
        <nav className="admin-mobile-section" aria-label="Current admin section">
          {sectionBack && (
            <button
              className="admin-mobile-back"
              disabled={saving}
              aria-label="Back"
              onClick={sectionBack}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Back</span>
            </button>
          )}
          <label className="admin-mobile-switcher">
            <span className="sr-only">Go to admin area</span>
            <select
              aria-label="Go to admin area"
              value={active}
              disabled={saving}
              onChange={(event) => chooseSection(event.target.value)}
            >
              {SECTION_GROUPS.filter(([, keys]) => allowed.some(([key]) => keys.includes(key))).map(
                ([group, keys]) => (
                  <optgroup key={group} label={group}>
                    {allowed
                      .filter(([key]) => keys.includes(key))
                      .map(([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                  </optgroup>
                ),
              )}
            </select>
          </label>
          {overviewSection && active !== overviewSection && (
            <button
              className="admin-mobile-overview"
              disabled={saving}
              aria-label="Staff home"
              onClick={() => chooseSection(overviewSection)}
            >
              <Home size={18} aria-hidden="true" />
              <span>Home</span>
            </button>
          )}
        </nav>
        {dirty && (
          <button
            className="admin-button primary admin-save-pending"
            disabled={saving}
            aria-label={saving ? 'Saving…' : saveLabel}
            onClick={() => saveCurrent().catch(() => {})}
          >
            <Save size={16} aria-hidden="true" />
            <span className="admin-save-label">{saving ? 'Saving…' : saveLabel}</span>
            <span className="admin-save-short" aria-hidden="true">
              {saving ? 'Saving…' : shortSaveLabel}
            </span>
          </button>
        )}
        {status && (
          <p role="status" className="admin-toolbar-status">
            {status}
          </p>
        )}
      </div>
      <div className="admin-console-layout">
        <aside className="admin-navigation max-[800px]:hidden">
          <nav aria-label="Admin sections">
            {overviewSection && (
              <button
                className="admin-overview-link"
                disabled={saving}
                onClick={() => chooseSection(overviewSection)}
                aria-current={active === overviewSection ? 'page' : undefined}
              >
                <Home size={18} aria-hidden="true" />
                Overview
              </button>
            )}
            {SECTION_GROUPS.filter(([, keys]) => allowed.some(([key]) => keys.includes(key))).map(
              ([group, keys]) =>
                group === 'Workspace' ? null : (
                  <details
                    key={`${group}:${active}`}
                    className="admin-navigation-group"
                    open={keys.includes(active)}
                  >
                    <summary>
                      <span>{group}</span>
                      <ChevronDown size={15} aria-hidden="true" />
                    </summary>
                    {allowed
                      .filter(([key]) => keys.includes(key))
                      .map(([key, name, Icon]) => (
                        <button
                          key={key}
                          disabled={saving}
                          onClick={() => chooseSection(key)}
                          aria-current={active === key ? 'page' : undefined}
                        >
                          <Icon size={18} aria-hidden="true" />
                          {name}
                        </button>
                      ))}
                  </details>
                ),
            )}
          </nav>
        </aside>
        <main id="staff-content" tabIndex={-1} className="admin-main">
          {section}
        </main>
      </div>
    </div>
  );
}
