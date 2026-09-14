import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formAction, visibleAnswers } from '@/lib/customForms';
import { checked } from '@/components/workspace/shared';
import CustomFormsFields from '@/components/workspace/CustomFormsFields';
import {
  validateAnswers,
  validateUpload,
} from '../../supabase/functions/custom-forms/validation.mjs';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';

export default function PublicFormPage() {
  const { slug } = useParams();
  const auth = useAuth();
  if (auth.loading && !auth.user)
    return (
      <div className="community-workspace public-custom-form">
        <p role="status">Loading form…</p>
      </div>
    );
  return <PublicForm key={`${slug}:${auth.user?.id || 'anonymous'}`} slug={slug} />;
}

function PublicForm({ slug }) {
  const auth = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [uploads, setUploads] = useState({});
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState('');
  const attempt = useRef(crypto.randomUUID());
  const mounted = useRef(true);
  const activeUploads = useRef(new Map());
  useEffect(() => {
    mounted.current = true;
    checked(supabase.rpc('get_public_form', { p_slug: slug }))
      .then((result) => {
        if (mounted.current) setForm(result);
      })
      .catch(() => {
        if (mounted.current)
          setError('This form could not be loaded. Please refresh or contact the centre.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      activeUploads.current.clear();
    };
  }, [slug]);

  async function upload(field, file) {
    activeUploads.current.delete(field.id);
    setAnswers((current) => {
      const next = { ...current };
      delete next[field.id];
      return next;
    });
    if (!file) {
      setUploads((current) => ({ ...current, [field.id]: undefined }));
      return;
    }
    const operation = crypto.randomUUID();
    activeUploads.current.set(field.id, operation);
    const isCurrent = () => mounted.current && activeUploads.current.get(field.id) === operation;
    setUploads((current) => ({ ...current, [field.id]: { name: file.name, busy: true } }));
    try {
      const mime = file.type === 'application/x-zip-compressed' ? 'application/zip' : file.type;
      validateUpload(field, { file_name: file.name, mime_type: mime, size_bytes: file.size });
      const prepared = await formAction(supabase, {
        action: 'upload_prepare',
        slug,
        version: form.version,
        field_id: field.id,
        idempotency_key: attempt.current,
        file_name: file.name,
        mime_type: mime,
        size_bytes: file.size,
      });
      if (!isCurrent()) return;
      await checked(
        supabase.storage
          .from('form-attachments')
          .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: mime }),
      );
      await formAction(supabase, {
        action: 'upload_finish',
        upload_id: prepared.upload_id,
        upload_token: prepared.upload_token,
      });
      if (!isCurrent()) return;
      setAnswers((current) => ({ ...current, [field.id]: prepared.upload_id }));
      setUploads((current) => ({
        ...current,
        [field.id]: {
          name: file.name,
          busy: false,
          id: prepared.upload_id,
          upload_token: prepared.upload_token,
        },
      }));
    } catch (failure) {
      if (isCurrent())
        setUploads((current) => ({
          ...current,
          [field.id]: { name: '', busy: false, error: failure.message },
        }));
    }
  }

  return (
    <div className="community-workspace public-custom-form">
      <div className="workspace-wrap">
        {loading ? (
          <p role="status">Loading form…</p>
        ) : receipt ? (
          <div className="workspace-card">
            <h1>Thank you</h1>
            <p>Your response has been received.</p>
            <p className="workspace-meta">Reference: {receipt}</p>
            <p>
              Keep this reference if you need to contact the centre. Submitting this form does not
              confirm a place.
            </p>
            <p>
              <Link to="/">Back to the website</Link>
            </p>
          </div>
        ) : form ? (
          <form
            className="workspace-card workspace-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || Object.values(uploads).some((item) => item?.busy)) return;
              setBusy(true);
              setError('');
              try {
                const payload = validateAnswers(
                  form.schema,
                  visibleAnswers(form.schema.fields, answers),
                );
                const selectedUploads = Object.entries(uploads)
                  .filter(([key, item]) => item?.id && payload[key] === item.id)
                  .map(([, item]) => ({ id: item.id, upload_token: item.upload_token }));
                const result = await formAction(supabase, {
                  action: 'submit',
                  slug,
                  version: form.version,
                  answers: payload,
                  uploads: selectedUploads,
                  idempotency_key: attempt.current,
                });
                if (!result?.ok || !result.id)
                  throw new Error('Your response could not be confirmed. Please try again.');
                setReceipt(result.id);
                setAnswers({});
                setUploads({});
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h1>{form.title}</h1>
            <p>{form.description}</p>
            {!auth.user && (
              <p className="workspace-meta">
                <Link to="/portal">Sign in</Link> before completing this form to keep replies in
                your account.
              </p>
            )}
            <fieldset disabled={busy}>
              <CustomFormsFields
                fields={form.schema.fields}
                answers={answers}
                onChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
                onFile={upload}
                uploads={uploads}
              />
            </fieldset>
            <p className="workspace-meta">
              Fields marked * are required. <Link to="/privacy">How we use your information</Link>
            </p>
            <button disabled={busy || Object.values(uploads).some((item) => item?.busy)}>
              {busy ? 'Sending…' : 'Send response'}
            </button>
          </form>
        ) : (
          !error && (
            <div className="workspace-card">
              <h1>Form unavailable</h1>
              <p>This form may have closed or its address may have changed.</p>
              <Link to="/contact">Contact the centre</Link>
            </div>
          )
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
