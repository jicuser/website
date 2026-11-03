import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { checked, Field } from '@/components/workspace/shared';
import FeeLedger from '@/components/workspace/FeeLedger';
import { admissionPayload, admissionStatus } from './model';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function Admissions({ data }) {
  const [params] = useSearchParams();
  const response = params.get('response') || '';
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState(false);
  const [source, setSource] = useState(null);
  const [sourceError, setSourceError] = useState('');
  const [courseId, setCourseId] = useState('');
  const [formLinks, setFormLinks] = useState([]);
  const attempt = useRef(null);
  const inFlight = useRef(false);
  const pending = useRef(null);
  const formRef = useRef(null);
  const reload = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    try {
      const next = await checked(
        supabase
          .rpc('list_learning_admissions', { p_offset: page * 50, p_limit: 50 })
          .abortSignal(controller.signal),
      );
      if (controller.signal.aborted) return false;
      if (!Array.isArray(next?.rows) || !Number.isFinite(next?.total))
        throw new Error('Applications could not be verified.');
      setResult(next);
      return true;
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message || 'Applications could not be loaded.');
      return false;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    reload();
    return () => pending.current?.abort();
  }, [reload]);
  useEffect(() => {
    if (!response) return undefined;
    let active = true;
    if (!uuid.test(response)) {
      setSourceError('This response reference is invalid.');
      return undefined;
    }
    Promise.all([
      checked(
        supabase
          .from('form_submissions')
          .select('id,kind,custom_form_id,created_at')
          .eq('id', response)
          .single(),
      ),
      checked(supabase.from('learning_course_forms').select('course_id,form_id').limit(1000)),
      checked(supabase.from('custom_forms').select('id,built_in_kind,title').limit(500)),
    ])
      .then(([submission, links, forms]) => {
        if (!active) return;
        const definition = (forms || []).find(
          (f) =>
            f.id === submission.custom_form_id ||
            (submission.kind !== 'custom' && f.built_in_kind === submission.kind),
        );
        setSource({ ...submission, title: definition?.title || 'Application response' });
        setFormLinks(
          (links || []).filter((l) => l.form_id === definition?.id).map((l) => l.course_id),
        );
      })
      .catch(() => {
        if (active)
          setSourceError('This response could not be checked. Return to Forms and open it again.');
      });
    return () => {
      active = false;
    };
  }, [response]);
  useEffect(() => {
    const beforeUnload = (e) => {
      if (dirty || inFlight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const leave = (e) => {
      const link = e.target.closest?.('a[href]');
      if (!link || e.defaultPrevented || (!dirty && !inFlight.current) || link.target === '_blank')
        return;
      const target = new URL(link.href, window.location.href);
      if (target.href === window.location.href) return;
      if (inFlight.current || !window.confirm('Leave without saving this application review?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', leave, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', leave, true);
    };
  }, [dirty]);
  const approve = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    setMessage('');
    try {
      if (!attempt.current) {
        const form = new FormData(event.currentTarget);
        attempt.current = admissionPayload(
          {
            course_id: form.get('course'),
            student_id: form.get('student'),
            submission_id: response,
            amount: form.get('amount'),
            note: form.get('note'),
            reviewed: form.has('reviewed'),
          },
          crypto.randomUUID(),
        );
      }
      inFlight.current = true;
      setBusy(true);
      const saved = await checked(supabase.rpc('review_learning_admission', attempt.current));
      if (!uuid.test(saved || ''))
        throw new Error('The saved application could not be confirmed. Retry the same review.');
      attempt.current = null;
      setRetry(false);
      setDirty(false);
      formRef.current?.reset();
      setCourseId('');
      setMessage(
        'Application approved. The class place is not active yet. Check the fee, then select Activate class place.',
      );
      await reload();
    } catch (e) {
      setError(e.message || 'Approval could not be confirmed. Retry the same review.');
      setRetry(Boolean(attempt.current));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const choices = data.learning_courses.filter(
    (c) => !c.archived && (!response || formLinks.includes(c.id)),
  );
  return (
    <section aria-label="Admissions and class places">
      <h2>Admissions &amp; places</h2>
      <div className="learning-flow">
        <span>1. Review application</span>
        <span>2. Check fee</span>
        <span>3. Activate class place</span>
        <span>4. Teacher register</span>
      </div>
      <p>
        Interest is not enrolment. Check the application and any required consent before approving.
        No account is created and no money is charged here.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <form
        ref={formRef}
        aria-label="Review an application"
        className="workspace-card workspace-form"
        onSubmit={approve}
        onChange={() => setDirty(true)}
      >
        <h3>Review an application</h3>
        {response ? (
          <p>
            {source
              ? `From ${source.title} · ${source.id}`
              : sourceError || 'Checking the response…'}
          </p>
        ) : (
          <p>
            Walk-in application. To link an online response, open it in Forms and choose Review
            class application.
          </p>
        )}
        {response && source && !choices.length && (
          <p role="alert">
            No class uses this registration form yet. Link it under Manage learning first.
          </p>
        )}
        <fieldset
          disabled={busy || retry || (Boolean(response) && (!source || Boolean(sourceError)))}
        >
          <Field label="Class">
            <select
              name="course"
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Choose a class…</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Student">
            <select name="student" required>
              <option value="">Choose an existing student…</option>
              {data.learning_students
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
            </select>
          </Field>
          <p className="workspace-meta">
            Add a missing student in Manage learning; do not create another record for the same
            person.
          </p>
          <Field label="Admission fee (£)">
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="0.00"
              pattern="[0-9]+(\.[0-9]{1,2})?"
            />
          </Field>
          <p className="workspace-meta">
            Enter 0 for an approved no-fee place. Explain the decision below.
          </p>
          <Field label="Review note">
            <textarea name="note" required minLength={3} maxLength={2000} />
          </Field>
          <label>
            <input type="checkbox" name="reviewed" required /> I have checked the student, class and
            any required consent.
          </label>
        </fieldset>
        <button
          type="submit"
          disabled={busy || (Boolean(response) && (!source || !!sourceError || !choices.length))}
        >
          {busy ? 'Approving…' : retry ? 'Retry same approval' : 'Approve application'}
        </button>
      </form>
      <div className="workspace-actions">
        <h3>Applications &amp; places</h3>
        <button type="button" disabled={busy || loading} onClick={reload}>
          Refresh payment status
        </button>
      </div>
      {loading ? (
        <p role="status">Loading applications…</p>
      ) : (
        <div className="learning-admission-list">
          {result.rows.map((row) => (
            <Admission key={row.id} row={row} data={data} reload={reload} onError={setError} />
          ))}
        </div>
      )}
      {!loading && !result.rows.length && <p>No reviewed applications on this page.</p>}
      <div className="workspace-actions">
        <button disabled={page === 0 || loading} onClick={() => setPage((n) => n - 1)}>
          Previous applications
        </button>
        <span>
          Page {page + 1} · {result.total} applications
        </span>
        <button
          disabled={(page + 1) * 50 >= result.total || loading}
          onClick={() => setPage((n) => n + 1)}
        >
          Next applications
        </button>
      </div>
      <Link to="/portal?tab=manage">Manage classes, students &amp; form links</Link>
    </section>
  );
}
function Admission({ row, data, reload, onError }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [reason, setReason] = useState('');
  const [showFees, setShowFees] = useState(false);
  const status = admissionStatus(row, row.fee);
  const change = async (active) => {
    if (lock.current || !reason.trim()) return;
    if (
      !window.confirm(
        active
          ? 'Activate this class place? The server will check payment and capacity again.'
          : 'Withdraw this class place? Attendance, progress and receipts will be retained.',
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    onError('');
    try {
      const saved = await checked(
        supabase.rpc('set_learning_enrolment', {
          p_admission_id: row.id,
          p_active: active,
          p_reason: reason.trim(),
        }),
      );
      if (saved !== active)
        throw new Error('The class-place change could not be confirmed. Refresh before retrying.');
      await reload();
    } catch (e) {
      onError(e.message || 'The place could not be updated.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <details className="workspace-card">
      <summary>
        <strong>
          {data.learning_students.find((s) => s.id === row.student_id)?.display_name || 'Student'} ·{' '}
          {data.learning_courses.find((c) => c.id === row.course_id)?.title || 'Class'}
        </strong>
        <span className="admission-status">{status}</span>
      </summary>
      <p>Review: {row.review_note}</p>
      {row.submission_id && <p>Original response: {row.submission_id}</p>}
      {row.fee_id && (
        <>
          <button type="button" onClick={() => setShowFees((value) => !value)}>
            {showFees ? 'Hide fee records' : 'Open fee & receipts'}
          </button>
          {showFees && <FeeLedger studentId={row.student_id} courseId={row.course_id} canManage />}
          <p>After recording or correcting a receipt, refresh payment status above.</p>
        </>
      )}
      <Field label="Reason for class-place decision">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          disabled={busy}
        />
      </Field>
      <div className="workspace-actions">
        {row.state !== 'enrolled' && (
          <button
            disabled={busy || !reason.trim() || (row.fee_id && row.fee?.status !== 'paid')}
            onClick={() => change(true)}
          >
            Activate class place
          </button>
        )}
        {row.state !== 'withdrawn' && (
          <button disabled={busy || !reason.trim()} onClick={() => change(false)}>
            Withdraw place
          </button>
        )}
      </div>
    </details>
  );
}
