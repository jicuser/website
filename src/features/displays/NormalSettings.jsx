import React from 'react';
import { Link } from 'react-router-dom';
import usePosters from '@/hooks/usePosters';

export default function NormalSettings({ form, update, currentEvents, hall, preset = 'standby' }) {
  const programmes = usePosters();

  if (preset === 'standby') {
    return (
      <>
        <p className="workspace-meta tv-layout-help">
          Show, hide, move and resize the timetable, Next Salah, clock, logo and poster blocks in
          the visual layout above.
        </p>

        <details className="admin-panel">
          <summary>Posters & rotation</summary>
          <p>
            Choose which posters are available to this display. Their position and size are controlled
            in the visual layout above.
          </p>
          <Link to="/admin?section=posters">Edit posters & content →</Link>
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
      </>
    );
  }

  if (!hall)
    return (
      <section className="admin-panel">
        <p>The Shoe Area uses the standby layout only. Prayer-hall presets are disabled there.</p>
      </section>
    );

  if (preset === 'before')
    return (
      <section className="admin-panel tv-preset-settings">
        <h3>Before Jama‘ah</h3>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.prayer_enabled !== false}
            onChange={(event) => update('prayer_enabled', event.target.checked)}
          />
          Use automatic prayer screens
        </label>
        <label>
          Show this preset before Jama‘ah
          <select
            value={form.jamaah_lead_minutes ?? 1}
            onChange={(event) => update('jamaah_lead_minutes', Number(event.target.value))}
          >
            {[0, 1, 2, 3, 5, 10].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? 'Do not show before Jama‘ah' : `${minutes} minute${minutes === 1 ? '' : 's'} before`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Main message
          <input
            maxLength={240}
            value={form.before_jamaah_message || ''}
            onChange={(event) => update('before_jamaah_message', event.target.value)}
          />
        </label>
      </section>
    );

  if (preset === 'jamaah')
    return (
      <section className="admin-panel tv-preset-settings">
        <h3>Jama‘ah screen</h3>
        <p>
          This appears from Jama‘ah time until the configured Dhikr start for that prayer.
        </p>
        <label>
          Main message
          <input
            maxLength={240}
            value={form.jamaah_message || ''}
            onChange={(event) => update('jamaah_message', event.target.value)}
          />
        </label>
        <label>
          Supporting message
          <input
            maxLength={240}
            value={form.jamaah_submessage || ''}
            onChange={(event) => update('jamaah_submessage', event.target.value)}
          />
        </label>
      </section>
    );

  if (preset === 'dhikr')
    return (
      <section className="admin-panel tv-preset-settings">
        <h3>Dhikr timing</h3>
        <p>Choose when the after-salah Dhikr screen starts after each Jama‘ah.</p>
        <div className="admin-field-grid tv-prayer-delay-grid">
          {[
            ['fajr', 'Fajr', 14],
            ['dhuhr', 'Dhuhr', 9],
            ['asr', 'Asr', 9],
            ['maghrib', 'Maghrib', 8],
            ['isha', 'Isha', 7],
          ].map(([key, label, fallback]) => (
            <label key={key}>
              {label}
              <select
                value={form[`dhikr_delay_${key}`] ?? fallback}
                onChange={(event) => update(`dhikr_delay_${key}`, Number(event.target.value))}
              >
                {[5, 6, 7, 8, 9, 10, 12, 14, 15, 20].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes after Jama‘ah
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="workspace-meta">
          The preview above uses the real Dhikr renderer so Arabic spacing and sizing match the TV
          renderer rather than a separate mock-up.
        </p>
      </section>
    );

  if (preset === 'jummah')
    return (
      <section className="admin-panel tv-preset-settings">
        <h3>Jummah preset</h3>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.auto_jummah !== false}
            onChange={(event) => update('auto_jummah', event.target.checked)}
          />
          Automatically show Friday’s Jummah welcome
        </label>
        <p>Shows from one hour before the first Jummah until 20 minutes after the last.</p>
        <label>
          Jummah message
          <textarea
            rows={4}
            maxLength={1200}
            value={form.jummah_notice || ''}
            onChange={(event) => update('jummah_notice', event.target.value)}
          />
        </label>
      </section>
    );

  return (
    <section className="admin-panel tv-preset-settings">
      <h3>Ramadan du‘a</h3>
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
        Ramadan du‘a (optional)
        <textarea
          rows={4}
          dir="auto"
          maxLength={1200}
          value={form.taraweeh_dua || ''}
          onChange={(event) => update('taraweeh_dua', event.target.value)}
        />
      </label>
      <p>Blank uses Qur’an 2:201. The preview above shows the exact TV notice renderer.</p>
    </section>
  );
}
