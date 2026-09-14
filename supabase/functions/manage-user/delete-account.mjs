export class AccountDeletionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AccountDeletionError';
    this.status = status;
  }
}

// Inputs are profiles read by the authenticated handler, never request metadata.
// Content and uploaded files are not deleted to make an account removable.
export async function deleteStaffAccount(db, actor, target, confirmation) {
  if (actor?.is_active !== true || actor.is_owner !== true)
    throw new AccountDeletionError('Only an active owner can delete staff accounts.', 403);
  if (!target?.id) throw new AccountDeletionError('Staff account not found.', 404);
  if (actor.id === target.id || target.is_owner !== false)
    throw new AccountDeletionError('Your own account and owner accounts are protected.', 403);
  if (target.is_active !== false)
    throw new AccountDeletionError('Disable this account before deleting it.', 409);
  if (confirmation !== 'DELETE')
    throw new AccountDeletionError('Type DELETE to confirm account deletion.');

  const { data: inputs, error: inputError } = await db
    .from('tv_inputs')
    .select('session_id')
    .eq('owner_id', target.id)
    .limit(1);
  if (inputError || !Array.isArray(inputs))
    throw new AccountDeletionError('Could not check connected sources. Please retry.', 503);
  if (inputs.length)
    throw new AccountDeletionError('End this account’s shared source before deleting it.', 409);

  // Keep an auditable intent even if the external Auth request loses its response.
  const { data: audit, error: auditError } = await db
    .from('audit_log')
    .insert({
      actor_id: actor.id,
      actor_name: actor.display_name || 'Owner',
      table_name: 'profiles',
      record_id: target.id,
      action: 'DELETE_REQUESTED',
    })
    .select('id')
    .single();
  if (auditError || !audit?.id)
    throw new AccountDeletionError('Could not record the deletion request. Nothing was deleted.', 503);

  const record = async (action) => {
    try {
      const { error } = await db.from('audit_log').update({ action }).eq('id', audit.id);
      return !error;
    } catch {
      return false;
    }
  };

  let result;
  try {
    result = await db.auth.admin.deleteUser(target.id);
  } catch {
    await record('DELETE_UNCONFIRMED');
    throw new AccountDeletionError('Deletion could not be confirmed. Reload the staff list before retrying.', 503);
  }
  if (result?.error) {
    const status = Number(result.error.status);
    if (!status || status >= 500) {
      await record('DELETE_UNCONFIRMED');
      throw new AccountDeletionError('Deletion could not be confirmed. Reload the staff list before retrying.', 503);
    }
    await record('DELETE_BLOCKED');
    throw new AccountDeletionError(
      'The account could not be deleted. Linked records or uploads may need to be retained or reassigned. Keep access disabled while this is reviewed.',
      409,
    );
  }
  if (!result) {
    await record('DELETE_UNCONFIRMED');
    throw new AccountDeletionError('Deletion could not be confirmed. Reload the staff list before retrying.', 503);
  }
  const recorded = await record('DELETE');
  return recorded
    ? { ok: true }
    : { ok: true, warning: 'Account deleted. Its audit request was kept, but the completion could not be recorded.' };
}
