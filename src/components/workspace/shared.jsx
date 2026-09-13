import React, { useState } from 'react';
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not scheduled';
export function Field({ label, children }) {
  return (
    <label className="workspace-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Select({ label, options, value, onChange, required = true }) {
  return (
    <Field label={label}>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {row.display_name || row.title}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function ActionForm({ title, onSubmit, children, button = 'Save' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="workspace-card workspace-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await onSubmit(new FormData(event.currentTarget));
          setError('Saved.');
        } catch (e) {
          setError(e.message || 'Could not save. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {title && <h3>{title}</h3>}
      <fieldset disabled={busy}>{children}</fieldset>
      <button disabled={busy}>{busy ? 'Saving…' : button}</button>
      {error && <p role="status">{error}</p>}
    </form>
  );
}
export async function checked(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export function TextField({
  label,
  name,
  type = 'text',
  required = true,
  maxLength = 160,
  ...props
}) {
  return (
    <Field label={label}>
      <input name={name} type={type} required={required} maxLength={maxLength} {...props} />
    </Field>
  );
}
