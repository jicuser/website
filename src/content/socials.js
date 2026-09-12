import { SITE } from './site.js';

// One channel directory feeds the social page, search and footer.
export const SOCIAL_CHANNELS = [
  {
    id: 'facebook',
    name: 'Facebook',
    handle: '@JICMasjid',
    description: 'Community announcements, events and news from the centre.',
    topics: ['Community', 'Events'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@jicmasjid',
    description: 'Photos, programme posters and moments from our community.',
    topics: ['Photos', 'Posters'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@JICMASJID',
    description: 'Watch talks, lessons and streams from Jamatia Islamic Centre.',
    topics: ['Talks', 'Livestreams'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@jicmasjid',
    description: 'Short videos and reminders from JIC.',
    topics: ['Short videos', 'Reminders'],
  },
  {
    id: 'x',
    name: 'X',
    handle: '@jicmosque',
    description: 'Follow the centre’s notices and community updates.',
    topics: ['Notices', 'Updates'],
  },
]
  .filter(({ id }) => SITE.socials[id])
  .map((channel) => ({ ...channel, url: SITE.socials[channel.id] }));
