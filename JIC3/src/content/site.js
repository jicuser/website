/**
 * ============================================================
 *  SITE-WIDE CONTENT  —  src/content/site.js
 * ============================================================
 *  Edit this file to update the masjid's name, address, phone,
 *  opening hours, and social-media links.
 *  These values appear in the Footer and Contact page.
 * ============================================================
 */

export const SITE = {
  name:    'Jamatia Islamic Centre',
  tagline: 'A place of worship, learning, and community service dedicated to spreading the message of peace and harmony.',

  address: {
    line1: '179-183 Woodlands Rd',
    line2: 'Birmingham B11 4ER',
    full:  '179-183 Woodlands Rd, Birmingham B11 4ER',
  },

  phone: '0121 778 6612',
  email: 'info@jicmasjid.org',           // update if you have one

  hours: 'Open 24 hours',

  // Official JIC live radio stream used by the mobile app.
  // VITE_RADIO_STREAM_URL can still override this per deployment.
  radio: { streamUrl: 'https://jicmosque.radioca.st/stream' },

  socials: {
    facebook:  'https://facebook.com/JICMasjid',
    twitter:   'https://twitter.com/jicmasjid',    // ← fixed: no @ in URL
    instagram: 'https://instagram.com/jicmasjid',  // ← fixed: no @ in URL
    youtube:   'https://youtube.com/@JICMASJID',
    tiktok:    'https://tiktok.com/@jicmasjid',
  },
};
