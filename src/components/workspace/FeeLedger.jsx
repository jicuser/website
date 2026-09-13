import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { feeAmount, feeWrite, poundsToMinor, uncertainFeeWrite } from '@/lib/fees';
import { checked, dateLabel, Field } from './shared';

export default function FeeLedger({
  formId = null,
  studentId = null,
  courseId = null,
  canManage = false,
}) {
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [outstanding, setOutstanding] = useState(false);
  const [create, setCreate] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const createAttempt = useRef(crypto.randomUUID());
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(
        await checked(
          supabase.rpc('list_fee_requests', {
            p_form_id: formId,
            p_student_id: studentId,
            p_course_id: courseId,
            p_outstanding_only: outstanding,
            p_offset: page * 20,
            p_limit: 20,
          }),
        ),
      );
    } catch {
      setResult({ rows: [], total: 0 });
      setError('Payment records could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formId, studentId, courseId, outstanding, page]);
  useEffect(() => {
    reload();
  }, [reload]);
  return (
    <section>
      <div className="workspace-header">
        <h3>Fees and payment records</h3>
        <button disabled={loading || busy} onClick={reload}>
          Refresh payments
        </button>
        {canManage && (formId || (studentId && courseId)) && (
          <button disabled={busy || createPending} onClick={() => setCreate(!create)}>
            {create ? 'Close fee form' : 'Add fee request'}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="workspace-meta">
        These records show fees and confirmed receipts. Recording a receipt does not charge a card
        or transfer money.
      </p>
      {create && canManage && (
        <form
          className="workspace-card workspace-form"
          onChange={() => {
            createAttempt.current = crypto.randomUUID();
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            let requestStarted = false;
            setBusy(true);
            setError('');
            try {
              const args = {
                p_title: String(data.get('title')).trim(),
                p_amount_minor: poundsToMinor(data.get('amount')),
                p_currency: 'GBP',
                p_form_id: formId,
                p_student_id: studentId,
                p_course_id: courseId,
                p_due_at: data.get('due') ? new Date(data.get('due')).toISOString() : null,
                p_idempotency_key: createAttempt.current,
              };
              requestStarted = true;
              await feeWrite(supabase.rpc('create_fee_request', args));
              createAttempt.current = crypto.randomUUID();
              setCreatePending(false);
              setCreate(false);
              await reload();
            } catch (failure) {
              setCreatePending(requestStarted && uncertainFeeWrite(failure));
              setError(failure.message || 'The fee request could not be saved.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <Field label="Fee description">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Course fee"
                readOnly={createPending}
              />
            </Field>
            <Field label="Amount (£)">
              <input
                name="amount"
                required
                inputMode="decimal"
                pattern="[0-9]+(\.[0-9]{1,2})?"
                readOnly={createPending}
              />
            </Field>
            <Field label="Payment due (your local time)">
              <input name="due" type="datetime-local" readOnly={createPending} />
            </Field>
            <button>{busy ? 'Saving…' : 'Create fee request'}</button>
          </fieldset>
          {createPending && (
            <p role="status">
              The result is not confirmed. Retry these same details to avoid creating another fee
              request, or refresh payment records to check the result.
            </p>
          )}
        </form>
      )}
      <Field label="Show payment records">
        <select
          value={outstanding ? 'outstanding' : 'all'}
          onChange={(event) => {
            setOutstanding(event.target.value === 'outstanding');
            setPage(0);
          }}
        >
          <option value="all">All requests</option>
          <option value="outstanding">Outstanding only</option>
        </select>
      </Field>
      {result.outstanding_by_currency && (
        <div className="custom-forms-counts">
          {Object.entries(result.outstanding_by_currency).map(([currency, amount]) => (
            <span key={currency}>
              <strong>{feeAmount(amount, currency)}</strong> outstanding
            </span>
          ))}
        </div>
      )}
      {loading ? (
        <p role="status">Loading payment records…</p>
      ) : !result.rows.length ? (
        <p>No payment requests match this view.</p>
      ) : (
        result.rows.map((row) => (
          <FeeRequest
            key={`${row.id}-${row.paid_minor}-${row.status}`}
            row={row}
            canManage={canManage}
            onChanged={reload}
          />
        ))
      )}
      <div className="workspace-actions">
        <button disabled={loading || !page} onClick={() => setPage((value) => value - 1)}>
          Previous payments
        </button>
        <span>
          Page {page + 1} · {result.total} requests
        </span>
        <button
          disabled={loading || (page + 1) * 20 >= result.total}
          onClick={() => setPage((value) => value + 1)}
        >
          Next payments
        </button>
      </div>
    </section>
  );
}

function FeeRequest({ row, canManage, onChanged }) {
  const [open, setOpen] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reverse, setReverse] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      checked(
        supabase
          .from('fee_receipts')
          .select('*')
          .eq('fee_id', row.id)
          .order('created_at', { ascending: true })
          .limit(200),
      ),
      canManage
        ? checked(
            supabase
              .from('fee_audit')
              .select('*')
              .eq('fee_id', row.id)
              .order('created_at', { ascending: false })
              .limit(100),
          )
        : [],
    ])
      .then(([payments, events]) => {
        if (active) {
          setReceipts(payments || []);
          setAudit(events || []);
        }
      })
      .catch(() => {
        if (active)
          setError('Receipt details could not be loaded. Close this record and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, row.id, canManage]);
  async function run(operation) {
    setBusy(true);
    setError('');
    try {
      await operation();
      await onChanged();
      return { ok: true };
    } catch (failure) {
      setError(failure.message || 'The payment record could not be updated.');
      return { ok: false, uncertain: uncertainFeeWrite(failure) };
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="workspace-card">
      <h3>{row.title}</h3>
      <p>
        {feeAmount(row.amount_minor, row.currency)} ·{' '}
        {row.status === 'partial'
          ? 'Part paid'
          : row.status === 'void'
            ? 'Voided'
            : row.status === 'paid'
              ? 'Paid'
              : 'Unpaid'}
      </p>
      <p>
        Received: {feeAmount(row.paid_minor, row.currency)} · Outstanding:{' '}
        {feeAmount(row.outstanding_minor, row.currency)}
      </p>
      <p className="workspace-meta">Due: {dateLabel(row.due_at)}</p>
      {canManage && row.status !== 'void' && (
        <div className="workspace-actions">
          {row.outstanding_minor > 0 && row.currency === 'GBP' && (
            <button disabled={busy || confirmationPending} onClick={() => setConfirm(!confirm)}>
              {confirm ? 'Close receipt form' : 'Confirm a payment received'}
            </button>
          )}
          {row.paid_minor === 0 && (
            <button disabled={busy} onClick={() => setVoiding(!voiding)}>
              Void request
            </button>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmReceipt
          row={row}
          busy={busy}
          onPending={setConfirmationPending}
          onConfirm={(args) => run(() => feeWrite(supabase.rpc('confirm_fee_payment', args)))}
        />
      )}
      {voiding && (
        <ReasonForm
          label="Reason for voiding this request"
          button="Confirm void"
          busy={busy}
          onSubmit={(reason) =>
            run(() =>
              checked(supabase.rpc('void_fee_request', { p_fee_id: row.id, p_reason: reason })),
            )
          }
        />
      )}
      {row.voided_at && (
        <p>
          Voided {dateLabel(row.voided_at)}: {row.void_reason}
        </p>
      )}
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Receipts and history</summary>
        {loading && <p role="status">Loading receipts…</p>}
        {!loading && !receipts.length && <p>No receipts recorded.</p>}
        {receipts.map((receipt) => (
          <div className="custom-response-message" key={receipt.id}>
            <p>
              <strong>{feeAmount(receipt.amount_minor, row.currency)}</strong> ·{' '}
              {receipt.method === 'stripe'
                ? 'Verified Stripe payment'
                : receipt.method === 'reversal'
                  ? 'Reversal entry'
                  : 'Manually confirmed by staff'}
            </p>
            <p>{receipt.reference}</p>
            <p>{receipt.note}</p>
            <p className="workspace-meta">{dateLabel(receipt.created_at)}</p>
            {canManage &&
              receipt.method === 'manual' &&
              !receipts.some((candidate) => candidate.reversal_of === receipt.id) && (
                <button
                  disabled={busy}
                  onClick={() => setReverse(reverse === receipt.id ? null : receipt.id)}
                >
                  Correct this manual receipt
                </button>
              )}
            {reverse === receipt.id && (
              <ReasonForm
                label="Reason for reversing this receipt"
                button="Record reversal"
                busy={busy}
                onSubmit={(reason) =>
                  run(() =>
                    checked(
                      supabase.rpc('reverse_fee_receipt', {
                        p_receipt_id: receipt.id,
                        p_reason: reason,
                      }),
                    ),
                  )
                }
              />
            )}
          </div>
        ))}
        {receipts.length >= 200 && (
          <p className="workspace-meta">Showing the first 200 receipt entries.</p>
        )}
        {canManage && audit.length > 0 && (
          <details>
            <summary>Staff audit trail</summary>
            {audit.map((event) => (
              <p key={event.id} className="workspace-meta">
                {dateLabel(event.created_at)} · {event.action || event.kind}{' '}
                {event.details?.reason || event.reason || ''}
              </p>
            ))}
          </details>
        )}
      </details>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

function ConfirmReceipt({ row, busy, onConfirm, onPending }) {
  const attempt = useRef(crypto.randomUUID());
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <form
      className="workspace-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        const data = new FormData(event.currentTarget);
        try {
          const amount = poundsToMinor(data.get('amount'));
          if (amount > row.outstanding_minor)
            throw new Error('This amount exceeds the outstanding balance.');
          const result = await onConfirm({
            p_fee_id: row.id,
            p_amount_minor: amount,
            p_reference: String(data.get('reference')).trim(),
            p_note: String(data.get('note')).trim(),
            p_idempotency_key: attempt.current,
          });
          if (!result.ok) {
            setPending(result.uncertain);
            onPending(result.uncertain);
          }
        } catch (failure) {
          setError(failure.message);
        }
      }}
    >
      <fieldset disabled={busy}>
        <Field label="Amount received (£)">
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={(row.outstanding_minor / 100).toFixed(2)}
            readOnly={pending}
          />
        </Field>
        <Field label="Receipt or bank reference">
          <input name="reference" required maxLength={160} readOnly={pending} />
        </Field>
        <Field label="Note visible with this receipt">
          <textarea name="note" rows={2} maxLength={2000} readOnly={pending} />
        </Field>
        <label>
          <input type="checkbox" required /> I have checked that this payment was received.
        </label>
        <button>{busy ? 'Saving…' : 'Record manual confirmation'}</button>
      </fieldset>
      {pending && (
        <p role="status">
          The payment result is not confirmed. Retry these same details to avoid recording it twice,
          or refresh payment records to check the result.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function ReasonForm({ label, button, busy, onSubmit }) {
  return (
    <form
      className="workspace-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(String(new FormData(event.currentTarget).get('reason')).trim());
      }}
    >
      <fieldset disabled={busy}>
        <Field label={label}>
          <textarea name="reason" required maxLength={2000} rows={2} />
        </Field>
        <p className="workspace-meta">
          This creates an audit entry. It does not send a refund or move money.
        </p>
        <button>{button}</button>
      </fieldset>
    </form>
  );
}
