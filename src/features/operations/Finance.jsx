import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Printer, Check, ArrowRight } from 'lucide-react';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';
import { londonDate } from '@/lib/timetable';
import { SITE } from '@/content/site';
import { BANK_DETAILS, money, toPence } from './model';
import { Field, LoadState, Notice, PortalGate, Stats, rpc, useRecords } from './shared';

const kinds = [
  ['janazah', 'Janazah'],
  ['madrassah', 'Madrassah'],
  ['hall', 'Hall hire'],
  ['other', 'Other service'],
];
const dateLabel = (value) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', {
        timeZone: 'Europe/London',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const financeLoader = async (signal) => {
  const { data, error } = await supabase.rpc('community_finance_overview').abortSignal(signal);
  if (error) throw error;
  return data;
};
const personalLoader = async (signal) => {
  const { data, error } = await supabase.rpc('my_community_invoices').abortSignal(signal);
  if (error) throw error;
  return data || [];
};
function printDocument(element) {
  const frame = document.createElement('iframe');
  frame.title = 'Invoice print document';
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = `<!doctype html><html><head><title>JIC invoice</title><style>body{font:14px/1.6 system-ui;color:#14262c;margin:32px}h2{font-size:28px}h3{margin-top:24px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ccc;padding:10px}dl>div{display:flex;justify-content:space-between;gap:20px}dt{font-weight:600}dd{margin:0}.ops-preserve{white-space:pre-wrap}.ops-invoice-head{display:flex;justify-content:space-between;gap:32px}.ops-invoice-total{text-align:right;font-size:20px}.ops-badge{text-transform:uppercase;letter-spacing:.1em}.ops-help{font-size:12px;color:#455}button{display:none}@page{size:A4;margin:15mm}</style></head><body>${element.outerHTML}</body></html>`;
  document.body.appendChild(frame);
}
export function InvoiceDocument({ invoice: i }) {
  const ref = useRef();
  const issuer = i.issuer || {
    name: 'Draft — issuer details added on issue',
    address: '',
    email: '',
  };
  const outstanding =
    i.status === 'void' ? 0 : Math.max(0, i.total_pence - Number(i.paid_pence || 0));
  return (
    <div>
      <div className="ops-heading ops-no-print">
        <span className="ops-badge">{i.status}</span>
        <button type="button" className="ops-secondary" onClick={() => printDocument(ref.current)}>
          <Printer size={17} /> Print / save PDF
        </button>
      </div>
      <article ref={ref} className="ops-invoice-document">
        <div className="ops-invoice-head">
          <div>
            <p className="ops-eyebrow">
              {i.status === 'draft' ? 'Draft invoice — not issued' : 'Invoice'}
            </p>
            <h2>{i.number || 'Draft'}</h2>
            <p className="ops-preserve">
              <strong>{issuer.name}</strong>
              <br />
              {issuer.address}
              <br />
              {issuer.email}
            </p>
            {issuer.registration_note && <p>{issuer.registration_note}</p>}
          </div>
          <div>
            <h3>Bill to</h3>
            <p className="ops-preserve">
              {i.recipient_name}
              <br />
              {i.recipient_address}
              <br />
              {i.recipient_email}
            </p>
          </div>
        </div>
        <dl className="ops-invoice-dates">
          <div>
            <dt>Invoice date</dt>
            <dd>{dateLabel(i.issued_at)}</dd>
          </div>
          <div>
            <dt>Supply date</dt>
            <dd>{dateLabel(i.supply_date)}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{dateLabel(i.due_date)}</dd>
          </div>
        </dl>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Service / item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {i.lines.map((line, index) => (
                <tr key={index}>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{money(line.unit_pence)}</td>
                  <td>{money(line.quantity * line.unit_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ops-invoice-total">
          <p>
            Total <strong>{money(i.total_pence)}</strong>
          </p>
          <p>
            Recorded payments <strong>{money(i.paid_pence || 0)}</strong>
          </p>
          <p>
            Balance due <strong>{money(outstanding)}</strong>
          </p>
        </div>
        {i.status !== 'draft' && <p>{issuer.vat}</p>}
        {i.status === 'void' ? (
          <p className="ops-notice">Void: {i.void_reason}</p>
        ) : (
          <>
            <h3>Payment details</h3>
            <p>
              {BANK_DETAILS.bank} · {BANK_DETAILS.accountName}
              <br />
              Sort code {BANK_DETAILS.sortCode} · Account {BANK_DETAILS.accountNumber}
              <br />
              Reference: <strong>{i.number || 'Available when issued'}</strong>
            </p>
          </>
        )}
        {i.notes && <p className="ops-preserve">{i.notes}</p>}
        <p className="ops-help">This is a service invoice, not a charitable donation receipt.</p>
      </article>
    </div>
  );
}
function PaymentForm({ invoice, campaigns = [], onSaved }) {
  const [amount, setAmount] = useState(
    invoice ? String(Math.max(0, invoice.total_pence - Number(invoice.paid_pence || 0)) / 100) : '',
  );
  const [campaign, setCampaign] = useState(''),
    [date, setDate] = useState(londonDate()),
    [method, setMethod] = useState('bank'),
    [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const attempt = useRef(null);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const args = {
        p_invoice: invoice?.id || null,
        p_campaign: invoice ? null : campaign,
        p_amount: toPence(amount),
        p_date: date,
        p_method: method,
        p_reference: reference.trim(),
      };
      const signature = JSON.stringify(args);
      if (attempt.current?.signature !== signature)
        attempt.current = { signature, key: crypto.randomUUID() };
      await rpc('record_community_payment', { ...args, p_key: attempt.current.key });
      attempt.current = null;
      setAmount('');
      setReference('');
      setConfirmed(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="ops-form ops-panel" onSubmit={save}>
      <h3>{invoice ? 'Record a received payment' : 'Confirm a campaign donation'}</h3>
      <fieldset disabled={busy}>
        {!invoice && (
          <Field label="Approved campaign">
            <select required value={campaign} onChange={(e) => setCampaign(e.target.value)}>
              <option value="">Choose a campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.reference}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="ops-form-grid">
          <Field label="Amount (£)">
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Received on">
            <input
              required
              type="date"
              max={londonDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
          </Field>
          <Field label="Bank / receipt reference">
            <input
              required
              minLength={2}
              maxLength={200}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        </div>
        <label className="ops-check">
          <input
            required
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I have checked that JIC has received this payment.</span>
        </label>
        <button className="ops-button" disabled={busy}>
          {busy ? 'Recording…' : 'Record received payment'}
        </button>
      </fieldset>
      <Notice error={error} />
    </form>
  );
}
function InvoiceEditor({ invoice, onSaved, onCancel }) {
  const initial = () =>
    invoice
      ? {
          ...invoice,
          share: Boolean(invoice.member_id),
          lines: invoice.lines.map((l) => ({ ...l, amount: String(l.unit_pence / 100) })),
        }
      : {
          kind: 'janazah',
          recipient_name: '',
          recipient_address: '',
          recipient_email: '',
          share: false,
          supply_date: londonDate(),
          due_date: londonDate(),
          notes: '',
          lines: [{ description: '', quantity: 1, amount: '' }],
        };
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const baseline = useRef(JSON.stringify(initial()));
  const formRef = useRef();
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const item = (index, key, value) =>
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    }));
  async function save() {
    if (!formRef.current.reportValidity()) return false;
    setBusy(true);
    setError('');
    try {
      const member_id = form.share
        ? await rpc('finance_member_by_email', { p_email: form.recipient_email })
        : null;
      const id = await rpc('save_community_invoice', {
        p_id: invoice?.id || null,
        p_body: {
          ...form,
          member_id,
          lines: form.lines.map((l) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unit_pence: toPence(l.amount),
          })),
        },
        p_version: invoice?.version || null,
      });
      baseline.current = JSON.stringify(form);
      onSaved(id);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useRegisterAdminSave(save, JSON.stringify(form) !== baseline.current, 'Save invoice draft', busy);
  return (
    <form
      ref={formRef}
      className="ops-panel ops-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="ops-heading">
        <h2>{invoice ? 'Edit draft' : 'New invoice'}</h2>
        <button
          type="button"
          className="ops-secondary"
          disabled={busy}
          onClick={() => {
            if (
              JSON.stringify(form) === baseline.current ||
              window.confirm('Discard this invoice draft?')
            )
              onCancel();
          }}
        >
          Close
        </button>
      </div>
      <fieldset disabled={busy}>
        <Field label="Service">
          <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            {kinds.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer name">
          <input
            required
            minLength={2}
            maxLength={160}
            value={form.recipient_name}
            onChange={(e) => set('recipient_name', e.target.value)}
          />
        </Field>
        <Field label="Customer address">
          <textarea
            required
            minLength={5}
            maxLength={600}
            rows={3}
            value={form.recipient_address}
            onChange={(e) => set('recipient_address', e.target.value)}
          />
        </Field>
        <Field label="Customer email">
          <input
            type="email"
            required={form.share}
            maxLength={254}
            value={form.recipient_email}
            onChange={(e) => set('recipient_email', e.target.value)}
          />
        </Field>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={form.share}
            onChange={(e) => set('share', e.target.checked)}
          />
          <span>
            Share the issued invoice with the verified portal account using this email. Confirm the
            recipient before enabling.
          </span>
        </label>
        <div className="ops-form-grid">
          <Field label="Supply / service date">
            <input
              required
              type="date"
              value={form.supply_date}
              onChange={(e) => set('supply_date', e.target.value)}
            />
          </Field>
          <Field label="Payment due">
            <input
              required
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </Field>
        </div>
        <h3>Invoice items</h3>
        {form.lines.map((l, index) => (
          <div className="ops-line-item" key={index}>
            <Field label={`Item ${index + 1}`}>
              <input
                required
                minLength={2}
                maxLength={300}
                value={l.description}
                onChange={(e) => item(index, 'description', e.target.value)}
              />
            </Field>
            <Field label="Qty">
              <input
                type="number"
                min={1}
                max={10000}
                required
                value={l.quantity}
                onChange={(e) => item(index, 'quantity', e.target.value)}
              />
            </Field>
            <Field label="Unit price (£)">
              <input
                required
                inputMode="decimal"
                value={l.amount}
                onChange={(e) => item(index, 'amount', e.target.value)}
              />
            </Field>
            {form.lines.length > 1 && (
              <button
                className="ops-secondary"
                type="button"
                aria-label={`Remove item ${index + 1}`}
                onClick={() =>
                  set(
                    'lines',
                    form.lines.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {form.lines.length < 30 && (
          <button
            className="ops-secondary"
            type="button"
            onClick={() =>
              set('lines', [...form.lines, { description: '', quantity: 1, amount: '' }])
            }
          >
            <Plus size={16} /> Add item
          </button>
        )}
        <Field label="Notes (optional)">
          <textarea
            maxLength={2000}
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
        <p className="ops-help">
          Save a draft first. Issuing gives it a unique number and locks the invoice details. This
          module supports invoices with no VAT charged.
        </p>
        <button className="ops-button" disabled={busy}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
      </fieldset>
      <Notice error={error} />
    </form>
  );
}
function FinanceSettings({ settings, onSaved }) {
  const initial = settings || {
    issuer_name: SITE.name,
    issuer_address: SITE.address.full,
    issuer_email: SITE.email,
    registration_note: '',
    non_vat_confirmed: false,
  };
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const baseline = useRef(JSON.stringify(initial));
  const formRef = useRef();
  async function save() {
    if (!formRef.current.reportValidity()) return false;
    setBusy(true);
    setError('');
    try {
      await rpc('save_community_finance_settings', { p_body: form });
      baseline.current = JSON.stringify(form);
      onSaved();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  useRegisterAdminSave(
    save,
    JSON.stringify(form) !== baseline.current,
    'Save finance settings',
    busy,
  );
  return (
    <form
      ref={formRef}
      className="ops-panel ops-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2>Invoice issuer</h2>
      <p>
        Confirm the organisation’s details before the first invoice. Issued invoices keep a snapshot
        of these details.
      </p>
      <fieldset disabled={busy}>
        {[
          ['issuer_name', 'Legal / trading name', 2, 160],
          ['issuer_address', 'Postal address', 10, 600],
          ['issuer_email', 'Contact email', 5, 254],
          ['registration_note', 'Registration details (optional)', 0, 200],
        ].map(([key, label, min, max]) => (
          <Field label={label} key={key}>
            <input
              required={min > 0}
              type={key === 'issuer_email' ? 'email' : 'text'}
              minLength={min}
              maxLength={max}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </Field>
        ))}
        <label className="ops-check">
          <input
            type="checkbox"
            checked={form.non_vat_confirmed}
            onChange={(e) => setForm((f) => ({ ...f, non_vat_confirmed: e.target.checked }))}
          />
          <span>
            I have confirmed these details and that JIC may issue these invoices without VAT. If VAT
            is required, leave this off and use your accounting system.
          </span>
        </label>
        <button className="ops-button" disabled={busy}>
          {busy ? 'Saving…' : 'Save issuer details'}
        </button>
      </fieldset>
      <Notice error={error} />
    </form>
  );
}
export default function FinanceManager() {
  const state = useRecords(financeLoader);
  const [tab, setTab] = useState('invoices'),
    [selected, setSelected] = useState(null),
    [editor, setEditor] = useState(null),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const data = state.data;
  const chosen = data?.invoices.find((i) => i.id === selected);
  const invoices =
    data?.invoices.filter((i) =>
      `${i.number || 'draft'} ${i.recipient_name} ${i.kind}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  async function act(name, args, success) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await rpc(name, args);
      setMessage(success);
      state.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-admin">
      <header className="ops-heading">
        <div>
          <p className="ops-eyebrow">Treasurer’s workspace</p>
          <h1>Finance</h1>
          <p>Invoices, received payments and confirmed fundraising.</p>
        </div>
        <button
          className="ops-button"
          onClick={() => {
            setEditor('new');
            setTab('invoices');
          }}
          disabled={Boolean(editor) || busy}
        >
          <Plus size={17} /> New invoice
        </button>
      </header>
      <LoadState state={state} />
      <Notice error={error} message={message} />
      {data && (
        <>
          <Stats
            items={[
              ['Outstanding', money(data.outstanding), 'Issued invoices'],
              ['Overdue', money(data.overdue), 'Past the due date'],
              ['Fees received', money(data.received), 'Net recorded payments'],
              ['Campaign giving', money(data.donations), 'Confirmed donations'],
            ]}
          />
          <div className="ops-panel">
            <div className="ops-heading">
              <h2>Received over six months</h2>
              <small>GBP · fees + campaign donations · net of corrections</small>
            </div>
            <div
              className="ops-chart"
              role="img"
              aria-label={data.months.map((m) => `${m.label}: ${money(m.total)}`).join(', ')}
            >
              {data.months.map((m) => (
                <div className="ops-chart-column" key={m.key}>
                  <span>{money(m.total)}</span>
                  <div className="ops-chart-track">
                    <i
                      style={{
                        height: `${(Math.max(0, m.total) / Math.max(1, ...data.months.map((n) => n.total))) * 100}%`,
                      }}
                    />
                  </div>
                  <small>{m.label}</small>
                </div>
              ))}
            </div>
            {data.months.every((m) => m.total === 0) && (
              <p className="ops-help">Your chart will grow as received payments are recorded.</p>
            )}
          </div>
          <nav className="ops-tabs" aria-label="Finance areas">
            {[
              ['invoices', 'Invoices'],
              ['donations', 'Campaign donations'],
              ['payments', 'Payment history'],
              ['settings', 'Issuer settings'],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                disabled={Boolean(editor)}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'settings' && (
            <FinanceSettings
              key={data.settings?.updated_at || 'initial'}
              settings={data.settings}
              onSaved={() => {
                setMessage('Issuer settings saved.');
                state.refresh();
              }}
            />
          )}
          {tab === 'donations' && (
            <PaymentForm
              campaigns={data.campaigns}
              onSaved={() => {
                setMessage('Donation confirmed. The public campaign total will update.');
                state.refresh();
              }}
            />
          )}
          {tab === 'payments' && (
            <div className="ops-panel">
              <h2>Latest 100 payment entries</h2>
              <p className="ops-help">
                Corrections add a reversing entry. They do not send a bank refund.
              </p>
              {data.payments.length === 0 && <p>No payments recorded yet.</p>}
              <div className="ops-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{dateLabel(p.happened_on)}</td>
                        <td>{p.reference}</td>
                        <td>
                          {p.invoice_id ? 'Invoice' : 'Donation'} · {p.method}
                        </td>
                        <td>{money(p.amount_pence)}</td>
                        <td>
                          {p.amount_pence > 0 && !p.reversed ? (
                            <button
                              className="ops-secondary"
                              disabled={busy}
                              onClick={() => {
                                const reason = window.prompt(
                                  'Reason for correcting this entry (does not send a refund):',
                                );
                                if (reason)
                                  act(
                                    'reverse_community_payment',
                                    { p_id: p.id, p_reason: reason, p_key: crypto.randomUUID() },
                                    'Correction recorded.',
                                  );
                              }}
                            >
                              Correct entry
                            </button>
                          ) : p.reversed ? (
                            'Reversed'
                          ) : (
                            'Correction'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === 'invoices' &&
            (editor ? (
              <InvoiceEditor
                key={editor}
                invoice={editor === 'new' ? null : data.invoices.find((i) => i.id === editor)}
                onCancel={() => setEditor(null)}
                onSaved={(id) => {
                  setEditor(null);
                  setSelected(id);
                  setMessage('Invoice draft saved. Review it before issuing.');
                  state.refresh();
                }}
              />
            ) : (
              <div className="ops-finance-layout">
                <aside className="ops-panel">
                  <Field label="Find an invoice">
                    <input
                      type="search"
                      placeholder="Name, invoice number or service"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Field>
                  <p className="ops-help">Latest 100 invoices</p>
                  {!invoices.length && <p>No matching invoices. Use New invoice to start.</p>}
                  <div className="ops-invoice-list">
                    {invoices.map((i) => (
                      <button
                        key={i.id}
                        aria-pressed={selected === i.id}
                        onClick={() => setSelected(i.id)}
                      >
                        <span>
                          <strong>{i.recipient_name}</strong>
                          <small>
                            {i.number || 'Draft'} · {i.kind}
                          </small>
                        </span>
                        <span>
                          {money(i.total_pence)}
                          <small>
                            {i.status === 'issued' && i.total_pence <= i.paid_pence
                              ? 'Paid'
                              : i.status}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>
                <div>
                  {chosen ? (
                    <>
                      <div className="ops-panel">
                        <InvoiceDocument invoice={chosen} />
                        <div className="ops-actions">
                          {chosen.status === 'draft' && (
                            <>
                              <button
                                className="ops-secondary"
                                disabled={busy}
                                onClick={() => setEditor(chosen.id)}
                              >
                                Edit draft
                              </button>
                              <button
                                className="ops-button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Issue this invoice? Its details will be locked and it will appear in the linked member’s portal.',
                                    )
                                  )
                                    act(
                                      'issue_community_invoice',
                                      { p_id: chosen.id, p_version: chosen.version },
                                      'Invoice issued. You can now print it or record payment.',
                                    );
                                }}
                              >
                                <Check size={17} /> Issue invoice
                              </button>
                            </>
                          )}
                          {chosen.status !== 'void' && (
                            <button
                              className="ops-secondary"
                              disabled={busy}
                              onClick={() => {
                                const reason = window.prompt('Why should this invoice be void?');
                                if (reason)
                                  act(
                                    'void_community_invoice',
                                    { p_id: chosen.id, p_reason: reason },
                                    'Invoice marked void.',
                                  );
                              }}
                            >
                              Void invoice
                            </button>
                          )}
                        </div>
                      </div>
                      {chosen.status === 'issued' && chosen.paid_pence < chosen.total_pence && (
                        <PaymentForm
                          key={`${chosen.id}-${chosen.paid_pence}`}
                          invoice={chosen}
                          onSaved={() => {
                            setMessage('Payment recorded.');
                            state.refresh();
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="ops-empty">
                      <h2>Choose an invoice</h2>
                      <p>Review details, issue a draft, record a payment or print a copy.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </>
      )}
    </section>
  );
}
export function MyInvoicesPage() {
  return (
    <PortalGate destination="/account/invoices">
      <MyInvoices />
    </PortalGate>
  );
}
function MyInvoices() {
  const state = useRecords(personalLoader);
  const [id, setId] = useState(null);
  const selected = state.data?.find((i) => i.id === id);
  return (
    <div className="ops-page">
      <Link to="/portal">← My account</Link>
      <header className="ops-intro">
        <p className="ops-eyebrow">Your JIC records</p>
        <h1>My invoices</h1>
        <p>
          See invoices shared with your verified account and the payments recorded against them.
        </p>
      </header>
      <LoadState state={state} />
      {state.data?.length === 0 && (
        <div className="ops-empty">
          <h2>You have no shared invoices.</h2>
          <p>When the office links an issued invoice to your account, it will appear here.</p>
        </div>
      )}
      <div className="ops-finance-layout">
        <div className="ops-invoice-list">
          {state.data?.map((i) => (
            <button key={i.id} aria-pressed={id === i.id} onClick={() => setId(i.id)}>
              <span>
                <strong>{i.number}</strong>
                <small>
                  {i.kind} · {dateLabel(i.due_date)}
                </small>
              </span>
              <span>
                {money(i.total_pence)}
                <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
        {selected && (
          <div className="ops-panel">
            <InvoiceDocument invoice={selected} />
          </div>
        )}
      </div>
    </div>
  );
}
