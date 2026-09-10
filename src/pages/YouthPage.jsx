import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { BookOpen, Heart, Trophy } from 'lucide-react';
import ItikaafRegistrationForm from '@/components/sections/youth/ItikaafRegistrationForm';

const PAGE_TITLE = 'Youth Programs | Jamatia Islamic Centre';
const META_DESCRIPTION = 'Youth programmes and activities at Jamatia Islamic Centre.';

const activities = [
  { title: 'Faith & Learning', text: 'Youth circles, reminders and practical Islamic learning.', icon: BookOpen },
  { title: 'Community Service', text: 'Volunteer projects that build responsibility and connection.', icon: Heart },
  { title: 'Social & Sports', text: 'Positive activities that help young people build friendships and confidence.', icon: Trophy },
];

function YouthHero() {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-background py-8 md:py-11">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Youth at JIC</p>
          <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Youth Programs</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Faith, learning, service and positive activities for young people.</p>
        </div>
      </div>
    </motion.section>
  );
}

function YouthActivitiesSection() {
  return (
    <section id="activities" className="jic-anchor-target py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-center"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Activities</p><h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Faith and community</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{activities.map(({ title, text, icon: Icon }) => <article key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div><h3 className="text-lg font-bold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>
        </div>
      </div>
    </section>
  );
}

function YouthRegistrationSection() {
  return (
    <motion.section id="itikaf" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="jic-anchor-target py-6 md:py-8">
      <div className="container mx-auto px-3 sm:px-4"><div className="mx-auto max-w-4xl"><div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="mb-4 text-center md:text-left"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Youth · Registration</p><h1 className="mt-2 text-2xl font-bold text-card-foreground md:text-3xl">I'tikaf Registration</h1></div><ItikaafRegistrationForm /></div></div></div>
    </motion.section>
  );
}

export default function YouthPage({ view = 'overview' }) {
  return <><Helmet><title>{view === 'itikaf' ? "I'tikaf Registration | Jamatia Islamic Centre" : PAGE_TITLE}</title><meta name="description" content={META_DESCRIPTION}/></Helmet><div className="min-h-screen bg-background">{view === 'itikaf' ? <YouthRegistrationSection/> : <><YouthHero/><YouthActivitiesSection/></>}</div></>;
}
