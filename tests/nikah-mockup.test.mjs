import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url).pathname;

// Render the real feature and sanitiser; substitute only router/backend boundaries.
function fixture(content = {}, hash = '') {
  const cache = new Map();
  const stubs = {
    'react-router-dom': {
      Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
      useLocation: () => ({ pathname: '/services/nikah', hash }),
    },
    '@/context/ContentContext': { useContent: () => ({ getContent: (key, fallback) => content[key] ?? fallback }) },
    '@/lib/pageVisibility': { isPageVisible: () => !content.hideHall },
    '@/content/serviceJourneys': { SERVICE_JOURNEYS: { nikah: {
      checklist: ['Confirm the requirements with the team.'],
      faqs: [
        ['Can I check a date before making arrangements?', 'The team will confirm availability.'],
        ['Is hall hire included?', 'Confirm hall arrangements with the team.'],
        ['How do I get my certificate?', 'Speak to the team about your certificate.'],
      ],
    } } },
    '@/components/ManagedPageContent': { default: () => null },
    '@/components/ManagedPageSections': { default: () => null },
    '@/components/ImageViewer': { default: () => null },
    '@/components/sections/BuiltInForm': { default: ({ slug, bookingType }) =>
      React.createElement('div', { 'data-form': slug, 'data-booking': bookingType }) },
  };
  function load(filename) {
    const path = resolve(root, filename);
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      fileName: path,
      compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, console, URL,
      require: (name) => {
        if (Object.hasOwn(stubs, name)) return { __esModule: true, ...stubs[name] };
        if (name.endsWith('.css')) return {};
        if (name.startsWith('.')) {
          const base = resolve(dirname(path), name);
          const target = [base, `${base}.js`, `${base}.jsx`].find(existsSync);
          assert.ok(target, `Unresolved local dependency: ${name}`);
          return load(target);
        }
        return require(name);
      },
    }, { filename: path });
    return module.exports;
  }
  return {
    page: () => renderToStaticMarkup(React.createElement(load('src/features/nikah/NikahPage.jsx').default)),
    venue: (selectedGroup) => {
      const data = load('src/features/nikah/venue.js').readNikahVenue(content.nikah_venue);
      return renderToStaticMarkup(React.createElement(load('src/features/nikah/NikahVenue.jsx').default,
        { venue: data, selectedGroup }));
    },
  };
}

test('approved reference has two booking cards, two slim shortcuts and four direct FAQ rows', () => {
  const html = fixture().page();
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /class="nikah-hero/);
  assert.match(html, /aria-label="Book Nikah"/);
  assert.match(html, /aria-label="Book hall"/);
  for (const label of ['Explore the spaces and arrange your day.', 'Make a booking for your special day.',
    'Find and book a suitable hall.', 'View facilities', 'Check hall dates', 'Decorated examples',
    'Parking', 'Frequently asked questions', 'What to prepare']) assert.ok(html.includes(label), label);
  const quickLinks = html.match(/<nav class="nikah-quick-links"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(quickLinks);
  assert.equal((quickLinks.match(/<(?:a|button)\b/g) || []).length, 2);
  assert.equal((html.match(/<details\b/g) || []).length, 4);
  assert.match(html, /id="enquire"[^>]*hidden=""/);
  assert.doesNotMatch(html, /data-form=|nikah-planning|Need more information\?|tel:|Guide me|https:\/\/images\.unsplash/);
});

test('hero uses a published visible photograph, never hidden or unsafe media', () => {
  const html = fixture({ nikah_venue: {
    decorations: { photos: [{ url: '/published-decoration.jpg', alt: 'Real decoration' }] },
    mens_hall: { photos: [{ url: '/actual-hall.jpg' }] },
  } }).page();
  assert.match(html, /class="nikah-hero-photo"[^>]*src="\/published-decoration.jpg"/);
  const hidden = fixture({ nikah_venue: {
    decorations: { visible: false, photos: [{ url: '/private-decoration.jpg' }] },
    mens_hall: { photos: [{ url: 'javascript:alert(1)' }] },
  } }).page();
  assert.doesNotMatch(hidden, /nikah-hero-photo|private-decoration|javascript:/);
});

test('gallery can be selected from the page and safely falls back when an area is hidden', () => {
  const parking = fixture().venue('parking');
  assert.match(parking, /nikah-venue-grid--parking/);
  assert.ok(parking.includes('Parking on the day'));
  assert.ok(!parking.includes('Men’s hall'));
  const unavailable = fixture({ nikah_venue: { parking: { visible: false } } }).venue('parking');
  assert.match(unavailable, /nikah-venue-grid--facilities/);
});

test('hidden areas and hall booking remove their related shortcuts and controls', () => {
  const html = fixture({ hideHall: true, nikah_venue: {
    mens_hall: { visible: false }, ladies_hall: { visible: false }, kitchen: { visible: false },
    decorations: { visible: false }, parking: { visible: false },
  } }).page();
  for (const label of ['Book hall', 'Check hall dates', 'View facilities', 'Parking information',
    'Decorated examples', 'At the masjid']) assert.ok(!html.includes(label), label);
  assert.ok(html.includes('Book Nikah'));
});

test('enquire and book deep links open only the published Nikah form', () => {
  for (const hash of ['#enquire', '#book']) {
    const html = fixture({}, hash).page();
    assert.match(html, /data-form="nikah-enquiry" data-booking="nikah"/);
    assert.doesNotMatch(html, /id="enquire"[^>]*hidden=""/);
    assert.doesNotMatch(html, /data-form="hall-booking"/);
  }
});

test('gallery includes the full-width kitchen and honest empty and published photo states', () => {
  const empty = fixture().venue('facilities');
  assert.match(empty, /nikah-venue-card[^\"]*is-wide/);
  assert.match(empty, /Photos to follow/);
  assert.doesNotMatch(empty, /<img/);
  const photos = fixture({ nikah_venue: { mens_hall: { photos: [{ url: '/real.jpg', alt: 'Actual hall' }] } } }).venue('facilities');
  assert.match(photos, /src="\/real.jpg" alt="Actual hall"/);
  assert.match(photos, /aria-label="View Men’s hall photos"/);
});
