import React, { useId, useState } from 'react';

export default function DeleteAccount({ actor, account, disabled, hasPendingChanges, onDelete }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  if (
    actor?.is_owner !== true || actor.is_active !== true || !account?.id ||
    account.is_owner !== false || actor.id === account.id
  ) return null;
  const blocked = disabled || account.is_active !== false || hasPendingChanges;
  const close = () => {
    setOpen(false);
    setConfirmation('');
    setError('');
  };
  return (
    <section aria-label={`Delete ${account.display_name || 'staff account'}`}>
      {!open ? (
        <>
          <button className="admin-button" type="button" disabled={blocked} onClick={() => setOpen(true)}>
            Delete account
          </button>
          {account.is_active && <p>Disable access before deleting this account.</p>}
          {hasPendingChanges && <p>Save permission changes before deleting this account.</p>}
        </>
      ) : (
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (blocked || confirmation !== 'DELETE') return;
          setError('');
          try {
            await onDelete(confirmation);
          } catch (failure) {
            setError(failure.message || 'Deletion could not be confirmed. Reload the staff list.');
          }
        }}>
          <p>
            Delete {account.display_name || 'this staff account'} permanently? This cannot be undone.
            Linked history and uploads are not deleted. They may prevent account deletion until reviewed.
          </p>
          <label htmlFor={fieldId}>
            Type DELETE to confirm
            <input
              id={fieldId}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={confirmation}
              disabled={blocked}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="admin-actions">
            <button className="admin-button" type="submit" disabled={blocked || confirmation !== 'DELETE'}>
              Delete permanently
            </button>
            <button className="admin-button" type="button" disabled={disabled} onClick={close}>
              Cancel deletion
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
