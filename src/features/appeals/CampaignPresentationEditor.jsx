import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { createImageUploader } from '@/lib/imageUpload';
import { IMAGE_ACCEPT } from '@/lib/images';
import { validatePresentation, safeImageUrl } from './model';
import './appeals.css';
const empty = { cover_image: '', image_alt: '', outcome: '', completed_on: '', featured: false };
export default function CampaignPresentationEditor({ campaign, onStateChange }) {
  const auth = useAuth();
  const [draft, setDraft] = useState(empty), [baseline, setBaseline] = useState(empty);
  const [version, setVersion] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [revision, setRevision] = useState(0);
  const mutation = useRef(false), dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => { onStateChange?.({ dirty, busy }); }, [dirty, busy, onStateChange]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setLoadError(''); setError('');
    supabase.from('campaign_presentations').select('*').eq('campaign_id', campaign.id).maybeSingle().abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error) { setLoadError('Appeal display settings are unavailable. The campaign presentation migration may not be active.'); return; }
        const value = Object.fromEntries(Object.keys(empty).map((key) => [key, data?.[key] ?? empty[key]]));
        setDraft(value); setBaseline(value); setVersion(data?.version || 0);
      }).catch(() => { if (!controller.signal.aborted) setLoadError('Appeal display settings could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campaign.id, revision]);
  async function save() {
    if (mutation.current || loading || loadError) return false;
    mutation.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const clean = validatePresentation(draft);
      const { data, error } = await supabase.rpc('save_campaign_presentation', { p_id: campaign.id, p_body: clean, p_version: version });
      if (error) throw error;
      const value = { ...clean, completed_on: clean.completed_on || '' };
      setVersion(data.version); setDraft(value); setBaseline(value); setMessage('Appeal display saved. Confirmed donation totals are unchanged.'); return true;
    } catch (failure) { setError(failure.message || 'Save failed. Your draft is still here.'); return false; }
    finally { mutation.current = false; setBusy(false); }
  }
  useRegisterAdminSave(save, dirty, 'Save appeal display', busy || loading);
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || mutation.current) return;
    mutation.current = true; setBusy(true); setError('');
    try { const url = await createImageUploader(supabase)(file, 'appeals'); setDraft((value) => ({ ...value, cover_image: url })); setMessage('Image uploaded. Add its description, then Save appeal display.'); }
    catch (failure) { setError(failure.message || 'Upload failed. You can also use an existing secure image URL.'); }
    finally { mutation.current = false; setBusy(false); }
  }
  const change = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));
  return <section className="jic-appeal-editor" aria-label={`Display settings for ${campaign.title}`}>
    <h3>Photo & results</h3><p className="jic-appeal-note">These fields control the Donate page. Use Finance to record received payments; display editing never changes money raised.</p>
    {loading && <p role="status">Loading display settings…</p>}
    {loadError && <p role="alert">{loadError} <button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></p>}
    {!loading && !loadError && <fieldset disabled={busy}>
      <label>Cover photo URL<input type="url" value={draft.cover_image} onChange={(event) => change('cover_image', event.target.value)} placeholder="https://…" /></label>
      {auth.can('media') ? <label>Or upload a photo<input type="file" accept={IMAGE_ACCEPT} onChange={upload} /></label> : <p className="jic-appeal-note">Use an existing photo URL, or ask a staff member with Media access to upload a photo.</p>}
      <label>Photo description<input maxLength={240} value={draft.image_alt} onChange={(event) => change('image_alt', event.target.value)} /></label>
      {safeImageUrl(draft.cover_image) && <img className="jic-appeal-editor-preview" src={safeImageUrl(draft.cover_image)} alt={draft.image_alt || 'Cover photo preview'} />}
      <label>What this appeal achieved<textarea rows={3} maxLength={2000} value={draft.outcome} onChange={(event) => change('outcome', event.target.value)} placeholder="Add verified outcomes, not a fundraising estimate." /></label>
      <label>Completion date<input type="date" value={draft.completed_on} onChange={(event) => change('completed_on', event.target.value)} /></label>
      <label className="jic-appeal-check"><input type="checkbox" checked={draft.featured} onChange={(event) => change('featured', event.target.checked)} />Show this current appeal first</label>
      <div className="ops-actions"><button type="button" className="ops-button" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save appeal display'}</button><button type="button" className="ops-secondary" disabled={!dirty || busy} onClick={() => { setDraft(baseline); setError(''); setMessage('Changes undone.'); }}>Undo changes</button></div>
      {campaign.status !== 'closed' && <p className="jic-appeal-note">To move this appeal into Past achievements, close it using the campaign controls after confirming its final records.</p>}
    </fieldset>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
