import React, { useId, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, Search, X } from 'lucide-react';
import ServiceIcon from './ServiceIcon';
import { siteDesign } from '@/lib/siteDesign';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { filterServices, getVisibleServices, SERVICE_CATEGORIES } from './catalog';
import '@/styles/services.css';

/** One CMS-aware service finder, shared by the homepage and full directory. */
export default function ServiceExplorer({ compact = false }) {
  const { getContent } = useContent();
  const instanceId = useId();
  const searchRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const category = params.get('category') || 'all';
  const design = siteDesign(getContent);
  const setFilters = (patch) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch))
          value && value !== 'all' ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  const visibleServices = getVisibleServices(getContent);
  const categories = SERVICE_CATEGORIES.filter(
    ({ id }) => id === 'all' || visibleServices.some((service) => service.category === id),
  );
  const activeCategory = categories.some(({ id }) => id === category) ? category : 'all';
  const results = filterServices({ category: activeCategory, query, getContent });
  const hasFilters = activeCategory !== 'all' || query.trim().length > 0;
  const displayedServices = compact
    ? visibleServices.filter(({ id }) => ['support', 'careers', 'community'].includes(id))
    : results;
  const directoryVisible = isPageVisible(getContent, '/services');
  const contactVisible = isPageVisible(getContent, '/contact');
  const Heading = compact ? 'h2' : 'h1';
  const headingId = `${instanceId}-heading`;
  const searchId = `${instanceId}-search`;
  const resultsId = `${instanceId}-results`;

  function clearSearch() {
    setFilters({ q: '' });
    searchRef.current?.focus();
  }

  function resetFilters() {
    setFilters({ q: '', category: 'all' });
    searchRef.current?.focus();
  }

  if (compact && displayedServices.length === 0) return null;

  return (
    <section
      className={`service-explorer ${compact ? 'service-explorer--compact' : 'service-explorer--full'}`}
      aria-labelledby={headingId}
      id={compact ? undefined : 'service-finder'}
    >
      <header className="service-explorer-header">
        <div className="service-explorer-intro">
          <Heading id={headingId} className="service-explorer-title">
            {compact ? 'Services & support' : 'Community Hub'}
          </Heading>
          {!compact && (
            <p className="service-explorer-description">
              Choose a service, get useful guidance and contact the team when you need to.
            </p>
          )}
        </div>
        {compact && directoryVisible && (
          <Link className="service-explorer-all-link" to="/services">
            All services <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </header>

      {!compact && (
        <>
          <div className="service-explorer-controls" id={compact ? undefined : 'choose-service'}>
            <div className="service-explorer-search-row">
              <div className="service-explorer-search">
                <label className="sr-only" htmlFor={searchId}>
                  Search services
                </label>
                <Search size={19} aria-hidden="true" />
                <input
                  ref={searchRef}
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(event) => setFilters({ q: event.target.value.slice(0, 120) })}
                  placeholder="What can we help you find?"
                  aria-controls={resultsId}
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={clearSearch} aria-label="Clear service search">
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <div className="service-explorer-categories" role="group" aria-label="Filter services">
              {categories.map(({ id, label }) => {
                const count =
                  id === 'all'
                    ? visibleServices.length
                    : visibleServices.filter((service) => service.category === id).length;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activeCategory === id}
                    onClick={() => setFilters({ category: id })}
                  >
                    {label}
                    <span aria-hidden="true">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p
            className="service-explorer-result-count"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {`${results.length} ${results.length === 1 ? 'service' : 'services'}${hasFilters ? ' found' : ''}`}
          </p>
        </>
      )}
      <div id={resultsId}>
        {displayedServices.length ? (
          <div className="service-explorer-grid">
            {displayedServices.map((service) => {
              const titleId = `${instanceId}-${service.id}`;
              return (
                <Link
                  key={service.id}
                  to={service.to}
                  className={`service-explorer-card ${service.id === 'prayer' ? 'service-explorer-card--prayer' : ''}`}
                  aria-labelledby={titleId}
                >
                  <span className="service-explorer-card-icon" aria-hidden="true">
                    <ServiceIcon name={design.icons[service.id] || service.icon} />
                  </span>
                  <span className="service-explorer-card-copy">
                    <h3 id={titleId}>{service.title}</h3>
                    <span className="service-explorer-card-description">{service.description}</span>
                  </span>
                  <ChevronRight
                    className="service-explorer-card-arrow"
                    size={18}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="service-explorer-empty">
            <Search size={28} aria-hidden="true" />
            <h3>
              {visibleServices.length ? 'No matching services.' : 'No services are listed here.'}
            </h3>
            <p>
              {visibleServices.length
                ? 'Try a shorter search or choose another category.'
                : 'Please contact the centre for help with your enquiry.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={resetFilters}>
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <nav className="hub-utility-links" aria-label="Worship and account">
          {[
            ['Adhkar', '/worship/daily-duas'],
            ['Read Qur’an', '/worship/quran'],
            ['Salah times', '/prayer-times'],
            ['My portal & certificates', '/portal'],
          ]
            .filter(([, to]) => isPageVisible(getContent, to))
            .map(([name, to]) => (
              <Link key={to} to={to}>
                {name}
              </Link>
            ))}
        </nav>
      )}
      {!compact && contactVisible && (
        <div className="service-explorer-footer">
          <p>
            Need help finding the right service?{' '}
            <Link to="/contact">
              Contact the centre <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
