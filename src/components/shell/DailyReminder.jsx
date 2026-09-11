import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import { DEFAULT_REMINDERS } from '@/content/reminders';
import { internalPath } from '@/lib/navigation';

export default function DailyReminder() {
  const { getContent } = useContent();
  const [index, setIndex] = useState(() => Math.floor(Date.now() / 86400000));
  const interactions = useRef(0);
  const advance = useCallback(() => {
    interactions.current = 0;
    setIndex((value) => value + 1);
  }, []);
  useEffect(() => {
    let scrollTimer,
      scrollIntentUntil = 0;
    const isEditing = (target) =>
      target instanceof Element &&
      target.closest(
        'input,textarea,select,[contenteditable="true"],.admin-console,.jic-daily-reminder',
      );
    const countInteraction = () => {
      interactions.current += 1;
      if (interactions.current >= 2) advance();
    };
    const onClick = (event) => {
      if (event.isTrusted && !isEditing(event.target)) countInteraction();
    };
    const onIntent = (event) => {
      if (isEditing(event.target)) return;
      if (
        event.type === 'keydown' &&
        ![
          'ArrowDown',
          'ArrowUp',
          'ArrowLeft',
          'ArrowRight',
          'PageDown',
          'PageUp',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      )
        return;
      scrollIntentUntil = Date.now() + 2000;
    };
    // One scroll gesture, including its momentum, counts once, not once per pixel.
    const onScroll = () => {
      if (Date.now() > scrollIntentUntil) return;
      scrollIntentUntil = Date.now() + 1000;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        scrollIntentUntil = 0;
        countInteraction();
      }, 180);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'].forEach((type) =>
      document.addEventListener(type, onIntent, { capture: true, passive: true }),
    );
    return () => {
      window.clearTimeout(scrollTimer);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('scroll', onScroll, true);
      ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'].forEach((type) =>
        document.removeEventListener(type, onIntent, true),
      );
    };
  }, [advance]);
  let reminders = DEFAULT_REMINDERS,
    notices = [];
  try {
    const saved = JSON.parse(getContent('header_reminders', '[]'));
    const valid = saved.filter(
      (item) =>
        typeof item?.text === 'string' &&
        item.text.trim() &&
        typeof item?.type === 'string' &&
        (item.source == null || typeof item.source === 'string'),
    );
    if (valid.length)
      reminders = [
        ...valid,
        ...DEFAULT_REMINDERS.filter(
          (item) => !valid.some((custom) => custom.text.trim() === item.text),
        ),
      ];
  } catch {
    /* Keep curated defaults. */
  }
  try {
    notices = JSON.parse(getContent('header_ticker_items', '[]')).filter(
      (item) =>
        typeof item?.text === 'string' && (item.label == null || typeof item.label === 'string'),
    );
  } catch {
    /* Optional notices. */
  }
  const reminder = reminders[index % reminders.length];
  let date = '';
  try {
    date = new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London',
    }).format(new Date());
  } catch {
    /* Older browsers. */
  }
  return (
    <aside className="jic-daily-reminder" aria-label="Daily reminder">
      <button
        type="button"
        aria-label="Show another daily reminder"
        title="Changes after two taps or scroll gestures. Tap here for the next reminder."
        onClick={advance}
      >
        <div>
          <b>{reminder.type}</b>
          <span>{date}</span>
          <small>{reminder.source}</small>
        </div>
        <p>{reminder.text}</p>
      </button>
      {notices.length > 0 && (
        <div className="jic-notices">
          {notices.map((notice, i) => (
            <Link key={i} to={internalPath(notice.to)}>
              <b>{notice.label}</b> {notice.text}
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
