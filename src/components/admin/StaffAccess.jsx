import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';
import AccessChecklist from '@/features/access/AccessChecklist';
import DeleteAccount from '@/features/access/DeleteAccount';
import { canManageAccount, PERMISSIONS } from '../../../supabase/functions/_shared/access.js';

const emptyAccess = () => ({ permissions: [], staff_kinds: [] });
export default function StaffAccess() {
  const { user, profile, can } = useAuth();
  const allowed = can('users');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [access, setAccess] = useState(emptyAccess);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState({});
  const [requests, setRequests] = useState([]);
  const [requestDrafts, setRequestDrafts] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const inFlight = useRef(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,is_owner,is_active,permissions,staff_kinds')
      .order('created_at');
    if (error) throw error;
    setRows(data || []);
  }, []);
  const invoke = useCallback(async (body) => {
    const { data, error } = await supabase.functions.invoke('manage-user', { body });
    if (error) {
      const details = await error.context
        ?.clone?.()
        .json()
        .catch(() => null);
      throw new Error(details?.error || error.message || 'The request could not be completed.');
    }
    if (!data?.ok) throw new Error(data?.error || 'The request could not be completed.');
    return data;
  }, []);
  const loadRequests = useCallback(async () => {
    const result = await invoke({ action: 'list_access_requests' });
    setRequests(result.requests || []);
  }, [invoke]);
  useEffect(() => {
    if (!allowed) return;
    Promise.all([load(), loadRequests()])
      .catch(() =>
        setNotice({
          error: true,
          text: 'People or access requests could not be loaded. Please refresh.',
        }),
      )
      .finally(() => setLoading(false));
  }, [allowed, load, loadRequests]);
  const run = useCallback(async (action, work, rethrow = false) => {
    if (inFlight.current) {
      if (rethrow) throw new Error('Please wait for the current request.');
      return;
    }
    inFlight.current = true;
    setBusy(action);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      setNotice({ error: true, text: error.message });
      if (rethrow) throw error;
    } finally {
      inFlight.current = false;
      setBusy('');
    }
  }, []);
  const save = useCallback(
    () =>
      run(
        'permissions',
        async () => {
          for (const [id, value] of Object.entries(pending)) {
            await invoke({ action: 'set_permissions', user_id: id, ...value });
            setRows((current) =>
              current.map((row) => (row.id === id ? { ...row, ...value } : row)),
            );
            // Remove only the saved draft, retaining later edits or a failed account update.
            setPending((current) => {
              if (current[id] !== value) return current;
              const remaining = { ...current };
              delete remaining[id];
              return remaining;
            });
          }
          setNotice({ text: 'Permissions saved.' });
        },
        true,
      ),
    [invoke, pending, run],
  );
  useRegisterAdminSave(save, Object.keys(pending).length > 0, 'Save permissions', Boolean(busy));
  if (!allowed) return <p>You need people-management permission to open this section.</p>;
  const approveRequest = async (request) => {
    const draft = requestDrafts[request.id] || { permissions: [], staff_kinds: [] };
    await run(`approve-${request.id}`, async () => {
      await invoke({ action: 'approve_access_request', request_id: request.id, ...draft });
      setNotice({ text: 'Request approved. Access has been updated.' });
      await Promise.all([load(), loadRequests()]);
    });
  };
  const rejectRequest = async (request) => {
    await run(`reject-${request.id}`, async () => {
      await invoke({ action: 'reject_access_request', request_id: request.id });
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setNotice({ text: 'Request declined.' });
    });
  };
  const invite = (event) => {
    event.preventDefault();
    run('invite', async () => {
      await invoke({ action: 'invite', email: email.trim(), display_name: name.trim(), ...access });
      setEmail('');
      setName('');
      setAccess(emptyAccess());
      setInviteOpen(false);
      setNotice({
        text: 'Invitation sent. The recipient can set their password using the email link.',
      });
      await load();
    });
  };
  return (
    <div className="admin-staff-access">
      <h2>People & access</h2>
      <p>Add members, volunteers or staff, then choose what they can manage.</p>
      {notice && (
        <p
          className={notice.error ? 'admin-error' : 'admin-success'}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      <div className="admin-heading admin-staff-list-heading">
        <div>
          <h3>People</h3>
          <p>Open a person to change their access.</p>
        </div>
        <button
          type="button"
          className="admin-button primary"
          aria-expanded={inviteOpen}
          onClick={() => setInviteOpen((value) => !value)}
        >
          <UserPlus size={18} />
          {inviteOpen ? 'Close' : 'Add person'}
        </button>
      </div>
      {inviteOpen && (
        <form onSubmit={invite} className="admin-panel admin-staff-invite-inline">
          <fieldset disabled={Boolean(busy)}>
            <div className="admin-access-grid">
              <label>
                Name
                <input
                  autoComplete="name"
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            <details className="admin-staff-invite-access" open>
              <summary>Role & access</summary>
              <AccessChecklist actor={profile} value={access} onChange={setAccess} />
            </details>
            <div className="admin-actions">
              <button className="admin-button primary">
                <UserPlus size={18} />
                {busy === 'invite' ? 'Sending…' : 'Send invitation'}
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  setInviteOpen(false);
                  setEmail('');
                  setName('');
                  setAccess(emptyAccess());
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}

      <AccessRequests
        requests={requests}
        drafts={requestDrafts}
        setDrafts={setRequestDrafts}
        busy={busy}
        actor={profile}
        onApprove={approveRequest}
        onReject={rejectRequest}
      />
      {loading ? (
        <p role="status">Loading people…</p>
      ) : (
        rows.map((row) => {
          const own = row.id === user?.id;
          const editable = !own && canManageAccount(profile, row);
          const value = pending[row.id] || {
            permissions: row.permissions,
            staff_kinds: row.staff_kinds,
          };
          return (
            <details className="admin-panel" key={row.id}>
              <summary>
                {row.display_name || 'Person'}
                {own ? ' (you)' : ''} ·{' '}
                {row.is_owner
                  ? 'Owner'
                  : row.permissions.length
                    ? `${row.permissions.length} staff permissions`
                    : 'Portal only'}{' '}
                · {row.is_active ? 'Enabled' : 'Disabled'}
              </summary>
              {row.is_owner ? (
                <p>Owner access is protected and cannot be changed here.</p>
              ) : (
                <AccessChecklist
                  actor={profile}
                  value={value}
                  disabled={Boolean(busy) || !editable}
                  onChange={(next) => setPending((current) => ({ ...current, [row.id]: next }))}
                />
              )}
              {!editable && !row.is_owner && (
                <p>
                  {own
                    ? 'Another authorised manager must change your permissions.'
                    : 'You can manage only accounts whose permissions you also hold.'}
                </p>
              )}
              <div className="admin-actions">
                <button
                  className="admin-button"
                  type="button"
                  disabled={Boolean(busy) || !editable}
                  role="switch"
                  aria-checked={row.is_active}
                  onClick={() =>
                    run(row.id, async () => {
                      await invoke({
                        action: 'set_active',
                        user_id: row.id,
                        is_active: !row.is_active,
                      });
                      setRows((current) =>
                        current.map((item) =>
                          item.id === row.id ? { ...item, is_active: !row.is_active } : item,
                        ),
                      );
                      setNotice({ text: `Account ${row.is_active ? 'disabled' : 'enabled'}.` });
                    })
                  }
                >
                  {row.is_active ? 'Disable access' : 'Enable access'}
                </button>
                <button
                  className="admin-button"
                  type="button"
                  disabled={Boolean(busy) || !row.is_active || (!editable && !own)}
                  onClick={() =>
                    run(`setup-${row.id}`, async () => {
                      await invoke({ action: 'send_setup', user_id: row.id });
                      setNotice({ text: 'A password reset email has been sent.' });
                    })
                  }
                >
                  Send password reset
                </button>
              </div>
              <DeleteAccount
                actor={profile}
                account={row}
                disabled={Boolean(busy)}
                hasPendingChanges={Boolean(pending[row.id])}
                onDelete={(confirmation) =>
                  run(
                    `delete-${row.id}`,
                    async () => {
                      const result = await invoke({
                        action: 'delete',
                        user_id: row.id,
                        confirmation,
                      });
                      setRows((current) => current.filter((item) => item.id !== row.id));
                      setPending((current) => {
                        const remaining = { ...current };
                        delete remaining[row.id];
                        return remaining;
                      });
                      setNotice({ text: result.warning || 'Account deleted.' });
                    },
                    true,
                  )
                }
              />
              {pending[row.id] && (
                <button
                  className="admin-button primary"
                  disabled={Boolean(busy)}
                  onClick={() => save().catch(() => {})}
                >
                  Save permissions
                </button>
              )}
              {!row.permissions.length && !row.is_owner && (
                <p>Portal account only. No staff areas assigned.</p>
              )}
            </details>
          );
        })
      )}
      <p className="admin-tv-help">
        People with “{PERMISSIONS.find(([id]) => id === 'users')[1]}” can grant only permissions
        they already have.
      </p>
    </div>
  );
}

function AccessRequests({ requests, drafts, setDrafts, busy, actor, onApprove, onReject }) {
  if (!requests.length) return null;
  return (
    <section className="admin-access-requests" aria-labelledby="access-requests-title">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">PENDING</span>
          <h3 id="access-requests-title">Account requests</h3>
        </div>
        <span className="admin-hint">{requests.length} waiting</span>
      </div>
      {requests.map((request) => {
        const value = drafts[request.id] || { permissions: [], staff_kinds: [] };
        return (
          <article className="admin-panel admin-access-request" key={request.id}>
            <div>
              <h4>{request.display_name}</h4>
              <p>
                {request.email} · {request.requested_role.replace('_', ' ')}
              </p>
              {request.requested_features?.length > 0 && (
                <p className="admin-hint">Asked for: {request.requested_features.join(', ')}</p>
              )}
              {request.message && <p>{request.message}</p>}
            </div>
            <AccessChecklist
              actor={actor}
              value={value}
              onChange={(next) => setDrafts((current) => ({ ...current, [request.id]: next }))}
              disabled={Boolean(busy)}
            />
            <div className="admin-actions">
              <button
                className="admin-button primary"
                disabled={Boolean(busy)}
                onClick={() => onApprove(request)}
              >
                Approve access
              </button>
              <button
                className="admin-button"
                disabled={Boolean(busy)}
                onClick={() => onReject(request)}
              >
                Decline
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
