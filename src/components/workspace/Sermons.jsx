import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { downloadQuoteCard, safeQuoteSource } from '@/lib/quoteCard';
import { ActionForm, TextField, Field, checked, dateLabel } from './shared';

const fields = 'id,title,speaker,summary,transcript,quotes,audio_path,published_at';
const stamp = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
function Recording({ path }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try { const data = await checked(supabase.storage.from('sermon-recordings').createSignedUrl(path, 600)); setUrl(data.signedUrl); }
    catch { setError('Could not open recording. Please retry.'); }
  };
  return <div>{url ? <audio aria-label="Talk recording" controls preload="none" src={url} onError={() => { setUrl(''); setError('Recording link expired. Open it again.'); }} /> : <button onClick={load}>Listen to recording</button>}{error && <p role="status">{error}</p>}</div>;
}
function Talk({ talk }) {
  const [error, setError] = useState('');
  return <article className="workspace-card"><h2>{talk.title}</h2><p>{talk.speaker} · {dateLabel(talk.published_at)}</p><Recording path={talk.audio_path}/><p style={{ whiteSpace: 'pre-wrap' }}>{talk.summary}</p>
    <details><summary>Read transcript</summary>{talk.transcript.map((segment, index) => <p key={index}><strong>{stamp(segment.start)}</strong> {segment.text}</p>)}</details>
    {talk.quotes.map((quote, index) => <blockquote key={index} className="workspace-card"><p>“{quote.text}”</p><p>{quote.reference || talk.speaker} · {stamp(talk.transcript[quote.segment_index]?.start || 0)}</p>{safeQuoteSource(quote.source_url) && <a href={safeQuoteSource(quote.source_url)} target="_blank" rel="noopener noreferrer">Reference checked by the reviewer</a>}<button onClick={() => downloadQuoteCard(quote, talk).catch(() => setError('Could not create quote image.'))}>Download quote image</button></blockquote>)}{error && <p role="status">{error}</p>}
  </article>;
}
export function SermonArchive() {
  const [rows, setRows] = useState([]), [page, setPage] = useState(0), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  useEffect(() => {
    let alive = true; setBusy(true); setRows([]); setError('');
    let request = supabase.from('sermon_publications').select(fields).order('published_at', { ascending: false }).range(page * 10, page * 10 + 9);
    if (search) request = request.ilike('title', `%${search.replace(/[%_\\]/g, '\\$&')}%`);
    checked(request).then((data) => { if (alive) setRows(data || []); }).catch(() => { if (alive) setError('Talks are unavailable. Please try again shortly.'); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [page, search]);
  return <section className="workspace"><h1>Talks & reflections</h1><p>Listen again, read the summary and explore reviewed references.</p><form onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); setPage(0); }}><Field label="Search talk titles"><input value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)}/></Field><button>Search</button></form>{busy && <p role="status">Loading talks…</p>}{error && <p role="alert">{error}</p>}{!busy && !error && !rows.length && <p>No published talks yet.</p>}{rows.map((talk) => <Talk key={talk.id} talk={talk}/>)}<div className="workspace-actions"><button disabled={page === 0 || busy} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={rows.length < 10 || busy} onClick={() => setPage(page + 1)}>Next</button></div></section>;
}
function Review({ job, reload }) {
  const [transcript, setTranscript] = useState(job.draft?.transcript || []);
  const [quotes, setQuotes] = useState((job.draft?.quotes || []).map((q) => ({ ...q, include: false })));
  const change = (index, key, value) => setQuotes((old) => old.map((q, i) => i === index ? { ...q, [key]: value } : q));
  return <ActionForm title={`Review: ${job.title}`} button="Publish reviewed talk" onSubmit={async (form) => {
    await checked(supabase.rpc('publish_sermon', { p_id: job.id, p_title: form.get('title'), p_speaker: form.get('speaker'), p_summary: form.get('summary'), p_transcript: transcript, p_quotes: quotes.filter((q) => q.include).map(({ include: _include, ...quote }) => quote), p_acknowledged: form.get('reviewed') === 'on' })); await reload();
  }}><Recording path={job.audio_path}/><TextField label="Title" name="title" defaultValue={job.title}/><TextField label="Speaker" name="speaker" required={false} defaultValue={job.speaker}/><Field label="Summary"><textarea name="summary" required maxLength={10000} rows={8} defaultValue={job.draft.summary}/></Field><details><summary>Check and correct the transcript</summary>{transcript.map((segment, i) => <Field key={i} label={`${stamp(segment.start)}–${stamp(segment.end)}`}><textarea required maxLength={6000} rows={3} value={segment.text} onChange={(event) => setTranscript((old) => old.map((s, index) => index === i ? { ...s, text: event.target.value } : s))}/></Field>)}</details><h4>Optional quote cards</h4><p>Quotes stay excluded until selected. Check every Quran, hadith or other attributed quotation against a reliable source, including the numbering and translation.</p>{quotes.map((quote, i) => <div key={i} className="workspace-card"><label><input type="checkbox" checked={quote.include} onChange={(event) => change(i, 'include', event.target.checked)}/> Include this quote</label><p>{stamp(transcript[quote.segment_index]?.start || 0)}: {quote.text}</p><Field label="Attribution"><select value={quote.kind} onChange={(event) => change(i, 'kind', event.target.value)}><option value="speaker">Speaker’s own words</option><option value="quran">Quran</option><option value="hadith">Hadith</option><option value="other">Other attributed text</option></select></Field><Field label="Verified reference"><input value={quote.reference} maxLength={200} required={quote.include && quote.kind !== 'speaker'} onChange={(event) => change(i, 'reference', event.target.value)}/></Field><Field label="Verified source URL"><input type="url" value={quote.source_url} maxLength={1000} required={quote.include && quote.kind !== 'speaker'} onChange={(event) => change(i, 'source_url', event.target.value)}/></Field></div>)}<label><input name="reviewed" type="checkbox" required/> I listened to the recording, corrected the transcript and summary, verified included references and have permission to publish this talk.</label></ActionForm>;
}
export function SermonManager() {
  const [rows, setRows] = useState([]), [error, setError] = useState(''), [source, setSource] = useState('upload'), [page, setPage] = useState(0);
  const reload = useCallback(async () => {
    setError('');
    try { setRows(await checked(supabase.from('sermon_jobs').select('*').order('created_at', { ascending: false }).range(page * 15, page * 15 + 14)) || []); }
    catch { setRows([]); setError('Could not load recordings.'); }
  }, [page]);
  useEffect(() => { reload(); }, [reload]);
  const action = async (name, id) => { try { await checked(supabase.rpc(name, { p_id: id })); await reload(); } catch { setError('Could not update this recording.'); } };
  return <section><h2>Recordings & review</h2><p>Queue an authorised talk, then listen and check its draft before publishing. Processing starts when the recording worker runs.</p><ActionForm title="Add a recording" button="Queue recording" onSubmit={async (form) => {
    let path = null;
    if (source === 'upload') {
      const file = form.get('audio'), extension = file?.name?.split('.').pop().toLowerCase();
      if (!file?.size || file.size > 24 * 1024 * 1024 || !['mp3', 'm4a', 'wav', 'ogg', 'webm'].includes(extension)) throw Error('Choose MP3, M4A, WAV, OGG or WebM audio up to 24 MB.');
      const { data, error: sessionError } = await supabase.auth.getSession(); if (sessionError || !data.session) throw Error('Sign in again.');
      path = `${data.session.user.id}/${crypto.randomUUID()}.${extension}`;
      const types = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm' };
      await checked(supabase.storage.from('sermon-recordings').upload(path, file, { contentType: types[extension], upsert: false }));
    }
    await checked(supabase.rpc('queue_sermon', { p_title: form.get('title'), p_speaker: form.get('speaker'), p_source_kind: source, p_source_path: path, p_capture_seconds: Number(form.get('minutes')) * 60 })); await reload();
  }}><TextField label="Talk title" name="title"/><TextField label="Speaker" name="speaker" required={false}/><Field label="Recording source"><select value={source} onChange={(event) => setSource(event.target.value)}><option value="upload">Upload an existing recording</option><option value="radio">Capture the configured live radio</option></select></Field>{source === 'upload' ? <Field label="Audio file, up to 24 MB"><input name="audio" type="file" accept=".mp3,.m4a,.wav,.ogg,.webm" required/></Field> : <p>The server captures the live radio when this queued job starts. Keep the queue clear before an intended live talk.</p>}<TextField label={source === 'upload' ? 'Process the first how many minutes? (1–60)' : 'Capture duration in minutes (1–60)'} name="minutes" type="number" min={1} max={60} defaultValue={30}/><label><input type="checkbox" required/> I have permission to record and process this talk with the configured transcription provider.</label></ActionForm><button onClick={reload}>Refresh recordings</button>{error && <p role="alert">{error}</p>}{rows.map((job) => <article key={job.id} className="workspace-card"><h3>{job.title}</h3><p>{job.status} · {dateLabel(job.created_at)}</p>{job.last_error && <p>Processing issue: {job.last_error.replaceAll('_', ' ')}</p>}{job.status === 'failed' && <button onClick={() => action('retry_sermon', job.id)}>Retry processing</button>}{job.status === 'review' && <><Review job={job} reload={reload}/><button onClick={() => { if (window.confirm('Remove this talk from the public archive?')) action('withdraw_sermon', job.id); }}>Withdraw published talk</button></>}</article>)}<button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button disabled={rows.length < 15} onClick={() => setPage(page + 1)}>Next</button></section>;
}
