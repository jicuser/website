import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { supabase } from '@/lib/supabaseClient';

const ROLES = [
  { value: 'viewer', label: 'No admin access', description: 'Can use the public website only.' },
  { value: 'tv_operator', label: 'TV operator', description: 'Controls the hall TVs only.' },
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Manages notices, pictures and Madrassah enquiries.',
  },
  {
    value: 'events_manager',
    label: 'Events manager',
    description: 'Manages events, notices, pictures and Itikaaf registrations.',
  },
  {
    value: 'content_editor',
    label: 'Website editor',
    description: 'Edits pages, pictures, events, notices, the team, livestream and TVs.',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manages the website, timetable, TVs and all forms; can read the audit log.',
  },
  {
    value: 'super_admin',
    label: 'Super administrator',
    description: 'Full access, including inviting staff and changing their permissions.',
  },
];

const input =
  'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

export default function StaffAccess() {
  const { user, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [pendingRoles, setPendingRoles] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');
  const requestInProgress = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,display_name,role,is_active')
      .order('created_at');
    if (error) throw error;
    setRows(data || []);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    load()
      .catch(() =>
        setNotice({
          error: true,
          text: 'Staff accounts could not be loaded. Please refresh the page.',
        }),
      )
      .finally(() => setLoading(false));
  }, [isSuperAdmin, load]);

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

  const runRequest = useCallback(async (action, work, rethrow = false) => {
    if (requestInProgress.current) {
      if (rethrow) throw new Error('Please wait for the current staff request to finish.');
      return;
    }
    requestInProgress.current = true;
    setBusy(action);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      setNotice({ error: true, text: error.message || 'The request could not be completed.' });
      if (rethrow) throw error;
    } finally {
      requestInProgress.current = false;
      setBusy('');
    }
  }, []);

  const saveRoles = useCallback(
    () =>
      runRequest(
        'roles',
        async () => {
          const changes = Object.entries(pendingRoles);
          for (const [id, nextRole] of changes) {
            if (id === user?.id)
              throw new Error('Your own super administrator role cannot be changed here.');
            await invoke({ action: 'set_role', user_id: id, role: nextRole });
            setRows((current) =>
              current.map((row) => (row.id === id ? { ...row, role: nextRole } : row)),
            );
            // Keep any unsaved changes if a later request fails.
            setPendingRoles((current) => {
              const remaining = { ...current };
              if (remaining[id] === nextRole) delete remaining[id];
              return remaining;
            });
          }
          setNotice({
            text: changes.length === 1 ? 'Role saved.' : `${changes.length} roles saved.`,
          });
        },
        true,
      ),
    [invoke, pendingRoles, runRequest, user?.id],
  );
  useRegisterAdminSave(saveRoles, Object.keys(pendingRoles).length > 0, 'Save role changes');

  if (!isSuperAdmin) {
    return <p>Only a super administrator can manage staff accounts and permissions.</p>;
  }

  const invite = (event) => {
    event.preventDefault();
    runRequest('invite', async () => {
      await invoke({ action: 'invite', email: email.trim(), display_name: name.trim(), role });
      setEmail('');
      setName('');
      setNotice({ text: 'Invitation sent. The staff member can follow the link in their email.' });
      try {
        await load();
      } catch {
        setNotice({ text: 'Invitation sent. Refresh the page to update the staff list.' });
      }
    });
  };

  const toggleAccess = (row) => {
    if (row.id === user?.id) return;
    runRequest(row.id, async () => {
      const isActive = !row.is_active;
      await invoke({ action: 'set_active', user_id: row.id, is_active: isActive });
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, is_active: isActive } : item)),
      );
      setNotice({
        text: `${row.display_name || 'Staff member'}: access ${isActive ? 'enabled' : 'disabled'}.`,
      });
    });
  };

  const sendSetupEmail = (row) => {
    runRequest(`setup-${row.id}`, async () => {
      await invoke({ action: 'send_setup', user_id: row.id });
      setNotice({
        text: `Setup email sent to ${row.display_name || 'the staff member'}. Use the newest email link to choose a password.`,
      });
    });
  };

  return (
    <div className="min-w-0">
      <h2 className="text-2xl font-bold">Staff access</h2>
      <p className="mb-5 mt-2 text-sm text-slate-500">
        Invite staff, choose what they can manage, and switch account access on or off.
      </p>
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${notice.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {notice.text}
        </div>
      )}

      <form onSubmit={invite} className="mb-6 rounded-2xl border bg-white p-4 sm:p-5">
        <h3 className="mb-3 font-semibold">Invite someone</h3>
        <fieldset disabled={Boolean(busy)} className="grid min-w-0 gap-3 md:grid-cols-2">
          <label className="min-w-0">
            <span className={label}>Name</span>
            <input
              className={input}
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="min-w-0">
            <span className={label}>Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              className={input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="min-w-0">
            <span className={label}>What can they manage?</span>
            <select
              className={input}
              value={role}
              aria-describedby="invite-role-description"
              onChange={(event) => setRole(event.target.value)}
            >
              {ROLES.filter((item) => item.value !== 'viewer').map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span id="invite-role-description" className="mt-2 block text-sm text-slate-500">
              {ROLES.find((item) => item.value === role)?.description}
            </span>
          </label>
          <div className="self-start md:pt-5">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50">
              <UserPlus size={16} aria-hidden="true" />
              {busy === 'invite' ? 'Sending invitation…' : 'Send invitation'}
            </button>
          </div>
        </fieldset>
      </form>

      <h3 className="mb-2 font-semibold">Current staff</h3>
      <p className="mb-3 text-sm text-slate-500">
        Access switches save immediately. After changing a role, press Save role changes at the top.
      </p>
      {loading ? (
        <p role="status">Loading staff…</p>
      ) : rows.length === 0 ? (
        <p>No staff accounts to show.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const ownAccount = row.id === user?.id;
            const selectedRole = pendingRoles[row.id] ?? row.role;
            const displayName = row.display_name || 'Staff member';
            return (
              <div
                key={row.id}
                className="grid min-w-0 items-center gap-3 rounded-xl border bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="break-words font-semibold">
                    {displayName}
                    {ownAccount ? ' (you)' : ''}
                  </div>
                  {ownAccount && (
                    <p className="mt-1 text-xs text-slate-500">
                      Your own account stays enabled with full access.
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-50"
                    disabled={Boolean(busy) || !row.is_active}
                    onClick={() => sendSetupEmail(row)}
                  >
                    {busy === `setup-${row.id}` ? 'Sending…' : 'Send setup email'}
                  </button>
                </div>
                <div className="min-w-0">
                  <select
                    className={input}
                    aria-label={`Role for ${displayName}`}
                    aria-describedby={`role-description-${row.id}`}
                    disabled={Boolean(busy) || ownAccount}
                    value={selectedRole}
                    onChange={(event) =>
                      setPendingRoles((current) => {
                        const next = { ...current };
                        if (event.target.value === row.role) delete next[row.id];
                        else next[row.id] = event.target.value;
                        return next;
                      })
                    }
                  >
                    {ROLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p id={`role-description-${row.id}`} className="mt-2 text-xs text-slate-500">
                    {ROLES.find((item) => item.value === selectedRole)?.description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(row.is_active)}
                  aria-label={`Account access for ${displayName}`}
                  disabled={Boolean(busy) || ownAccount}
                  onClick={() => toggleAccess(row)}
                  className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-lg px-1 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-60"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 ${row.is_active ? 'bg-emerald-700' : 'bg-slate-500'}`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${row.is_active ? 'translate-x-4' : ''}`}
                    />
                  </span>
                  {busy === row.id ? 'Saving…' : row.is_active ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
