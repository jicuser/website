import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { checked, dateLabel, Field } from './shared';

/** Optional transport: unavailable configuration leaves the portal reply workflow intact. */
export default function CustomFormsEmail({ submissionId, recipient = '', subject, onReply }) {
  const [enabled, setEnabled] = useState(false);
  const [show, setShow] = useState(false);
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = useRef(crypto.randomUUID());
  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('form_email_capability', {
      p_submission_id: submissionId,
    });
    if (error) {
      setEnabled(false);
      return;
    }
    setEnabled(data?.enabled === true);
    const [sent, received] = await Promise.all([
      checked(
        supabase
          .from('form_email_outbox')
          .select('id,recipient,subject,status,last_error,created_at')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: false })
          .limit(50),
      ),
      checked(
        supabase
          .from('form_email_incoming')
          .select('id,sender,subject,body,status,created_at')
          .eq('submission_id', submissionId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(50),
      ),
    ]);
    setOutgoing(sent || []);
    setIncoming(received || []);
  }, [submissionId]);
  useEffect(() => {
    reload().catch(() => setMessage('Email history could not be loaded.'));
  }, [reload]);
  async function run(operation) {
    setBusy(true);
    setMessage('');
    try {
      await operation();
      await reload();
      await onReply();
    } catch (failure) {
      setMessage(failure.message || 'The email action could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {enabled && (
        <button disabled={busy} onClick={() => setShow(!show)}>
          {show ? 'Close email composer' : 'Compose an email reply'}
        </button>
      )}
      {enabled && show && (
        <form
          className="workspace-card workspace-form"
          onChange={() => {
            attempt.current = crypto.randomUUID();
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(async () => {
              await checked(
                supabase.rpc('queue_form_email', {
                  p_submission_id: submissionId,
                  p_recipient: String(data.get('recipient')).trim(),
                  p_subject: String(data.get('subject')).trim(),
                  p_body: String(data.get('body')).trim(),
                  p_idempotency_key: attempt.current,
                  p_acknowledged: data.get('acknowledged') === 'on',
                }),
              );
              attempt.current = crypto.randomUUID();
              setShow(false);
              setMessage('Email queued. Its delivery status is shown below.');
            });
          }}
        >
          <fieldset disabled={busy}>
            <Field label="Email recipient">
              <input
                name="recipient"
                type="email"
                required
                maxLength={254}
                defaultValue={recipient}
              />
            </Field>
            <Field label="Email subject">
              <input name="subject" required maxLength={160} defaultValue={subject} />
            </Field>
            <Field label="Email message">
              <textarea name="body" required rows={5} maxLength={6000} />
            </Field>
            <label>
              <input name="acknowledged" type="checkbox" required /> I have checked the recipient
              and message, and want to send this email.
            </label>
            <p className="workspace-meta">
              This also saves the reply in the portal. Delivery is confirmed separately below.
            </p>
            <button>{busy ? 'Queuing…' : 'Queue this email'}</button>
          </fieldset>
        </form>
      )}
      {outgoing.length > 0 && (
        <details>
          <summary>Email delivery history</summary>
          {outgoing.map((email) => (
            <div className="custom-response-message" key={email.id}>
              <p>{email.subject}</p>
              <p>
                {email.recipient} · {email.status.replaceAll('_', ' ')}
              </p>
              <p className="workspace-meta">{dateLabel(email.created_at)}</p>
              {email.last_error && (
                <p>Delivery needs attention. Check the email service before retrying.</p>
              )}
            </div>
          ))}
        </details>
      )}
      {incoming.length > 0 && (
        <section>
          <h3>Incoming email awaiting review</h3>
          <p className="workspace-meta">
            Email senders are not verified portal users. Check these messages before adding them to
            the conversation.
          </p>
          {incoming.map((email) => (
            <article className="workspace-card" key={email.id}>
              <h3>{email.subject}</h3>
              <p>
                {email.sender} · {dateLabel(email.created_at)}
              </p>
              <p>{email.body}</p>
              <div className="workspace-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      checked(
                        supabase.rpc('review_form_email', { p_id: email.id, p_accept: true }),
                      ),
                    )
                  }
                >
                  Add to conversation
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      checked(
                        supabase.rpc('review_form_email', { p_id: email.id, p_accept: false }),
                      ),
                    )
                  }
                >
                  Reject message
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}
