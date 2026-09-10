import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Droplets, Hammer, Image, School, Users } from 'lucide-react';

const PROJECTS = [
  { title: 'Masjid Extension', text: 'The main expansion programme, bringing the key masjid improvement areas together under one project.', to: '/projects/masjid-extension', icon: Hammer, status: 'In progress' },
  { title: 'Current Appeals', text: 'Active fundraising and immediate project needs.', to: '/projects/current-appeals', icon: Building2, status: 'Active' },
  { title: 'Updates & Gallery', text: 'Photos, milestones and recent progress from across JIC development.', to: '/projects/gallery', icon: Image, status: 'Updates' },
];

const EXTENSION_AREAS = [
  { title: 'Main Prayer Hall', to: '/projects/main-prayer-hall', icon: Building2 },
  { title: 'Wudu & Facilities', to: '/projects/wudu-area', icon: Droplets },
  { title: 'Community Hall', to: '/projects/community-hall', icon: Users },
  { title: 'Madrassah Floor', to: '/projects/madrassah-floor', icon: School },
];

export default function ProjectsPage() {
  return <div className="page-transition">
    <section className="bg-background py-8 md:py-10"><div className="container mx-auto px-4">
      <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Overview</p><h1 className="mt-2 text-2xl font-bold text-foreground">Current project areas</h1></div>
      <div className="grid gap-4 md:grid-cols-3">{PROJECTS.map(({ title, text, to, icon: Icon, status }) => <Link key={to} to={to} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/30">
        <div className="mb-4 flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={21}/></div><span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{status}</span></div>
        <h2 className="text-lg font-bold text-card-foreground">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open <ArrowRight size={16}/></span>
      </Link>)}</div>
    </div></section>

    <section className="border-y border-border bg-muted/20 py-8 md:py-10"><div className="container mx-auto px-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Masjid Extension</p><h2 className="mt-2 text-2xl font-bold text-foreground">Extension areas</h2></div><Link to="/projects/masjid-extension/timeline" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">View timeline <ArrowRight size={16}/></Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{EXTENSION_AREAS.map(({ title, to, icon: Icon }) => <Link key={to} to={to} className="rounded-2xl border border-border bg-card p-4"><Icon className="mb-3 text-primary" size={21}/><h3 className="font-bold text-card-foreground">{title}</h3></Link>)}</div>
    </div></section>

    <section className="bg-background py-8 md:py-10"><div className="container mx-auto px-4"><div className="grid gap-4 md:grid-cols-2">
      <Link to="/projects/how-to-support" className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold text-card-foreground">Support the projects</h3><p className="mt-2 text-sm text-muted-foreground">Ways to contribute to JIC development.</p></Link>
      <Link to="/projects/gallery" className="rounded-2xl border border-border bg-card p-5"><Image className="mb-3 text-primary" size={22}/><h3 className="font-bold text-card-foreground">Latest progress</h3><p className="mt-2 text-sm text-muted-foreground">See photos and recent milestones.</p></Link>
    </div></div></section>
  </div>;
}
