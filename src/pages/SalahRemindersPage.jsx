import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Share2 } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import {
  DEFAULT_SALAH_REMINDERS,
  REMINDER_PRAYERS,
  reminderProblem,
} from '@/lib/salahReminderSettings';
import { createReminderApi, createReminderClient } from '@/lib/salahRemindersClient';
import '@/styles/salah-reminders.css';

export default function SalahRemindersPage() {
  const [settings, setSettings] = useState(DEFAULT_SALAH_REMINDERS);
  const [state, setState] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const client = useRef(null),
    mounted = useRef(false),
    inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const api = createReminderApi({
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
    let storage;
    try {
      storage = window.localStorage;
    } catch {
      storage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage blocked');
        },
        removeItem: () => {},
      };
    }
    client.current = createReminderClient(api, {
      window,
      navigator,
      Notification: window.Notification,
      crypto,
      storage,
      atob: (value) => window.atob(value),
    });
    client.current
      .inspect()
      .then((value) => {
        if (!mounted.current) return;
        setState(value);
        if (value.saved?.preferences) setSettings(value.saved.preferences);
      })
      .catch((problem) => mounted.current && setError(problem.message))
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, []);
  const act = async (action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (action === 'save') {
        const saved = await client.current.enable(settings, state.config, state.saved?.updated_at);
        if (mounted.current) {
          setState((current) => ({ ...current, active: true, saved }));
          setMessage('Salah alerts are on.');
        }
      } else if (action === 'off') {
        await client.current.disable();
        if (mounted.current) {
          setState((current) => ({ ...current, active: false, saved: null }));
          setMessage('Reminders turned off for this device.');
        }
      } else if (action === 'test') {
        await client.current.test();
        if (mounted.current) setMessage('Test sent. Check your phone’s notifications.');
      } else {
        const value = await client.current.inspect();
        if (mounted.current) {
          setState(value);
          if (value.saved?.preferences) setSettings(value.saved.preferences);
        }
      }
    } catch (problem) {
      if (mounted.current) setError(problem.message || 'Could not update reminders. Please retry.');
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setBusy(false);
        setLoading(false);
      }
    }
  };
  const problem = reminderProblem(settings);
  const changed =
    state?.saved?.preferences &&
    JSON.stringify(settings) !== JSON.stringify(state.saved.preferences);
  return (
    <div className="salah-reminders jic-page-shell">
      <PageHeading title="Salah alerts">
        A reminder on this device before prayer. No account needed.
      </PageHeading>
      <section className="salah-reminders__panel" aria-label="Reminder settings">
        <div className="salah-reminders__status">
          <Bell size={20} />
          <strong>
            {loading
              ? 'Checking this device…'
              : error && !state
                ? 'This device could not be checked'
                : state?.active
                  ? 'Reminders on for this device'
                  : 'Reminders off for this device'}
          </strong>
        </div>
        {loading && <p role="status">Loading reminder setup…</p>}
        {error && (
          <p role="alert" className="salah-reminders__error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="salah-reminders__message">
            <Check size={17} />
            {message}
          </p>
        )}
        {state?.support === 'install' && (
          <div className="salah-reminders__setup">
            <h2>On iPhone</h2>
            <ol>
              <li>
                In Safari, tap <Share2 size={16} aria-hidden="true" /> Share →{' '}
                <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Open the JIC icon, go to Salah alerts and tap <strong>Enable Salah alerts</strong>.
              </li>
            </ol>
          </div>
        )}
        {state?.support === 'blocked' && (
          <p className="salah-reminders__setup">
            Notifications are blocked. Allow notifications for Jamatia in your phone/browser
            settings, then check this device again.
          </p>
        )}
        {state?.support === 'unsupported' && (
          <p className="salah-reminders__setup">
            Website notifications need a secure HTTPS page and a supported browser. Try an
            up-to-date Safari Home-Screen app on iPhone, or Chrome on Android.
          </p>
        )}
        {state && !state.config.ready && (
          <p className="salah-reminders__error">
            Salah alerts are currently unavailable. Please check the prayer timetable.
          </p>
        )}

        {problem && <p className="salah-reminders__hint">{problem}</p>}
        {changed && <p className="salah-reminders__hint">Your changes are not saved yet.</p>}
        <p className="salah-reminders__summary">
          <strong>
            {settings.prayers.length === 5
              ? 'All five prayers'
              : `${settings.prayers.length} prayers`}
          </strong>
          <span>
            {[
              settings.jamaah && `${settings.jamaahMinutes} minutes before Jama’ah`,
              settings.start && `${settings.startMinutes} minutes before Salah begins`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>
        <div className="salah-reminders__actions">
          <button
            type="button"
            className="jic-primary-cta"
            disabled={
              busy ||
              loading ||
              !state?.config.ready ||
              state?.support !== 'supported' ||
              Boolean(problem)
            }
            onClick={() => act('save')}
          >
            {busy ? 'Please wait…' : state?.active ? 'Save alert settings' : 'Enable Salah alerts'}
          </button>
          {state?.active && (
            <button
              type="button"
              className="jic-secondary-cta"
              disabled={busy || !state.config.ready}
              onClick={() => act('test')}
            >
              Send test alert
            </button>
          )}
          {(state?.active || state?.saved?.active) && (
            <button
              type="button"
              className="jic-secondary-cta"
              disabled={busy}
              onClick={() => act('off')}
            >
              Turn off Salah alerts
            </button>
          )}
          {(state?.support !== 'supported' || error) && (
            <button
              type="button"
              className="jic-secondary-cta"
              disabled={busy || loading}
              onClick={() => act('reload')}
            >
              Check this device again
            </button>
          )}
        </div>
        <details className="salah-reminders__customise">
          <summary>Customise alerts</summary>
          <fieldset disabled={busy || loading} className="salah-reminders__choices">
            {[
              ['start', 'Salah start time', 'startMinutes'],
              ['jamaah', 'Jama’ah time', 'jamaahMinutes'],
            ].map(([key, label, minutes]) => (
              <div className="salah-reminders__choice" key={key}>
                <label className="salah-reminders__switch">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={settings[key]}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                  <strong>{label}</strong>
                </label>
                {settings[key] && (
                  <label className="salah-reminders__minutes">
                    Remind me
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="60"
                      step="1"
                      aria-label={`Minutes before ${label}`}
                      value={settings[minutes]}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          [minutes]: event.target.value === '' ? '' : Number(event.target.value),
                        }))
                      }
                    />
                    <span>minutes before</span>
                  </label>
                )}
              </div>
            ))}
            <details className="salah-reminders__prayers">
              <summary>Choose prayers · {settings.prayers.length} selected</summary>
              <div>
                {REMINDER_PRAYERS.map((prayer) => (
                  <label key={prayer}>
                    <input
                      type="checkbox"
                      checked={settings.prayers.includes(prayer)}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          prayers: event.target.checked
                            ? [...current.prayers, prayer]
                            : current.prayers.filter((item) => item !== prayer),
                        }))
                      }
                    />
                    {prayer === 'dhuhr' ? 'Dhuhr' : prayer[0].toUpperCase() + prayer.slice(1)}
                  </label>
                ))}
              </div>
            </details>
          </fieldset>
        </details>
        <details className="salah-reminders__about">
          <summary>About these alerts</summary>
          <p className="salah-reminders__hint">
            0 minutes means at the prayer time. Times follow the published JIC timetable in UK time.
            Phone settings, Focus and network conditions can silence or delay alerts; check the
            timetable when needed.
          </p>
          <p className="salah-reminders__hint">
            No sign-in needed. This device’s subscription and choices are stored privately for
            reminders. Turning reminders off removes them. <Link to="/privacy">Privacy</Link>
          </p>
        </details>
      </section>
      <Link className="salah-reminders__timetable" to="/prayer-times">
        View today’s prayer times →
      </Link>
    </div>
  );
}
