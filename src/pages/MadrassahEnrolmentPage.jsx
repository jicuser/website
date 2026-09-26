import React from 'react';
import EnrollmentForm from '@/components/sections/madrassah/EnrollmentForm';
import { Link } from 'react-router-dom';

export default function MadrassahEnrolmentPage() {
  return (
    <div className="page-transition py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="madrassah-page-context">
            <Link to="/madrassah">← Back to Madrassah</Link>
            <span>For adult learning, use <Link to="/education/courses">Adult Courses & Classes</Link>.</span>
          </div>
          <EnrollmentForm />
        </div>
      </div>
    </div>
  );
}
