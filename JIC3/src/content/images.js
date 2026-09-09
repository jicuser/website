/**
 * ============================================================
 *  IMAGES  —  src/content/images.js
 * ============================================================
 *  Every image URL used across the site lives here.
 *  To swap an image: replace the URL on the right-hand side.
 *  To use a local file: put it in /public/ and write '/my-photo.jpg'.
 * ============================================================
 */

const CDN = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/6d6be6eb-ad37-41f6-b510-19ea41b9028a';

export const IMAGES = {
  // ── Home page ──────────────────────────────────────────────
  homeHero:         `${CDN}/a36d60015d1eb1f64588a36222584b66.png`,

  // ── About page ─────────────────────────────────────────────
  aboutHero:        `${CDN}/b4cad674da90c42b10367d7c50b4ea75.png`,
  aboutHistory:     `${CDN}/2355863303a48938de3cc43028eeac23.png`,

  // ── Projects page ──────────────────────────────────────────
  funeralAppeal:    `${CDN}/58a3215da96feff6bb9f6dea8bf5890e.jpg`,
};
