import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { noticePlacement } from '@/lib/noticePlacement';
import '@/styles/notice-placement.css';
const seen = new Set();
function wasSeen(key) {
  try {
    return seen.has(key) || sessionStorage.getItem(key) === '1';
  } catch {
    return seen.has(key);
  }
}
export default function SiteNotice({ item, to, prefix = 'notice' }) {
  const settings = noticePlacement(item?.display_settings);
  const key = `jic-${prefix}:${item?.id || 1}:${item?.updated_at || item?.title || ''}`;
  return settings.notification ? (
    <Notice key={key} item={item} to={to} settings={settings} storageKey={key} />
  ) : null;
}
function Notice({ item, to, settings, storageKey }) {
  const [open, setOpen] = useState(() => !wasSeen(storageKey));
  useEffect(() => {
    if (!open) return undefined;
    seen.add(storageKey);
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* Session memory is enough. */
    }
    const timer = window.setTimeout(() => setOpen(false), 10000);
    return () => window.clearTimeout(timer);
  }, [storageKey, open]);
  if (!open) return null;
  return (
    <aside className={`jic-site-notice ${settings.position}`} aria-label={item.title} role="status">
      <div>
        <strong>{item.title}</strong>
        {item.body && <p>{item.body}</p>}
        {to && (
          <Link to={to} onClick={() => setOpen(false)}>
            Watch live
          </Link>
        )}
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => setOpen(false)}>
        <X size={18} />
      </button>
    </aside>
  );
}
