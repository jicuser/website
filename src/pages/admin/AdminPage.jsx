import { IMAGE_ACCEPT, validateImage } from '@/lib/images';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Upload,
  Activity,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import FormsInbox from '@/components/admin/FormsInbox';
import StaffAccess from '@/components/admin/StaffAccess';
import StreamSetup from '@/components/admin/StreamSetup';
import PostersEditor from '@/components/admin/PostersEditor';
import PrayerEditor from '@/components/admin/PrayerEditor';
import PageEditor from '@/components/admin/PageEditor';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { displayTime } from '@/lib/timetable';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/dateTime';

const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50';
const primary = `${btn} bg-amber-400 text-slate-950 hover:bg-amber-300`;
const ghost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const danger = `${btn} bg-red-50 text-red-700 hover:bg-red-100`;

const SECTIONS = [
  ['dashboard', 'Overview', Activity, 'dashboard'],
  ['prayer', 'Timetable & Jummah', Clock3, 'prayer_times'],
  ['events', 'Events', CalendarDays, 'events'],
  ['posters', 'Posters & announcements', FileText, 'content'],
  ['announcements', 'Announcements', Megaphone, 'announcements'],
  ['livestream', 'Livestream', Radio, 'livestream'],
  ['tv', 'Hall streams', Monitor, 'tv'],
  ['content', 'Website & pages', FileText, 'content'],
  ['team', 'Meet the team', Users, 'team'],
  ['forms', 'Forms inbox', FileText, 'forms'],
  ['users', 'Staff & access', ShieldCheck, 'users'],
  ['audit', 'Audit log', Activity, 'audit'],
];

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
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      {message}
    </div>
  );
}
function Empty({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
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
  const ext = validateImage(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('site-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

function DashboardSection({ onChoose }) {
  const { can } = useAuth();
  const tasks = [
    ['tv', 'Hall streams', 'Choose a hall, show a class or return to posters.', Monitor, 'tv'],
    [
      'prayer',
      'Prayer times',
      'Today’s times, monthly timetable and Jummah.',
      Clock3,
      'prayer_times',
    ],
    ['events', 'Events & posters', 'Add a poster, date and event details.', CalendarDays, 'events'],
    [
      'posters',
      'Posters & announcements',
      'Edit pictures and announcement text; choose where posters appear.',
      FileText,
      'content',
    ],
    ['announcements', 'Notices', 'Keep the community up to date.', Megaphone, 'announcements'],
    ['livestream', 'Livestream', 'Choose the website’s live video.', Radio, 'livestream'],
    [
      'forms',
      'Forms inbox',
      'Read messages and registrations, then mark them completed.',
      FileText,
      'forms',
    ],
    ['users', 'Staff access', 'Choose who can edit and control TVs.', Users, 'users'],
  ].filter(([, , , , permission]) => can(permission));
  return (
    <div>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">JAMATIA ISLAMIC CENTRE</span>
          <h2>What would you like to do?</h2>
        </div>
      </div>
      <div className="admin-task-grid">
        {can('content') && (
          <Link to="/">
            <Home />
            <strong>Website</strong>
            <span>Open the site, then choose Edit this page for pictures and text.</span>
          </Link>
        )}
        {tasks.map(([id, title, description, Icon]) => (
          <button key={id} onClick={() => onChoose(id)}>
            <Icon />
            <strong>{title}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function TvSection() {
  return <StreamSetup />;
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
                <div className="text-sm text-slate-500">
                  {row.event_date} {row.start_time ? displayTime(row.start_time) : ''} ·{' '}
                  {row.location}
                </div>
              </div>
              <div className="flex gap-2">
                <button className={ghost} onClick={() => edit(row)}>
                  Edit
                </button>
                <button className={danger} onClick={() => del(row.id)}>
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
    setMsg('Announcement saved.');
    setForm(makeBlank());
    await load();
  }, [form, load]);
  useRegisterAdminSave(save, dirty, 'Save announcement');
  const del = async (id) => {
    if (window.confirm('Delete announcement?')) {
      await supabase.from('announcements').delete().eq('id', id);
      load();
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold">Announcements</h2>
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
          Save announcement
        </button>
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{row.title}</div>
                <p className="text-sm text-slate-600">{row.body}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(row.starts_at)}</p>
              </div>
              <button className={danger} onClick={() => del(row.id)}>
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

function TeamSection() {
  const blank = {
    name: '',
    role_title: '',
    bio: '',
    image_url: '',
    sort_order: 0,
    published: true,
  };
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [photoFile, setPhotoFile] = useState(null);
  const [msg, setMsg] = useState('');
  const dirty =
    editing !== null || photoFile !== null || JSON.stringify(form) !== JSON.stringify(blank);
  const load = useCallback(async () => {
    const { data } = await supabase.from('team_members').select('*').order('sort_order');
    setRows(data || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const save = useCallback(async () => {
    if (!form.name.trim()) throw new Error('Add a name first.');
    setBusy(true);
    try {
      let imageUrl = form.image_url;
      if (photoFile) imageUrl = await uploadImage(photoFile, 'team');
      const payload = { ...form, image_url: imageUrl || null };
      const query = editing
        ? supabase.from('team_members').update(payload).eq('id', editing)
        : supabase.from('team_members').insert(payload);
      const { error } = await query;
      if (error) throw error;
      setMsg('Team member saved.');
      setForm(blank);
      setPhotoFile(null);
      setEditing(null);
      await load();
    } catch (error) {
      setMsg(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [form, photoFile, editing, load]);
  useRegisterAdminSave(save, dirty && !busy, 'Save team member');
  const del = async (id) => {
    if (window.confirm('Delete team member?')) {
      await supabase.from('team_members').delete().eq('id', id);
      load();
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold">Meet the team</h2>
      <Notice message={msg} error={msg && !msg.includes('saved')} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save().catch(() => {});
        }}
        className="mb-6 rounded-2xl border bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field title="Name">
            <input
              required
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field title="Role/title">
            <input
              className={input}
              value={form.role_title}
              onChange={(e) => setForm({ ...form, role_title: e.target.value })}
            />
          </Field>
          <Field title="Photo">
            <div className="flex gap-2">
              <input
                className={input}
                value={photoFile ? '' : form.image_url || ''}
                placeholder={photoFile ? photoFile.name : 'Image URL'}
                onChange={(e) => {
                  setPhotoFile(null);
                  setForm({ ...form, image_url: e.target.value });
                }}
              />
              <label className={`${ghost} cursor-pointer`}>
                <Upload size={14} />
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </Field>
          <Field title="Sort order">
            <input
              type="number"
              className={input}
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </Field>
          <Field title="Bio" className="md:col-span-2">
            <textarea
              className={input}
              rows="3"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Field>
        </div>
        <label className="mt-4 block text-sm">
          <input
            type="checkbox"
            checked={!!form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />{' '}
          Published
        </label>
        <button disabled={busy || !dirty} className={`${primary} mt-4`}>
          <Save size={15} />
          {busy ? 'Saving…' : 'Save team member'}
        </button>
        {editing && (
          <button
            type="button"
            className={`${ghost} mt-4 ml-2`}
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setPhotoFile(null);
            }}
          >
            Cancel
          </button>
        )}
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 rounded-xl border bg-white p-4">
            {row.image_url && (
              <img
                src={row.image_url}
                alt={row.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold">{row.name}</div>
              <div className="text-sm text-slate-500">{row.role_title}</div>
            </div>
            <button
              disabled={busy}
              className={ghost}
              onClick={() => {
                setEditing(row.id);
                setForm({ ...blank, ...row });
                setPhotoFile(null);
                window.scrollTo({ top: 0 });
              }}
            >
              Edit
            </button>
            <button className={danger} onClick={() => del(row.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    supabase
      .from('audit_log')
      .select('id,actor_id,actor_name,table_name,record_id,action,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit log</h2>
        </div>
        <button className={ghost} onClick={load}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
      {loading ? (
        <Empty>Loading…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No changes recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
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
                  <td className="p-3 font-semibold">{row.action}</td>
                  <td className="p-3">{row.table_name}</td>
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
  const active = allowed.some((item) => item[0] === params.get('section'))
    ? params.get('section')
    : allowed[0]?.[0] || 'dashboard';
  const setActive = (key) => setParams({ section: key }, { replace: true });

  const chooseSection = (key) => {
    if (key === active || !allowed.some((item) => item[0] === key)) return;
    if (dirty && active !== 'tv' && !window.confirm('Discard unsaved changes?')) return;
    setActive(key);
  };
  const safeSignOut = async () => {
    if (dirty && active !== 'tv' && !window.confirm('Sign out and discard unsaved changes?'))
      return;
    await signOut();
  };

  const section = {
    tv: <TvSection />,
    dashboard: <DashboardSection onChoose={chooseSection} />,
    prayer: <PrayerEditor />,
    events: <EventsSection />,
    posters: <PostersEditor />,
    announcements: <AnnouncementsSection />,
    livestream: <LivestreamSection />,
    content: <PageEditor initialPath={params.get('page') || '/'} />,
    team: <TeamSection />,
    forms: <FormsInbox />,
    users: <StaffAccess />,
    audit: <AuditSection />,
  }[active];

  const auditName = user?.user_metadata?.audit_name || profile?.display_name || 'User';

  return (
    <div className="admin-console min-h-screen bg-slate-100 text-slate-900">
      <header className="admin-toolbar">
        <div className="admin-toolbar-title">
          <strong>JIC Admin</strong>
          <small>
            {auditName}
            {profile?.is_owner ? ' · Owner' : ''}
          </small>
        </div>
        <div className="admin-toolbar-actions">
          <button
            className="admin-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="admin-button"
            onClick={() => {
              if (!dirty || active === 'tv' || window.confirm('Discard unsaved changes?'))
                navigate('/');
            }}
          >
            <Home size={18} />
            Website
          </button>
          <button className="admin-button" onClick={safeSignOut} aria-label="Sign out">
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
        {dirty && (
          <button
            className="admin-button primary admin-save-pending"
            disabled={saving}
            onClick={() => saveCurrent().catch(() => {})}
          >
            <Save size={16} />
            {saving ? 'Saving…' : saveLabel}
          </button>
        )}
        {status && (
          <p role="status" className="admin-toolbar-status">
            {status}
          </p>
        )}
      </header>
      <div className="admin-console-layout">
        <aside className="admin-navigation">
          <label className="admin-mobile-section">
            Go to
            <select value={active} onChange={(event) => chooseSection(event.target.value)}>
              {allowed.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label="Admin sections">
            {[
              [
                'Everyday',
                ['dashboard', 'tv', 'prayer', 'posters', 'events', 'announcements', 'livestream'],
              ],
              ['Website & people', ['content', 'forms', 'team', 'users', 'audit']],
            ].map(([group, keys]) => (
              <div key={group}>
                <p>{group}</p>
                {allowed
                  .filter(([key]) => keys.includes(key))
                  .map(([key, name, Icon]) => (
                    <button
                      key={key}
                      onClick={() => chooseSection(key)}
                      aria-current={active === key ? 'page' : undefined}
                    >
                      <Icon size={18} />
                      {name}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="admin-main">{section}</main>
      </div>
    </div>
  );
}
