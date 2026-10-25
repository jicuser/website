import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Save } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { HUB_GROUPS, HUB_LAYOUT_KEY, HUB_TONES, moveHubCard, normaliseHubLayout, safeHubImage } from './hubLayout';
import '@/styles/community-hub.css';

/** Preferences are local drafts until an authorised staff member explicitly saves. */
export default function CommunityHubEditor() {
  const { getContent, saveContent } = useContent();
  const { can } = useAuth();
  const stored = getContent(HUB_LAYOUT_KEY, '');
  const current = useMemo(() => normaliseHubLayout(stored), [stored]);
  const currentText = JSON.stringify(current);
  const [draft, setDraft] = useState(current);
  const [baseline, setBaseline] = useState(currentText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const dirty = JSON.stringify(draft) !== baseline;
  const conflict = dirty && currentText !== baseline;
  const permitted = can('content');

  useEffect(() => {
    if (!dirty) { setDraft(current); setBaseline(currentText); }
  }, [current, currentText, dirty]);

  const save = useCallback(async () => {
    if (lock.current || !permitted) return false;
    if (conflict) { setError('Hub settings changed while you were editing. Discard your draft to reload them before saving.'); return false; }
    const invalid = HUB_GROUPS.find(({ id }) => draft.images[id] && !safeHubImage(draft.images[id]));
    if (invalid) { setError(`Use an HTTPS image address or a local /path for ${invalid.title}.`); return false; }
    lock.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      const next = normaliseHubLayout(draft);
      await saveContent(HUB_LAYOUT_KEY, JSON.stringify(next), 'text');
      setDraft(next); setBaseline(JSON.stringify(next)); setMessage('Community Hub saved.');
      return true;
    } catch (failure) {
      setError(failure.message || 'The Hub could not be saved. Your draft has been kept.');
      return false;
    } finally { lock.current = false; setBusy(false); }
  }, [permitted, conflict, draft, saveContent]);
  useRegisterAdminSave(save, permitted && dirty, 'Save Community Hub');

  function change(updater) { setMessage(''); setError(''); setDraft(updater); }
  function discard() { setDraft(current); setBaseline(currentText); setError(''); setMessage('Draft discarded.'); }
  if (!permitted) return null;
  return (
    <section className="hub-admin-editor" aria-labelledby="hub-admin-heading">
      <header className="hub-admin-heading"><div><span className="community-hub-kicker">Community experience</span><h2 id="hub-admin-heading">Community Hub builder</h2><p>Arrange the eight areas, choose colours and add optional photographs. Page visibility is managed separately below.</p></div><Link to="/services" className="hub-admin-preview">View Hub <ExternalLink size={16} aria-hidden="true" /></Link></header>
      <fieldset disabled={busy}>
        <legend className="sr-only">Community Hub layout</legend>
        <label className="hub-admin-quick-toggle"><input type="checkbox" checked={draft.quickLinks} onChange={(event) => change((value) => ({ ...value, quickLinks: event.target.checked }))} /> Show Janazah, Nikah and giving shortcuts</label>
        <div className="hub-admin-list">{draft.order.map((id, index) => {
          const group = HUB_GROUPS.find((item) => item.id === id);
          const enabled = !draft.hidden.includes(id);
          return <div key={id} className={`hub-admin-row ${enabled ? '' : 'is-hidden'}`}>
            <div className="hub-admin-row-heading"><span className={`hub-admin-colour-dot community-hub-tone-${draft.colours[id]}`} aria-hidden="true" /><strong>{group.title}</strong><div className="hub-admin-row-actions"><button type="button" disabled={index === 0} onClick={() => change((value) => moveHubCard(value, id, -1))} aria-label={`Move ${group.title} up`}><ArrowUp size={17} /></button><button type="button" disabled={index === draft.order.length - 1} onClick={() => change((value) => moveHubCard(value, id, 1))} aria-label={`Move ${group.title} down`}><ArrowDown size={17} /></button><label className="hub-admin-visible"><input type="checkbox" checked={enabled} onChange={(event) => { const checked = event.target.checked; change((value) => ({ ...value, hidden: checked ? value.hidden.filter((item) => item !== id) : [...value.hidden, id] })); }} aria-label={`Show ${group.title} in the Hub`} /><span>{enabled ? 'Shown' : 'Hidden'}</span></label></div></div>
            <details className="hub-admin-card-options"><summary>Colour & photograph</summary><div className="hub-admin-option-fields"><label>Card colour<select value={draft.colours[id]} onChange={(event) => { const colour = event.target.value; change((value) => ({ ...value, colours: { ...value.colours, [id]: colour } })); }}>{HUB_TONES.map((tone) => <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>)}</select></label><label>Image address (optional)<input type="url" value={draft.images[id]} placeholder="https://… or /image.jpg" onChange={(event) => { const image = event.target.value.trim(); change((value) => ({ ...value, images: { ...value.images, [id]: image } })); }} aria-label={`${group.title} image address`} /></label></div></details>
          </div>;
        })}</div>
      </fieldset>
      {conflict && <p className="hub-admin-error" role="alert">The saved settings have changed. Reload them before replacing this draft.</p>}
      {error && <p className="hub-admin-error" role="alert">{error}</p>}
      {message && <p className="hub-admin-status" role="status">{message}</p>}
      <footer className="hub-admin-save"><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button type="button" onClick={discard} disabled={!dirty || busy}>Discard draft</button><button type="button" className="hub-admin-save-primary" onClick={save} disabled={!dirty || busy || conflict}><Save size={17} aria-hidden="true" /> {busy ? 'Saving…' : 'Save Hub'}</button></footer>
    </section>
  );
}
