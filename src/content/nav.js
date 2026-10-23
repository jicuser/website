/** Legacy extension address retained for existing CMS content and shared links. */
export const MASJID_EXTENSION_TABS = [
  { name: 'Masjid Extension', path: '/projects/masjid-extension' },
];
export const GIVING_NAVIGATION = {
  name: 'Giving',
  path: '/donate',
  children: [],
  editable: false,
};
export const GET_INVOLVED_NAVIGATION = {
  name: 'Get involved',
  path: '/get-involved',
  children: [
    { name: 'Overview', path: '/get-involved' },
    { name: 'Volunteer', path: '/get-involved/volunteer' },
    { name: 'Campaigns', path: '/fundraise' },
    { name: 'Start a fundraiser', path: '/fundraise/new' },
  ],
  editable: false,
};
export const MADRASSAH_TABS = [
  { name: 'Overview', path: '/madrassah' },
  { name: 'Pupil Enrolment', path: '/madrassah/enrolment' },
  { name: 'Classes', path: '/madrassah/classes-courses' },
  { name: 'Student Information', path: '/madrassah/student-portal' },
  { name: 'Contact Madrassah', path: '/madrassah/contact' },
  { name: 'Policies', path: '/madrassah/policies' },
];
export const EDUCATION_TABS = [
  { name: 'Overview', path: '/education' },
  { name: 'All programmes', path: '/education/programmes' },
  { name: 'Adult Classes', path: '/education/courses' },
  { name: 'Enrolment', path: '/education/enrolment' },
  { name: 'Madrassah', path: '/madrassah' },
];
export const WORSHIP_TABS = [
  { name: 'Overview', path: '/worship' },
  { name: 'Read Qur’an', path: '/worship/quran' },
  { name: 'Dala’il al-Khayrat', path: '/worship/dalail-al-khayrat' },
  { name: 'Adhkar & Du‘as', path: '/worship/daily-duas' },
  { name: 'Prayer Guide', path: '/worship/prayer-guide' },
  { name: 'Janazah Guide', path: '/worship/janazah-guide' },
];
export const NAV_GROUPS = [
  { name: 'Home', path: '/', children: [] },
  {
    name: 'About',
    path: '/about',
    children: [
      { name: 'Overview', path: '/about' },
      { name: 'Meet the Team', path: '/team' },
      { name: 'Our History', path: '/about/history' },
      { name: 'Financial History', path: '/financial-history' },
      { name: 'Contact Us', path: '/contact' },
      { name: 'Social Media', path: '/social-media' },
    ],
  },
  {
    name: 'Prayer Times',
    path: '/prayer-times',
    children: [
      { name: 'Today', path: '/prayer-times' },
      { name: 'Monthly Timetable', path: '/prayer-times/monthly' },
      { name: 'Jummah', path: '/prayer-times/jummah' },
      { name: 'Salah Alerts', path: '/prayer-times/reminders' },
    ],
  },
  { name: 'Adhkar, Qur’an & Janazah Guide', path: '/worship', children: WORSHIP_TABS },
  {
    name: 'Ramadan',
    path: '/ramadan',
    children: [
      { name: 'Overview', path: '/ramadan' },
      { name: 'Sponsor an Iftar', path: '/ramadan/iftar' },
      { name: 'Sponsor a Suhoor', path: '/ramadan/suhoor' },
      { name: 'Daily Giving', path: '/ramadan/daily-giving' },
    ],
  },
  {
    name: 'Services',
    path: '/services',
    children: [
      { name: 'Overview', path: '/services' },
      { name: 'Religious Services', path: '/services/religious' },
      { name: 'Educational Programmes', path: '/services/education' },
      { name: 'Community Services', path: '/services/community' },
      { name: 'Funeral Services', path: '/funerals' },
      { name: 'Nikah', path: '/services/nikah' },
      { name: 'Hall Booking', path: '/services/hall-booking' },
    ],
  },
  {
    name: 'Our Masjid Project',
    path: '/projects',
    children: [
      { name: 'Project overview', path: '/projects' },
      { name: 'Support JIC', path: '/donate' },
    ],
  },
  { name: 'Education', path: '/education', children: EDUCATION_TABS },
  {
    name: 'Youth',
    path: '/youth',
    children: [
      { name: 'Overview', path: '/youth' },
      { name: 'Activities', path: '/youth/activities' },
      { name: "I'tikaf Registration", path: '/youth/itikaf' },
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
// A menu destination is not necessarily a public CMS page.
export const PUBLIC_MENU_GROUPS = [
  ...NAV_GROUPS,
  { name: 'Madrassah', path: '/madrassah', children: MADRASSAH_TABS },
  GIVING_NAVIGATION,
  GET_INVOLVED_NAVIGATION,
  { name: 'Social Media', path: '/social-media', children: [] },
  { name: 'Portal login', path: '/portal', children: [], editable: false },
];
export const FOOTER_LINKS = [
  { name: 'Donate', path: '/donate' },
  { name: 'Get involved', path: '/get-involved' },
  { name: 'Portal login', path: '/portal' },
  { name: 'Contact Us', path: '/contact' },
  { name: 'Download Salah timetable', path: '/prayer-times/monthly#phone-wallpaper' },
  { name: 'Services', path: '/services' },
  { name: 'Our Masjid Project', path: '/projects' },
  { name: 'Education', path: '/education' },
  { name: 'Youth', path: '/youth' },
];
