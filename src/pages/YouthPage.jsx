import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { BookOpen, Heart, Trophy } from 'lucide-react';
import { SITE } from '@/content/site';
import ItikaafRegistrationForm from '@/components/sections/youth/ItikaafRegistrationForm';

const PAGE_TITLE = 'Youth Programs | Jamatia Islamic Centre';
const META_DESCRIPTION = 'Join our youth programs and activities at Jamatia Islamic Centre. Engage with the community through educational, spiritual, and recreational programs designed for young Muslims.';

const activities = [
  { title: 'Faith & Learning', text: 'Youth circles, reminders and practical Islamic learning.', icon: BookOpen },
  { title: 'Community Service', text: 'Volunteer projects that build responsibility and connection.', icon: Heart },
  { title: 'Social & Sports', text: 'Positive activities that help young people build friendships and confidence.', icon: Trophy },
];

function YouthHero() {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">Youth Programs</motion.h1>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">Empowering our youth through faith-based programs, educational activities, and community engagement.</motion.p>
        </div>
      </div>
    </motion.section>
  );
}

function YouthActivitiesSection() {
  return (
    <section id="activities" className="jic-anchor-target py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 text-center"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Youth at JIC</p><h2 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Activities that build faith and community</h2></div>
          <div className="grid gap-4 md:grid-cols-3">{activities.map(({ title, text, icon: Icon }) => <article key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div><h3 className="text-lg font-bold text-card-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>
        </div>
      </div>
    </section>
  );
}

function YouthRegistrationSection() {
  return (
    <motion.section id="itikaf" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="jic-anchor-target py-8 md:py-12">
      <div className="container mx-auto px-3 sm:px-4"><div className="mx-auto max-w-4xl"><div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="mb-4 text-center md:text-left"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Youth · Registration</p><h1 className="mt-2 text-2xl font-bold text-card-foreground md:text-3xl">I'tikaf Registration Form</h1><p className="mt-2 text-sm text-muted-foreground">Complete the form below to register for the JIC youth I'tikaf programme.</p></div>{(import.meta.env.VITE_ITIKAAF_REGISTRATION_ENABLED === 'true' || import.meta.env.VITE_ITIKAAF_SHEETS_WEBHOOK_URL) ? <ItikaafRegistrationForm /> : <div role="status" className="rounded-xl border p-5"><h2 className="text-lg font-semibold">Online registration is not open</h2><p className="mt-2">Please contact the centre about I’tikaf registration.</p><a className="mt-3 inline-flex min-h-11 items-center underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></div>}</div><div className="mt-4 text-center"><p className="text-sm text-muted-foreground">Need help? Visit <a href="/contact" className="text-primary hover:underline font-medium">Contact Us</a>.</p></div></div></div>
    </motion.section>
  );
}

export default function YouthPage({ view = 'overview' }) {
  return <><Helmet><title>{view==='itikaf'?"I'tikaf Registration | Jamatia Islamic Centre":PAGE_TITLE}</title><meta name="description" content={META_DESCRIPTION}/></Helmet><div className="min-h-screen bg-background">{view==='itikaf'?<YouthRegistrationSection/>:<><YouthHero/><YouthActivitiesSection/></>}</div></>;
}
