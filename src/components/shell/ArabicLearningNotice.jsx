import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';

const DISMISSED_KEY = 'jic-arabic-invitation-dismissed:v1';
let dismissedInMemory = false;

function wasDismissed() {
  try {
    return dismissedInMemory || localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return dismissedInMemory;
  }
}

export default function ArabicLearningNotice() {
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (dismissed) return undefined;
    // Let the existing welcome finish before offering another destination.
    const timer = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  function dismiss() {
    dismissedInMemory = true;
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // The invitation still stays closed during this visit without storage.
    }
  }

  if (dismissed || !ready) return null;

  return (
    <aside
      className="jic-arabic-notice"
      aria-labelledby="jic-arabic-notice-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') dismiss();
      }}
    >
      <div className="jic-arabic-notice-heading">
        <BookOpen size={20} aria-hidden="true" />
        <strong id="jic-arabic-notice-title">Learn Arabic</strong>
      </div>
      <p>Build words and sentences, one coloured piece at a time.</p>
      <Link className="jic-arabic-notice-action" to="/learning/arabic" onClick={dismiss}>
        Learn now
      </Link>
      <button
        type="button"
        className="jic-arabic-notice-close"
        aria-label="Dismiss Arabic learning invitation"
        onClick={dismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
