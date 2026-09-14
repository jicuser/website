import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FIELD_TYPES, validateDraft } from '@/lib/customForms';
import { checked, Field } from './shared';
import CustomFormsFields from './CustomFormsFields';
import { workflowChanged } from '@/lib/pageContent';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';

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
  schema: {
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'email', label: 'Email address', type: 'email', required: true },
      { id: 'message', label: 'How can we help?', type: 'textarea', required: true },
    ],
  },
});

export default function CustomFormsBuilder({ definition, seed, onClose, onSaved }) {
  const [draft, setDraft] = useState(() =>
    definition
      ? { ...definition, manager_ids: [], responsible_ids: [], watcher_ids: [] }
      : { ...initial(), ...seed },
  );
  const [dirty, setDirty] = useState(false);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const patch = (value) => {
    setDraft((current) => ({ ...current, ...value }));
    setDirty(true);
  };
  const setFields = (fields) => patch({ schema: { fields } });
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
    const invalid = validateDraft(draft);
    if (invalid) {
      setMessage(invalid);
      throw new Error(invalid);
    }
    if (publish && !draft.responsible_ids.length) {
      setMessage('Choose at least one responsible person before publishing.');
      throw new Error('Choose at least one responsible person before publishing.');
    }
    setBusy(true);
    setMessage('');
    try {
      const id = await checked(
        supabase.rpc('save_custom_form', {
          p_form: {
            ...(draft.id ? { id: draft.id } : {}),
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
      patch({ id });
      if (publish) {
        const version = await checked(supabase.rpc('publish_custom_form', { p_form_id: id }));
        patch({ published_version: version });
        setMessage(`Published version ${version}. The public form is ready to share.`);
      } else setMessage('Draft saved. Publish when it is ready for responses.');
      workflowChanged();
      await onSaved(id);
      setDirty(false);
    } catch (error) {
      setMessage(error.message || 'The form could not be saved. Please try again.');
      throw error;
    } finally {
      setBusy(false);
    }
  }

  useRegisterAdminSave(() => save(false), dirty && !busy, 'Save form draft');
  useEffect(() => {
    const guard = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  return (
    <section className="workspace-card custom-form-editor">
      <div className="workspace-header">
        <h2>{draft.id ? 'Edit form' : 'Create form'}</h2>
        <button
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm('Discard unsaved form changes?')) onClose();
          }}
        >
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
        <div className="workspace-grid">
          <Field label="Form title">
            <input
              value={draft.title}
              maxLength={160}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          <Field label="Form address">
            <input
              value={draft.slug}
              maxLength={80}
              placeholder="volunteer-registration"
              onChange={(event) =>
                patch({ slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })
              }
            />
          </Field>
        </div>
        <Field label="Introduction">
          <textarea
            rows={3}
            value={draft.description}
            maxLength={4000}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <p className="workspace-meta">Address: /forms/{draft.slug || 'your-form-address'}</p>
        <label className="custom-form-check workspace-field">
          <span>Accept responses when published</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
        </label>
        <h3>Questions</h3>
        {draft.schema.fields.map((field, index) => (
          <FieldEditor
            key={`${index}-${field.type}`}
            field={field}
            index={index}
            fields={draft.schema.fields}
            onChange={(next) =>
              setFields(
                draft.schema.fields.map((item, position) => (position === index ? next : item)),
              )
            }
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
        <button
          disabled={draft.schema.fields.length >= 40}
          onClick={() => {
            let number = draft.schema.fields.length + 1;
            while (draft.schema.fields.some((field) => field.id === `field_${number}`)) number++;
            setFields([
              ...draft.schema.fields,
              { id: `field_${number}`, label: '', type: 'text', required: false },
            ]);
          }}
        >
          Add question
        </button>
        <h3>People and actions</h3>
        <p>
          Responsible people receive a task for each response. Watchers receive an alert. Managers
          can edit this form.
        </p>
        <div className="workspace-grid">
          {[
            ['responsible', 'Responsible people'],
            ['watcher', 'Notify these people'],
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
        <div className="workspace-actions">
          <button onClick={() => setPreview(!preview)}>
            {preview ? 'Close preview' : 'Preview questions'}
          </button>
          <button onClick={() => save(false).catch(() => {})}>Save draft</button>
          <button onClick={() => save(true).catch(() => {})}>Save and publish</button>
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

function FieldEditor({ field, fields, index, onChange, onRemove, onMove }) {
  const patch = (value) => onChange({ ...field, ...value });
  const previous = fields
    .slice(0, index)
    .filter(
      (candidate) =>
        !candidate.show_when && !['image', 'file', 'multiselect'].includes(candidate.type),
    );
  const parent = previous.find((candidate) => candidate.id === field.show_when?.field);
  return (
    <fieldset className="custom-form-field">
      <legend>Question {index + 1}</legend>
      <div className="workspace-grid">
        <Field label="Label">
          <input
            value={field.label}
            maxLength={160}
            onChange={(event) => patch({ label: event.target.value })}
          />
        </Field>
        <Field label="Answer type">
          <select
            value={field.type}
            onChange={(event) => {
              const next = { ...field, type: event.target.value };
              if (['select', 'multiselect'].includes(next.type))
                next.options = field.options || ['Yes', 'No'];
              else delete next.options;
              onChange(next);
            }}
          >
            {FIELD_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Field key">
        <input
          value={field.id}
          maxLength={40}
          onChange={(event) => patch({ id: event.target.value })}
        />
      </Field>
      <label className="custom-form-check workspace-field">
        <span>Required answer</span>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(event) => patch({ required: event.target.checked })}
        />
      </label>
      {['select', 'multiselect'].includes(field.type) && (
        <Field label="Choices (one per line)">
          <textarea
            rows={4}
            value={(field.options || []).join('\n')}
            onChange={(event) => patch({ options: event.target.value.split('\n') })}
          />
        </Field>
      )}
      <Field label="Show question">
        <select
          value={field.show_when?.field || ''}
          onChange={(event) => {
            if (!event.target.value) {
              const next = { ...field };
              delete next.show_when;
              onChange(next);
            } else {
              const chosen = previous.find((candidate) => candidate.id === event.target.value);
              patch({
                show_when: {
                  field: event.target.value,
                  operator: 'equals',
                  value:
                    chosen.type === 'checkbox'
                      ? true
                      : chosen.type === 'number'
                        ? 0
                        : chosen.options?.[0] || '',
                },
              });
            }
          }}
        >
          <option value="">Always</option>
          {previous.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              Depending on: {candidate.label || candidate.id}
            </option>
          ))}
        </select>
      </Field>
      {field.show_when && (
        <div className="workspace-grid">
          <Field label="Condition">
            <select
              value={field.show_when.operator}
              onChange={(event) =>
                patch({ show_when: { ...field.show_when, operator: event.target.value } })
              }
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Does not equal</option>
            </select>
          </Field>
          <Field label="Answer to match">
            {parent?.type === 'checkbox' ? (
              <select
                value={String(field.show_when.value)}
                onChange={(event) =>
                  patch({ show_when: { ...field.show_when, value: event.target.value === 'true' } })
                }
              >
                <option value="true">Confirmed</option>
                <option value="false">Not confirmed</option>
              </select>
            ) : (
              <input
                type={parent?.type === 'number' ? 'number' : 'text'}
                value={field.show_when.value}
                onChange={(event) =>
                  patch({
                    show_when: {
                      ...field.show_when,
                      value:
                        parent?.type === 'number' ? Number(event.target.value) : event.target.value,
                    },
                  })
                }
              />
            )}
          </Field>
        </div>
      )}
      <div className="workspace-actions">
        <button onClick={() => onMove(-1)} disabled={index === 0}>
          Move up
        </button>
        <button onClick={() => onMove(1)} disabled={index === fields.length - 1}>
          Move down
        </button>
        <button onClick={onRemove} disabled={fields.length === 1}>
          Remove question
        </button>
      </div>
    </fieldset>
  );
}
