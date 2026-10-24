import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Save, Upload } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { createImageUploader } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabaseClient';
import { NIKAH_AREAS, NIKAH_VENUE_KEY, readNikahVenue, VENUE_PHOTO_LIMIT } from './venue';

export default function NikahVenueEditor({ onPreview }) {
  const { getContent, saveContent } = useContent();
  const raw = getContent(NIKAH_VENUE_KEY, '{}');
  const [draft, setDraft] = useState(() => readNikahVenue(raw));
  const [baseline, setBaseline] = useState(() => JSON.stringify(readNikahVenue(raw)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(readNikahVenue(draft)) !== baseline;
  useEffect(() => {
    if (dirty) return;
    const next = readNikahVenue(raw);
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, [raw, dirty]);
  useEffect(() => {
    onPreview?.(readNikahVenue(draft));
  }, [draft, onPreview]);
  const change = (id, update) => {
    setDraft((current) => ({ ...current, [id]: { ...current[id], ...update } }));
    setMessage('');
  };
  const save = useCallback(async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError('');
    try {
      const value = JSON.stringify(readNikahVenue(draft));
      await saveContent(NIKAH_VENUE_KEY, value, 'json');
      setBaseline(value);
      setMessage('Nikah facilities and photos saved.');
    } catch (problem) {
      setError(problem.message);
      throw problem;
    } finally {
      setBusy(false);
    }
  }, [dirty, busy, draft, saveContent]);
  useRegisterAdminSave(save, dirty, 'Save Nikah facilities and photos', busy);
  async function upload(event, id) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || draft[id].photos.length >= VENUE_PHOTO_LIMIT) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const url = await createImageUploader(supabase)(file, `nikah/${id}`);
      setDraft((current) => ({
        ...current,
        [id]: { ...current[id], photos: [...current[id].photos, { url, alt: '' }] },
      }));
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  function movePhoto(id, index, direction) {
    const photos = [...draft[id].photos];
    [photos[index], photos[index + direction]] = [photos[index + direction], photos[index]];
    change(id, { photos });
  }
  return (
    <section className="admin-panel nikah-venue-editor">
      <h3>Nikah facilities & photos</h3>
      <p>
        Add real photos of the halls, kitchen, previous decorations and parking. The first photo is
        the cover. Save to publish.
      </p>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      <fieldset disabled={busy}>
        {NIKAH_AREAS.map((area) => {
          const details = draft[area.id];
          return (
            <details key={area.id} className="nikah-venue-editor-area">
              <summary>
                {area.title}{' '}
                <small>
                  · {details.photos.length} photos{!details.visible && ' · Hidden'}
                </small>
              </summary>
              <label className="nikah-venue-editor-toggle">
                <input
                  type="checkbox"
                  checked={details.visible}
                  onChange={(event) => change(area.id, { visible: event.target.checked })}
                />{' '}
                Show {area.title}
              </label>
              <label>
                Information about {area.title}
                <textarea
                  rows={3}
                  maxLength={1200}
                  value={details.description}
                  onChange={(event) => change(area.id, { description: event.target.value })}
                  placeholder={
                    area.id === 'parking'
                      ? 'Arrival directions, parking locations and any arrangements to confirm for the day.'
                      : 'Add confirmed facilities or details visitors should know.'
                  }
                />
              </label>
              <div className="nikah-venue-editor-photos">
                {details.photos.map((photo, index) => (
                  <div key={`${photo.url}:${index}`} className="nikah-venue-editor-photo">
                    <img src={photo.url} alt={photo.alt || area.title} />
                    <label>
                      {area.title} photo {index + 1} description
                      <input
                        value={photo.alt}
                        maxLength={200}
                        onChange={(event) =>
                          change(area.id, {
                            photos: details.photos.map((item, i) =>
                              i === index ? { ...item, alt: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={index === 0}
                        aria-label={`Move ${area.title} photo ${index + 1} earlier`}
                        onClick={() => movePhoto(area.id, index, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        disabled={index === details.photos.length - 1}
                        aria-label={`Move ${area.title} photo ${index + 1} later`}
                        onClick={() => movePhoto(area.id, index, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        aria-label={`Remove ${area.title} photo ${index + 1}`}
                        onClick={() =>
                          change(area.id, { photos: details.photos.filter((_, i) => i !== index) })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {details.photos.length < VENUE_PHOTO_LIMIT && (
                <label className="admin-button">
                  <Upload size={16} /> Add {area.title} photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => upload(event, area.id)}
                  />
                </label>
              )}
            </details>
          );
        })}
      </fieldset>
      <button
        type="button"
        className="admin-button primary"
        disabled={busy || !dirty}
        onClick={() => save().catch(() => {})}
      >
        <Save size={16} />
        {busy ? 'Saving…' : 'Save facilities & photos'}
      </button>
    </section>
  );
}
