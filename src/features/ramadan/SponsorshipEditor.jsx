import React, { useId } from 'react';
import { fullDate } from '@/lib/bookingCalendar';
import { SPONSORSHIP_STATUS } from './model';

export default function SponsorshipEditor({
  day,
  form,
  editing,
  entries,
  enabled,
  busy,
  headingRef,
  onChange,
  onEdit,
  onNew,
  onClose,
  onSave,
  onToggleDay,
}) {
  const fieldId = useId();
  return (
    <section className="sponsorship-editor" aria-labelledby="sponsorship-editor-heading">
      <header className="sponsorship-editor-heading">
        <div>
          <h3 id="sponsorship-editor-heading" tabIndex={-1} ref={headingRef}>
            {editing ? 'Edit sponsorship' : 'Add sponsorship'}
          </h3>
          <p>
            {day.number} Ramadan · {fullDate(day.date)}
          </p>
        </div>
        <button type="button" className="booking-button" disabled={busy} onClick={onClose}>
          Close
        </button>
      </header>
      {entries.length > 0 && (
        <div
          className="booking-actions sponsorship-editor-sponsors"
          aria-label="Sponsors for this day"
        >
          {entries.map((row) => (
            <button
              type="button"
              key={row.id}
              aria-pressed={editing === row.id}
              disabled={busy}
              onClick={() => onEdit(row)}
            >
              {row.sponsor_name} · {SPONSORSHIP_STATUS[row.status]}
            </button>
          ))}
          {editing && (
            <button type="button" disabled={busy} onClick={onNew}>
              Add another sponsor
            </button>
          )}
        </div>
      )}
      <form onSubmit={onSave}>
        <fieldset disabled={busy} className="sponsorship-editor-fields">
          <legend className="sr-only">Private sponsorship details</legend>
          <div className="booking-fields">
            <label className="booking-field">
              Sponsor name
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={form.sponsor_name}
                onChange={(event) => onChange('sponsor_name', event.target.value)}
              />
            </label>
            <label className="booking-field">
              Amount (£)
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => onChange('amount', event.target.value)}
              />
            </label>
            <label className="booking-field">
              Phone
              <input
                type="tel"
                maxLength={80}
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => onChange('phone', event.target.value)}
              />
            </label>
            <label className="booking-field">
              Email
              <input
                type="email"
                maxLength={254}
                autoComplete="email"
                value={form.email}
                onChange={(event) => onChange('email', event.target.value)}
              />
            </label>
            <div className="booking-field">
              <label htmlFor={`${fieldId}-status`}>Status</label>
              <select
                id={`${fieldId}-status`}
                value={form.status}
                onChange={(event) => onChange('status', event.target.value)}
              >
                {Object.entries(SPONSORSHIP_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="ramadan-check sponsorship-payment">
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(event) => onChange('paid', event.target.checked)}
              />
              Payment received
            </label>
          </div>
          <div className="booking-field">
            <label htmlFor={`${fieldId}-public-name`}>Public display name (optional)</label>
            <input
              id={`${fieldId}-public-name`}
              aria-describedby={`${fieldId}-name-help`}
              maxLength={120}
              value={form.public_name}
              onChange={(event) => onChange('public_name', event.target.value)}
            />
            <small id={`${fieldId}-name-help`}>Only add a name if the sponsor agrees.</small>
          </div>
          <div className="booking-field">
            <label htmlFor={`${fieldId}-notes`}>Staff notes</label>
            <textarea
              id={`${fieldId}-notes`}
              rows={3}
              maxLength={3000}
              value={form.notes}
              onChange={(event) => onChange('notes', event.target.value)}
            />
          </div>
          <p className="sponsorship-private-note">Contact, payment and staff notes stay private.</p>
          <div className="booking-actions">
            <button className="primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add sponsorship'}
            </button>
            <button type="button" onClick={onToggleDay} disabled={busy}>
              {enabled ? 'Close this day' : 'Open this day'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
