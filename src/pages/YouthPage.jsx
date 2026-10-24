import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { BookOpen, Heart, Moon, Trophy } from 'lucide-react';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';
import ItikaafRegistrationForm from '@/components/sections/youth/ItikaafRegistrationForm';

const PAGE_TITLE = 'Youth | Jamatia Islamic Centre';
const META_DESCRIPTION = 'Youth programmes and activities at Jamatia Islamic Centre.';

const activities = [
  {
    title: 'Faith & Learning',
    text: 'Classes and study circles.',
    icon: BookOpen,
    path: '/youth/classes-skills',
  },
  {
    title: 'Volunteering',
    text: 'Find ways to help at JIC.',
    icon: Heart,
    path: '/youth/volunteering',
  },
  {
    title: 'Social & Sports',
    text: 'Explore current activities.',
    icon: Trophy,
    path: '/youth/activities',
  },
  { title: 'I’tikaf', text: 'Registration and information.', icon: Moon, path: '/youth/itikaf' },
];

function YouthActivitiesSection() {
  return (
    <PageChoices
      label="Youth activities"
      items={activities.map(({ text, ...item }) => ({ ...item, description: text }))}
    />
  );
}

function YouthRegistrationSection() {
  return (
    <motion.section
      id="itikaf"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="jic-anchor-target py-6 md:py-8"
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Youth · Registration
              </p>
              <h1 className="mt-2 text-2xl font-bold text-card-foreground md:text-3xl">
                I'tikaf Registration
              </h1>
            </div>
            <ItikaafRegistrationForm />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function YouthPage({ view = 'overview' }) {
  return (
    <>
      <Helmet>
        <title>
          {view === 'itikaf' ? "I'tikaf Registration | Jamatia Islamic Centre" : PAGE_TITLE}
        </title>
        <meta name="description" content={META_DESCRIPTION} />
      </Helmet>
      <div className="jic-youth-page">
        {view === 'overview' && (
          <PageHeading title="Youth">
            Activities, learning and opportunities for young people.
          </PageHeading>
        )}
        {view === 'itikaf' ? <YouthRegistrationSection /> : <YouthActivitiesSection />}
        {view === 'overview' && (
          <div className="guidance-page-width">
            <GuidancePanel journeyId="youth" />
          </div>
        )}
      </div>
    </>
  );
}
