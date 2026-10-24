import React, { useCallback, useEffect, useRef, useState, useId } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';
import { navigationName } from '@/lib/navigationConfiguration';
import { PAGE_PLACEMENTS, pageProblem, pageSlug, workflowChanged } from '@/lib/pageContent';
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
  const auth = useAuth();
  const { getContent } = useContent();
  const canAddPage = auth.isOwner || auth.can('content');
  const [draft, setDraft] = useState(() =>
    definition
      ? { ...definition, manager_ids: [], responsible_ids: [], watcher_ids: [] }
      : { ...initial(), ...initialDraft },
  );
  const [people, setPeople] = useState([]);
  const [pages, setPages] = useState([]);
  const [pageError, setPageError] = useState('');
  const [destination, setDestination] = useState('direct');
  const [pageTitle, setPageTitle] = useState('');
  const [pagePlacement, setPagePlacement] = useState('/education');
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const questionGroup = useId();
  const [savedPage, setSavedPage] = useState(null);
  const [publishLinkedPage, setPublishLinkedPage] = useState(false);
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
    if (!canAddPage) return undefined;
    const controller = new AbortController();
    let query = supabase.from('site_pages').select('*').order('title').limit(500);
    if (definition?.id) query = query.eq('form_id', definition.id);
    checked(query.abortSignal(controller.signal))
      .then((result) => {
        if (!controller.signal.aborted) {
          setPages(result || []);
          if (definition?.id) setSelectedPage(result?.find((item) => !item.published)?.id || '');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setPageError('Pages could not be loaded. A direct form link is still available.');
      });
    return () => controller.abort();
  }, [definition?.id, canAddPage]);
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
    let page = null;
    if (destination === 'new') {
      page = {
        ...(savedPage || {}),
        slug: savedPage?.slug || pageSlug(pageTitle || draft.title),
        title: (pageTitle || draft.title).trim(),
        body: savedPage?.body || draft.description.trim(),
        placement: pagePlacement,
        kind: 'page',
        registration: 'interest',
        published: publish || Boolean(savedPage?.published),
        ...(savedPage ? { expected_updated_at: savedPage.updated_at } : {}),
      };
    } else if (destination === 'existing') {
      const chosen = savedPage || pages.find((item) => item.id === selectedPage);
      if (!chosen) {
        setMessage('Choose the page that will open this form.');
        throw new Error('Choose an existing page.');
      }
      page = { ...chosen, expected_updated_at: chosen.updated_at, registration: 'interest' };
    }
    if (definition?.id && publish && publishLinkedPage) {
      const linked = pages.find((item) => item.id === selectedPage && item.form_id === draft.id);
      if (!linked) {
        setMessage('Choose the linked draft page to publish.');
        throw new Error('Choose a linked draft page.');
      }
      page = { ...linked, expected_updated_at: linked.updated_at, published: true };
    }
    const pageInvalid = page && pageProblem(page);
    if (pageInvalid) {
      setMessage(pageInvalid);
      throw new Error(pageInvalid);
    }
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await checked(
        supabase.rpc('save_form_workflow', {
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
          p_publish: publish,
          p_page: page,
        }),
      );
      const saved = result.form;
      if (!saved?.id) throw new Error('The form save could not be confirmed. Please try again.');
      if (result.page) setSavedPage(result.page);
      setMessage(
        publish
          ? `Published version ${saved.published_version}.${result.page?.published ? ' The linked page is live.' : ' The form is ready to share.'}`
          : `Draft saved.${result.page ? ' The page association was saved too.' : ''} Publish when it is ready for responses.`,
      );
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

  useRegisterAdminSave(() => save(false), dirty && !busy && !loading, 'Save form draft', busy);
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
      <nav className="custom-form-view-toggle" aria-label="Form editor view">
        <button
          type="button"
          aria-pressed={!preview}
          disabled={busy || loading || loadFailed}
          onClick={() => setPreview(false)}
        >
          Edit questions
        </button>
        <button
          type="button"
          aria-pressed={preview}
          disabled={busy || loading || loadFailed}
          onClick={() => setPreview(true)}
        >
          Preview questions
        </button>
      </nav>
      <fieldset
        className="custom-form-edit-fields"
        hidden={preview}
        disabled={busy || loading || loadFailed}
      >
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
        <h3>1. Basics</h3>
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
        {!definition?.id && (
          <section className="custom-form-routing" aria-label="Where the form appears">
            <h4>Where should people find this form?</h4>
            <Field label="Website location">
              <select
                value={destination}
                disabled={Boolean(savedPage)}
                onChange={(event) => {
                  setDestination(event.target.value);
                  setDirty(true);
                }}
              >
                <option value="direct">Direct form link</option>
                {canAddPage && <option value="new">Create a page for this form</option>}
                {canAddPage && <option value="existing">Add to an existing page</option>}
              </select>
            </Field>
            {!canAddPage && (
              <p className="workspace-meta">
                A website editor can add this form to a page after it is saved.
              </p>
            )}
            {pageError && <p role="status">{pageError}</p>}
            {destination === 'new' && (
              <>
                <Field label="Page name">
                  <input
                    value={pageTitle || draft.title}
                    maxLength={160}
                    onChange={(event) => {
                      setPageTitle(event.target.value);
                      setDirty(true);
                    }}
                  />
                </Field>
                <Field label="Menu section">
                  <select
                    value={pagePlacement}
                    onChange={(event) => {
                      setPagePlacement(event.target.value);
                      setDirty(true);
                    }}
                  >
                    {PAGE_PLACEMENTS.map(([path, label]) => (
                      <option key={path} value={path}>
                        {navigationName(getContent, path, label)}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="workspace-meta">
                  Save draft keeps the new page hidden. Save and publish opens the page and form
                  together.
                </p>
              </>
            )}
            {destination === 'existing' && (
              <>
                <Field label="Existing page">
                  <select
                    value={selectedPage}
                    disabled={Boolean(savedPage) || Boolean(pageError)}
                    onChange={(event) => {
                      setSelectedPage(event.target.value);
                      setDirty(true);
                    }}
                  >
                    <option value="">Choose a page…</option>
                    {pages
                      .filter((item) => !item.form_id || item.form_id === draft.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                          {item.published ? ' · Live' : ' · Draft'}
                        </option>
                      ))}
                  </select>
                </Field>
                <p className="workspace-meta">
                  The page keeps its current visibility. Pages that already use another form can be
                  changed in Website pages.
                </p>
              </>
            )}
          </section>
        )}
        {definition?.id && canAddPage && pages.some((item) => !item.published) && (
          <section className="custom-form-routing" aria-label="Linked draft page">
            <h4>Linked draft page</h4>
            <Field label="Page to publish">
              <select
                value={selectedPage}
                onChange={(event) => {
                  setSelectedPage(event.target.value);
                  setDirty(true);
                }}
              >
                {pages
                  .filter((item) => !item.published)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </Field>
            <label className="custom-form-check workspace-field">
              <span>Publish linked page with this form</span>
              <input
                type="checkbox"
                checked={publishLinkedPage}
                onChange={(event) => {
                  setPublishLinkedPage(event.target.checked);
                  setDirty(true);
                }}
              />
            </label>
            <p className="workspace-meta">
              Publish changes saves the form and this page together. Save draft keeps the page
              hidden.
            </p>
          </section>
        )}
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

        <h3>2. Questions</h3>
        {draft.schema.fields.map((field, index) => (
          <CustomFormQuestion
            key={field.id}
            group={questionGroup}
            expanded={selectedQuestion === field.id}
            onExpand={(open) =>
              setSelectedQuestion((current) =>
                open ? field.id : current === field.id ? null : current,
              )
            }
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
              onClick={() => {
                const question = newQuestion(draft.schema.fields, preset.id);
                setFields([...draft.schema.fields, question]);
                setSelectedQuestion(question.id);
              }}
            >
              + {preset.name}
            </button>
          ))}
          <button
            type="button"
            disabled={draft.schema.fields.length >= 40}
            onClick={() => {
              const question = newQuestion(draft.schema.fields);
              setFields([...draft.schema.fields, question]);
              setSelectedQuestion(question.id);
            }}
          >
            Add question
          </button>
        </div>
        <section className="custom-form-routing">
          <div>
            <h3>3. Responses</h3>
            <p className="workspace-meta">
              These people receive the automatic action when somebody submits this form.
            </p>
            {draft.built_in_kind && (
              <p className="workspace-meta">
                This built-in form keeps its existing response permission. Only people with that
                permission can be assigned here.
              </p>
            )}
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
      <div className="workspace-actions custom-form-save-actions">
        <button
          disabled={busy || loading || loadFailed}
          onClick={() => save(false).catch(() => {})}
        >
          Save draft
        </button>
        <button
          className="custom-form-publish"
          disabled={busy || loading || loadFailed}
          onClick={() => save(true).catch(() => {})}
        >
          {busy ? 'Saving…' : draft.published_version ? 'Publish changes' : 'Save and publish'}
        </button>
      </div>
      {draft.published_version && (
        <p className="workspace-meta">
          Published version {draft.published_version}. Saving a draft preserves the published
          questions until you publish again. Turning responses off takes effect when saved.
        </p>
      )}
    </section>
  );
}
