/** Primary navigation grouped by visitor intent. */

export const MASJID_EXTENSION_TABS = [
  { name: '‹ All Projects', path: '/projects' },
  { name: 'Extension Overview', path: '/projects/masjid-extension' },
  { name: 'Timeline', path: '/projects/masjid-extension/timeline' },
  { name: 'Main Prayer Hall', path: '/projects/main-prayer-hall' },
  { name: 'Wudu & Facilities', path: '/projects/wudu-area' },
  { name: 'Community Hall', path: '/projects/community-hall' },
  { name: 'Madrassah Floor', path: '/projects/madrassah-floor' },
];

export const EDUCATION_TABS = [
  { name: 'Madrassah', path: '/madrassah' },
  { name: 'Classes & Courses', path: '/madrassah/classes-courses' },
  { name: 'Student Portal', path: '/madrassah/student-portal' },
];

export const MADRASSAH_TABS = [
  { name: '‹ Education', path: '/madrassah' },
  { name: 'Madrassah Overview', path: '/madrassah' },
  { name: 'Programmes', path: '/madrassah/programs' },
  { name: 'Enrolment', path: '/madrassah/enrolment' },
  { name: 'Policies', path: '/madrassah/policies' },
];

export const WORSHIP_TABS = [
  { name: 'Overview', path: '/worship' },
  { name: 'Read Qur’an', path: '/worship/quran' },
  { name: 'Dala’il al-Khayrat', path: '/worship/dalail-al-khayrat' },
  { name: 'Daily Du‘as', path: '/worship/daily-duas' },
  { name: 'Prayer Guide', path: '/worship/prayer-guide' },
  { name: 'Janazah Guide', path: '/worship/janazah-guide' },
  { name: 'Daily Salah', path: '/worship/daily-salah' },
];

export const NAV_GROUPS = [
  { name: 'Home', path: '/', children: [] },
  { name: 'About', path: '/about', children: [
    { name: 'About Us', path: '/about' }, { name: 'Meet the Team', path: '/team' },
    { name: 'Our History', path: '/about/history' }, { name: 'Financial History', path: '/financial-history' },
    { name: 'Contact Us', path: '/contact' },
  ]},
  { name: 'Prayer Times', path: '/prayer-times', children: [
    { name: 'Today', path: '/prayer-times' }, { name: 'Monthly Timetable', path: '/prayer-times/monthly' },
    { name: 'Jummah', path: '/prayer-times/jummah' },
  ]},
  { name: 'Worship', path: '/worship', children: WORSHIP_TABS },
  { name: 'Services', path: '/services', children: [
    { name: 'Services Overview', path: '/services' }, { name: 'Funeral Services', path: '/funerals' },
    { name: 'Nikah', path: '/services/nikah' }, { name: 'Hall Booking', path: '/services/hall-booking' },
    { name: 'Community Support', path: '/services/community-services' },
  ]},
  { name: 'Projects', path: '/projects', children: [
    { name: 'All Projects', path: '/projects' }, { name: 'Masjid Extension', path: '/projects/masjid-extension' },
    { name: 'Current Appeals', path: '/projects/current-appeals' }, { name: 'Updates & Gallery', path: '/projects/gallery' },
    { name: 'Support Projects', path: '/projects/how-to-support' },
  ]},
  { name: 'Education', path: '/madrassah', children: EDUCATION_TABS },
  { name: 'Youth', path: '/youth', children: [
    { name: 'Activities', path: '/youth/activities' }, { name: "I'tikaf Form", path: '/youth/itikaf' },
    { name: 'Trips & Events', path: '/youth/trips-events' }, { name: 'Volunteering', path: '/youth/volunteering' },
    { name: 'Classes & Skills', path: '/youth/classes-skills' },
  ]},
];

export const NAV_ITEMS = [
  ...NAV_GROUPS.map(({ name, path }) => ({ name, path })),
  { name: 'Financial History', path: '/financial-history' },
  { name: 'Meet the Team', path: '/team' },
  { name: 'Contact Us', path: '/contact' },
];
