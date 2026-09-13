import React, { useState } from 'react';
import { useContent } from '@/context/ContentContext';
import { READING_COLLECTIONS, publicAssetUrl, validReadingEntry } from '@/lib/mobileContent';
function parse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}
export default function MobileContentEditor() {
  const { getContent, saveContent } = useContent();
  const [brand, setBrand] = useState(() => parse(getContent('mobile_branding', '{}'), {}));
  const [entries, setEntries] = useState(() => parse(getContent('reading_library', '[]'), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    if (busy) return;
    setMessage('');
    if (
      Object.values(brand).some((value) => value && !publicAssetUrl(value)) ||
      entries.length > 200 ||
      entries.some((entry) => !validReadingEntry(entry))
    ) {
      setMessage(
        'Use valid picture URLs and give every reading a title, text, reference and source link.',
      );
      return;
    }
    setBusy(true);
    try {
      await saveContent('mobile_branding', JSON.stringify(brand), 'json');
      await saveContent(
        'reading_library',
        JSON.stringify(entries.map((entry) => ({ ...entry, published: true }))),
        'json',
      );
      setMessage('Published app content.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
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
        <button className="admin-button primary" disabled={busy} onClick={save}>
          {busy ? 'Publishing…' : 'Publish app content'}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
