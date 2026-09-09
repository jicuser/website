/**
 * ============================================================
 *  PROJECTS PAGE CONTENT  —  src/content/pages/projects.js
 * ============================================================
 *  Update the appeal target, equipment list, and vision bullets.
 * ============================================================
 */

export const PROJECTS_HERO = {
  heading: 'Funeral Service Appeal',
  subheading: "Help us establish Birmingham's first not-for-profit funeral service, providing a vital, dignified service for our community in times of need.",
};

/** Total fundraising target in £ */
export const APPEAL_TARGET = 74_250;

/** Equipment items being purchased — name and cost in £ */
export const EQUIPMENT_LIST = [
  { name: '3 Body Freezers',       cost: 8_790 },
  { name: 'Ghusal Table',          cost: 7_600 },
  { name: 'Body Lift',             cost: 3_180 },
  { name: 'Body Hoist',            cost: 3_680 },
  { name: 'Hearse & PVT Ambulance',cost: 25_000 },
  { name: 'Building Work',         cost: 26_000 },
];

export const HOW_TO_DONATE = {
  heading: 'How to Donate',
  body: 'Your contribution, no matter the size, makes a difference. To donate, please contact the Masjid directly.',
  note: 'Kindly mention you learned about this appeal from the website.',
  ctaLabel: 'Contact the Masjid',
  ctaTo: '/contact',
};

export const VISION_BULLETS = [
  'Provide a compassionate and affordable funeral service.',
  'Uphold Islamic traditions with dignity and respect.',
  'Support families during their most difficult times.',
];
