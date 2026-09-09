/**
 * ============================================================
 *  HOME PAGE CONTENT  —  src/content/pages/home.js
 * ============================================================
 *  Edit text here. The React component in src/pages/HomePage.jsx
 *  just reads these values — no JSX to touch for copy changes.
 * ============================================================
 */

// ── Hero ─────────────────────────────────────────────────────
export const HERO = {
  heading:  'Welcome to',
  highlight: 'Jamatia Islamic Centre',
  body: 'A place of worship, learning, and community service dedicated to spreading the message of peace and harmony.',
  cta1: { label: 'Prayer Times', to: '/prayer-times' },
  cta2: { label: 'Contact Us',   to: '/contact' },
};

// ── Prayer Times strip ────────────────────────────────────────
export const PRAYER_STRIP = {
  heading: "Today's Prayer Times",
  subheading: 'Join us for prayers at the following times. Check our prayer times page for the full schedule.',
  ctaLabel: 'View Full Schedule',
  emptyMessage: "Today's prayer times are not available. Please check the full schedule or contact us.",
};

// ── Services section ──────────────────────────────────────────
export const SERVICES_SECTION = {
  heading: 'Our Services',
  subheading: 'We offer a range of services to meet the spiritual, educational, and community needs of Muslims.',
  ctaLabel: 'Explore All Services',
  ctaTo: '/services',
};

/** icon keys map to lucide-react / MosqueIcon — edit title & description freely */
export const SERVICES_LIST = [
  { icon: 'mosque',    title: 'Daily Prayers',      description: 'Five daily prayers in congregation led by our qualified Imams.' },
  { icon: 'book',      title: 'Quran Classes',      description: 'Learn to read and understand the Holy Quran with proper tajweed.' },
  { icon: 'users',     title: 'Community Events',   description: 'Regular gatherings, celebrations, and community activities.' },
  { icon: 'calendar',  title: 'Friday Sermons',     description: 'Inspiring Jummah khutbahs addressing contemporary issues.' },
  { icon: 'bookOpen',  title: 'Islamic Education',  description: 'Comprehensive Islamic studies for children and adults.' },
  { icon: 'heart',     title: 'Charity Work',       description: 'Supporting those in need through various charitable initiatives.' },
];

// ── Upcoming Events ───────────────────────────────────────────
export const EVENTS_SECTION = {
  heading: 'Upcoming Events',
  subheading: 'Join us for these special events and activities at Jamatia Islamic Centre.',
};

export const EVENTS_LIST = [
  {
    title: 'Friday Sermon',
    date:  'Every Friday, 1:00 PM',
    description: 'Weekly Jummah prayer and sermon by our Imam.',
  },
  {
    title: 'Quran Study Circle',
    date:  'Wednesdays, 7:30 PM',
    description: 'Deep dive into Quranic verses and their meanings.',
  },
  {
    title: 'Community Iftar',
    date:  'During Ramadan',
    description: 'Join us for breaking fast together during the holy month.',
  },
];

// ── Call to Action ────────────────────────────────────────────
export const CTA = {
  heading:  'Join Our Community',
  body: 'Become a part of our growing community. Everyone is welcome to join our prayers and activities.',
  cta1: { label: 'Get in Touch',    to: '/contact' },
  cta2: { label: 'Join Madrassah', to: '/madrassah' },
};
