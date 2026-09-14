import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { useContent } from '@/context/ContentContext';
import { READING_COLLECTIONS, publicAssetUrl, validReadingEntry } from '@/lib/mobileContent';
function parse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
export default function MobileContentEditor() {
  const { getContent, saveContent } = useContent();
  const brandRaw = getContent('mobile_branding', '{}');
  const readingRaw = getContent('reading_library', '[]');
  const published = useMemo(
    () => ({ brand: parse(brandRaw, {}), entries: parse(readingRaw, []) }),
    [brandRaw, readingRaw],
  );
  const [brand, setBrand] = useState(published.brand);
  const [entries, setEntries] = useState(published.entries);
  const [baseline, setBaseline] = useState(() => JSON.stringify({ brand, entries }));
  const dirty = JSON.stringify({ brand, entries }) !== baseline;
  useEffect(() => {
    if (!dirty) {
      setBrand(published.brand);
      setEntries(published.entries);
      setBaseline(JSON.stringify(published));
    }
  }, [published, dirty]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const save = useCallback(async () => {
    if (busy) return;
    setMessage('');
    if (
      Object.values(brand).some((value) => value && !publicAssetUrl(value)) ||
      entries.length > 200 ||
      entries.some((entry) => !validReadingEntry(entry))
    ) {
      const error = new Error(
        'Use valid picture URLs and give every reading a title, text, reference and source link.',
      );
      setMessage(error.message);
      throw error;
    }
    setBusy(true);
    try {
      await saveContent('mobile_branding', JSON.stringify(brand), 'json');
      await saveContent(
        'reading_library',
        JSON.stringify(entries.map((entry) => ({ ...entry, published: true }))),
        'json',
      );
      setBaseline(JSON.stringify({ brand, entries }));
      setMessage('Published app content.');
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, [brand, entries, busy, saveContent]);
  useRegisterAdminSave(save, dirty && !busy, 'Publish app content');
  return (
    <section className="admin-panel">
      <h2>App images & reading</h2>
      <p>
        Published images and reading texts are public. Only publish approved texts with their source
        and reference; student records belong in the private portal.
      </p>
      <fieldset disabled={busy} className="scene-properties">
        <legend>App images</legend>
        {[
          ['hero', 'Home background'],
          ['headerLight', 'Logo for light mode'],
          ['headerDark', 'Logo for dark mode'],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={brand[key] || ''}
              maxLength={2000}
              placeholder="https://… or /image.png"
              onChange={(e) => setBrand((previous) => ({ ...previous, [key]: e.target.value }))}
            />
          </label>
        ))}
      </fieldset>
      <h3>Approved reading library</h3>
      {entries.map((entry, index) => {
        const change = (key, value) =>
          setEntries((previous) =>
            previous.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
          );
        return (
          <fieldset className="scene-properties" disabled={busy} key={entry.id}>
            <legend>{entry.title || 'New reading'}</legend>
            <label>
              Collection
              <select
                value={entry.collection}
                onChange={(e) => change('collection', e.target.value)}
              >
                {READING_COLLECTIONS.map((collection) => (
                  <option key={collection}>{collection}</option>
                ))}
              </select>
            </label>
            {[
              ['title', 'Title', 200],
              ['reference', 'Reference', 500],
              ['source', 'Source link', 2000],
            ].map(([key, label, max]) => (
              <label key={key}>
                {label}
                <input
                  required
                  maxLength={max}
                  value={entry[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              Approved text
              <textarea
                rows={8}
                maxLength={30000}
                value={entry.text}
                onChange={(e) => change('text', e.target.value)}
              />
            </label>
            <button
              className="admin-button"
              onClick={() => {
                if (window.confirm('Remove this reading?'))
                  setEntries((previous) => previous.filter((_, i) => i !== index));
              }}
            >
              Remove reading
            </button>
          </fieldset>
        );
      })}
      <div className="admin-actions">
        <button
          className="admin-button"
          disabled={busy || entries.length >= 200}
          onClick={() =>
            setEntries((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                collection: 'dhikr',
                title: '',
                text: '',
                reference: '',
                source: '',
              },
            ])
          }
        >
          Add reading
        </button>
        <button
          className="admin-button primary"
          disabled={busy}
          onClick={() => save().catch(() => {})}
        >
          {busy ? 'Publishing…' : 'Publish app content'}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
