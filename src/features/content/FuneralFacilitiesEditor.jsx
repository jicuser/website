import React, { useCallback, useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import {
  FUNERAL_FACILITIES_KEY,
  funeralImageUrl,
  readFuneralFacilities,
} from '@/features/funerals/facilities';
import { createImageUploader } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabaseClient';
import '@/styles/funerals.css';

export default function FuneralFacilitiesEditor({ onPreview }) {
  const { getContent, saveContent } = useContent();
  const raw = getContent(FUNERAL_FACILITIES_KEY, '[]');
  const [draft, setDraft] = useState(() => readFuneralFacilities(raw));
  const [baseline, setBaseline] = useState(() => JSON.stringify(readFuneralFacilities(raw)));
  const [selected, setSelected] = useState('ambulance');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(draft) !== baseline;
  const facility = draft.find((item) => item.id === selected);

  useEffect(() => {
    if (dirty) return;
    const value = readFuneralFacilities(raw);
    setDraft(value);
    setBaseline(JSON.stringify(value));
  }, [raw, dirty]);
  useEffect(() => {
    onPreview?.(readFuneralFacilities(draft));
  }, [draft, onPreview]);
  const change = (key, value) => {
    setDraft((current) =>
      current.map((item) => (item.id === selected ? { ...item, [key]: value } : item)),
    );
    setMessage('');
  };
  const save = useCallback(async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError('');
    try {
      if (draft.some((item) => item.image.trim() && !funeralImageUrl(item.image)))
        throw new Error('Use an HTTPS photo address or choose a photo to upload.');
      const value = readFuneralFacilities(draft);
      const serialized = JSON.stringify(value);
      await saveContent(FUNERAL_FACILITIES_KEY, serialized, 'json');
      setDraft(value);
      setBaseline(serialized);
      setMessage('Facilities saved to the website.');
    } catch (problem) {
      setError(problem.message);
      throw problem;
    } finally {
      setBusy(false);
    }
  }, [busy, dirty, draft, saveContent]);
  useRegisterAdminSave(save, dirty, 'Save funeral facilities', busy);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const image = await createImageUploader(supabase)(file, 'funerals');
      change('image', image);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-panel funeral-facilities-editor">
      <h3>Funeral facilities & transport</h3>
      <p>Choose a card to edit its photo and details. Save to publish.</p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy}>
        <label>
          Facility
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {draft.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
                {item.visible ? '' : ' · Hidden'}
              </option>
            ))}
          </select>
        </label>
        <label className="custom-form-check">
          <span>Show on the website</span>
          <input
            type="checkbox"
            checked={facility.visible}
            onChange={(event) => change('visible', event.target.checked)}
          />
        </label>
        <label>
          Card title
          <input
            maxLength={80}
            value={facility.title}
            onChange={(event) => change('title', event.target.value)}
          />
        </label>
        <label>
          Short description
          <textarea
            rows={3}
            maxLength={240}
            value={facility.description}
            onChange={(event) => change('description', event.target.value)}
          />
        </label>
        <label>
          Photo URL
          <input
            type="url"
            value={facility.image}
            onChange={(event) => change('image', event.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Photo description
          <input
            maxLength={160}
            value={facility.alt}
            onChange={(event) => change('alt', event.target.value)}
          />
        </label>
        {funeralImageUrl(facility.image) && (
          <img
            className="funeral-facilities-editor__preview"
            src={facility.image}
            alt={facility.alt || facility.title}
          />
        )}
        <div className="admin-actions">
          <label className="admin-button">
            <Upload size={16} aria-hidden="true" /> Choose photo
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
          </label>
          {facility.image && (
            <button type="button" className="admin-button" onClick={() => change('image', '')}>
              Remove photo
            </button>
          )}
        </div>
      </fieldset>
      <button
        type="button"
        className="admin-button primary"
        disabled={busy || !dirty}
        onClick={() => save().catch(() => {})}
      >
        <Save size={16} aria-hidden="true" />
        {busy ? 'Saving…' : 'Save facilities'}
      </button>
    </section>
  );
}
