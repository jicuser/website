import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CAMPAIGN_PURPOSE, money } from './model';
import { LoadState, Notice, rpc, rows, useRecords } from './shared';
import CampaignPresentationEditor from '@/features/appeals/CampaignPresentationEditor';
const loader = (signal) => rows('community_campaigns', signal, (query) => query.order('created_at', { ascending: false }).limit(200));
const labels = { pending: 'Awaiting review', published: 'Current appeals', closed: 'Past appeals', rejected: 'Changes requested' };
export default function FundraisingManager() {
  const state = useRecords(loader);
  const [filter, setFilter] = useState('pending'), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [editorState, setEditorState] = useState({ dirty: false, busy: false });
  const mutation = useRef(false), campaigns = state.data || [];
  const visible = campaigns.filter((campaign) => campaign.status === filter), current = visible.find((campaign) => campaign.id === selected);
  const discard = () => !editorState.dirty || window.confirm('Discard your unsaved appeal display changes?');
  function choose(id) { if (!editorState.busy && discard()) { setSelected(id); setEditorState({ dirty: false, busy: false }); } }
  async function review(campaign, status) {
    if (mutation.current || editorState.busy || !discard()) return;
    const note = status === 'rejected' ? window.prompt('Explain what the organiser needs to change:') : '';
    if (status === 'rejected' && !note) return;
    if (status === 'published' && !window.confirm('Publish this appeal? Confirm the organiser, public wording and fundraising purpose are suitable for JIC.')) return;
    if (status === 'closed' && !window.confirm('Close this appeal and move it to Past appeals? Confirm final payment records separately in Finance.')) return;
    mutation.current = true; setBusy(true); setError('');
    try {
      await rpc('review_community_campaign', { p_id: campaign.id, p_status: status, p_note: note || '', p_version: campaign.version });
      setSelected(''); setEditorState({ dirty: false, busy: false }); setMessage('Campaign status saved.'); state.refresh();
    } catch (failure) { setError(failure.message); }
    finally { mutation.current = false; setBusy(false); }
  }
  return <section className="ops-admin">
    <header className="ops-heading"><div><p className="ops-eyebrow">Community support</p><h1>Fundraising</h1><p>Review appeals, choose photos and publish verified results.</p></div><div className="ops-actions"><Link className="ops-secondary" to="/fundraise/new">Create an appeal</Link><Link className="ops-secondary" to="/donate">View Donate →</Link></div></header>
    <LoadState state={state} /><Notice error={error} message={message} />
    <nav className="ops-tabs" aria-label="Campaign status">{Object.entries(labels).map(([id,label]) => <button type="button" key={id} aria-pressed={filter === id} disabled={busy || editorState.busy} onClick={() => { if (discard()) { setFilter(id); setSelected(''); setEditorState({ dirty: false, busy: false }); } }}>{label}{state.data ? ` (${campaigns.filter((campaign) => campaign.status === id).length})` : ''}</button>)}</nav>
    <p className="ops-help">Latest 200 campaigns. {CAMPAIGN_PURPOSE}</p>
    {!state.loading && !state.error && !visible.length && <p>No appeals in this section.</p>}
    {visible.length > 0 && <label className="ops-campaign-filter">Select an appeal<select value={selected} disabled={busy || editorState.busy} onChange={(event) => choose(event.target.value)}><option value="">Choose an appeal…</option>{visible.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}</select></label>}
    {current && <article className="ops-panel"><h2>{current.title}</h2><p>Organiser: {current.organiser} · {money(current.target_pence)} target</p><p className="ops-preserve">{current.story}</p>{current.review_note && <p className="ops-notice">{current.review_note}</p>}<p className="ops-help">Payment reference: {current.reference}</p>
      <div className="ops-actions">{current.status !== 'published' && <button type="button" className="ops-button" disabled={busy || editorState.busy} onClick={() => review(current,'published')}>{current.status === 'closed' ? 'Reopen appeal' : 'Approve and publish'}</button>}{current.status === 'pending' && <button type="button" className="ops-secondary" disabled={busy || editorState.busy} onClick={() => review(current,'rejected')}>Request changes</button>}{current.status === 'published' && <button type="button" className="ops-secondary" disabled={busy || editorState.busy} onClick={() => review(current,'closed')}>Close appeal</button>}{['published','closed'].includes(current.status) && <Link className="ops-secondary" to={`/fundraise/${current.slug}`}>View appeal</Link>}</div>
      <CampaignPresentationEditor key={current.id} campaign={current} onStateChange={setEditorState} />
    </article>}
  </section>;
}
