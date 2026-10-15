import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { checked } from './shared';
import CustomFormsBuilder from './CustomFormsBuilder';
import CustomFormsInbox from './CustomFormsInbox';
import '@/styles/custom-forms.css';

export default function CustomFormsWorkspace({ auth, initialMine = false }) {
  const [definitions, setDefinitions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [publicForms, setPublicForms] = useState([]);
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState(initialMine ? 'responses' : 'forms');
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [forms, staff, published] = await Promise.all([
        checked(
          supabase
            .from('custom_forms')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(500),
        ),
        checked(
          supabase
            .from('custom_form_staff')
            .select('form_id,user_id,role')
            .eq('user_id', auth.user.id)
            .limit(1500),
        ),
        checked(supabase.rpc('list_public_forms')),
      ]);
      setDefinitions(forms || []);
      setAssignments(staff || []);
      setPublicForms(published || []);
    } catch {
      setDefinitions([]);
      setAssignments([]);
      setPublicForms([]);
      setError('Forms are not available right now. Please try again or contact an administrator.');
    } finally {
      setLoading(false);
    }
  }, [auth.user.id]);
  useEffect(() => {
    reload();
  }, [reload]);
  const canCreate = auth.isOwner || auth.can('forms_manage');
  return (
    <>
      <div className="workspace-actions">
        <button aria-pressed={view === 'forms'} onClick={() => setView('forms')}>
          Available forms
        </button>
        <button aria-pressed={view === 'responses'} onClick={() => setView('responses')}>
          Responses and replies
        </button>
        {canCreate && (
          <button
            onClick={() => {
              setEditor({});
              setView('forms');
            }}
          >
            Create form
          </button>
        )}
        <button disabled={loading} onClick={reload}>
          Refresh forms
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {editor && (
        <CustomFormsBuilder
          key={editor.id || 'new'}
          definition={editor.id ? editor : null}
          onClose={() => setEditor(null)}
          onSaved={reload}
        />
      )}
      {loading ? (
        <p role="status">Loading forms…</p>
      ) : view === 'forms' ? (
        <>
          <h2>Available forms</h2>
          {!publicForms.length && <p>No forms are open for responses.</p>}
          <div className="workspace-grid">
            {publicForms.map((form) => (
              <article className="workspace-card" key={form.id}>
                <h3>{form.title}</h3>
                <p>{form.description}</p>
                <p>
                  <Link className="workspace-button" to={`/forms/${encodeURIComponent(form.slug)}`}>
                    Complete form
                  </Link>
                </p>
              </article>
            ))}
          </div>
          {definitions.length > 0 && (
            <>
              <h2>Forms you manage or follow</h2>
              <div className="workspace-grid">
                {definitions.map((form) => {
                  const canEdit =
                    canCreate ||
                    assignments.some(
                      (assignment) =>
                        assignment.form_id === form.id && assignment.role === 'manager',
                    );
                  return (
                    <article className="workspace-card" key={form.id}>
                      <h3>{form.title}</h3>
                      <p>
                        {form.published_version
                          ? form.enabled
                            ? `Open · Version ${form.published_version}`
                            : 'Responses closed'
                          : 'Unpublished draft'}
                      </p>
                      <div className="workspace-actions">
                        {canEdit && (
                          <button onClick={() => setEditor(form)}>
                            Edit questions and routing
                          </button>
                        )}
                        {form.enabled && form.published_version && (
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  new URL(
                                    `/forms/${encodeURIComponent(form.slug)}`,
                                    window.location.origin,
                                  ).href,
                                );
                                setError('Form link copied.');
                              } catch {
                                setError(
                                  `Share this address: ${new URL(`/forms/${encodeURIComponent(form.slug)}`, window.location.origin).href}`,
                                );
                              }
                            }}
                          >
                            Copy form link
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <CustomFormsInbox
          auth={auth}
          definitions={definitions}
          assignments={assignments}
          initialMine={initialMine}
        />
      )}
    </>
  );
}
