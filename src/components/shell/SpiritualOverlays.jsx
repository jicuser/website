import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { DEFAULT_REMINDERS } from '@/content/reminders';

const SESSION_KEY = 'jic-salawat-shown';
const RANDOM_COOLDOWN = 45000;

const SALAWAT = {
  arabic: 'صَلَّى اللّٰهُ عَلَى سَيِّدِنَا مُحَمَّدٍ',
  transliteration: 'Sallal-lahu ‘ala Sayyidina Muhammad',
  english: 'Allah send prayers upon our master Muhammad.',
  urdu: 'اللہ ہمارے آقا محمد ﷺ پر رحمتیں نازل فرمائے۔',
};

function readReminders(getContent) {
  let reminders = DEFAULT_REMINDERS;
  try {
    const saved = JSON.parse(getContent('header_reminders', '[]'));
    const valid = Array.isArray(saved)
      ? saved.filter(
          (item) =>
            typeof item?.text === 'string' &&
            item.text.trim() &&
            typeof item?.type === 'string' &&
            (item.source == null || typeof item.source === 'string'),
        )
      : [];
    if (valid.length) reminders = [...valid, ...DEFAULT_REMINDERS.filter((item) => !valid.some((custom) => custom.text.trim() === item.text))];
  } catch {
    // Keep curated defaults.
  }
  return reminders;
}

export default function SpiritualOverlays() {
  const { getContent } = useContent();
  const reminders = useMemo(() => readReminders(getContent), [getContent]);
  const [salawatOpen, setSalawatOpen] = useState(false);
  const [reflection, setReflection] = useState(null);

  const closeSalawat = useCallback((delay = 0) => {
    if (!delay) {
      setSalawatOpen(false);
      return;
    }
    window.setTimeout(() => setSalawatOpen(false), delay);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return undefined;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // If storage is unavailable, still show the welcome once for this page load.
    }
    setSalawatOpen(true);
    const timer = window.setTimeout(() => setSalawatOpen(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let lastShown = 0;
    let interactionCount = 0;

    const isExcluded = (target) =>
      target instanceof Element &&
      target.closest(
        'button,a,input,textarea,select,[contenteditable="true"],dialog,.jic-spiritual-overlay,.jic-daily-reminder',
      );

    const onClick = (event) => {
      if (!event.isTrusted || salawatOpen || reflection || isExcluded(event.target)) return;
      interactionCount += 1;
      if (interactionCount < 2 || Date.now() - lastShown < RANDOM_COOLDOWN) return;
      if (Math.random() > 0.14) return;

      lastShown = Date.now();
      interactionCount = 0;
      const item = reminders[Math.floor(Math.random() * reminders.length)];
      setReflection({ ...item, mode: Math.random() < 0.55 ? 'toast' : 'spotlight' });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [reflection, reminders, salawatOpen]);

  useEffect(() => {
    if (!reflection) return undefined;
    const timer = window.setTimeout(() => setReflection(null), reflection.mode === 'toast' ? 4200 : 5600);
    return () => window.clearTimeout(timer);
  }, [reflection]);

  return (
    <>
      {salawatOpen && (
        <div className="jic-spiritual-overlay jic-salawat-overlay" role="dialog" aria-modal="true" aria-label="Salawat">
          <button
            type="button"
            className="jic-spiritual-dismiss"
            aria-label="Close salawat"
            onClick={() => closeSalawat(3000)}
          >
            <X size={20} />
          </button>
          <div className="jic-salawat-card" onClick={() => closeSalawat(3000)}>
            <span className="jic-spiritual-kicker">SALAWAT</span>
            <p className="jic-salawat-arabic" lang="ar" dir="rtl">
              {SALAWAT.arabic}
            </p>
            <p className="jic-salawat-transliteration">{SALAWAT.transliteration}</p>
            <p className="jic-salawat-english">{SALAWAT.english}</p>
            <p className="jic-salawat-urdu" lang="ur" dir="rtl">
              {SALAWAT.urdu}
            </p>
            <small>Tap to close</small>
          </div>
        </div>
      )}

      {reflection && (
        <aside
          className={`jic-spiritual-overlay jic-reflection-overlay is-${reflection.mode}`}
          role="status"
          aria-live="polite"
        >
          <div className="jic-reflection-card">
            <button
              type="button"
              className="jic-spiritual-dismiss"
              aria-label="Close reminder"
              onClick={() => setReflection(null)}
            >
              <X size={18} />
            </button>
            <span className="jic-spiritual-kicker">{reflection.type}</span>
            <p>{reflection.text}</p>
            {reflection.source && <small>{reflection.source}</small>}
          </div>
        </aside>
      )}
    </>
  );
}
