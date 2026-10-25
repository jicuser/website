import React from 'react';
import { Link } from 'react-router-dom';
import PageHeading from '@/components/PageHeading';
import { usePublishedPages, usePublishedPagesStatus } from '@/context/PublishedPagesContext';

export default function AdultCoursesPage() {
  const courses = usePublishedPages().filter((page) => page.placement === '/education/courses');
  const { loading, error } = usePublishedPagesStatus();
  return (
    <section>
      <PageHeading title="Adult Classes" eyebrow="Learning at JIC">
        Open a course for its dates, details and registration options.
      </PageHeading>
      {!courses.length && (
        <div className="mx-auto max-w-5xl px-4 pb-6">
          <p role={error ? 'alert' : 'status'}>
            {loading
              ? 'Loading classes…'
              : error
                ? 'Class details could not be loaded.'
                : 'No adult classes are currently listed here.'}
          </p>
          {!loading && (
            <p className="mt-2">
              <Link to="/contact">Ask the centre about adult classes</Link> or{' '}
              <Link to="/madrassah">find pupil classes at the Madrassah</Link>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
