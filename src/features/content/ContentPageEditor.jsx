import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { checked } from '@/components/workspace/shared';
import CustomFormsBuilder from '@/components/workspace/CustomFormsBuilder';
import useWorkflowData from './useWorkflowData';
import {
  PAGE_KINDS,
  PAGE_PLACEMENTS,
  REGISTRATION_TYPES,
  pageSlug,
  pageProblem,
  pageUrl,
  formStatus,
  formAdminUrl,
  workflowChanged,
} from '@/lib/pageContent';
import { IMAGE_ACCEPT, validateImage } from '@/lib/images';

export default function ContentPageEditor({ initial, onClose, onSaved }) {
  const auth = useAuth();
  const [draft, setDraft] = useState(initial),
    [baseline, setBaseline] = useState(initial);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [creatingForm, setCreatingForm] = useState(false);
  const load = useCallback(() => checked(supabase.rpc('admin_form_catalogue')), []);
  const forms = useWorkflowData(load);
  const dirty = !draft.id || JSON.stringify(draft) !== JSON.stringify(baseline);
  const change = (values) => {
    setDraft((current) => ({ ...current, ...values }));
    setMessage('');
  };
  const save = async () => {
    if (busy) return;
    const problem = pageProblem(draft);
    if (problem) throw new Error(problem);
    setBusy(true);
    setMessage('');
    try {
      const saved = await checked(supabase.rpc('save_content_page', { p_page: draft }));
      setDraft(saved);
      setBaseline(saved);
      setMessage(saved.published ? 'Page published.' : 'Page saved; it is hidden from the public.');
      workflowChanged();
      onSaved?.(saved);
    } catch (error) {
      setMessage(error.message || 'The page was not saved.');
      throw error;
    } finally {
      setBusy(false);
    }
  };
  useRegisterAdminSave(save, dirty && !busy && !creatingForm, 'Save page');
  const linked = (forms.data || []).find((item) => item.id === draft.form_id);
  return (
    <section className="admin-panel content-workflow community-workspace custom-forms-admin">
      <div className="admin-heading">
        <h3>{draft.id ? 'Edit detail page' : 'Create detail page'}</h3>
        <button
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm('Discard unsaved page changes?')) onClose();
          }}
        >
          Close page editor
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy || creatingForm} className="content-fields">
        <label>
          Page title
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(event) =>
              change({
                title: event.target.value,
                ...(!draft.id && (!draft.slug || draft.slug === pageSlug(draft.title))
                  ? { slug: pageSlug(event.target.value) }
                  : {}),
              })
            }
          />
        </label>
        <label>
          Page address
          <input
            maxLength={80}
            value={draft.slug}
            readOnly={Boolean(draft.id)}
            onChange={(event) => change({ slug: pageSlug(event.target.value) })}
          />
          <small>/pages/{draft.slug || 'page-address'} · Saved addresses stay stable.</small>
        </label>
        <label>
          Page type
          <select value={draft.kind} onChange={(event) => change({ kind: event.target.value })}>
            {PAGE_KINDS.map(([value, title]) => (
              <option value={value} key={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Show in
          <select
            value={draft.placement}
            onChange={(event) => change({ placement: event.target.value })}
          >
            {PAGE_PLACEMENTS.map(([value, title]) => (
              <option value={value} key={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="content-field-wide">
          Description
          <textarea
            rows={5}
            maxLength={12000}
            value={draft.body}
            onChange={(event) => change({ body: event.target.value })}
          />
        </label>
        <label>
          Schedule or date
          <input
            maxLength={400}
            value={draft.schedule}
            onChange={(event) => change({ schedule: event.target.value })}
          />
        </label>
        <label>
          Picture address
          <input
            maxLength={2000}
            value={draft.image_url}
            onChange={(event) => change({ image_url: event.target.value })}
          />
        </label>
        {auth.can('media') && (
          <label>
            Upload page picture
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setBusy(true);
                try {
                  const ext = validateImage(file);
                  const path = `pages/${crypto.randomUUID()}.${ext}`;
                  await checked(supabase.storage.from('site-images').upload(path, file));
                  change({
                    image_url: supabase.storage.from('site-images').getPublicUrl(path).data
                      .publicUrl,
                  });
                } catch (error) {
                  setMessage(error.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}
        <label>
          Registration
          <select
            value={draft.registration}
            onChange={(event) => change({ registration: event.target.value })}
          >
            {REGISTRATION_TYPES.map(([value, title]) => (
              <option value={value} key={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        {draft.registration !== 'none' && (
          <label>
            Linked form
            <select
              value={draft.form_id || ''}
              onChange={(event) => change({ form_id: event.target.value || null })}
            >
              <option value="">Choose a form…</option>
              {draft.form_id && !linked && (
                <option value={draft.form_id}>Current form (details unavailable)</option>
              )}
              {(forms.data || []).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title} · {formStatus(item)}
                </option>
              ))}
            </select>
          </label>
        )}
        {draft.registration !== 'none' && (auth.isOwner || auth.can('forms_manage')) && (
          <button className="admin-button" onClick={() => setCreatingForm(true)}>
            Create a registration form
          </button>
        )}
        {draft.registration !== 'none' && linked && (
          <div className="content-field-wide">
            <p>
              Responsible:{' '}
              {linked.responsible?.map((person) => person.display_name || 'Staff').join(', ') ||
                'Not assigned'}{' '}
              · {formStatus(linked)}
            </p>
            <Link to={formAdminUrl(linked.id)}>Manage form, responses & actions</Link>
          </div>
        )}
        <label className="admin-check content-field-wide">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => change({ published: event.target.checked })}
          />
          Page live after saving
        </label>
        <small className="content-field-wide">
          Hiding this page does not delete responses or close a form used elsewhere. Close
          registrations in the form settings when needed.
        </small>
        <div className="admin-actions content-field-wide">
          <button
            className="admin-button primary"
            disabled={!dirty}
            onClick={() => save().catch((error) => setMessage(error.message))}
          >
            {busy ? 'Saving…' : 'Save page'}
          </button>
          {draft.id && draft.published && (
            <Link className="admin-button" to={pageUrl(draft)} target="_blank" rel="noreferrer">
              View public page
            </Link>
          )}
        </div>
      </fieldset>
      {creatingForm && (
        <CustomFormsBuilder
          seed={{
            title: `${draft.title} — registration`,
            slug: pageSlug(`${draft.slug}-registration`),
            description: `Enquire about ${draft.title}.`,
            task_title: `Review ${draft.title}`.slice(0, 160),
          }}
          onClose={() => setCreatingForm(false)}
          onSaved={(id) => {
            change({ form_id: id });
            workflowChanged();
          }}
        />
      )}
    </section>
  );
}
