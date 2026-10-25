import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_SECTIONS } from '@/content/adminNavigation';
import { findAdminTasks } from './taskNavigation';

/** Navigation only: the parent still owns permission and unsaved-change checks. */
export default function AdminQuickFind({ onChoose, active, disabled = false }) {
  const { can } = useAuth();
  const [query, setQuery] = useState('');
  const disclosure = useRef(null);
  const input = useRef(null);
  const results = findAdminTasks(ADMIN_SECTIONS, can, query);
  useEffect(() => {
    if (disclosure.current?.open) {
      disclosure.current.open = false;
      document.getElementById('staff-content')?.focus({ preventScroll: true });
    }
    setQuery('');
  }, [active]);
  return (
    <details
      className="admin-quick-find"
      ref={disclosure}
      onToggle={(event) => {
        if (event.currentTarget.open) input.current?.focus();
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          disclosure.current.open = false;
          disclosure.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label="Find a staff tool">
        <Search size={18} aria-hidden="true" />
        <span>Find a tool</span>
      </summary>
      <div className="admin-quick-find-panel">
        <label>
          <span>Find a staff tool</span>
          <input
            ref={input}
            type="search"
            placeholder="Search pages, forms, bookings…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="admin-quick-find-count" role="status">
          {results.length} {results.length === 1 ? 'tool' : 'tools'} available
        </p>
        <div className="admin-quick-find-results">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => {
                if (active === item.id) {
                  disclosure.current.open = false;
                  disclosure.current.querySelector('summary')?.focus();
                } else onChoose(item.id);
              }}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.description || item.group}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
          {!results.length && <p>No matching tools. Try a different word.</p>}
        </div>
      </div>
    </details>
  );
}
