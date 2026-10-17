import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { createImageUploader } from '@/lib/imageUpload';
import { IMAGE_ACCEPT } from '@/lib/images';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { Field, LoadState, Notice, useRecords } from '@/features/operations/shared';
import { DEFAULT_STAGES, PROJECT_KEY, STAGE_STATUS, parseStages, validateStages } from './model';
import '@/styles/projects.css';
const loader = async (signal) => {
  const { data, error } = await supabase
    .from('page_content')
    .select('content_value')
    .eq('content_key', PROJECT_KEY)
    .maybeSingle()
    .abortSignal(signal);
  if (error) throw error;
  return { raw: data?.content_value ?? null };
};
export default function ProjectEditor() {
  const state = useRecords(loader);
  return (
    <section className="ops-admin">
      <header className="ops-heading">
        <div>
          <p className="ops-eyebrow">Our masjid project</p>
          <h1>Project timeline</h1>
          <p>Add stages, arrange their order and tell the story through photos.</p>
        </div>
        <Link to="/projects" className="ops-secondary">
          View project →
        </Link>
      </header>
      <LoadState state={state} />
      {state.data && !state.error && (
        <StageEditor key={state.data.raw || 'new'} raw={state.data.raw} onSaved={state.refresh} />
      )}
    </section>
  );
}
function StageEditor({ raw, onSaved }) {
  const [stages, setStages] = useState(() =>
    raw ? parseStages(raw) : structuredClone(DEFAULT_STAGES),
  );
  const [active, setActive] = useState(stages[0]?.id || '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const formRef = useRef();
  const baseline = useRef(JSON.stringify(stages));
  const current = stages.find((s) => s.id === active);
  const change = (key, value) =>
    setStages((all) => all.map((s) => (s.id === active ? { ...s, [key]: value } : s)));
  async function save() {
    if (!formRef.current.reportValidity()) return false;
    setBusy(true);
    setError('');
    try {
      const clean = validateStages(stages);
      const value = JSON.stringify(clean);
      const row = {
        content_key: PROJECT_KEY,
        content_value: value,
        content_type: 'json',
        page: 'projects',
      };
      let query =
        raw === null
          ? supabase.from('page_content').insert(row)
          : supabase
              .from('page_content')
              .update(row)
              .eq('content_key', PROJECT_KEY)
              .eq('content_value', raw);
      const { data, error } = await query.select('content_key');
      if (error) throw error;
      if (data?.length !== 1)
        throw new Error('The timeline changed in another window. Reload before saving.');
      baseline.current = JSON.stringify(clean);
      setStages(clean);
      setMessage('Project timeline saved.');
      window.dispatchEvent(new Event('jic-content-updated'));
      onSaved();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useRegisterAdminSave(
    save,
    JSON.stringify(stages) !== baseline.current,
    'Save project timeline',
    busy,
  );
  async function upload(event) {
    const files = Array.from(event.target.files || []);
    const stageId = active;
    event.target.value = '';
    if (!files.length) return;
    if (current.photos.length + files.length > 12) {
      setError('Use up to 12 photos per stage.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const photos = [];
      for (const file of files) {
        const url = await createImageUploader(supabase)(file, 'projects');
        photos.push({ url, caption: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') });
      }
      setStages((all) =>
        all.map((s) => (s.id === stageId ? { ...s, photos: [...s.photos, ...photos] } : s)),
      );
      setMessage('Photos uploaded. Add captions, then save the timeline.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function move(index, direction) {
    const next = [...stages];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setStages(next);
  }
  return (
    <form
      ref={formRef}
      className="ops-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Notice error={error} message={message} />
      <fieldset disabled={busy}>
        <div className="ops-finance-layout">
          <aside className="ops-panel">
            <h2>Stages</h2>
            <div className="project-editor-stages">
              {stages.map((s, i) => (
                <div key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active === s.id}
                    onClick={() => setActive(s.id)}
                  >
                    <b>{i + 1}</b> {s.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${s.title} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${s.title} later`}
                    disabled={i === stages.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="ops-secondary"
              disabled={stages.length >= 30}
              onClick={() => {
                const stage = {
                  id: crypto.randomUUID(),
                  title: 'New stage',
                  description: '',
                  status: 'planned',
                  started_on: '',
                  completed_on: '',
                  photos: [],
                  polycam: '',
                  visible: false,
                };
                setStages([...stages, stage]);
                setActive(stage.id);
              }}
            >
              <Plus size={16} /> Add stage
            </button>
            <p className="ops-help">
              New stages start hidden from the timeline. Content saved here is public website
              content; do not add private notes.
            </p>
          </aside>
          {current && (
            <section className="ops-panel">
              <div className="ops-heading">
                <h2>{current.title}</h2>
                <label className="ops-check">
                  <input
                    type="checkbox"
                    checked={current.visible}
                    onChange={(e) => change('visible', e.target.checked)}
                  />
                  Show on website
                </label>
              </div>
              <Field label="Stage title">
                <input
                  required
                  maxLength={100}
                  value={current.title}
                  onChange={(e) => change('title', e.target.value)}
                />
              </Field>
              <Field label="What happened at this stage?">
                <textarea
                  maxLength={4000}
                  rows={5}
                  value={current.description}
                  onChange={(e) => change('description', e.target.value)}
                />
              </Field>
              <div className="ops-form-grid">
                <Field label="Status">
                  <select value={current.status} onChange={(e) => change('status', e.target.value)}>
                    {STAGE_STATUS.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Started (optional)">
                  <input
                    type="date"
                    value={current.started_on}
                    onChange={(e) => change('started_on', e.target.value)}
                  />
                </Field>
                <Field label="Completed (optional)">
                  <input
                    type="date"
                    min={current.started_on || undefined}
                    value={current.completed_on}
                    onChange={(e) => change('completed_on', e.target.value)}
                  />
                </Field>
              </div>
              <h3>Photos</h3>
              <Field
                label="Upload stage photos"
                hint="JPG, PNG or WebP. Choose up to 12 per stage."
              >
                <input type="file" accept={IMAGE_ACCEPT} multiple onChange={upload} />
              </Field>
              <div className="project-editor-photos">
                {current.photos.map((p, i) => (
                  <div key={`${p.url}-${i}`}>
                    <img src={p.url} alt={p.caption} />
                    <Field label={`Photo ${i + 1} caption`}>
                      <input
                        required
                        maxLength={240}
                        value={p.caption}
                        onChange={(e) =>
                          change(
                            'photos',
                            current.photos.map((photo, index) =>
                              index === i ? { ...photo, caption: e.target.value } : photo,
                            ),
                          )
                        }
                      />
                    </Field>
                    <button
                      className="ops-secondary"
                      type="button"
                      onClick={() =>
                        change(
                          'photos',
                          current.photos.filter((_, index) => index !== i),
                        )
                      }
                    >
                      Remove from stage
                    </button>
                  </div>
                ))}
              </div>
              {!current.photos.length && (
                <p className="ops-help">
                  <Camera size={16} /> Upload before, during and after photos to show the journey.
                </p>
              )}
              <Field
                label="Polycam public capture link or embed code"
                hint="Copy it from Polycam’s Share menu. The walkthrough appears when this stage is marked completed."
              >
                <textarea
                  rows={2}
                  value={current.polycam}
                  onChange={(e) => change('polycam', e.target.value)}
                  placeholder="https://poly.cam/capture/…/embed"
                />
              </Field>
              <div className="ops-actions">
                <button className="ops-button" disabled={busy}>
                  {busy ? 'Saving…' : 'Save timeline'}
                </button>
                <button
                  type="button"
                  className="ops-secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Remove this stage from the timeline? Uploaded photos will remain in media storage.',
                      )
                    ) {
                      const next = stages.filter((s) => s.id !== active);
                      setStages(next);
                      setActive(next[0]?.id || '');
                    }
                  }}
                >
                  Remove stage
                </button>
              </div>
            </section>
          )}
        </div>
        {!current && (
          <button className="ops-button" disabled={busy}>
            Save timeline
          </button>
        )}
      </fieldset>
    </form>
  );
}
