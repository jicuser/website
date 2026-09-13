import React from 'react';
import { Link } from 'react-router-dom';
import usePosters from '@/hooks/usePosters';
import { weeklySessions, WEEKDAYS, isAdultProgramme } from '@/lib/education';

export default function EducationPage({ view = 'overview' }) {
  const posters = usePosters();
  const sessions = weeklySessions(posters);
  const courses = posters.filter(isAdultProgramme);
  return (
    <section className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold text-primary">Education</p>
        <h1 className="mt-2 text-3xl font-semibold">{view === 'week' ? 'This week’s learning' : view === 'courses' ? 'Adult classes & courses' : 'Learning for adults'}</h1>
        <p className="mt-3 text-muted-foreground">Explore our adult courses, open learning circles and regular gatherings.</p>
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Education">
        {[['Overview','/education'],['Classes & courses','/education/classes-courses'],['Weekly schedule','/education/week'],['Student portal','/portal']].map(([title,path]) => <Link className="rounded-xl border border-border px-4 py-2" key={path} to={path}>{title}</Link>)}
      </nav>
      {view !== 'courses' && <section className="space-y-3">
        <h2 className="text-xl font-semibold">Weekly schedule</h2>
        <p className="text-sm text-muted-foreground">Published recurring sessions. Check the poster for term dates and contact the centre about changes.</p>
        {sessions.length === 0 ? <p>The next schedule will appear when published.</p> : WEEKDAYS.map((day,index) => {
          const today = sessions.filter((session) => session.day === index + 1);
          return today.length > 0 && <div key={day} className="rounded-xl border border-border bg-card/80 p-4"><h3 className="font-semibold">{day}</h3>{today.map((session,i) => <p key={`${session.id}-${i}`} className="mt-2"><strong>{session.time || `After ${session.after}`}</strong> · {session.title || session.programme}{session.title && <span className="text-muted-foreground"> · {session.programme}</span>}</p>)}</div>;
        })}
      </section>}
      {view !== 'week' && <section className="space-y-3"><h2 className="text-xl font-semibold">What’s on</h2>{courses.map((course) => <article className="rounded-xl border border-border bg-card/80 p-4" key={course.id}><h3 className="font-semibold">{course.title}</h3><p>{course.schedule}</p><p className="mt-1 text-sm text-muted-foreground">{course.detail}</p></article>)}{courses.length === 0 && <p>New courses will appear here when published.</p>}</section>}
      <p className="text-sm text-muted-foreground">Looking for children’s enrolment or parent information? <Link to="/madrassah" className="underline">Visit the separate Madrassah section.</Link></p>
    </section>
  );
}
