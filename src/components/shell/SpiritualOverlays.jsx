import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useContent } from '@/context/ContentContext';

const SESSION_KEY = 'jic-salawat-shown';
let shownInMemory = false;
const SALAWAT = {
  arabic: 'صَلَّى اللّٰهُ عَلَى سَيِّدِنَا مُحَمَّدٍ',
  transliteration: 'Sallal-lahu ‘ala Sayyidina Muhammad',
  english: 'Allah send prayers upon our master Muhammad.',
  urdu: 'اللہ ہمارے آقا محمد ﷺ پر رحمتیں نازل فرمائے۔',
};

export default function SpiritualOverlays() {
  const { editMode } = useContent();
  const note = useRef(null);
  const [open, setOpen] = useState(() => {
    try {
      return !shownInMemory && sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
      return !shownInMemory;
    }
  });
  useEffect(() => {
    if (!open || editMode) return;
    shownInMemory = true;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Still show once for this page load when storage is unavailable.
    }
    const timer = window.setTimeout(() => setOpen(false), 5500);
    const outside = (event) => {
      if (!note.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, editMode]);

  if (!open || editMode) return null;
  return (
    <>
      <div className="jic-salawat-backdrop" aria-hidden="true" />
      <aside ref={note} className="jic-salawat-note" aria-label="Salawat">
        <div>
          <span className="jic-spiritual-kicker">Salawat</span>
          <p className="jic-salawat-arabic" lang="ar" dir="rtl">
            {SALAWAT.arabic}
          </p>
          <p className="jic-salawat-transliteration">{SALAWAT.transliteration}</p>
        </div>
        <button
          type="button"
          className="jic-spiritual-dismiss"
          aria-label="Dismiss salawat"
          onClick={() => setOpen(false)}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </aside>
    </>
  );
}
