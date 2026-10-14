import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Search, X } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(editingSection?.name || '');
  const [query, setQuery] = useState('');
  const searching = Boolean(query.trim());
  const results = searching ? findNavigatorPages(sections, query) : [];

  useEffect(() => {
    setExpanded(editingSection?.name || '');
    setQuery('');
  }, [selected, editingSection]);

  const choose = (path) => {
    if (!disabled && path && path !== selected) onSelectPage(path);
  };
  const pageRow = (page, overview = false) => (
    <li className="page-navigator__page" key={page.path}>
      <button
        type="button"
        disabled={disabled}
        data-page-path={page.path}
        aria-current={selected === page.path ? 'page' : undefined}
        onClick={() => choose(page.path)}
      >
        <span>
          <span>{overview ? 'Overview' : page.label}</span>
          {searching && <small>{page.section}</small>}
        </span>
        <ChevronRight size={15} aria-hidden="true" />
      </button>
      <a
        href={page.path}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${page.name} website page`}
        title="View saved website page"
      >
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </li>
  );

  return (
    <aside className="page-navigator" aria-label="Choose a website page">
      <div className="page-navigator__current">
        <span className="admin-eyebrow">EDITING</span>
        <strong>{editingSection?.name}</strong>
        {editingPage && editingPage.label !== editingSection?.name && (
          <span>{editingPage.label}</span>
        )}
      </div>
      <div className="page-navigator__search">
        <label className="page-navigator__search-label" htmlFor={`${id}-search`}>
          <Search size={16} aria-hidden="true" />
          Find any page
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
      <p className="page-navigator__hint">
        Choose a section, then a page to edit. The arrow beside a page opens its saved website view.
      </p>
      {searching ? (
        <nav className="page-navigator__results" aria-label="Page search results">
          <p className="page-navigator__count" role="status">
            {results.length} {results.length === 1 ? 'page found' : 'pages found'}
          </p>
          <ul>{results.map((page) => pageRow(page))}</ul>
          {!results.length && <p>No matching pages. Try a different name.</p>}
        </nav>
      ) : (
        <nav className="page-navigator__directory" aria-label="Website sections">
          <ul>
            {sections.map((section, index) => {
              const leaf = section.pages.length === 1;
              const open = expanded === section.name;
              const current = editingSection?.name === section.name;
              const panelId = `${id}-section-${index}`;
              return (
                <li key={section.name}>
                  <button
                    className="page-navigator__section"
                    type="button"
                    disabled={disabled}
                    data-section={section.name}
                    aria-current={current ? (leaf ? 'page' : 'location') : undefined}
                    aria-expanded={leaf ? undefined : open}
                    aria-controls={leaf ? undefined : panelId}
                    onClick={() => {
                      if (disabled) return;
                      if (leaf) choose(section.pages[0].path);
                      else setExpanded(open ? '' : section.name);
                    }}
                  >
                    <span>{section.name}</span>
                    {!leaf && (
                      <ChevronDown size={18} aria-hidden="true" className={open ? 'is-open' : ''} />
                    )}
                  </button>
                  {!leaf && (
                    <ul id={panelId} className="page-navigator__children" hidden={!open}>
                      {section.pages.map((page) => pageRow(page, page.path === section.path))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
