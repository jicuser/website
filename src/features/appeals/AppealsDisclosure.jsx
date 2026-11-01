import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { money } from '@/features/operations/model';
import { campaignProgress, groupAppeals, safeImageUrl } from './model';
import './appeals.css';
function AppealList({ mode }) {
  const [state, setState] = useState({ loading: true, rows: [], error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState({ loading: true, rows: [], error: '' });
    supabase.rpc('public_community_campaigns').abortSignal(controller.signal).then(({ data, error }) => {
      if (!controller.signal.aborted) setState({ loading: false, rows: error ? [] : data || [], error: error ? 'Appeals could not be loaded.' : '' });
    }).catch(() => { if (!controller.signal.aborted) setState({ loading: false, rows: [], error: 'Appeals could not be loaded.' }); });
    return () => controller.abort();
  }, [revision]);
  const campaigns = groupAppeals(state.rows)[mode];
  if (state.loading) return <p role="status">Loading appeals…</p>;
  if (state.error) return <p role="alert">{state.error} <button type="button" onClick={() => setRevision((value) => value + 1)}>Try again</button></p>;
  if (!campaigns.length) return <p>{mode === 'current' ? 'No current appeals are published. You can still give directly to JIC below.' : 'Completed appeal results will appear here once the centre publishes them.'}</p>;
  return <><div className="jic-appeal-grid">{campaigns.map((campaign) => {
    const image = safeImageUrl(campaign.cover_image), progress = campaignProgress(campaign);
    return <article className="jic-appeal-card" key={campaign.id}>
      {image ? <img src={image} alt={campaign.image_alt || campaign.title} loading="lazy" decoding="async" width="480" height="270" /> : <div className="jic-appeal-placeholder"><Heart size={26} aria-hidden="true" /><span>{mode === 'past' ? 'Past appeal' : 'Support our community'}</span></div>}
      <div className="jic-appeal-copy"><h3>{campaign.title}</h3><p>{String(campaign.story || '').slice(0,150)}{String(campaign.story || '').length > 150 ? '…' : ''}</p>
        {progress !== null ? <><div className="jic-appeal-totals"><strong>{money(campaign.raised_pence)} raised</strong><span>{money(campaign.target_pence)} target</span></div><progress value={progress} max={100} aria-label={`${campaign.title}: confirmed donations toward target`} /></> : <p>Confirmed totals are not available.</p>}
        {mode === 'past' && campaign.outcome && <p className="jic-appeal-outcome">{campaign.outcome}</p>}
        {mode === 'past' && campaign.completed_on && <small>Completed <time dateTime={campaign.completed_on}>{new Date(`${campaign.completed_on}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</time></small>}
        <Link to={`/fundraise/${encodeURIComponent(campaign.slug)}`}>{mode === 'past' ? 'View appeal results' : 'View & support appeal'} <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>;
  })}</div><p className="jic-appeal-note">Only confirmed payments are included. No donor details are displayed.</p></>;
}
export default function AppealsDisclosure() {
  const [open, setOpen] = useState(false), [mode, setMode] = useState('current');
  const id = useId();
  return <section className="jic-appeals" aria-label="JIC fundraising appeals">
    <button type="button" className="jic-appeals-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}><span><Heart size={19} aria-hidden="true" /><strong>Current appeals & past achievements</strong></span><ChevronDown size={20} className={open ? 'is-open' : ''} aria-hidden="true" /></button>
    <div id={id} hidden={!open}>{open && <div className="jic-appeals-content"><div className="jic-appeals-tabs" aria-label="Choose appeals"><button type="button" aria-pressed={mode === 'current'} onClick={() => setMode('current')}>Current appeals</button><button type="button" aria-pressed={mode === 'past'} onClick={() => setMode('past')}>Past achievements</button></div><AppealList mode={mode} /></div>}</div>
  </section>;
}
