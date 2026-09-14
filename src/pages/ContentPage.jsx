import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { PAGE_PLACEMENTS, REGISTRATION_TYPES } from '@/lib/pageContent';
export default function ContentPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ page: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState({ page: null, loading: true, error: '' });
    supabase
      .rpc('get_content_page', { p_slug: slug })
      .then(({ data, error }) => {
        if (active)
          setState({
            page: data,
            loading: false,
            error: error ? 'This page could not be loaded. Please try again.' : '',
          });
      })
      .catch(
        () =>
          active &&
          setState({
            page: null,
            loading: false,
            error: 'This page could not be loaded. Please try again.',
          }),
      );
    return () => {
      active = false;
    };
  }, [slug]);
  const page = state.page;
  if (state.loading) return <p role="status">Loading page details…</p>;
  if (state.error) return <p role="alert">{state.error}</p>;
  if (!page)
    return (
      <section className="container mx-auto px-4 py-8">
        <h1>Page unavailable</h1>
        <p>This page is not currently published.</p>
        <Link to="/">Back to the website</Link>
      </section>
    );
  const label = REGISTRATION_TYPES.find(([key]) => key === page.registration)?.[1];
  return (
    <article className="content-detail container mx-auto px-4 py-8">
      <Link to={page.placement}>
        Back to {PAGE_PLACEMENTS.find(([path]) => path === page.placement)?.[1] || 'overview'}
      </Link>
      <div className="content-detail-grid">
        <div>
          <h1>{page.title}</h1>
          {page.schedule && <p className="content-schedule">{page.schedule}</p>}
          <div className="content-body">{page.body}</div>
          {page.registration !== 'none' && (
            <section className="content-registration">
              <h2>{label}</h2>
              {page.accepting && page.form_slug ? (
                <>
                  <p>
                    {page.registration === 'application'
                      ? 'Submitting an application does not confirm a place. The centre will review it.'
                      : page.registration === 'interest'
                        ? 'Let the centre know you are interested. This does not reserve a place.'
                        : 'Complete the form below to send your details to the centre.'}
                  </p>
                  <Link
                    className="admin-button primary"
                    to={`/forms/${encodeURIComponent(page.form_slug)}`}
                  >
                    {page.registration === 'application'
                      ? 'Apply'
                      : page.registration === 'interest'
                        ? 'Register interest'
                        : 'Register'}
                  </Link>
                </>
              ) : (
                <p>
                  Registrations are currently closed. <Link to="/contact">Contact the centre</Link>{' '}
                  for more information.
                </p>
              )}
            </section>
          )}
        </div>
        {page.image_url && (
          <a
            href={page.image_url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open full-size poster"
          >
            <img
              className="content-detail-poster"
              src={page.image_url}
              alt={`${page.title} poster`}
            />
          </a>
        )}
      </div>
    </article>
  );
}
