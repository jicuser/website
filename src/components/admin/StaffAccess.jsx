import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';
import AccessChecklist from '@/features/access/AccessChecklist';
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
  const [pending, setPending] = useState({});
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
  useEffect(() => {
    if (!allowed) return;
    load()
      .catch(() => setNotice({ error: true, text: 'Staff could not be loaded. Please refresh.' }))
      .finally(() => setLoading(false));
  }, [allowed, load]);
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
  useRegisterAdminSave(save, Object.keys(pending).length > 0, 'Save permissions');
  if (!allowed) return <p>You need staff-management permission to open this section.</p>;
  const invite = (event) => {
    event.preventDefault();
    run('invite', async () => {
      await invoke({ action: 'invite', email: email.trim(), display_name: name.trim(), ...access });
      setEmail('');
      setName('');
      setAccess(emptyAccess());
      setNotice({
        text: 'Invitation sent. The recipient can set their password using the email link.',
      });
      await load();
    });
  };
  return (
    <div className="admin-staff-access">
      <h2>Staff access</h2>
      <p>Tick exactly what each person can manage. Labels never select permissions for you.</p>
      {notice && (
        <p
          className={notice.error ? 'admin-error' : 'admin-success'}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      <form onSubmit={invite} className="admin-panel">
        <h3>Invite someone</h3>
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
          <AccessChecklist actor={profile} value={access} onChange={setAccess} />
          <button className="admin-button primary">
            <UserPlus size={18} />
            {busy === 'invite' ? 'Sending…' : 'Send invitation'}
          </button>
        </fieldset>
      </form>
      <h3>Current staff</h3>
      {loading ? (
        <p role="status">Loading staff…</p>
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
                {row.display_name || 'Staff member'}
                {own ? ' (you)' : ''} ·{' '}
                {row.is_owner ? 'Owner' : `${row.permissions.length} permissions`} ·{' '}
                {row.is_active ? 'Enabled' : 'Disabled'}
              </summary>
              {row.is_owner ? (
                <p>Owner access is protected and cannot be reassigned here.</p>
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
                      setNotice({ text: 'A new setup email has been sent.' });
                    })
                  }
                >
                  Send setup email
                </button>
              </div>
              {pending[row.id] && (
                <button
                  className="admin-button primary"
                  disabled={Boolean(busy)}
                  onClick={() => save().catch(() => {})}
                >
                  Save permissions
                </button>
              )}
              {!row.permissions.length && !row.is_owner && <p>Public website access only.</p>}
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
