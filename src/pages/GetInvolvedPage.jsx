import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartHandshake, Users, Flag } from 'lucide-react';
import GuidancePanel from '@/features/guidance/GuidancePanel';
import PageHeading from '@/components/PageHeading';
import ServiceJourney from '@/components/services/ServiceJourney';
import { SERVICE_JOURNEYS } from '@/content/serviceJourneys';
import '@/styles/operations.css';

const ways = [
  {
    to: '/get-involved/volunteer',
    title: 'Volunteer',
    text: 'Offer your time, experience or a skill.',
    icon: HeartHandshake,
  },
  {
    to: '/fundraise',
    title: 'Community campaigns',
    text: 'See what people are raising funds for.',
    icon: Users,
  },
  {
    to: '/fundraise/new',
    title: 'Start a fundraiser',
    text: 'Create a page and invite others to give.',
    icon: Flag,
  },
];

export default function GetInvolvedPage() {
  return (
    <div className="ops-page ops-involvement">
      <PageHeading title="Get involved">
        Give your time, bring people together or fundraise for JIC.
      </PageHeading>
      <GuidancePanel journeyId="volunteer" />
      <nav className="ops-involvement-list" aria-label="Ways to get involved">
        {ways.map(({ to, title, text, icon: Icon }) => (
          <Link to={to} key={to} className="ops-involvement-link">
            <Icon size={24} aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <p>
        Looking to make a donation? <Link to="/donate">Donate to JIC</Link>.
      </p>
    </div>
  );
}

const volunteerJourney = {
  ...SERVICE_JOURNEYS.community,
  guideId: 'volunteer',
  formSlug: 'contact-us',
  title: 'Volunteer with JIC',
  intro:
    'Tell us what you can offer and when you are available. The team will help you find a suitable way to take part.',
  action: 'Ask about volunteering',
  subject: 'Volunteering enquiry',
  steps: [
    ['Tell us about yourself', 'Share a skill, an interest or the time you can offer.'],
    [
      'Explore opportunities',
      'The office will discuss where your help is needed and any checks required.',
    ],
    ['Agree how to take part', 'Confirm a role, availability and who you will work with.'],
  ],
  checklist: [
    'Your name and contact details',
    'What you would like to help with',
    'When you are available',
  ],
  related: [
    {
      title: 'Community campaigns',
      description: 'Support a fundraiser or start your own.',
      to: '/fundraise',
    },
    {
      title: 'Community support',
      description: 'Ask the centre about support or activities.',
      to: '/services/community',
    },
  ],
};

export function VolunteerPage() {
  return <ServiceJourney journey={volunteerJourney} />;
}
