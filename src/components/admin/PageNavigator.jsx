import React, { useEffect, useId, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { EDITABLE_PAGES } from '@/content/editablePages';
import { buildPageNavigator, findNavigatorPages } from '@/lib/pageNavigator';
import '@/styles/page-navigator.css';

const sections = buildPageNavigator(EDITABLE_PAGES);

export default function PageNavigator({ selected, onSelectPage, disabled = false }) {
  const id = useId();
  const editingSection = sections.find((section) =>
    section.pages.some((page) => page.path === selected),
  );
  const editingPage = editingSection?.pages.find((page) => page.path === selected);
  const [browsing, setBrowsing] = useState(editingSection?.name || sections[0].name);
  const [query, setQuery] = useState('');
  const browsingSection = sections.find((section) => section.name === browsing) || sections[0];
  const searching = Boolean(query.trim());
  const visible = searching ? findNavigatorPages(sections, query) : browsingSection.pages;
  const selectedInSection = browsingSection.pages.some((page) => page.path === selected);

  useEffect(() => {
    setBrowsing(editingSection?.name || sections[0].name);
    setQuery('');
  }, [selected, editingSection]);

  const choose = (path) => {
    if (!disabled && path && path !== selected) onSelectPage(path);
  };

  return (
    <aside className="page-navigator" aria-label="Choose a website page">
      <div className="page-navigator__current">
        <span className="admin-eyebrow">EDITING</span>
        <strong>{editingSection?.name}</strong>
        {editingPage && editingPage.label !== editingSection?.name && (
          <span>{editingPage.label}</span>
        )}
      </div>

      <label htmlFor={`${id}-section`}>
        Website section
        <select
          id={`${id}-section`}
          value={browsingSection.name}
          disabled={disabled}
          onChange={(event) => {
            setBrowsing(event.target.value);
            setQuery('');
          }}
        >
          {sections.map((section) => (
            <option key={section.name} value={section.name}>
              {section.name} ({section.pages.length})
            </option>
          ))}
        </select>
      </label>

      {!searching && (
        <label className="page-navigator__page-select" htmlFor={`${id}-page`}>
          Page to edit
          <select
            id={`${id}-page`}
            value={selectedInSection ? selected : ''}
            disabled={disabled}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="" disabled>
              Choose a page…
            </option>
            {browsingSection.pages.map((page) => (
              <option key={page.path} value={page.path}>
                {page.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="page-navigator__search">
        <label className="page-navigator__search-label" htmlFor={`${id}-search`}>
          <Search size={16} aria-hidden="true" /> Find any page
        </label>
        <span>
          <input
            id={`${id}-search`}
            type="search"
            placeholder="Page name or section…"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear page search"
              disabled={disabled}
              onClick={() => setQuery('')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>

      <div className={`page-navigator__pages ${searching ? 'is-searching' : ''}`}>
        <p className="page-navigator__count" role="status">
          {searching
            ? `${visible.length} ${visible.length === 1 ? 'page found' : 'pages found'}`
            : `Pages in ${browsingSection.name}`}
        </p>
        <nav aria-label={searching ? 'Page search results' : `Pages in ${browsingSection.name}`}>
          {visible.map((page) => (
            <button
              type="button"
              key={page.path}
              disabled={disabled}
              aria-current={selected === page.path ? 'page' : undefined}
              onClick={() => choose(page.path)}
            >
              <span>
                <span>{page.label}</span>
                {searching && <small>{page.section}</small>}
              </span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ))}
        </nav>
        {searching && !visible.length && <p>No matching pages. Try a different name.</p>}
      </div>
    </aside>
  );
}
