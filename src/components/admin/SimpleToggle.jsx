import React from 'react';
import '@/styles/site-controls.css';
export default function SimpleToggle({ label, checked, onChange, disabled = false, detail }) {
  return (
    <div className="site-toggle-row">
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <button
        type="button"
        className="site-toggle"
        role="switch"
        aria-label={label}
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
        {checked ? 'On' : 'Off'}
      </button>
    </div>
  );
}
