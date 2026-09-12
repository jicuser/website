import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import usePosters, { POSTERS_KEY, posterImage } from '@/hooks/usePosters';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';

const destinations = ['home', 'worship', 'education', 'youth', 'madrassah', 'services', 'about'];
export default function PostersEditor() {
  const published = usePosters();
  const { saveContent } = useContent();
  const { can } = useAuth();
  const [items, setItems] = useState(published);
  const [baseline, setBaseline] = useState(published);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(items) !== JSON.stringify(baseline);
  useEffect(() => {
    if (!dirty) {
      setItems(published);
      setBaseline(published);
    }
  }, [published, dirty]);
  const save = useCallback(async () => {
    if (busy) return;
    if (items.length > 100 || items.some((p) => !p.title.trim() || !posterImage(p.image)))
      throw new Error('Give every poster a name and picture. Keep up to 100 posters.');
    setBusy(true);
    try {
      await saveContent(POSTERS_KEY, JSON.stringify(items), 'json');
      setBaseline(items);
      setMessage(
        'Published. Website sections and TV selections now use these posters. TVs refresh within 30 seconds.',
      );
    } finally {
      setBusy(false);
    }
  }, [items, saveContent, busy]);
  useRegisterAdminSave(save, dirty, 'Publish posters');
  const item = items.find((p) => p.id === selected);
  const update = (key, value) =>
    setItems((ps) => ps.map((p) => (p.id === selected ? { ...p, [key]: value } : p)));
  async function upload(file) {
    if (!file) return;
    setBusy(true);
    try {
      const extension = validateImage(file);
      const path = `posters/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('site-images').upload(path, file);
      if (error) throw error;
      update('image', supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <h2>Posters</h2>
      <p>
        Edit a current poster or add one. Tick the website pages where it belongs. In TV screens,
        tick its name in a poster selection. Replacing its picture updates every place using it.
      </p>
      <Link to="/admin?section=events">Dated event posters →</Link>
      <h3>Current posters ({items.length})</h3>
      <div className="admin-poster-picker">
        {items.map((p) => (
          <button
            type="button"
            className="admin-button"
            key={p.id}
            onClick={() => setSelected(p.id)}
          >
            {posterImage(p.image) && <img src={p.image} alt="" loading="lazy" />}
            <span>{p.title || 'New poster'} · Edit</span>
          </button>
        ))}
      </div>
      <button
        className="admin-button"
        disabled={busy || items.length >= 100}
        onClick={() => {
          const id = crypto.randomUUID();
          setItems([
            ...items,
            {
              id,
              title: '',
              image: '',
              alt: '',
              subtitle: '',
              schedule: '',
              detail: '',
              to: '/contact',
              groups: [],
            },
          ]);
          setSelected(id);
        }}
      >
        + Add poster
      </button>
      {item && (
        <fieldset disabled={busy} className="scene-properties">
          <legend>{item.title || 'New poster'}</legend>
          {['title', 'subtitle', 'schedule', 'detail', 'alt'].map((key) => (
            <label key={key}>
              {
                {
                  title: 'Poster name',
                  subtitle: 'Short heading',
                  schedule: 'Day and time',
                  detail: 'Description',
                  alt: 'Picture description',
                }[key]
              }
              <input
                maxLength={key === 'detail' || key === 'alt' ? 1000 : 200}
                value={item[key] || ''}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            Picture URL
            <input value={item.image} onChange={(e) => update('image', e.target.value)} />
          </label>
          {can('media') && (
            <label>
              Upload / replace picture
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => upload(e.target.files[0])}
              />
            </label>
          )}
          <h4>Show on website</h4>
          {destinations.map((group) => (
            <label className="admin-check" key={group}>
              <input
                type="checkbox"
                checked={item.groups.includes(group)}
                onChange={(e) =>
                  update(
                    'groups',
                    e.target.checked
                      ? [...item.groups, group]
                      : item.groups.filter((g) => g !== group),
                  )
                }
              />
              {group === 'home' ? 'Home page' : group}
            </label>
          ))}
          <label>
            Link when opened
            <input
              value={item.to}
              onChange={(e) => update('to', e.target.value)}
              placeholder="/contact"
            />
          </label>
          <button
            className="admin-button"
            onClick={() => {
              if (!window.confirm('Remove this poster from the catalogue and all places using it?'))
                return;
              setItems(items.filter((p) => p.id !== selected));
              setSelected('');
            }}
          >
            Remove poster
          </button>
        </fieldset>
      )}
      <button
        className="admin-button primary"
        disabled={!dirty || busy}
        onClick={() => save().catch((e) => setMessage(e.message))}
      >
        Publish posters
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
