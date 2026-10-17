import React, { useRef, useState } from 'react';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { londonDate } from '@/lib/timetable';
import { Field, LoadState, Notice, Stats, rpc, rows, useRecords } from './shared';
const loader = (signal) =>
  rows('community_safeguarding_checks', signal, (q) =>
    q.order('review_on', { ascending: true }).limit(200),
  );
const levels = [
  ['basic', 'Basic'],
  ['standard', 'Standard'],
  ['enhanced', 'Enhanced'],
  ['enhanced_barred', 'Enhanced with eligible barred-list check'],
];
const blank = () => ({
  subject_name: '',
  role_name: '',
  check_level: 'basic',
  checked_on: londonDate(),
  review_on: '',
  retention_review_on: '',
  status: 'recorded',
  policy_reference: '',
  policy_confirmed: false,
});
export default function Safeguarding() {
  const state = useRecords(loader);
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const initial = useRef(JSON.stringify(form));
  const formRef = useRef();
  const today = londonDate();
  const records = state.data || [];
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save() {
    if (!formRef.current.reportValidity()) return false;
    setBusy(true);
    setError('');
    try {
      await rpc('save_community_safeguarding', {
        p_id: editing?.id || null,
        p_body: form,
        p_version: editing?.version || null,
      });
      reset();
      setMessage('Restricted review record saved.');
      state.refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    const next = blank();
    initial.current = JSON.stringify(next);
    setForm(next);
    setEditing(null);
  }
  useRegisterAdminSave(save, JSON.stringify(form) !== initial.current, 'Save review record', busy);
  async function remove(r) {
    if (
      !window.confirm(
        `Permanently remove the minimal review record for ${r.subject_name}? Use this after the retention review confirms it is no longer needed.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await rpc('remove_community_safeguarding', { p_id: r.id });
      if (editing?.id === r.id) reset();
      state.refresh();
      setMessage('Record removed after retention review.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-admin">
      <p className="ops-eyebrow">Restricted staff records</p>
      <h1>Safeguarding reviews</h1>
      <p>
        Track DBS checks and internal review dates. Access requires the separate safeguarding
        permission.
      </p>
      <div className="ops-notice">
        DBS checks have no official expiry date. A review date is JIC’s reminder to reassess. Record
        minimal information here; do not add certificate scans, convictions or safeguarding incident
        details.
      </div>
      <LoadState state={state} />
      <Notice error={error} message={message} />
      {state.data && (
        <Stats
          items={[
            ['Records', records.length],
            ['Review due', records.filter((r) => r.review_on <= today).length],
            ['Retention review due', records.filter((r) => r.retention_review_on <= today).length],
          ]}
        />
      )}
      <div className="ops-finance-layout">
        <div>
          <h2>Review queue</h2>
          {records.length === 0 && !state.loading && !state.error && (
            <p className="ops-empty">No review records yet.</p>
          )}
          {records.map((r) => (
            <article className="ops-panel" key={r.id}>
              <span className="ops-badge">
                {r.review_on <= today ? 'Review due' : r.status.replaceAll('_', ' ')}
              </span>
              <h3>{r.subject_name}</h3>
              <p>
                {r.role_name} · {levels.find(([id]) => id === r.check_level)?.[1]}
              </p>
              <p>
                Review: {r.review_on}
                <br />
                Retention review: {r.retention_review_on}
              </p>
              <div className="ops-actions">
                <button
                  className="ops-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      JSON.stringify(form) !== initial.current &&
                      !window.confirm('Discard unsaved review changes?')
                    )
                      return;
                    setEditing(r);
                    setForm({ ...r, policy_confirmed: false });
                    initial.current = JSON.stringify({ ...r, policy_confirmed: false });
                  }}
                >
                  Open record
                </button>
                <button className="ops-secondary" disabled={busy} onClick={() => remove(r)}>
                  Remove after review
                </button>
              </div>
            </article>
          ))}
        </div>
        <form
          ref={formRef}
          className="ops-panel ops-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="ops-heading">
            <h2>{editing ? 'Update review' : 'Record a check'}</h2>
            {editing && (
              <button
                className="ops-secondary"
                type="button"
                onClick={() => {
                  if (
                    JSON.stringify(form) === initial.current ||
                    window.confirm('Discard unsaved changes?')
                  )
                    reset();
                }}
              >
                New record
              </button>
            )}
          </div>
          <fieldset disabled={busy}>
            <Field label="Staff / volunteer name">
              <input
                required
                minLength={2}
                maxLength={160}
                value={form.subject_name}
                onChange={(e) => set('subject_name', e.target.value)}
              />
            </Field>
            <Field label="Role checked for">
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.role_name}
                onChange={(e) => set('role_name', e.target.value)}
              />
            </Field>
            <Field label="Eligible check level">
              <select value={form.check_level} onChange={(e) => set('check_level', e.target.value)}>
                {levels.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="ops-form-grid">
              {[
                ['checked_on', 'Check date'],
                ['review_on', 'Next internal review'],
                ['retention_review_on', 'Retention review'],
              ].map(([key, label]) => (
                <Field label={label} key={key}>
                  <input
                    required
                    type="date"
                    max={key === 'checked_on' ? today : undefined}
                    min={key === 'checked_on' ? undefined : form.checked_on}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <Field label="Follow-up status">
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="recorded">Check recorded</option>
                <option value="review_needed">Review needed</option>
                <option value="action_required">Action required</option>
              </select>
            </Field>
            <Field
              label="JIC policy / lawful-basis reference"
              hint="Reference the approved policy. Do not enter criminal-record details."
            >
              <input
                required
                minLength={5}
                maxLength={300}
                value={form.policy_reference}
                onChange={(e) => set('policy_reference', e.target.value)}
              />
            </Field>
            <label className="ops-check">
              <input
                required
                type="checkbox"
                checked={form.policy_confirmed}
                onChange={(e) => set('policy_confirmed', e.target.checked)}
              />
              <span>
                I have confirmed role eligibility, our lawful basis and the required policy for
                keeping this record.
              </span>
            </label>
            <button className="ops-button" disabled={busy}>
              {busy ? 'Saving…' : 'Save review record'}
            </button>
          </fieldset>
          <p className="ops-help">
            <a
              href="https://www.gov.uk/guidance/dbs-check-requests-guidance-for-employers"
              target="_blank"
              rel="noopener noreferrer"
            >
              DBS employer guidance
            </a>{' '}
            ·{' '}
            <a
              href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/criminal-offence-data/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ICO guidance
            </a>
          </p>
        </form>
      </div>
    </section>
  );
}
