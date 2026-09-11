import { IMAGE_ACCEPT, validateImage } from '@/lib/images';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  UserPlus,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import TvScreenEditor from '@/components/admin/TvScreenEditor';
import { TV_SCREENS } from '@/lib/tvControl';
import PrayerEditor from '@/components/admin/PrayerEditor';
import PageEditor from '@/components/admin/PageEditor';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useAdminSave, useRegisterAdminSave } from '@/context/AdminSaveContext';
import { displayTime } from '@/lib/timetable';

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
  ['announcements', 'Announcements', Megaphone, 'announcements'],
  ['livestream', 'Livestream', Radio, 'livestream'],
  ...TV_SCREENS.map((screen) => [`tv-${screen.id}`, screen.label, Monitor, 'livestream']),
  ['content', 'Website & pages', FileText, 'content'],
  ['team', 'Meet the team', Users, 'team'],
  ['users', 'Users & roles', ShieldCheck, 'users'],
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
  const [stats, setStats] = useState(null);
  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [events, announcements, prayers, team] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('event_date', today),
      supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('published', true),
      supabase
        .from('prayer_times')
        .select('*', { count: 'exact', head: true })
        .gte('d_date', today),
      supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('published', true),
    ]);
    setStats({
      events: events.count ?? 0,
      announcements: announcements.count ?? 0,
      prayers: prayers.count ?? 0,
      team: team.count ?? 0,
    });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const cards = [
    ['Upcoming events', stats?.events, CalendarDays],
    ['Live announcements', stats?.announcements, Megaphone],
    ['Timetable days', stats?.prayers, Clock3],
    ['Team members', stats?.team, Users],
  ];
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="admin-eyebrow">JAMATIA ISLAMIC CENTRE</span>
          <h2 className="text-2xl font-bold">Overview</h2>
        </div>
        <button onClick={load} className={ghost}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([name, value, Icon]) => (
          <div key={name} className="rounded-2xl border bg-white p-5 shadow-sm">
            <Icon className="mb-4 text-amber-600" />
            <div className="text-3xl font-bold">{value ?? '—'}</div>
            <div className="text-sm text-slate-500">{name}</div>
          </div>
        ))}
      </div>
      <div className="admin-shortcuts">
        <button onClick={() => onChoose('content')}>
          <FileText />
          <strong>Pages & pictures</strong>
          <b>Open editor →</b>
        </button>
        <Link to="/admin/home-tiles">
          <Home />
          <strong>Homepage tiles</strong>
          <b>Edit tiles →</b>
        </Link>
        <button onClick={() => onChoose('prayer')}>
          <Clock3 />
          <strong>Timetable & Jummah</strong>
          <b>Manage times →</b>
        </button>
      </div>
      <section className="admin-panel">
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">LIVE PREVIEW</span>
            <h3>Website preview</h3>
          </div>
          <Link to="/" className="admin-button">
            Open website ↗
          </Link>
        </div>
        <div className="admin-site-preview">
          <iframe src="/?preview=1" title="JIC live website preview" />
        </div>
      </section>
    </div>
  );
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
    starts_at: new Date().toISOString().slice(0, 16),
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
          scheduled_at: data.scheduled_at
            ? new Date(data.scheduled_at).toISOString().slice(0, 16)
            : '',
        };
        setForm(next);
        setSaved(next);
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
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    };
    const { error } = await supabase.from('livestream_settings').update(payload).eq('id', 1);
    if (error) {
      setMsg(error.message);
      throw error;
    }
    setSaved(form);
    setMsg('Livestream saved.');
  }, [form]);
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

function UsersSection() {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setInviteRole] = useState('teacher');
  const [pendingRoles, setPendingRoles] = useState({});
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    setRows(data || []);
    if (error) setMsg(error.message);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const invoke = useCallback(async (body) => {
    const { data, error } = await supabase.functions.invoke('manage-user', { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'Request failed');
    return data;
  }, []);
  const saveRoles = useCallback(async () => {
    const changes = Object.entries(pendingRoles);
    for (const [id, nextRole] of changes)
      await invoke({ action: 'set_role', user_id: id, role: nextRole });
    setPendingRoles({});
    setMsg(changes.length === 1 ? 'Role saved.' : `${changes.length} roles saved.`);
    await load();
  }, [pendingRoles, invoke, load]);
  useRegisterAdminSave(saveRoles, Object.keys(pendingRoles).length > 0, 'Save role changes');
  if (!isSuperAdmin) return <Empty>Only a Super Admin can manage user accounts and roles.</Empty>;
  const invite = async (event) => {
    event.preventDefault();
    try {
      await invoke({ action: 'invite', email, display_name: name, role });
      setMsg('Invitation sent.');
      setEmail('');
      setName('');
      load();
    } catch (error) {
      setMsg(error.message);
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold">Users & roles</h2>
      <Notice message={msg} error={msg && !/(sent|saved)/.test(msg)} />
      <form
        onSubmit={invite}
        className="mb-6 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4"
      >
        <Field title="Name">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field title="Email">
          <input
            required
            type="email"
            className={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field title="Role">
          <select className={input} value={role} onChange={(e) => setInviteRole(e.target.value)}>
            {['teacher', 'events_manager', 'content_editor', 'admin', 'super_admin'].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </Field>
        <div className="self-end">
          <button className={primary}>
            <UserPlus size={15} />
            Invite
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid items-center gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_220px_100px]"
          >
            <div>
              <div className="font-semibold">{row.display_name || 'User'}</div>
            </div>
            <select
              className={input}
              value={pendingRoles[row.id] ?? row.role}
              onChange={(e) =>
                setPendingRoles((current) => ({ ...current, [row.id]: e.target.value }))
              }
            >
              {[
                'viewer',
                'teacher',
                'events_manager',
                'content_editor',
                'admin',
                'super_admin',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <span className={`text-sm ${row.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
              {row.is_active ? 'Active' : 'Disabled'}
            </span>
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
  const { user, profile, role, signOut, can, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useAppearance();
  const { saveCurrent, dirty, saving, label: saveLabel, status } = useAdminSave();
  const allowed = useMemo(
    () =>
      SECTIONS.filter(
        ([key, , , permission]) =>
          key === 'dashboard' || (key === 'users' ? isSuperAdmin : can(permission)),
      ),
    [can, isSuperAdmin],
  );
  const [active, setActive] = useState('dashboard');
  useEffect(() => {
    if (!allowed.some((item) => item[0] === active)) setActive('dashboard');
  }, [allowed, active]);

  const chooseSection = (key) => {
    if (key === active) return;
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setActive(key);
  };
  const safeSignOut = async () => {
    if (dirty && !window.confirm('Sign out and discard unsaved changes?')) return;
    await signOut();
  };

  const section = {
    ...Object.fromEntries(
      TV_SCREENS.map((screen) => [
        `tv-${screen.id}`,
        <TvScreenEditor key={screen.id} screenId={screen.id} />,
      ]),
    ),
    dashboard: <DashboardSection onChoose={chooseSection} />,
    prayer: <PrayerEditor />,
    events: <EventsSection />,
    announcements: <AnnouncementsSection />,
    livestream: <LivestreamSection />,
    content: <PageEditor />,
    team: <TeamSection />,
    users: <UsersSection />,
    audit: <AuditSection />,
  }[active];

  const auditName = user?.user_metadata?.audit_name || profile?.display_name || 'User';

  return (
    <div className="admin-console min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b bg-[#faf7ef] text-slate-950">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="min-w-0">
            <div className="font-bold">JIC Admin</div>
            <div className="truncate text-xs text-slate-500">
              {auditName} · {role}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`${btn} border border-slate-200 bg-white text-slate-800`}
              aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => saveCurrent().catch(() => {})}
              disabled={!dirty || saving}
              className={`${primary} admin-global-save`}
            >
              <Save size={15} />
              <span className="hidden sm:inline">{saving ? 'Saving…' : saveLabel}</span>
              <span className="sm:hidden">Save</span>
            </button>
            <Link
              to="/"
              className={`${btn} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}
            >
              <Home size={15} />
              <span className="hidden md:inline">Website</span>
            </Link>
            <Link
              to="/tv179"
              target="_blank"
              className={`${btn} border border-slate-200 bg-white text-slate-800`}
              aria-label="Open TV display"
            >
              <Monitor size={15} />
              <span className="hidden md:inline">TV display</span>
            </Link>
            <button
              onClick={safeSignOut}
              className={`${btn} border border-slate-200 bg-white text-slate-800 hover:bg-red-50 hover:text-red-700`}
            >
              <LogOut size={15} />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
        {status && (
          <div className="px-4 pb-2 text-right text-xs font-semibold text-slate-500 lg:px-6">
            {status}
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_1fr]">
        <aside className="border-b bg-white p-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {allowed.map(([key, name, Icon]) => (
              <button
                key={key}
                onClick={() => chooseSection(key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${active === key ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon size={17} />
                {name}
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-4 lg:p-8">{section}</main>
      </div>
    </div>
  );
}
