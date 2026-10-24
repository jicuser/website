import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useContent } from '@/context/ContentContext';

const SESSION_KEY = 'jic-salawat-shown';
const SALAWAT = {
  arabic: 'صَلَّى اللّٰهُ عَلَى سَيِّدِنَا مُحَمَّدٍ',
  transliteration: 'Sallal-lahu ‘ala Sayyidina Muhammad',
  english: 'Allah send prayers upon our master Muhammad.',
  urdu: 'اللہ ہمارے آقا محمد ﷺ پر رحمتیں نازل فرمائے۔',
};

export default function SpiritualOverlays() {
  const { editMode } = useContent();
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!open || editMode) return;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Still show once for this page load when storage is unavailable.
    }
  }, [open, editMode]);

  if (!open || editMode) return null;
  return (
    <aside className="jic-salawat-note" aria-label="Salawat">
      <div>
        <span className="jic-spiritual-kicker">Salawat</span>
        <p className="jic-salawat-arabic" lang="ar" dir="rtl">
          {SALAWAT.arabic}
        </p>
        <details>
          <summary>Transliteration & translations</summary>
          <p className="jic-salawat-transliteration">{SALAWAT.transliteration}</p>
          <p>{SALAWAT.english}</p>
          <p lang="ur" dir="rtl">
            {SALAWAT.urdu}
          </p>
        </details>
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
  );
}
