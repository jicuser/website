import React from 'react';
import { Link } from 'react-router-dom';
import usePosters from '@/hooks/usePosters';
export default function NormalSettings({ form, update, currentEvents, hall }) {
  const programmes = usePosters();
  return (
    <>
      <section className="admin-panel">
        <h3>Normal display</h3>
        {[
          ['show_times', 'Salah timetable'],
          ['show_next', 'Next prayer'],
          ['show_clock', 'Current clock'],
        ].map(([key, name]) => (
          <label key={key} className="admin-check">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => update(key, e.target.checked)}
            />
            {name}
          </label>
        ))}
      </section>
      <details className="admin-panel" open={true}>
        <summary>Posters & rotation</summary>
        <p>
          Tick the posters for this TV. Up to four show across, moving one place each rotation.
          Announcements rotate as a poster too.
        </p>
        <Link to="/admin?section=posters">Edit posters & announcements →</Link>
        <div className="admin-poster-picker">
          {programmes.map((item) => (
            <label key={item.id}>
              <span>
                {item.kind === 'announcement' ? (
                  'Text & pictures'
                ) : (
                  <img src={item.image} alt="" loading="lazy" />
                )}
              </span>
              <span>
                <input
                  type="checkbox"
                  checked={form.poster_ids.includes(item.id)}
                  onChange={(event) =>
                    update(
                      'poster_ids',
                      event.target.checked
                        ? [...form.poster_ids, item.id]
                        : form.poster_ids.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.title}
              </span>
            </label>
          ))}
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.include_events}
            onChange={(event) => update('include_events', event.target.checked)}
          />
          Include upcoming event posters
        </label>
        {form.include_events &&
          (currentEvents.length ? (
            <div className="admin-poster-picker">
              {currentEvents.map((event) => (
                <div key={event.id}>
                  <img src={event.poster_url} alt={event.title} loading="lazy" />
                  <span>{event.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No upcoming event posters are published.</p>
          ))}
        <label>
          Change poster every
          <select
            value={form.rotation_seconds}
            onChange={(event) => update('rotation_seconds', Number(event.target.value))}
          >
            {[...new Set([10, 15, 20, 30, 60, form.rotation_seconds])]
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  {value} seconds
                </option>
              ))}
          </select>
        </label>
      </details>
      {hall && (
        <details className="admin-panel">
          <summary>Automatic prayers, Jummah & Ramadan</summary>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.prayer_enabled !== false}
              onChange={(event) => update('prayer_enabled', event.target.checked)}
            />
            Automatic prayer reminders
          </label>
          <p>
            At Jama‘ah: silence your phone. Dhikr begins 5 minutes later, or 10 minutes after
            Maghrib. Posters return 20 minutes after Jama‘ah. Class / Teach pauses all automatic
            notices.
          </p>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={form.auto_jummah !== false}
              onChange={(event) => update('auto_jummah', event.target.checked)}
            />
            Automatically show Friday’s Jummah welcome
          </label>
          <p>
            In Normal mode: from one hour before the first Jummah until 20 minutes after the last.
          </p>
          <label>
            Ramadan calendar
            <select
              value={form.ramadan_calendar}
              onChange={(event) => update('ramadan_calendar', event.target.value)}
            >
              <option value="auto">Automatic — Islamic calendar</option>
              <option value="on">Ramadan is on</option>
              <option value="off">Ramadan is off</option>
            </select>
          </label>
          {form.ramadan_calendar === 'auto' && (
            <label>
              Local moon calendar adjustment
              <select
                value={form.calendar_offset}
                onChange={(event) => update('calendar_offset', Number(event.target.value))}
              >
                {[-2, -1, 0, 1, 2].map((value) => (
                  <option key={value} value={value}>
                    {value === 0
                      ? 'No adjustment'
                      : `${value > 0 ? '+' : ''}${value} day${Math.abs(value) > 1 ? 's' : ''}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Notice override in Normal mode
            <select
              value={form.notice_mode || 'off'}
              onChange={(event) => update('notice_mode', event.target.value)}
            >
              <option value="off">Automatic</option>
              <option value="jummah">Keep Jummah welcome on</option>
              <option value="taraweeh">Keep Taraweeh du‘a on</option>
            </select>
          </label>
          <label>
            Jummah message
            <textarea
              rows={3}
              maxLength={1200}
              value={form.jummah_notice || ''}
              onChange={(event) => update('jummah_notice', event.target.value)}
            />
          </label>
          <label>
            Ramadan du‘a (optional)
            <textarea
              rows={3}
              dir="auto"
              maxLength={1200}
              value={form.taraweeh_dua || ''}
              onChange={(event) => update('taraweeh_dua', event.target.value)}
            />
          </label>
          <p>
            Blank uses Qur’an 2:201. During Ramadan, Normal shows du‘a 20–40 minutes after Isha
            Jama‘ah, then alternates fasting times and posters. Class / Teach uses your saved
            scenes.
          </p>
        </details>
      )}
    </>
  );
}
