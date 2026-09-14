import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdultCoursesPage() {
  const [tab, setTab] = useState('overview');
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/education">← Education</Link>
      <h1 className="text-2xl md:text-4xl font-semibold my-4">Adult Courses & Classes</h1>
      <nav className="flex flex-wrap gap-3 mb-5" aria-label="Adult education">
        <button
          className="rounded-xl border border-border px-4 py-2"
          aria-pressed={tab === 'overview'}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          className="rounded-xl border border-border px-4 py-2"
          aria-pressed={tab === 'courses'}
          onClick={() => setTab('courses')}
        >
          Courses & registration
        </button>
      </nav>
      {tab === 'overview' ? (
        <p>
          Explore adult learning at the centre. The programme details and posters below show the
          available information and any registration requirements. Madrasah has its own{' '}
          <Link to="/madrassah">information and enrolment area</Link>.
        </p>
      ) : (
        <p>
          Open a course below for its details and registration options. A course page will say when
          online applications are open; sending an application is not confirmation of a place.
        </p>
      )}
    </section>
  );
}
