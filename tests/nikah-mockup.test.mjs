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

// Exercise the real page, gallery and venue sanitiser without backend/network I/O.
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
      faqs: [['Is my date confirmed?', 'The team will confirm availability.']],
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

test('approved layout has one hero, four compact shortcuts, planning and on-demand information', () => {
  const html = fixture().page();
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /class="nikah-hero/);
  assert.match(html, /aria-label="Book Nikah"/);
  assert.match(html, /aria-label="Book hall"/);
  assert.match(html, /aria-label="Decorated examples gallery"/);
  for (const label of ['View facilities', 'Check hall dates', 'Decorated examples', 'Parking information',
    'Plan your Nikah', 'Start planning', 'Need more information?', 'Team confirms']) assert.ok(html.includes(label), label);
  assert.match(html, /id="enquire"[^>]*hidden=""/);
  assert.doesNotMatch(html, /data-form=/);
  assert.doesNotMatch(html, /tel:|Guide me|https:\/\/images\.unsplash/);
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

test('hidden areas and hall booking remove the related shortcuts and controls', () => {
  const html = fixture({ hideHall: true, nikah_venue: {
    mens_hall: { visible: false }, ladies_hall: { visible: false }, kitchen: { visible: false },
    decorations: { visible: false }, parking: { visible: false },
  } }).page();
  for (const label of ['Book hall', 'Check hall dates', 'View facilities', 'Parking information',
    'Decorated examples', 'At the masjid']) assert.ok(!html.includes(label), label);
  assert.ok(html.includes('Book Nikah') && html.includes('Start planning'));
});

test('existing enquire deep link still opens the published Nikah form only', () => {
  const html = fixture({}, '#enquire').page();
  assert.match(html, /data-form="nikah-enquiry" data-booking="nikah"/);
  assert.doesNotMatch(html, /id="enquire"[^>]*hidden=""/);
  assert.doesNotMatch(html, /data-form="hall-booking"/);
});
