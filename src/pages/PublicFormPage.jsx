import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PageMetadata from '@/components/shell/PageMetadata';
import { useAuth } from '@/context/AuthContext';
import { useRegisterProgrammeJourney } from '@/context/ProgrammeJourneyContext';
import { supabase } from '@/lib/supabaseClient';
import { formAction, visibleAnswers, visibleFields } from '@/lib/customForms';
import { programmeForForm, programmeSlugFromSearch } from '@/lib/programmeJourney';
import { serviceEnquiry, hallFormPrefill } from '@/lib/serviceEnquiries';
import { checked } from '@/components/workspace/shared';
import { SITE } from '@/content/site';
import SmartForm from '@/components/workspace/SmartForm';
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

export function EmbeddedPublicForm({ slug, subject = '', title, headingLevel = 2 }) {
  const auth = useAuth();
  if (auth.loading && !auth.user) return <p role="status">Loading form…</p>;
  return (
    <PublicForm
      key={`${slug}:${subject}:${auth.user?.id || 'anonymous'}`}
      slug={slug}
      embedded
      subject={subject}
      titleOverride={title}
      headingLevel={headingLevel}
    />
  );
}

function PublicForm({ slug, embedded = false, subject = '', titleOverride, headingLevel = 2 }) {
  const auth = useAuth();
  const { search } = useLocation();
  const requestedProgramme = programmeSlugFromSearch(search);
  const journeyKey = `${slug}:${requestedProgramme || ''}`;
  const [programmeState, setProgrammeState] = useState(null);
  const programme = programmeState?.key === journeyKey ? programmeState.programme : null;
  useRegisterProgrammeJourney(programme);
  const [form, setForm] = useState(null);
  const [managedForm, setManagedForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const service = serviceEnquiry(slug);
  const [answers, setAnswers] = useState(() => hallFormPrefill(slug, search));
  const [uploads, setUploads] = useState({});
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState('');
  const attempt = useRef(crypto.randomUUID());
  const mounted = useRef(true);
  const activeUploads = useRef(new Map());
  const FormHeading = embedded && headingLevel !== 1 ? 'h2' : 'h1';
  useEffect(() => {
    setManagedForm(null);
    if (!auth.user) return undefined;
    const controller = new AbortController();
    supabase
      .rpc('admin_forms_overview')
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (!controller.signal.aborted && !error && Array.isArray(data))
          setManagedForm(data.find((item) => item.slug === slug && item.can_manage) || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [auth.user?.id, slug]);
  useEffect(() => {
    if (!requestedProgramme) return undefined;
    const controller = new AbortController();
    supabase
      .rpc('get_site_page', { p_slug: requestedProgramme })
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (!controller.signal.aborted)
          setProgrammeState({
            key: journeyKey,
            programme: error ? null : programmeForForm(data, slug, requestedProgramme),
          });
      })
      .catch(() => {
        // Optional programme context must never prevent a direct form submission.
        if (!controller.signal.aborted) setProgrammeState({ key: journeyKey, programme: null });
      });
    return () => controller.abort();
  }, [journeyKey, requestedProgramme, slug]);
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

  function updateAnswers(next) {
    const visible = new Set(visibleFields(form.schema.fields, next).map((field) => field.id));
    // A changed branch must also invalidate an upload that is still in flight.
    for (const id of activeUploads.current.keys())
      if (!visible.has(id)) activeUploads.current.delete(id);
    setUploads((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => visible.has(id))),
    );
    setAnswers(next);
    setError('');
  }

  return (
    <div className={`community-workspace public-custom-form${embedded ? ' is-embedded' : ''}`}>
      {!embedded && form?.title && (
        <PageMetadata title={form.title} description={form.description} noindex={false} />
      )}
      <div className="workspace-wrap">
        {managedForm && (
          <nav className="custom-form-staff-tools" aria-label="Staff form controls">
            <span>Staff controls</span>
            <Link
              className="workspace-button"
              to={`/admin?section=forms&form=${managedForm.id}&edit=1`}
            >
              Edit this form
            </Link>
            <Link
              className="workspace-button"
              to={`/admin?section=forms&form=${managedForm.id}&tab=responses`}
            >
              Responses
            </Link>
          </nav>
        )}
        {programme && !receipt && (
          <p>
            <Link to={programme.to}>← Back to {programme.title}</Link>
          </p>
        )}
        {service && !programme && !receipt && (
          <p>
            <Link to={service.page}>← Back to {service.pageName}</Link>
          </p>
        )}
        {loading ? (
          <p role="status">Loading form…</p>
        ) : receipt ? (
          <div className="workspace-card">
            {embedded ? <h2>Thank you</h2> : <h1>Thank you</h1>}
            <p>
              {service
                ? 'Your enquiry has been received. The centre’s team can use your contact details to follow up.'
                : 'Your response has been received.'}
            </p>
            {['nikah-enquiry', 'hall-booking'].includes(slug) && (
              <p>This does not confirm a booking or date.</p>
            )}
            <p className="workspace-meta">Reference: {receipt}</p>
            {auth.user ? (
              <Link className="workspace-button" to="/contact">
                Contact the centre about your response
              </Link>
            ) : (
              <p>Keep this reference if you need to contact the centre about your response.</p>
            )}
            <p>
              <Link to={programme?.to || '/'}>
                {programme ? `Back to ${programme.title}` : 'Back to the website'}
              </Link>
            </p>
          </div>
        ) : form ? (
          <SmartForm
            fields={form.schema.fields}
            answers={answers}
            onAnswersChange={updateAnswers}
            onFile={upload}
            uploads={uploads}
            busy={busy}
            submitLabel={
              slug === 'contact-us'
                ? 'Send message'
                : service || slug === 'madrassah-enquiry'
                  ? 'Send enquiry'
                  : 'Send response'
            }
            onSubmit={async () => {
              if (busy || Object.values(uploads).some((item) => item?.busy)) return;
              setBusy(true);
              setError('');
              try {
                const entered = visibleAnswers(form.schema.fields, answers);
                const contextField = form.schema.fields.find(
                  (field) => field.type === 'textarea' && typeof entered[field.id] === 'string',
                );
                if (subject && contextField)
                  entered[contextField.id] = `${subject}\n\n${entered[contextField.id]}`;
                const payload = validateAnswers(form.schema, entered);
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
            <FormHeading>{titleOverride || form.title}</FormHeading>
            <p>{form.description}</p>
            <p className="workspace-meta">
              Your response goes to the centre. Bookings and places need confirmation.
            </p>
            <p className="workspace-meta">
              <Link to="/privacy">How we use your information</Link>
            </p>
          </SmartForm>
        ) : (
          !error && (
            <div className="workspace-card">
              <h1>{service ? `${service.title} is currently closed` : 'Form unavailable'}</h1>
              <p>
                {service
                  ? 'You can still send a general message to the centre.'
                  : 'This form may have closed or its address may have changed.'}
              </p>
              <Link to="/contact">Contact the centre</Link>
            </div>
          )
        )}
        {error && (
          <p role="alert">
            {error}
            {slug === 'contact-us' && (
              <>
                {' '}
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent(subject || 'Website enquiry')}&body=${encodeURIComponent(
                    Object.entries(visibleAnswers(form?.schema.fields || [], answers))
                      .map(
                        ([key, value]) =>
                          `${form?.schema.fields.find((field) => field.id === key)?.label || key}: ${value}`,
                      )
                      .join('\n\n'),
                  )}`}
                >
                  Open your email app with this message
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
