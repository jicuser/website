import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { EID_ANNOUNCEMENT_KEY, parseEidAnnouncement } from '@/lib/eidAnnouncement';

export default function EidAnnouncementEditor() {
  const { can } = useAuth();
  const allowed = can('content');
  const { saveContent } = useContent();
  const [draft, setDraft] = useState(() => parseEidAnnouncement(''));
  const [saved, setSaved] = useState(() => parseEidAnnouncement(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    setLoading(true);
    setLoadError('');
    supabase.from('page_content').select('content_value')
      .eq('content_key', EID_ANNOUNCEMENT_KEY).maybeSingle()
      .then(({ data, error: failure }) => {
        if (!active) return;
        if (failure) throw failure;
        const value = parseEidAnnouncement(data?.content_value);
        setDraft(value);
        setSaved(value);
      })
      .catch(() => { if (active) setLoadError('Could not load the Eid announcement. Try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, attempt]);

  const save = useCallback(async () => {
    if (!allowed) throw new Error('Website content access is required.');
    if (!dirty || loading) return;
    if (inFlight.current) throw new Error('The Eid announcement is already saving.');
    const submitted = draft;
    const clean = parseEidAnnouncement(JSON.stringify(submitted));
    if (clean.enabled && !clean.message) throw new Error('Add an Eid message before showing it.');
    inFlight.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveContent(EID_ANNOUNCEMENT_KEY, JSON.stringify(clean), 'json');
      setDraft((current) => current === submitted ? clean : current);
      setSaved(clean);
      setMessage(clean.enabled ? 'Eid announcement is showing.' : 'Eid announcement is hidden.');
      window.dispatchEvent(new Event('jic-content-updated'));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [allowed, dirty, loading, draft, saveContent]);

  useRegisterAdminSave(save, allowed && dirty && !loading && !loadError, 'Save Eid announcement', saving);
  if (!allowed) return null;
  return (
    <section className="my-6" aria-label="Eid announcement settings">
      <h4 className="mb-2 font-semibold">Eid announcement</h4>
      <p className="mb-3 text-sm">Show a short notice on the website and bookmark app. Add the centre’s confirmed Eid date and Salah times in your message.</p>
      {loading && <p role="status">Loading Eid announcement…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reload announcement</button></p>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={loading || saving || Boolean(loadError)} className="grid gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.enabled}
            onChange={(event) => { setMessage(''); setDraft({ ...draft, enabled: event.target.checked }); }} />
          Show Eid announcement
        </label>
        <label className="grid gap-1">Heading
          <input maxLength={80} value={draft.title}
            onChange={(event) => { setMessage(''); setDraft({ ...draft, title: event.target.value }); }} />
        </label>
        <label className="grid gap-1">Eid message
          <textarea rows={3} maxLength={360} value={draft.message}
            onChange={(event) => { setMessage(''); setDraft({ ...draft, message: event.target.value }); }} />
        </label>
        <div className="admin-actions">
          <button type="button" className="admin-button primary" disabled={!dirty}
            onClick={() => save().catch((failure) => setError(failure.message))}>
            <Save size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Save Eid announcement'}
          </button>
          <small>{dirty ? 'Unsaved changes' : saved.enabled ? 'Showing' : 'Hidden'}</small>
        </div>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
