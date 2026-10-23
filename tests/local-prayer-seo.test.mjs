import test from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata } from '../src/lib/pageMetadata.js';
import { pageStructuredData } from '../src/lib/siteStructuredData.js';
import { withPageHead } from '../scripts/page-previews.mjs';
import { searchPages } from '../src/lib/siteSearch.js';

const shell =
  '<html><head><!-- jic:metadata:start --><!-- jic:metadata:end --></head><body><div id="root"></div></body></html>';

test('Birmingham prayer pages have specific local titles and canonical addresses', () => {
  for (const path of ['/prayer-times', '/prayer-times/monthly', '/prayer-times/jummah']) {
    const meta = pageMetadata(`${path}?day=example#times`);
    assert.match(meta.title, /Birmingham/);
    assert.match(meta.title, /JIC Woodlands Road/);
    assert.equal(meta.url, `https://www.jicmasjid.org${path}`);
    assert.equal(meta.noindex, false);
    assert.notEqual(meta.title, pageMetadata('/').title);
  }
  assert.match(pageMetadata('/prayer-times').description, /Salah \(Namaz\)/);
  assert.match(pageMetadata('/prayer-times').description, /West Midlands/);
});

test('structured data identifies the real mosque and connects each prayer page to it', () => {
  const [mosque, page] = pageStructuredData(pageMetadata('/prayer-times/monthly'));
  assert.equal(mosque['@type'], 'Mosque');
  assert.equal(mosque.name, 'Jamatia Islamic Centre');
  assert.ok(mosque.alternateName.includes('Woodlands Road Masjid'));
  assert.equal(mosque.address.addressRegion, 'West Midlands');
  assert.equal(mosque.address.postalCode, 'B11 4ER');
  assert.equal(page.about['@id'], mosque['@id']);
  assert.equal(page.inLanguage, 'en-GB');
  assert.equal(page.breadcrumb.itemListElement.at(-1).item, page.url);
  assert.ok(!JSON.stringify(mosque).includes('South Birmingham Central'));
  assert.deepEqual(pageStructuredData(pageMetadata('/portal')), []);
});

test('prayer documents contain a readable location and timetable links before JavaScript runs', () => {
  const html = withPageHead(shell, '/prayer-times');
  const body = html.split('<body>')[1];
  assert.match(body, /<h1>Today&#39;s Prayer Times<\/h1>/);
  for (const place of ['Woodlands Road Masjid', 'Sparkhill', 'Birmingham', 'West Midlands'])
    assert.ok(body.includes(place));
  assert.match(body, /href="\/prayer-times\/monthly"/);
  assert.match(body, /href="\/prayer-times\/jummah"/);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(!body.includes('06:00'), 'No fabricated or frozen daily times');
  const privatePage = withPageHead(shell, '/portal');
  assert.match(privatePage, /noindex, nofollow/);
  assert.ok(!privatePage.includes('application/ld+json'));
});

test('site search can find the prayer page using local names and Salah terms', () => {
  for (const query of [
    'Birmingham salah',
    'Woodlands Road masjid',
    'West Midlands prayer',
    'JIC namaz',
  ])
    assert.ok(
      searchPages(query).some((page) => page.path === '/prayer-times'),
      query,
    );
});
