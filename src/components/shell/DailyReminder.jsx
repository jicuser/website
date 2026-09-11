import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { DEFAULT_REMINDERS } from '@/content/reminders';
import { internalPath } from '@/lib/navigation';

export default function DailyReminder() {
  const { getContent } = useContent();
  const [index, setIndex] = useState(() => Math.floor(Date.now() / 86400000));
  let reminders = DEFAULT_REMINDERS, notices = [];
  try { const saved = JSON.parse(getContent('header_reminders', '[]')); const valid = saved.filter(item => typeof item?.text === 'string' && typeof item?.type === 'string' && (item.source == null || typeof item.source === 'string')); if (valid.length) reminders = valid; } catch { /* Keep curated defaults. */ }
  try { notices = JSON.parse(getContent('header_ticker_items', '[]')).filter(item => typeof item?.text === 'string' && (item.label == null || typeof item.label === 'string')); } catch { /* Optional notices. */ }
  const reminder = reminders[index % reminders.length];
  let date = '';
  try { date = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(new Date()); } catch { /* Older browsers. */ }
  return <aside className="jic-daily-reminder" aria-label="Daily reminder">
    <button type="button" aria-label="Show another daily reminder" onClick={() => setIndex(value => value + 1)}><div><b>{reminder.type}</b><span>{date}</span><small>{reminder.source}</small></div><p>{reminder.text}</p></button>
    {notices.length > 0 && <div className="jic-notices">{notices.map((notice, i) => <Link key={i} to={internalPath(notice.to)}><b>{notice.label}</b> {notice.text}</Link>)}</div>}
  </aside>;
}
