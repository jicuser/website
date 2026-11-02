import GuidedEditor from '@/components/admin/GuidedEditor';
import React from 'react';
import { fullDate, seasonDays, seasonLength } from '@/lib/bookingCalendar';

export default function RamadanSetup({
  setup,
  onChange,
  onSave,
  onNew,
  onCancel,
  busy,
  hasSeason,
}) {
  const days = seasonDays(setup);
  let dateError = '';
  if (setup.start_date && setup.end_date) {
    try {
      seasonLength(setup.start_date, setup.end_date);
    } catch (failure) {
      dateError = failure.message;
    }
  }
  return (
    <form className="booking-panel sponsorship-setup" onSubmit={onSave}>
      <div className="sponsorship-section-heading">
        <h3>Sponsorship setup</h3>
        {hasSeason && setup.id && (
          <button type="button" className="booking-button" disabled={busy} onClick={onNew}>
            New Ramadan
          </button>
        )}
      </div>
      <GuidedEditor key={setup.id || 'new'} label="Ramadan setup steps" disabled={busy}>
        <div data-step="Dates" data-help="Enter the confirmed start and end dates for Ramadan.">
          <label className="booking-field">
            Name
            <input
              required
              maxLength={120}
              value={setup.title}
              disabled={busy}
              onChange={(event) => onChange({ ...setup, title: event.target.value })}
            />
          </label>
          <div className="booking-fields sponsorship-season-dates">
            <div className="booking-field">
              <label htmlFor="ramadan-first-date">First UK date · 1 Ramadan</label>
              <input
                id="ramadan-first-date"
                required
                type="date"
                value={setup.start_date}
                disabled={busy}
                onChange={(event) => {
                  const next = { ...setup, start_date: event.target.value };
                  onChange({ ...next, end_date: seasonDays(next).at(-1)?.date || '' });
                }}
              />
            </div>
            <div className="booking-field">
              <label htmlFor="ramadan-last-date">Last UK date</label>
              <input
                id="ramadan-last-date"
                type="date"
                required
                disabled={busy || !setup.start_date}
                value={setup.end_date}
                min={seasonDays({ ...setup, day_count: 29 }).at(-1)?.date || undefined}
                max={seasonDays({ ...setup, day_count: 30 }).at(-1)?.date || undefined}
                aria-describedby={dateError ? 'ramadan-date-error' : undefined}
                onChange={(event) => {
                  const next = { ...setup, end_date: event.target.value };
                  try {
                    next.day_count = seasonLength(setup.start_date, next.end_date);
                  } catch {}
                  onChange(next);
                }}
              />
              {!dateError && setup.end_date && <small>{setup.day_count} Ramadan</small>}
            </div>
          </div>
          {dateError && (
            <p id="ramadan-date-error" role="alert">
              {dateError}
            </p>
          )}
          {days.length > 0 && !dateError && setup.end_date && (
            <p className="sponsorship-date-summary">
              1 Ramadan · {fullDate(days[0].date)} → {setup.day_count} Ramadan ·{' '}
              {fullDate(setup.end_date)}
            </p>
          )}
        </div>
        <div
          data-step="Amounts"
          data-help="Set optional daily sponsorship amounts. Leave blank if not needed."
        >
          <h4>Daily amounts (optional)</h4>
          <div className="booking-fields">
            {[
              ['iftar_amount', 'Iftar per day (£)'],
              ['suhoor_amount', 'Suhoor per day (£)'],
              ['daily_amount', 'Daily Giving per day (£)'],
            ].map(([key, label]) => (
              <label className="booking-field" key={key}>
                {label}
                <input
                  inputMode="decimal"
                  value={setup[key]}
                  disabled={busy}
                  onChange={(event) => onChange({ ...setup, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        </div>
        <div data-step="Review" data-help="Check the dates and amounts, then save your setup.">
          <h4>{setup.title || 'Ramadan'}</h4>
          <p>
            {setup.start_date && setup.end_date && !dateError
              ? `${fullDate(setup.start_date)} – ${fullDate(setup.end_date)}`
              : 'Complete the dates before saving.'}
          </p>
          <dl className="guided-review">
            {[
              ['iftar_amount', 'Iftar'],
              ['suhoor_amount', 'Suhoor'],
              ['daily_amount', 'Daily Giving'],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{setup[key] ? `£${setup[key]} per day` : 'No set amount'}</dd>
              </div>
            ))}
          </dl>
          <div className="booking-actions">
            <button className="primary" disabled={busy || Boolean(dateError)}>
              {busy ? 'Saving…' : 'Save setup'}
            </button>
            {hasSeason && (
              <button type="button" disabled={busy} onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </GuidedEditor>
    </form>
  );
}
