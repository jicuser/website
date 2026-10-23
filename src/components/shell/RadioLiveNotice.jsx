import React, { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import '@/styles/radio-live-notice.css';

const dismissedInSession = (key) => {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

export default function RadioLiveNotice({
  streamUrl,
  availability,
  playing,
  busy,
  hidden,
  onListen,
}) {
  const key = `jic-radio-notice:${streamUrl}`;
  const [dismissed, setDismissed] = useState(() => dismissedInSession(key));
  useEffect(() => setDismissed(dismissedInSession(key)), [key]);
  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      /* Dismissal still works without storage. */
    }
  }
  if (availability !== 'online' || playing || hidden || dismissed) return null;
  return (
    <aside className="jic-radio-live-notice" aria-label="Live radio" role="status">
      <Radio size={18} aria-hidden="true" />
      <span>JIC Radio is live</span>
      <button
        type="button"
        className="jic-radio-notice-listen"
        disabled={busy}
        onClick={() => {
          dismiss();
          onListen();
        }}
      >
        {busy ? 'Connecting…' : 'Listen'}
      </button>
      <button
        type="button"
        className="jic-radio-notice-close"
        aria-label="Dismiss live radio notice"
        onClick={dismiss}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
