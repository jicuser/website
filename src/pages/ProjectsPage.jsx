import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarClock, CheckCircle2, CircleDot, Hammer, Images, School, Users } from 'lucide-react';

const timeline = [
  { phase: 'Phase 1', title: 'Planning & consultation', text: 'Scope the work, confirm priorities, consult the community and prepare the required designs.', status: 'Complete' },
  { phase: 'Phase 2', title: 'Approvals & preparation', text: 'Permissions, contractor planning, fundraising and site preparation.', status: 'In progress' },
  { phase: 'Phase 3', title: 'Main works', text: 'Deliver the extension and key building improvements in planned stages.', status: 'Upcoming' },
  { phase: 'Phase 4', title: 'Fit-out & completion', text: 'Final finishes, equipment, testing and opening of completed areas.', status: 'Upcoming' },
];

const projectAreas = [
  { title: 'Masjid Extension', text: 'Follow the main extension project and key milestones.', to: '/projects/masjid-extension', icon: Hammer },
  { title: 'Main Prayer Hall', text: 'Improvements to the principal worship space.', to: '/projects/main-prayer-hall', icon: Building2 },
  { title: 'Community Hall', text: 'A flexible space for community activities and events.', to: '/projects/community-hall', icon: Users },
  { title: 'Madrassah Building', text: 'Learning spaces for children, classes and future programmes.', to: '/projects/madrassah-building', icon: School },
];

export default function ProjectsPage() {
  return (
    <div className="page-transition pt-24">
      <section className="border-b border-white/10 bg-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-primary">JIC Development</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">Projects & development</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">A clear view of what JIC is building, what stage each project is at and what comes next.</p>
          </div>
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Progress</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">Project timeline</h2>
            </div>
            <Link to="/projects/timeline" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">View timeline details <ArrowRight size={16}/></Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {timeline.map((item, index) => {
              const complete = item.status === 'Complete';
              const active = item.status === 'In progress';
              return (
                <article key={item.phase} className="relative rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{item.phase}</span>
                    {complete ? <CheckCircle2 size={20} className="text-emerald-500"/> : active ? <CircleDot size={20} className="text-amber-500"/> : <CalendarClock size={20} className="text-muted-foreground"/>}
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.status}</div>
                  {index < timeline.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-border lg:block"/>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-muted/20 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Project areas</p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">Explore each development</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {projectAreas.map(({title,text,to,icon:Icon}) => (
              <Link key={to} to={to} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30">
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div>
                <h3 className="text-xl font-bold text-card-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">View project <ArrowRight size={16}/></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/projects/current-appeals" className="rounded-2xl border border-border bg-card p-6"><h3 className="font-bold text-card-foreground">Current appeals</h3><p className="mt-2 text-sm text-muted-foreground">See active fundraising and project needs.</p></Link>
            <Link to="/projects/gallery" className="rounded-2xl border border-border bg-card p-6"><Images className="mb-3 text-primary" size={22}/><h3 className="font-bold text-card-foreground">Updates & gallery</h3><p className="mt-2 text-sm text-muted-foreground">Photos and progress updates from ongoing work.</p></Link>
            <Link to="/projects/how-to-support" className="rounded-2xl border border-border bg-card p-6"><h3 className="font-bold text-card-foreground">Support the projects</h3><p className="mt-2 text-sm text-muted-foreground">Find out how to contribute to JIC development.</p></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
