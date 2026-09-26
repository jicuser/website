import React from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EducationEnrolmentPage() {
  return (
    <main className="education-enrolment page-transition">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mx-auto max-w-3xl">
          <Link className="section-return-link" to="/education">← Back to Education</Link>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mt-4">Enrolment</p>
          <h1 className="text-2xl font-semibold text-foreground md:text-4xl mt-1">What would you like to enrol for?</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Madrassah pupil admissions and adult learning are separate. Choose the correct area below.
          </p>
          <div className="education-enrolment-grid">
            <Link to="/madrassah/enrolment" className="education-enrolment-card">
              <span><GraduationCap aria-hidden="true" /></span>
              <div>
                <strong>Madrassah pupil enrolment</strong>
                <p>For children joining the Madrassah, pupil admissions and parent enquiries.</p>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
            <Link to="/education/courses" className="education-enrolment-card">
              <span><BookOpen aria-hidden="true" /></span>
              <div>
                <strong>Adult courses & classes</strong>
                <p>Browse adult classes and use the registration option on the course you want.</p>
              </div>
              <b aria-hidden="true">›</b>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
