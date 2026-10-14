import React from 'react';
import { Building2, Hammer, Heart, Image } from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import PageChoices from '@/components/PageChoices';

const PROJECTS = [
  {
    path: '/projects/masjid-extension',
    description: 'Explore the prayer hall, wudu facilities, community hall and Madrassah floor.',
    icon: Hammer,
  },
  {
    path: '/projects/current-appeals',
    description: 'Find current fundraising appeals and project needs.',
    icon: Building2,
  },
  {
    path: '/projects/gallery',
    description: 'See photos, milestones and recent progress.',
    icon: Image,
  },
  {
    path: '/projects/how-to-support',
    description: 'Find ways to contribute to the building works.',
    icon: Heart,
  },
];

export default function ProjectsPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Masjid Building Works">
        Explore the extension, appeals and project updates.
      </PageHeading>
      <PageChoices items={PROJECTS} label="Building works pages" />
    </div>
  );
}
