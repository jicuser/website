import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import usePosters from '@/hooks/usePosters';
import { POSTERS_KEY, POSTER_DESTINATIONS, posterImage, validPoster } from '@/lib/posters';
import AnnouncementPoster from '@/components/posters/AnnouncementPoster';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';

export default function PostersEditor() {
  const published = usePosters();
  const { saveContent } = useContent();
  const { can } = useAuth();
  const [items, setItems] = useState(published);
  const [baseline, setBaseline] = useState(published);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const dirty = JSON.stringify(items) !== JSON.stringify(baseline);
  useEffect(() => {
    if (!dirty) {
      setItems(published);
      setBaseline(published);
    }
  }, [published, dirty]);
  const save = useCallback(async () => {
    if (pending.current) return;
    if (items.length > 100 || items.some((poster) => !validPoster(poster)))
      throw new Error(
        'Give every poster a name and picture, or announcement text (up to 800 characters / 10 paragraphs) with up to two pictures.',
      );
    pending.current = true;
    setBusy(true);
    try {
      await saveContent(POSTERS_KEY, JSON.stringify(items), 'json');
      setBaseline(items);
      setMessage('Published. Selected posters update on website pages and TVs within 30 seconds.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [items, saveContent]);
  useRegisterAdminSave(save, dirty && !busy, 'Publish posters');
  const item = items.find((poster) => poster.id === selected);
  const update = (key, value) =>
    setItems((previous) =>
      previous.map((poster) => (poster.id === selected ? { ...poster, [key]: value } : poster)),
    );
  const add = (kind) => {
    const id = crypto.randomUUID();
    setItems([
      ...items,
      {
        id,
        kind,
        title: kind === 'announcement' ? 'Announcements' : '',
        body: '',
        images: [],
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
  };
  async function upload(file, imageIndex = null) {
    if (!file || pending.current) return;
    const targetId = selected;
    pending.current = true;
    setBusy(true);
    try {
      const extension = validateImage(file);
      const path = `posters/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('site-images').upload(path, file);
      if (error) throw error;
      const url = supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
      // Keep the upload attached to its original poster if the selection changes.
      setItems((previous) =>
        previous.map((poster) => {
          if (poster.id !== targetId) return poster;
          if (imageIndex === null) return { ...poster, image: url };
          const images = [...poster.images];
          images[imageIndex] = url;
          return { ...poster, images };
        }),
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <h2>Posters & announcements</h2>
      <p>
        Edit a poster here, then tick its name in TV screens or choose its website pages below.
        Normal TVs show up to four across and move along one poster each rotation.
      </p>
      <Link to="/admin?section=events">Dated event posters →</Link>
      <h3>Current posters ({items.length})</h3>
      <div className="admin-poster-picker">
        {items.map((poster) => (
          <button
            type="button"
            className="admin-button"
            key={poster.id}
            disabled={busy}
            onClick={() => setSelected(poster.id)}
          >
            {poster.kind === 'announcement' ? (
              <span className="poster-type-label">Text & pictures</span>
            ) : (
              posterImage(poster.image) && <img src={poster.image} alt="" loading="lazy" />
            )}
            <span>{poster.title || 'New poster'} · Edit</span>
          </button>
        ))}
      </div>
      <div className="admin-actions">
        <button
          className="admin-button"
          disabled={busy || items.length >= 100}
          onClick={() => add('image')}
        >
          + Add image poster
        </button>
        <button
          className="admin-button"
          disabled={busy || items.length >= 100}
          onClick={() => add('announcement')}
        >
          + Add announcement poster
        </button>
      </div>
      {item && (
        <fieldset disabled={busy} className="scene-properties">
          <legend>{item.title || 'New poster'}</legend>
          <label>
            Poster name
            <input
              maxLength={200}
              value={item.title}
              onChange={(event) => update('title', event.target.value)}
            />
          </label>
          {item.kind === 'announcement' ? (
            <>
              <label>
                Announcements
                <textarea
                  rows={8}
                  maxLength={800}
                  value={item.body || ''}
                  placeholder="Write each announcement on a new line."
                  onChange={(event) => update('body', event.target.value)}
                />
              </label>
              <small>{(item.body || '').length} / 800 characters · up to 10 paragraphs</small>
              <h4>Pictures (optional)</h4>
              {item.images.map((url, index) => (
                <div key={index}>
                  <label>
                    Picture {index + 1} URL
                    <input
                      value={url}
                      maxLength={2000}
                      onChange={(event) =>
                        update(
                          'images',
                          item.images.map((image, position) =>
                            position === index ? event.target.value : image,
                          ),
                        )
                      }
                    />
                  </label>
                  {can('media') && (
                    <label>
                      Upload / replace picture
                      <input
                        type="file"
                        accept={IMAGE_ACCEPT}
                        onChange={(event) => upload(event.target.files[0], index)}
                      />
                    </label>
                  )}
                  <button
                    className="admin-button"
                    onClick={() =>
                      update(
                        'images',
                        item.images.filter((_, position) => position !== index),
                      )
                    }
                  >
                    Remove picture {index + 1}
                  </button>
                </div>
              ))}
              {item.images.length < 2 && (
                <button
                  className="admin-button"
                  onClick={() => update('images', [...item.images, ''])}
                >
                  + Add picture
                </button>
              )}
              <h4>Poster preview</h4>
              <div className="poster-announcement-preview">
                <AnnouncementPoster poster={{ ...item, images: item.images.filter(posterImage) }} />
              </div>
            </>
          ) : (
            <>
              {['subtitle', 'schedule', 'detail', 'alt'].map((key) => (
                <label key={key}>
                  {
                    {
                      subtitle: 'Short heading',
                      schedule: 'Day and time',
                      detail: 'Description',
                      alt: 'Picture description',
                    }[key]
                  }
                  <input
                    maxLength={key === 'detail' || key === 'alt' ? 1000 : 200}
                    value={item[key] || ''}
                    onChange={(event) => update(key, event.target.value)}
                  />
                </label>
              ))}
              <label>
                Picture URL
                <input
                  value={item.image}
                  maxLength={2000}
                  onChange={(event) => update('image', event.target.value)}
                />
              </label>
              {can('media') && (
                <label>
                  Upload / replace picture
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(event) => upload(event.target.files[0])}
                  />
                </label>
              )}
            </>
          )}
          <h4>Show on website</h4>
          {POSTER_DESTINATIONS.map((group) => (
            <label className="admin-check" key={group}>
              <input
                type="checkbox"
                checked={item.groups.includes(group)}
                onChange={(event) =>
                  update(
                    'groups',
                    event.target.checked
                      ? [...item.groups, group]
                      : item.groups.filter((value) => value !== group),
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
              onChange={(event) => update('to', event.target.value)}
              placeholder="/contact"
            />
          </label>
          <button
            className="admin-button"
            onClick={() => {
              if (!window.confirm('Remove this poster from the catalogue and all places using it?'))
                return;
              setItems(items.filter((poster) => poster.id !== selected));
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
        onClick={() => save().catch((error) => setMessage(error.message))}
      >
        Publish posters
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
