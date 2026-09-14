import React from 'react';
import { Link } from 'react-router-dom';
import usePosters from '@/hooks/usePosters';
import { weeklySessions, WEEKDAYS } from '@/lib/education';

export default function EducationPage({ view = 'overview' }) {
  const posters = usePosters();
  const sessions = weeklySessions(posters);
  return (
    <section className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold text-primary">Education</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {view === 'week'
            ? 'This week’s learning'
            : view === 'courses'
              ? 'Adult classes & courses'
              : 'Learning for adults'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Explore our adult courses, open learning circles and regular gatherings.
        </p>
      </header>
      {view !== 'courses' && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Weekly schedule</h2>
          <p className="text-sm text-muted-foreground">
            Published recurring sessions. Check the poster for term dates and contact the centre
            about changes.
          </p>
          {sessions.length === 0 ? (
            <p>The next schedule will appear when published.</p>
          ) : (
            WEEKDAYS.map((day, index) => {
              const today = sessions.filter((session) => session.day === index + 1);
              return (
                today.length > 0 && (
                  <div key={day} className="rounded-xl border border-border bg-card/80 p-4">
                    <h3 className="font-semibold">{day}</h3>
                    {today.map((session, i) => (
                      <p key={`${session.id}-${i}`} className="mt-2">
                        <strong>{session.time || `After ${session.after}`}</strong> ·{' '}
                        {session.title || session.programme}
                        {session.title && session.programme !== `After ${session.after}` && (
                          <span className="text-muted-foreground"> · {session.programme}</span>
                        )}
                      </p>
                    ))}
                  </div>
                )
              );
            })
          )}
        </section>
      )}
      <p className="text-sm text-muted-foreground">
        Looking for children’s enrolment or parent information?{' '}
        <Link to="/madrassah" className="underline">
          Visit the separate Madrassah section.
        </Link>
      </p>
    </section>
  );
}
