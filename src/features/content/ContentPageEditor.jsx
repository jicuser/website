import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { checked } from '@/components/workspace/shared';
import CustomFormsBuilder from '@/components/workspace/CustomFormsBuilder';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';
import {
  PAGE_PLACEMENTS,
  PAGE_KINDS,
  REGISTRATION_TYPES,
  pageDraft,
  pageProblem,
  pageUrl,
  workflowChanged,
  pageSlug,
} from '@/lib/pageContent';

export default function ContentPageEditor({ page, poster, onSaved, onClose }) {
  const { can } = useAuth();
  const [draft, setDraft] = useState(() => ({
    ...pageDraft(poster),
    ...page,
    id: page?.id || crypto.randomUUID(),
  }));
  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(Boolean(poster?.id || page?.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [forms, setForms] = useState([]);
  const [formsError, setFormsError] = useState('');
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(false);
  const saving = useRef(false);
  const patch = (values) => {
    setDraft((current) => ({ ...current, ...values }));
    setDirty(true);
    setMessage('');
  };
  const close = () => {
    if (!busy && (!dirty || window.confirm('Discard unsaved page changes?'))) onClose?.();
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      checked(supabase.rpc('admin_forms_overview').abortSignal(controller.signal)),
      checked(supabase.rpc('list_public_forms').abortSignal(controller.signal)),
    ])
      .then(([assigned, published]) => {
        if (controller.signal.aborted) return;
        setForms([
          ...new Map(
            [...(published || []), ...(assigned || [])].map((form) => [form.id, form]),
          ).values(),
        ]);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setFormsError('Available forms could not be loaded. Your existing link is unchanged.');
      });
    return () => controller.abort();
  }, []);

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

  const save = useCallback(async () => {
    if (saving.current) throw new Error('Wait for the current page change.');
    const invalid = pageProblem(draft);
    if (invalid) {
      setMessage(invalid);
      throw new Error(invalid);
    }
    if (
      page?.published &&
      !draft.published &&
      !window.confirm(
        'Hide this page? Its form, responses and actions will be kept. The form may still be open from other links.',
      )
    )
      return;
    saving.current = true;
    setBusy(true);
    setMessage('');
    try {
      const saved = await checked(
        supabase.rpc('save_site_page', {
          p_page: { ...draft, expected_updated_at: draft.updated_at || null },
        }),
      );
      if (!saved?.id)
        throw new Error('The page save could not be confirmed. Reload before retrying.');
      setDraft(saved);
      setDirty(false);
      setMessage(
        saved.published
          ? 'Page saved and visible on the website.'
          : 'Page saved. It is hidden from the website.',
      );
      workflowChanged();
      onSaved?.(saved);
      return saved;
    } catch (error) {
      setMessage(error.message || 'The page could not be saved. Your changes are still here.');
      throw error;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }, [draft, page?.published, onSaved]);
  useRegisterAdminSave(save, dirty && !busy && !creating, 'Save page');

  async function upload(file) {
    if (!file || saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage('');
    try {
      const ext = validateImage(file);
      const path = `pages/${crypto.randomUUID()}.${ext}`;
      await checked(supabase.storage.from('site-images').upload(path, file, { upsert: false }));
      patch({ image_url: supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl });
    } catch (error) {
      setMessage(error.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (creating)
    return (
      <div className="community-workspace custom-forms-admin">
        <CustomFormsBuilder
          initialDraft={{
            title: `${draft.title} — ${draft.registration === 'interest' ? 'interest' : 'registration'}`,
            slug: `${draft.slug.slice(0, 65)}-registration`,
            description:
              draft.registration === 'interest'
                ? 'Register your interest. This does not confirm a place.'
                : 'Complete this form to contact the centre about this programme. A response is not a confirmed place.',
            schema: {
              fields: [
                { id: 'name', label: 'Your name', type: 'text', required: true },
                { id: 'email', label: 'Email address', type: 'email', required: true },
                { id: 'phone', label: 'Telephone (optional)', type: 'phone', required: false },
                {
                  id: 'message',
                  label: 'Anything we should know? (optional)',
                  type: 'textarea',
                  required: false,
                },
              ],
            },
          }}
          onClose={() => setCreating(false)}
          onSaved={(form) => {
            setForms((current) => [...current.filter((item) => item.id !== form.id), form]);
            patch({ form_id: form.id });
            setCreating(false);
            setMessage('Form created. Save this page to link it.');
          }}
        />
      </div>
    );

  return (
    <section className="content-page-editor" aria-label="Content page editor">
      <div className="admin-heading">
        <h3>{page?.id ? 'Page & registration' : 'Create a page'}</h3>
        {onClose && (
          <button className="admin-button" disabled={busy} onClick={close}>
            Close page editor
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy}>
        <div className="content-field-grid">
          <label>
            Page title
            <input
              value={draft.title}
              maxLength={160}
              onChange={(event) =>
                patch({
                  title: event.target.value,
                  ...(!draft.updated_at && !slugEdited
                    ? { slug: pageSlug(event.target.value) }
                    : {}),
                })
              }
            />
          </label>
          <label>
            Page address
            <input
              value={draft.slug}
              readOnly={Boolean(draft.updated_at)}
              maxLength={80}
              onChange={(event) => {
                setSlugEdited(true);
                patch({ slug: pageSlug(event.target.value) });
              }}
            />
          </label>
          <label>
            Type
            <select value={draft.kind} onChange={(event) => patch({ kind: event.target.value })}>
              {PAGE_KINDS.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Place under
            <select
              value={draft.placement}
              onChange={(event) => patch({ placement: event.target.value })}
            >
              {PAGE_PLACEMENTS.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <small>The address stays {pageUrl(draft)} when you move the page to another section.</small>
        <label>
          Details
          <textarea
            rows={6}
            value={draft.body}
            maxLength={12000}
            onChange={(event) => patch({ body: event.target.value })}
          />
        </label>
        <label>
          When / schedule
          <input
            value={draft.schedule}
            maxLength={400}
            onChange={(event) => patch({ schedule: event.target.value })}
          />
        </label>
        <label>
          Picture address
          <input
            value={draft.image_url}
            maxLength={2000}
            onChange={(event) => patch({ image_url: event.target.value })}
          />
        </label>
        {can('media') && (
          <label>
            Upload page picture
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void upload(file);
              }}
            />
          </label>
        )}
        <label>
          Registration
          <select
            value={draft.registration}
            onChange={(event) =>
              patch({
                registration: event.target.value,
                ...(event.target.value === 'none' ? { form_id: null } : {}),
              })
            }
          >
            {REGISTRATION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {draft.registration !== 'none' && (
          <>
            <label>
              Linked form
              <select
                value={draft.form_id || ''}
                onChange={(event) => patch({ form_id: event.target.value || null })}
              >
                <option value="">No online form linked yet</option>
                {draft.form_id && !forms.some((form) => form.id === draft.form_id) && (
                  <option value={draft.form_id}>Current linked form</option>
                )}
                {forms.map((form) => (
                  <option value={form.id} key={form.id}>
                    {form.title}
                    {form.published_version === null ? ' · Draft' : ''}
                  </option>
                ))}
              </select>
            </label>
            {formsError && <p role="status">{formsError}</p>}
            {can('forms_manage') && (
              <button type="button" className="admin-button" onClick={() => setCreating(true)}>
                Create linked form
              </button>
            )}
            <small>
              A draft or closed form cannot accept registrations. Page visibility and form
              acceptance are separate.
            </small>
          </>
        )}
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => patch({ published: event.target.checked })}
          />
          Show page on website
        </label>
        <div className="admin-actions">
          <button
            className="admin-button primary"
            disabled={!dirty && Boolean(draft.updated_at)}
            onClick={() => save().catch(() => {})}
          >
            Save page
          </button>
          <button className="admin-button" onClick={() => setPreview((value) => !value)}>
            {preview ? 'Close page preview' : 'Preview page'}
          </button>
          {draft.updated_at && draft.published && (
            <Link className="admin-button" to={pageUrl(draft)} target="_blank" rel="noreferrer">
              View published page
            </Link>
          )}
        </div>
      </fieldset>
      {preview && (
        <article className="admin-panel content-page-preview">
          <h3>{draft.title}</h3>
          {draft.image_url && !pageProblem(draft) && (
            <img src={draft.image_url} alt="Page picture preview" />
          )}
          <p>{draft.schedule}</p>
          <p className="content-page-body">{draft.body}</p>
          <small>Preview only. This does not save, publish or submit a form.</small>
        </article>
      )}
    </section>
  );
}
