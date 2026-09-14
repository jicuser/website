import React from 'react';
import { Link } from 'react-router-dom';
export default function AdultCoursesPage() {
  return (
    <section className="container mx-auto px-4 py-8">
      <Link to="/education">Education overview</Link>
      <h1 className="text-3xl font-semibold my-4">Adult Courses & Classes</h1>
      <p>Explore published adult learning opportunities and their registration details below.</p>
      <p className="mt-3">
        For children’s enrolment and parent information, visit the separate{' '}
        <Link to="/madrassah">Madrasah section</Link>.
      </p>
    </section>
  );
}
