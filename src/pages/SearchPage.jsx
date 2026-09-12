import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { SEARCH_PAGES, searchPages } from '@/lib/siteSearch';
import { useContent } from '@/context/ContentContext';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').slice(0, 120);
  const { getContent } = useContent();
  const entries = SEARCH_PAGES.map((page) => {
    try {
      const content = JSON.parse(getContent(`page:${page.path}`, '{}'));
      return {
        ...page,
        title: content.title || page.title,
        description: content.body || page.description,
      };
    } catch {
      return page;
    }
  });
  const results = searchPages(query, entries);
  return (
    <section className="jic-search-page" aria-labelledby="search-title">
      <Helmet>
        <title>Search | Jamatia Islamic Centre</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 id="search-title">Search the centre</h1>
      <p>Find prayer times, classes, services and community updates.</p>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="site-search">What are you looking for?</label>
        <div className="jic-search-field" data-glass="dense">
          <Search size={22} aria-hidden="true" />
          <input
            id="site-search"
            type="search"
            value={query}
            maxLength={120}
            autoComplete="off"
            placeholder="Try prayer times, classes or social media"
            onChange={(event) =>
              setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
            }
          />
        </div>
      </form>
      {!query.trim() ? (
        <nav className="jic-search-suggestions" aria-label="Popular searches">
          {['Prayer times', 'Classes', 'Social media', 'Contact'].map((term) => (
            <button
              key={term}
              type="button"
              data-glass="clear"
              onClick={() => setParams({ q: term }, { replace: true })}
            >
              {term}
            </button>
          ))}
        </nav>
      ) : (
        <>
          <p role="status">
            {results.length
              ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
              : 'No matches. Try a shorter word, such as prayer, youth or classes.'}
          </p>
          <ul className="jic-search-results">
            {results.map(({ path, title, section, description }) => (
              <li key={path}>
                <Link to={path} data-glass="frosted">
                  <span>
                    <small>{section}</small>
                    <strong>{title}</strong>
                    {description && <p>{description.slice(0, 160)}</p>}
                  </span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
