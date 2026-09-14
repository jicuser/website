import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { PAGE_PLACEMENTS, pageProblem } from '@/lib/pageContent';

export default function ContentPage() {
  const { slug } = useParams();
  return <Page key={slug} slug={slug} />;
}

function Page({ slug }) {
  const [state, setState] = useState({ page: null, loading: true, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ page: null, loading: true, error: '' });
    supabase
      .rpc('get_site_page', { p_slug: slug })
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        setState({
          page: error ? null : data,
          loading: false,
          error: error ? 'This page could not be loaded. Please try again.' : '',
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            page: null,
            loading: false,
            error: 'This page could not be loaded. Please try again.',
          });
      });
    return () => controller.abort();
  }, [slug, retry]);
  if (state.loading)
    return (
      <p role="status" className="mx-auto max-w-5xl p-6">
        Loading details…
      </p>
    );
  if (state.error)
    return (
      <section className="mx-auto max-w-5xl p-6">
        <p role="alert">{state.error}</p>
        <button className="jic-button" onClick={() => setRetry((value) => value + 1)}>
          Retry page
        </button>
      </section>
    );
  const page = state.page;
  if (!page)
    return (
      <section className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">This page is not available.</h1>
        <p>It may be hidden or the address may have changed.</p>
        <Link to="/">Return to the website</Link>
      </section>
    );
  const label = { interest: 'Register interest', application: 'Apply', registration: 'Register' }[
    page.registration
  ];
  return (
    <article className="mx-auto max-w-5xl px-4 py-8">
      <Link to={page.placement}>
        ← {PAGE_PLACEMENTS.find(([path]) => path === page.placement)?.[1] || 'Back'}
      </Link>
      <h1 className="text-2xl md:text-4xl font-semibold mt-5 mb-3">{page.title}</h1>
      {page.schedule && <p className="text-primary font-medium mb-6">{page.schedule}</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {page.image_url && !pageProblem(page) && (
          <a
            href={page.image_url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${page.title} poster`}
          >
            <img
              src={page.image_url}
              alt={`${page.title} poster`}
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </a>
        )}
        <div>
          <div className="whitespace-pre-wrap leading-relaxed break-words">{page.body}</div>
          {label && (
            <section
              className="mt-6 rounded-2xl border border-border bg-card/80 p-5"
              aria-label="Registration information"
            >
              <h2 className="text-xl font-semibold">
                {page.registration === 'interest'
                  ? 'Register your interest'
                  : page.registration === 'application'
                    ? 'Application required'
                    : 'Registration required'}
              </h2>
              {page.form?.open && page.form.slug ? (
                <Link
                  className="inline-flex rounded-xl bg-primary text-primary-foreground px-5 py-3 mt-3 font-semibold"
                  to={`/forms/${encodeURIComponent(page.form.slug)}`}
                >
                  {label}
                </Link>
              ) : (
                <p className="mt-3">
                  {page.form?.slug
                    ? 'Online registrations are currently closed.'
                    : 'Online registration is not open yet.'}{' '}
                  <Link to="/contact">Contact the centre</Link> for details.
                </p>
              )}
              <p className="text-sm mt-3">
                Submitting a form does not confirm a place. The centre will follow up with you.
              </p>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
