import React from 'react';
import {
  PERMISSIONS,
  STAFF_KINDS,
  hasPermission,
} from '../../../supabase/functions/_shared/access.js';

export default function AccessChecklist({ value, onChange, actor, disabled = false }) {
  const toggle = (field, id, checked) =>
    onChange({
      ...value,
      [field]: checked ? [...value[field], id] : value[field].filter((item) => item !== id),
    });
  return (
    <fieldset disabled={disabled} className="admin-access-checklist">
      <legend>Staff labels</legend>
      <p>For organisation only. These do not give editing access.</p>
      <div className="admin-access-grid">
        {STAFF_KINDS.map(([id, label]) => (
          <label key={id} className="admin-check">
            <input
              type="checkbox"
              checked={value.staff_kinds.includes(id)}
              onChange={(event) => toggle('staff_kinds', id, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      <h4>What can they manage?</h4>
      <div className="admin-access-grid">
        {PERMISSIONS.map(([id, label]) => (
          <label key={id} className="admin-check">
            <input
              type="checkbox"
              checked={value.permissions.includes(id)}
              disabled={!hasPermission(actor, id)}
              onChange={(event) => toggle('permissions', id, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      {!value.permissions.length && <p>No Admin access until a permission is selected.</p>}
    </fieldset>
  );
}
