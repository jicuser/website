import React, { useCallback, useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { HALL_DETAILS_KEY, readHallDetails } from '@/lib/hallDetails';
import { createImageUploader } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabaseClient';

export default function HallDetailsEditor({ onPreview }) {
  const { getContent, saveContent } = useContent();
  const raw = getContent(HALL_DETAILS_KEY, '{}');
  const [draft, setDraft] = useState(() => readHallDetails(raw));
  const [baseline, setBaseline] = useState(raw);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty =
    JSON.stringify(readHallDetails(draft)) !== JSON.stringify(readHallDetails(baseline));
  useEffect(() => {
    if (dirty) return;
    setDraft(readHallDetails(raw));
    setBaseline(raw);
  }, [raw, dirty]);
  useEffect(() => {
    onPreview?.(readHallDetails(draft));
  }, [draft, onPreview]);
  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage('');
  };
  const save = useCallback(async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError('');
    try {
      const value = JSON.stringify(readHallDetails(draft));
      await saveContent(HALL_DETAILS_KEY, value, 'json');
      setBaseline(value);
      setMessage('Hall details saved.');
    } catch (problem) {
      setError(problem.message);
      throw problem;
    } finally {
      setBusy(false);
    }
  }, [dirty, busy, draft, saveContent]);
  useRegisterAdminSave(save, dirty, 'Save hall details', busy);
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const url = await createImageUploader(supabase)(file, 'hall');
      setDraft((current) => ({ ...current, photos: [...current.photos, { url, alt: '' }] }));
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-panel hall-details-editor">
      <div>
        <h3>Hall information</h3>
        <p>Only completed fields appear above the booking calendar.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy}>
        <label>
          About the hall
          <textarea
            rows={3}
            maxLength={2000}
            value={draft.description}
            onChange={(event) => change('description', event.target.value)}
          />
        </label>
        <label>
          Capacity
          <input
            maxLength={200}
            placeholder="Add the confirmed capacity"
            value={draft.capacity}
            onChange={(event) => change('capacity', event.target.value)}
          />
        </label>
        <label>
          Facilities · one per line
          <textarea
            rows={4}
            value={draft.facilities.join('\n')}
            onChange={(event) => change('facilities', event.target.value.split('\n'))}
          />
        </label>
        {draft.photos.map((photo, index) => (
          <div className="hall-details-editor__photo" key={index}>
            <label>
              Photo {index + 1} URL
              <input
                type="url"
                value={photo.url}
                onChange={(event) =>
                  change(
                    'photos',
                    draft.photos.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              Photo description
              <input
                maxLength={200}
                value={photo.alt}
                onChange={(event) =>
                  change(
                    'photos',
                    draft.photos.map((item, i) =>
                      i === index ? { ...item, alt: event.target.value } : item,
                    ),
                  )
                }
              />
            </label>
            <img src={photo.url} alt={photo.alt || `Hall photo ${index + 1}`} />
            <button
              type="button"
              className="admin-button"
              onClick={() =>
                change(
                  'photos',
                  draft.photos.filter((_, i) => i !== index),
                )
              }
            >
              Remove photo
            </button>
          </div>
        ))}
        {draft.photos.length < 8 && (
          <label className="admin-button">
            <Upload size={16} />
            Add hall photo
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
          </label>
        )}
      </fieldset>
      <button
        type="button"
        className="admin-button primary"
        disabled={busy || !dirty}
        onClick={() => save().catch(() => {})}
      >
        <Save size={16} />
        {busy ? 'Saving…' : 'Save hall details'}
      </button>
    </section>
  );
}
