import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';

const DEFAULT_TICKER = [
  { label: 'NEXT PRAYER', text: 'Live prayer information is shown automatically.' },
  { label: 'JUMMAH', text: 'Friday khutbah and jama‘ah times are shown automatically.' },
];

const DEFAULT_REMINDERS = [
  { type: 'Qur’an', text: 'Remember Me; I will remember you.', source: 'Qur’an 2:152' },
  {
    type: 'Qur’an',
    text: 'I am truly near. I respond to one’s prayer when they call upon Me.',
    source: 'Qur’an 2:186',
  },
  {
    type: 'Qur’an',
    text: 'Surely in the remembrance of Allah do hearts find comfort.',
    source: 'Qur’an 13:28',
  },
  { type: 'Qur’an', text: 'Establish prayer for My remembrance.', source: 'Qur’an 20:14' },
  { type: 'Qur’an', text: 'Do not lose hope in Allah’s mercy.', source: 'Qur’an 39:53' },
  {
    type: 'Qur’an',
    text: 'Whoever puts their trust in Allah, then He alone is sufficient for them.',
    source: 'Qur’an 65:3',
  },
  { type: 'Qur’an', text: 'Surely with hardship comes ease.', source: 'Qur’an 94:5–6' },
  { type: 'Hadith', text: 'Actions are judged by intentions.', source: 'Bukhari 1' },
  { type: 'Hadith', text: 'A good word is charity.', source: 'Bukhari 2989' },
  { type: 'Hadith', text: 'Allah is gentle and loves gentleness.', source: 'Muslim 2593' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

export default function HeaderContentEditor() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [saved, setSaved] = useState({ ticker: DEFAULT_TICKER, reminders: DEFAULT_REMINDERS });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase
        .from('page_content')
        .select('content_value')
        .eq('content_key', 'header_ticker_items')
        .maybeSingle(),
      supabase
        .from('page_content')
        .select('content_value')
        .eq('content_key', 'header_reminders')
        .maybeSingle(),
    ])
      .then(([tickerResult, reminderResult]) => {
        if (!active) return;
        const parse = (result, fallback) => {
          try {
            const parsed = result.data?.content_value
              ? JSON.parse(result.data.content_value)
              : fallback;
            return Array.isArray(parsed) && parsed.length ? parsed : fallback;
          } catch {
            return fallback;
          }
        };
        const nextTicker = parse(tickerResult, DEFAULT_TICKER);
        const nextReminders = parse(reminderResult, DEFAULT_REMINDERS);
        setTicker(clone(nextTicker));
        setReminders(clone(nextReminders));
        setSaved({ ticker: clone(nextTicker), reminders: clone(nextReminders) });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(
    () =>
      JSON.stringify(ticker) !== JSON.stringify(saved.ticker) ||
      JSON.stringify(reminders) !== JSON.stringify(saved.reminders),
    [ticker, reminders, saved],
  );

  const save = useCallback(async () => {
    if (!dirty || loading) return;
    if (saveInFlight.current) throw new Error('Header content is already saving.');
    const cleanTicker = ticker
      .filter((item) => item.text?.trim())
      .map((item) => ({ label: item.label?.trim() || 'UPDATE', text: item.text.trim() }));
    const cleanReminders = reminders
      .filter((item) => item.text?.trim())
      .map((item) => ({
        type: item.type?.trim() || 'Reminder',
        text: item.text.trim(),
        source: item.source?.trim() || '',
      }));
    const rows = [
      {
        content_key: 'header_ticker_items',
        content_value: JSON.stringify(cleanTicker),
        content_type: 'json',
        page: 'header',
      },
      {
        content_key: 'header_reminders',
        content_value: JSON.stringify(cleanReminders),
        content_type: 'json',
        page: 'header',
      },
    ];
    saveInFlight.current = true;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('page_content')
        .upsert(rows, { onConflict: 'content_key' });
      if (error) throw error;
      // Normalise the submitted snapshot only if it has not been edited since.
      setTicker((current) => (current === ticker ? cleanTicker : current));
      setReminders((current) => (current === reminders ? cleanReminders : current));
      setSaved({ ticker: clone(cleanTicker), reminders: clone(cleanReminders) });
      setMessage('Header content saved.');
      window.dispatchEvent(new Event('jic-content-updated'));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }, [dirty, loading, ticker, reminders]);

  useRegisterAdminSave(save, dirty && !loading && !saving, 'Save header content');

  const changeTicker = (index, key, value) =>
    setTicker((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  const changeReminder = (index, key, value) =>
    setReminders((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );

  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">HEADER</span>
          <h3>Rolling banner & reminders</h3>
        </div>
      </div>
      {message && <div className="admin-success">{message}</div>}

      <h4 className="mb-3 font-semibold">Rolling banner extras</h4>
      <div className="space-y-3">
        {ticker.map((item, index) => (
          <div
            key={`ticker-${index}`}
            className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[150px_1fr_auto]"
          >
            <input
              aria-label="Ticker label"
              value={item.label || ''}
              onChange={(event) => changeTicker(index, 'label', event.target.value)}
              placeholder="Label"
            />
            <input
              aria-label="Ticker text"
              value={item.text || ''}
              onChange={(event) => changeTicker(index, 'text', event.target.value)}
              placeholder="Message"
            />
            <button
              type="button"
              className="admin-button danger"
              onClick={() =>
                setTicker((items) => items.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="admin-button"
          onClick={() => setTicker((items) => [...items, { label: 'UPDATE', text: '' }])}
        >
          <Plus size={15} />
          Add banner message
        </button>
      </div>

      <h4 className="mb-3 mt-6 font-semibold">Qur’an, Hadith & reminders</h4>
      <div className="space-y-3">
        {reminders.map((item, index) => (
          <div
            key={`reminder-${index}`}
            className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[120px_1fr_160px_auto]"
          >
            <input
              aria-label="Reminder type"
              value={item.type || ''}
              onChange={(event) => changeReminder(index, 'type', event.target.value)}
              placeholder="Type"
            />
            <input
              aria-label="Reminder text"
              value={item.text || ''}
              onChange={(event) => changeReminder(index, 'text', event.target.value)}
              placeholder="Text"
            />
            <input
              aria-label="Reminder source"
              value={item.source || ''}
              onChange={(event) => changeReminder(index, 'source', event.target.value)}
              placeholder="Source"
            />
            <button
              type="button"
              className="admin-button danger"
              onClick={() =>
                setReminders((items) => items.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="admin-button"
          onClick={() =>
            setReminders((items) => [...items, { type: 'Reminder', text: '', source: '' }])
          }
        >
          <Plus size={15} />
          Add reminder
        </button>
      </div>

      <div className="admin-actions mt-5">
        <button
          type="button"
          disabled={!dirty || loading || saving}
          className="admin-button primary"
          onClick={() => save().catch((error) => setMessage(error.message))}
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save header content'}
        </button>
        <small>{dirty ? 'Unsaved changes' : 'Saved'}</small>
      </div>
    </section>
  );
}
