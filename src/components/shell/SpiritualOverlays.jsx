import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function readReminders(savedReminders) {
  let reminders = DEFAULT_REMINDERS;
  try {
    const saved = JSON.parse(savedReminders);
    const valid = Array.isArray(saved)
      ? saved.filter(
          (item) =>
            typeof item?.text === 'string' &&
            item.text.trim() &&
            typeof item?.type === 'string' &&
            (item.source == null || typeof item.source === 'string'),
        )
      : [];
    if (valid.length)
      reminders = [
        ...valid,
        ...DEFAULT_REMINDERS.filter(
          (item) => !valid.some((custom) => custom.text.trim() === item.text),
        ),
      ];
  } catch {
    // Keep curated defaults.
  }
  return reminders;
}

export default function SpiritualOverlays() {
  const { getContent, editMode } = useContent();
  const savedReminders = getContent('header_reminders', '[]');
  const reminders = useMemo(() => readReminders(savedReminders), [savedReminders]);
  const [salawatOpen, setSalawatOpen] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [reflection, setReflection] = useState(null);
  const salawatTimer = useRef(null);
  const salawatDismiss = useRef(null);
  const lastShown = useRef(0);
  const interactionCount = useRef(0);

  const closeSalawat = useCallback(() => {
    window.clearTimeout(salawatTimer.current);
    setSalawatOpen(false);
  }, []);

  useEffect(() => {
    if (!salawatOpen) return undefined;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // If storage is unavailable, still show the welcome once for this page load.
    }
    lastShown.current = Date.now();
    salawatTimer.current = window.setTimeout(() => setSalawatOpen(false), 5000);
    const previousFocus = document.activeElement;
    salawatDismiss.current?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (
        ['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)
      ) {
        closeSalawat();
      }
      if (event.key !== 'Tab') return;
      event.preventDefault();
      salawatDismiss.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKeyDown);
    // Ignore layout/route scroll events; dismiss only on a visitor's gesture.
    for (const event of ['wheel', 'touchmove']) {
      document.addEventListener(event, closeSalawat, { capture: true, passive: true });
    }
    return () => {
      window.clearTimeout(salawatTimer.current);
      document.removeEventListener('keydown', onKeyDown);
      for (const event of ['wheel', 'touchmove']) {
        document.removeEventListener(event, closeSalawat, true);
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [salawatOpen, closeSalawat]);

  useEffect(() => {
    const isExcluded = (target) =>
      target instanceof Element &&
      target.closest(
        'button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="dialog"],dialog,.jic-spiritual-overlay,.jic-daily-reminder',
      );

    const onClick = (event) => {
      if (
        !event.isTrusted ||
        salawatOpen ||
        reflection ||
        editMode ||
        isExcluded(event.target) ||
        document.querySelector('dialog[open],[aria-modal="true"]')
      )
        return;
      interactionCount.current += 1;
      if (interactionCount.current < 2 || Date.now() - lastShown.current < RANDOM_COOLDOWN) return;
      if (Math.random() > 0.14) return;

      // Refs survive re-renders and listener cleanup, keeping the cooldown intact.
      lastShown.current = Date.now();
      interactionCount.current = 0;
      const item = reminders[Math.floor(Math.random() * reminders.length)];
      setReflection({ ...item, mode: Math.random() < 0.55 ? 'toast' : 'spotlight' });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [reflection, reminders, salawatOpen, editMode]);

  useEffect(() => {
    if (!reflection) return undefined;
    const timer = window.setTimeout(
      () => setReflection(null),
      reflection.mode === 'toast' ? 4200 : 5600,
    );
    return () => window.clearTimeout(timer);
  }, [reflection]);

  return (
    <>
      {salawatOpen && (
        <div
          className="jic-spiritual-overlay jic-salawat-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Salawat"
          onClick={closeSalawat}
        >
          <button
            ref={salawatDismiss}
            type="button"
            className="jic-spiritual-dismiss"
            aria-label="Close salawat"
            onClick={() => closeSalawat()}
          >
            <X size={20} />
          </button>
          <div className="jic-salawat-card">
            <span className="jic-spiritual-kicker">SALAWAT</span>
            <p className="jic-salawat-arabic" lang="ar" dir="rtl">
              {SALAWAT.arabic}
            </p>
            <p className="jic-salawat-transliteration">{SALAWAT.transliteration}</p>
            <p className="jic-salawat-english">{SALAWAT.english}</p>
            <p className="jic-salawat-urdu" lang="ur" dir="rtl">
              {SALAWAT.urdu}
            </p>
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
