/**
 * Primary navigation plus standalone child pages.
 * Headings/content can be filled in later without changing the URL structure.
 */

export const NAV_GROUPS = [
  { name: 'Home', path: '/', children: [] },
  {
    name: 'About', path: '/about', children: [
      { name: 'About Us', path: '/about' },
      { name: 'Meet the Team', path: '/team' },
      { name: 'Our History', path: '/about/history' },
      { name: 'Financial History', path: '/financial-history' },
      { name: 'Contact Us', path: '/contact' },
    ],
  },
  {
    name: 'Services', path: '/services', children: [
      { name: 'Services Overview', path: '/services' },
      { name: 'Daily Prayers', path: '/services/daily-prayers' },
      { name: 'Jummah', path: '/services/jummah' },
      { name: 'Quran Classes', path: '/services/quran-classes' },
      { name: 'Community Services', path: '/services/community-services' },
      { name: 'Funeral Services', path: '/services/funeral-services' },
      { name: 'Nikah', path: '/services/nikah' },
      { name: 'Hall Booking', path: '/services/hall-booking' },
    ],
  },
  {
    name: 'Projects', path: '/projects', children: [
      { name: 'Projects Overview', path: '/projects' },
      { name: 'Masjid Extension', path: '/projects/masjid-extension' },
      { name: 'Main Prayer Hall', path: '/projects/main-prayer-hall' },
      { name: 'Wudu Area', path: '/projects/wudu-area' },
      { name: 'Community Hall', path: '/projects/community-hall' },
      { name: 'Madrassah Building', path: '/projects/madrassah-building' },
      { name: 'Current Appeals', path: '/projects/current-appeals' },
      { name: 'Gallery', path: '/projects/gallery' },
      { name: 'How to Support', path: '/projects/how-to-support' },
    ],
  },
  {
    name: 'Prayer Times', path: '/prayer-times', children: [
      { name: 'Today', path: '/prayer-times' },
      { name: 'Monthly Timetable', path: '/prayer-times/monthly' },
      { name: 'Jummah', path: '/prayer-times/jummah' },
    ],
  },
  {
    name: 'Madrassah', path: '/madrassah', children: [
      { name: 'About Madrassah', path: '/madrassah' },
      { name: 'Our Programs', path: '/madrassah/programs' },
      { name: 'Classes & Courses', path: '/madrassah/classes-courses' },
      { name: 'Special Courses', path: '/madrassah/special-courses' },
      { name: 'Enrolment', path: '/madrassah/enrolment' },
      { name: 'Policies', path: '/madrassah/policies' },
      { name: 'Student Portal', path: '/madrassah/student-portal' },
    ],
  },
  {
    name: 'Youth', path: '/youth', children: [
      { name: 'Youth Overview', path: '/youth' },
      { name: 'Youth Projects', path: '/youth/projects' },
      { name: 'Activities', path: '/youth/activities' },
      { name: "I'tikaf Program", path: '/youth/itikaf' },
      { name: 'Trips & Events', path: '/youth/trips-events' },
      { name: 'Volunteering', path: '/youth/volunteering' },
      { name: 'Classes & Skills', path: '/youth/classes-skills' },
    ],
  },
];

export const NAV_ITEMS = [
  ...NAV_GROUPS.map(({ name, path }) => ({ name, path })),
  { name: 'Financial History', path: '/financial-history' },
  { name: 'Meet the Team', path: '/team' },
  { name: 'Contact Us', path: '/contact' },
];
