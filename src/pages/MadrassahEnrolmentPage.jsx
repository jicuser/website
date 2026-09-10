import React from 'react';
import EnrollmentForm from '@/components/sections/madrassah/EnrollmentForm';

export default function MadrassahEnrolmentPage() {
  return (
    <div className="page-transition py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <EnrollmentForm />
        </div>
      </div>
    </div>
  );
}
