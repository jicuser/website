import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const names = { contact: 'Contact', madrassah: 'Madrassah', itikaaf: 'I’tikaf' };

export default function FormsInbox() {
  const [status, setStatus] = useState('new');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    // RLS returns only forms assigned to the signed-in staff role.
    supabase
      .from('form_submissions')
      .select('id,kind,payload,status,created_at')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(page * 25, page * 25 + 24)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setRows(data || []);
        if (loadError) setError('Forms could not be loaded. Please try again.');
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setError('Forms could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, refresh]);

  async function setComplete(row) {
    setBusy(row.id);
    setError('');
    try {
      const { error: saveError } = await supabase
        .from('form_submissions')
        .update({ status: row.status === 'new' ? 'done' : 'new' })
        .eq('id', row.id)
        .select('id')
        .single();
      if (saveError) throw saveError;
      setRefresh((value) => value + 1);
    } catch {
      setError('The status could not be saved. Please try again.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="admin-heading">
        <div>
          <h2>Forms inbox</h2>
          <p>Messages and registrations assigned to your role.</p>
        </div>
        <button
          className="admin-button"
          disabled={loading || Boolean(busy)}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <label className="block max-w-xs">
        Show
        <select
          className="mt-1 w-full rounded-lg border bg-white p-3"
          value={status}
          disabled={Boolean(busy)}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
        >
          <option value="new">Needs a reply</option>
          <option value="done">Completed</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading forms…</p>
      ) : rows.length === 0 ? (
        <p>No forms here yet.</p>
      ) : (
        rows.map((row) => (
          <details className="rounded-xl border bg-white p-4" key={row.id}>
            <summary className="cursor-pointer break-words font-semibold">
              {names[row.kind]} · {row.payload.name || row.payload.attendee_name}
              <span className="mt-1 block text-sm font-normal">
                {new Date(row.created_at).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  hour12: true,
                  timeZone: 'Europe/London',
                })}
              </span>
            </summary>
            <dl className="my-4 grid min-w-0 gap-3">
              {Object.entries(row.payload)
                .filter(([, value]) => value !== '')
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-semibold capitalize">{key.replaceAll('_', ' ')}</dt>
                    <dd className="whitespace-pre-wrap break-words">{String(value)}</dd>
                  </div>
                ))}
            </dl>
            <button
              className="admin-button"
              disabled={Boolean(busy)}
              onClick={() => setComplete(row)}
            >
              {busy === row.id ? 'Saving…' : row.status === 'new' ? 'Mark completed' : 'Reopen'}
            </button>
          </details>
        ))
      )}
      <div className="flex gap-3">
        <button
          className="admin-button"
          disabled={loading || Boolean(busy) || page === 0}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <button
          className="admin-button"
          disabled={loading || Boolean(busy) || rows.length < 25}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
