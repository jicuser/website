import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarClock, CheckCircle2, CircleDot, Droplets, Hammer, Image, School, Users } from 'lucide-react';

const PROJECTS = [
  { title:'Masjid Extension', text:'The main expansion programme, including new capacity and supporting spaces.', to:'/projects/masjid-extension', icon:Hammer, status:'In progress' },
  { title:'Main Prayer Hall', text:'Improvements to the principal worship space, finishes and visitor experience.', to:'/projects/main-prayer-hall', icon:Building2, status:'Planned' },
  { title:'Wudu & Facilities', text:'Ablution, washroom and supporting facility improvements for daily use.', to:'/projects/wudu-area', icon:Droplets, status:'Planned' },
  { title:'Community Hall', text:'A flexible community space for events, classes, meetings and local initiatives.', to:'/projects/community-hall', icon:Users, status:'Planned' },
  { title:'Madrassah Building', text:'Dedicated learning spaces for children, classes and future educational programmes.', to:'/projects/madrassah-building', icon:School, status:'Planned' },
];

const TIMELINE = [
  { phase:'01', title:'Planning & consultation', status:'Complete' },
  { phase:'02', title:'Approvals & preparation', status:'In progress' },
  { phase:'03', title:'Main works', status:'Upcoming' },
  { phase:'04', title:'Fit-out & completion', status:'Upcoming' },
];

export default function ProjectsPage(){
  return <div className="page-transition pt-24">
    <section className="border-b border-white/10 bg-background py-14 md:py-20"><div className="container mx-auto px-4"><div className="mx-auto max-w-4xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-primary">JIC Development</p>
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">Projects & development</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">All current JIC building and improvement projects in one place, with progress, updates and ways to support.</p>
    </div></div></section>

    <section className="bg-background py-12 md:py-16"><div className="container mx-auto px-4">
      <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">All projects</p><h2 className="mt-2 text-3xl font-bold text-foreground">Development areas</h2></div><Link to="/projects/timeline" className="hidden items-center gap-2 text-sm font-semibold text-primary sm:inline-flex">Full timeline <ArrowRight size={16}/></Link></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{PROJECTS.map(({title,text,to,icon:Icon,status})=><Link key={to} to={to} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30">
        <div className="mb-5 flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div><span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{status}</span></div>
        <h3 className="text-xl font-bold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">View project <ArrowRight size={16}/></span>
      </Link>)}</div>
    </div></section>

    <section className="border-y border-white/10 bg-muted/20 py-12 md:py-16"><div className="container mx-auto px-4">
      <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Progress</p><h2 className="mt-2 text-3xl font-bold text-foreground">Overall timeline</h2></div><Link to="/projects/timeline" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Timeline details <ArrowRight size={16}/></Link></div>
      <div className="grid gap-4 lg:grid-cols-4">{TIMELINE.map(item=>{const done=item.status==='Complete',active=item.status==='In progress';return <article key={item.phase} className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold tracking-[.18em] text-primary">{item.phase}</span>{done?<CheckCircle2 size={19} className="text-emerald-500"/>:active?<CircleDot size={19} className="text-amber-500"/>:<CalendarClock size={19} className="text-muted-foreground"/>}</div><h3 className="font-bold text-card-foreground">{item.title}</h3><p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{item.status}</p></article>})}</div>
    </div></section>

    <section className="bg-background py-12 md:py-16"><div className="container mx-auto px-4"><div className="grid gap-4 md:grid-cols-3">
      <Link to="/projects/current-appeals" className="rounded-2xl border border-border bg-card p-6"><h3 className="font-bold text-card-foreground">Current appeals</h3><p className="mt-2 text-sm text-muted-foreground">Active fundraising and immediate project needs.</p></Link>
      <Link to="/projects/gallery" className="rounded-2xl border border-border bg-card p-6"><Image className="mb-3 text-primary" size={22}/><h3 className="font-bold text-card-foreground">Updates & gallery</h3><p className="mt-2 text-sm text-muted-foreground">Photos, milestones and recent progress.</p></Link>
      <Link to="/projects/how-to-support" className="rounded-2xl border border-border bg-card p-6"><h3 className="font-bold text-card-foreground">Support the projects</h3><p className="mt-2 text-sm text-muted-foreground">Ways to contribute to JIC development.</p></Link>
    </div></div></section>
  </div>;
}
