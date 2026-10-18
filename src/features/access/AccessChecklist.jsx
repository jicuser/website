import React from 'react';
import {
  PERMISSIONS,
  STAFF_KINDS,
  hasPermission,
} from '../../../supabase/functions/_shared/access.js';
import { ADMIN_SECTIONS } from '@/content/adminNavigation';

const PERMISSION_GROUPS = [
  [
    'Website & media',
    ['content', 'media', 'events', 'announcements', 'team', 'livestream', 'delete_content'],
  ],
  ['Prayer & screens', ['prayer_times', 'tv', 'broadcast']],
  [
    'Forms & enquiries',
    [
      'forms_contact',
      'forms_madrassah',
      'forms_itikaaf',
      'forms_manage',
      'forms_custom',
      'certificates',
    ],
  ],
  ['Finance & fundraising', ['finance', 'fundraising']],
  ['People & restricted records', ['users', 'safeguarding', 'audit']],
];

export default function AccessChecklist({ value, onChange, actor, disabled = false }) {
  const toggle = (field, id, checked) =>
    onChange({
      ...value,
      [field]: checked ? [...value[field], id] : value[field].filter((item) => item !== id),
    });
  const preview = { ...value, is_active: true, is_owner: false };
  const areas = ADMIN_SECTIONS.filter(
    (section) => section.id !== 'dashboard' && hasPermission(preview, section.permission),
  );
  return (
    <fieldset disabled={disabled} className="admin-access-checklist">
      <legend>Role labels</legend>
      <p>Choose their role, then select access below. A role label does not grant permissions.</p>
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
      <h4>What can they access?</h4>
      <p className="admin-access-preview" aria-live="polite">
        {areas.length
          ? `Staff areas: ${areas.map((area) => area.name).join(', ')}.`
          : 'Portal only — no staff areas selected.'}
      </p>
      {PERMISSION_GROUPS.map(([title, ids]) => {
        const permissions = PERMISSIONS.filter(
          ([id]) =>
            ids.includes(id) &&
            (id !== 'certificates' || import.meta.env.VITE_ENABLE_CERTIFICATES === 'true'),
        );
        const selected = permissions.filter(([id]) => value.permissions.includes(id)).length;
        return (
          <details className="admin-permission-group" key={title}>
            <summary>
              {title}
              {selected > 0 && <span>{selected} selected</span>}
            </summary>
            <div className="admin-access-grid">
              {permissions.map(([id, label]) => (
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
          </details>
        );
      })}
      {!value.permissions.length && (
        <p>
          For a member account, leave staff permissions unselected. Their portal shows records
          linked to them.
        </p>
      )}
    </fieldset>
  );
}
