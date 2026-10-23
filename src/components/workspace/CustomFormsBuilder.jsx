import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { validateDraft } from '@/lib/customForms';
import {
  QUESTION_PRESETS,
  formAddress,
  newQuestion,
  starterQuestions,
  updateQuestion,
} from '@/lib/formBuilder';
import CustomFormQuestion from './CustomFormQuestion';
import { checked, Field } from './shared';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { workflowChanged } from '@/lib/pageContent';
import CustomFormsFields from './CustomFormsFields';

const initial = () => ({
  title: '',
  slug: '',
  description: '',
  enabled: true,
  task_title: 'Reply to form response',
  due_hours: 48,
  manager_ids: [],
  responsible_ids: [],
  watcher_ids: [],
  schema: { fields: starterQuestions('enquiry') },
});

export default function CustomFormsBuilder({
  definition,
  initialDraft = {},
  onClose,
  onSaved,
  registerBack,
}) {
  const [draft, setDraft] = useState(() =>
    definition
      ? { ...definition, manager_ids: [], responsible_ids: [], watcher_ids: [] }
      : { ...initial(), ...initialDraft },
  );
  const [people, setPeople] = useState([]);
  const [addressTouched, setAddressTouched] = useState(Boolean(definition || initialDraft.slug));
  const [template, setTemplate] = useState('enquiry');
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(Boolean(initialDraft.title));
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const patch = (value) => {
    setDirty(true);
    setDraft((current) => ({ ...current, ...value }));
  };
  const close = useCallback(() => {
    if (!busy && (!dirty || window.confirm('Discard unsaved form changes?'))) onClose();
  }, [busy, dirty, onClose]);
  useEffect(() => {
    if (!registerBack) return undefined;
    registerBack(close);
    return () => registerBack(null);
  }, [registerBack, close]);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const setFields = (fields) => patch({ schema: { ...draft.schema, fields } });
  useEffect(() => {
    let active = true;
    Promise.all([
      checked(supabase.rpc('custom_form_members', { p_form_id: definition?.id || null })),
      definition?.id
        ? checked(
            supabase.from('custom_form_staff').select('user_id,role').eq('form_id', definition.id),
          )
        : [],
    ])
      .then(([members, assignments]) => {
        if (!active) return;
        setPeople(members || []);
        if (definition)
          setDraft((current) => ({
            ...current,
            ...Object.fromEntries(
              ['manager', 'responsible', 'watcher'].map((role) => [
                `${role}_ids`,
                assignments.filter((row) => row.role === role).map((row) => row.user_id),
              ]),
            ),
          }));
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setMessage('Form assignments could not be loaded. Close this editor and try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [definition]);

  async function save(publish) {
    if (inFlight.current || busy || loading || loadFailed)
      throw new Error('Wait for the form and assignments to finish loading.');
    const invalid = validateDraft(draft);
    if (invalid) {
      setMessage(invalid);
      throw new Error(invalid);
    }
    if (publish && !draft.responsible_ids.length) {
      setMessage('Choose at least one responsible person before publishing.');
      throw new Error('Choose at least one responsible person before publishing.');
    }
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const id = await checked(
        supabase.rpc('save_custom_form', {
          p_form: {
            ...(draft.id ? { id: draft.id, expected_updated_at: draft.updated_at } : {}),
            slug: draft.slug,
            title: draft.title.trim(),
            description: draft.description.trim(),
            schema: draft.schema,
            enabled: draft.enabled,
            task_title: draft.task_title.trim(),
            due_hours: Number(draft.due_hours),
            manager_ids: draft.manager_ids,
            responsible_ids: draft.responsible_ids,
            watcher_ids: draft.watcher_ids,
          },
        }),
      );
      setDraft((current) => ({ ...current, id }));
      const stored = await checked(supabase.from('custom_forms').select('*').eq('id', id).single());
      setDraft((current) => ({ ...current, ...stored }));
      setDirty(false);
      if (publish) {
        const version = await checked(
          supabase.rpc('publish_custom_form', {
            p_form_id: id,
            p_expected_updated_at: stored.updated_at,
          }),
        );
        patch({ published_version: version });
        setMessage(`Published version ${version}. The public form is ready to share.`);
      } else setMessage('Draft saved. Publish when it is ready for responses.');
      const saved = await checked(supabase.from('custom_forms').select('*').eq('id', id).single());
      setDraft((current) => ({ ...current, ...saved }));
      setDirty(false);
      workflowChanged();
      await onSaved(saved);
    } catch (error) {
      setMessage(error.message || 'The form could not be saved. Please try again.');
      throw error;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useRegisterAdminSave(() => save(false), dirty && !busy && !loading, 'Save form draft');
  return (
    <section className="workspace-card custom-form-editor">
      <div className="workspace-header">
        <div>
          <span className="content-status">
            {draft.published_version ? (draft.enabled ? 'Live form' : 'Responses closed') : 'Draft'}
          </span>
          <h2>{draft.id ? 'Edit form' : 'Create form'}</h2>
          {draft.published_version && (
            <p className="workspace-meta">
              Your published questions stay unchanged until you publish again.
            </p>
          )}
        </div>
        <button disabled={busy} onClick={close}>
          Close editor
        </button>
      </div>
      {loading && <p role="status">Loading available people…</p>}
      {message && (
        <p role="status" className="custom-form-notice">
          {message}
        </p>
      )}
      <fieldset disabled={busy || loading || loadFailed}>
        {!draft.id && (
          <section className="custom-form-starters" aria-label="Form templates">
            <h3>Start with a template</h3>
            <div className="custom-form-quick-add">
              {[
                ['enquiry', 'Enquiry'],
                ['registration', 'Registration'],
                ['blank', 'Start blank'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={template === id}
                  onClick={() => {
                    setTemplate(id);
                    setFields(starterQuestions(id));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}
        <h3>About your form</h3>
        <Field label="Form title">
          <input
            value={draft.title}
            maxLength={160}
            onChange={(event) =>
              patch({
                title: event.target.value,
                ...(!addressTouched ? { slug: formAddress(event.target.value) } : {}),
              })
            }
          />
        </Field>
        <Field label="Introduction">
          <textarea
            rows={3}
            value={draft.description}
            maxLength={4000}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <details className="custom-form-advanced">
          <summary>Form address & availability</summary>
          <Field label="Form address">
            <input
              value={draft.slug}
              readOnly={Boolean(draft.published_version)}
              maxLength={80}
              placeholder="volunteer-registration"
              onChange={(event) => {
                setAddressTouched(true);
                patch({ slug: event.target.value.toLowerCase().replace(/\s+/g, '-') });
              }}
            />
          </Field>
          <p className="workspace-meta">
            /forms/{draft.slug || 'your-form-address'}
            {draft.published_version ? ' · Published addresses stay the same.' : ''}
          </p>
          <label className="custom-form-check workspace-field">
            <span>Accept responses when published</span>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => patch({ enabled: event.target.checked })}
            />
          </label>
        </details>

        <h3>Questions</h3>
        {draft.schema.fields.map((field, index) => (
          <CustomFormQuestion
            key={field.id}
            field={field}
            index={index}
            fields={draft.schema.fields}
            onChange={(next) => setFields(updateQuestion(draft.schema.fields, index, next))}
            onRemove={() =>
              setFields(draft.schema.fields.filter((_, position) => position !== index))
            }
            onMove={(direction) => {
              const next = [...draft.schema.fields];
              [next[index], next[index + direction]] = [next[index + direction], next[index]];
              setFields(next);
            }}
          />
        ))}
        <div className="custom-form-quick-add" role="group" aria-label="Add a question">
          {QUESTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={draft.schema.fields.length >= 40}
              onClick={() =>
                setFields([...draft.schema.fields, newQuestion(draft.schema.fields, preset.id)])
              }
            >
              + {preset.name}
            </button>
          ))}
          <button
            type="button"
            disabled={draft.schema.fields.length >= 40}
            onClick={() => setFields([...draft.schema.fields, newQuestion(draft.schema.fields)])}
          >
            Add question
          </button>
        </div>
        <section className="custom-form-routing">
          <div>
            <h3>Who handles responses?</h3>
            <p className="workspace-meta">
              These people receive the automatic action when somebody submits this form.
            </p>
          </div>
          <div className="custom-form-members custom-form-members-primary">
            {people.length === 0 && <p>No eligible accounts available.</p>}
            {people.map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  checked={draft.responsible_ids.includes(person.id)}
                  onChange={(event) =>
                    patch({
                      responsible_ids: event.target.checked
                        ? [...draft.responsible_ids, person.id]
                        : draft.responsible_ids.filter((id) => id !== person.id),
                    })
                  }
                />
                {person.display_name || 'Unnamed account'}
              </label>
            ))}
          </div>
        </section>

        <details className="custom-form-advanced">
          <summary>Access & automatic action</summary>
          <p className="workspace-meta">
            Following staff can see new responses. Form managers can edit this form.
          </p>
          <div className="workspace-grid">
            {[
              ['watcher', 'Following staff'],
              ['manager', 'Form managers'],
            ].map(([role, label]) => (
              <fieldset className="custom-form-field" key={role}>
                <legend>{label}</legend>
                <div className="custom-form-members">
                  {people.length === 0 && <p>No eligible accounts available.</p>}
                  {people.map((person) => (
                    <label key={person.id}>
                      <input
                        type="checkbox"
                        checked={draft[`${role}_ids`].includes(person.id)}
                        onChange={(event) =>
                          patch({
                            [`${role}_ids`]: event.target.checked
                              ? [...draft[`${role}_ids`], person.id]
                              : draft[`${role}_ids`].filter((id) => id !== person.id),
                          })
                        }
                      />
                      {person.display_name || 'Unnamed account'}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="workspace-grid">
            <Field label="Automatic action">
              <input
                value={draft.task_title}
                maxLength={160}
                list="custom-actions"
                onChange={(event) => patch({ task_title: event.target.value })}
              />
            </Field>
            <Field label="Due within (hours)">
              <input
                type="number"
                min={1}
                max={8760}
                value={draft.due_hours}
                onChange={(event) => patch({ due_hours: event.target.value })}
              />
            </Field>
          </div>
          <datalist id="custom-actions">
            {[
              'Reply to enquiry',
              'Call back',
              'Chase payment',
              'Confirm payment',
              'Request a photograph',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </datalist>
        </details>
        <div className="workspace-actions">
          <button onClick={() => setPreview(!preview)}>
            {preview ? 'Close preview' : 'Preview questions'}
          </button>
          <button onClick={() => save(false).catch(() => {})}>Save draft</button>
          <button className="custom-form-publish" onClick={() => save(true).catch(() => {})}>
            {busy ? 'Saving…' : draft.published_version ? 'Publish changes' : 'Save and publish'}
          </button>
        </div>
        {draft.published_version && (
          <p className="workspace-meta">
            Published version {draft.published_version}. Saving a draft preserves the published
            questions until you publish again. Turning responses off takes effect when saved.
          </p>
        )}
      </fieldset>
      {preview && (
        <div className="workspace-card workspace-form">
          <h3>Question preview</h3>
          <h4>{draft.title || 'Your form'}</h4>
          <p>{draft.description}</p>
          <fieldset>
            <CustomFormsFields
              fields={draft.schema.fields}
              answers={previewAnswers}
              onChange={(id, value) =>
                setPreviewAnswers((current) => ({ ...current, [id]: value }))
              }
              preview
            />
          </fieldset>
          <p className="workspace-meta">
            Use the choices above to check conditional questions. Preview does not send a response.
          </p>
        </div>
      )}
    </section>
  );
}
