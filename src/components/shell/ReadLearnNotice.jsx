import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';

// Retain earlier dismissals when broadening the invitation to reading as well.
const DISMISSED_KEY = 'jic-arabic-invitation-dismissed:v1';
let dismissedInMemory = false;

function wasDismissed() {
  try {
    return dismissedInMemory || localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return dismissedInMemory;
  }
}

export default function ReadLearnNotice({ readTo, learnTo }) {
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

  if (dismissed || !ready || (!readTo && !learnTo)) return null;

  return (
    <aside
      className="jic-read-learn-notice"
      aria-labelledby="jic-read-learn-notice-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') dismiss();
      }}
    >
      <div className="jic-read-learn-notice-heading">
        <BookOpen size={20} aria-hidden="true" />
        <strong id="jic-read-learn-notice-title">
          {readTo && learnTo ? 'Read & Learn' : readTo ? 'Read online' : 'Learn Arabic'}
        </strong>
      </div>
      <p>
        {readTo && learnTo
          ? 'Read online or build Arabic words and sentences.'
          : readTo
            ? 'Open your reading tools.'
            : 'Build words and sentences, one coloured piece at a time.'}
      </p>
      <div className="jic-read-learn-notice-actions">
        {readTo && (
          <Link className="jic-read-learn-notice-action is-reading" to={readTo} onClick={dismiss}>
            Read now
          </Link>
        )}
        {learnTo && (
          <Link className="jic-read-learn-notice-action" to={learnTo} onClick={dismiss}>
            Learn Arabic
          </Link>
        )}
      </div>
      <button
        type="button"
        className="jic-read-learn-notice-close"
        aria-label="Dismiss reading and learning invitation"
        onClick={dismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
