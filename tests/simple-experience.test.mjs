import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formAddress,
  newQuestion,
  starterQuestions,
  canMoveQuestion,
  updateQuestion,
} from '../src/lib/formBuilder.js';
import { seasonDays, seasonLength, daysInRange } from '../src/lib/bookingCalendar.js';
import { pageMetadata, publicMetadataPaths } from '../src/lib/pageMetadata.js';
import { pageHead, withPageHead } from '../scripts/page-previews.mjs';
import { validateSchema } from '../supabase/functions/custom-forms/validation.mjs';

test('question presets are independent, unique and include optional name titles and international phone examples', () => {
  const fields = starterQuestions('registration');
  fields.push(newQuestion(fields, 'name'));
  assert.equal(fields.at(-1).id, 'name_2');
  const title = newQuestion(fields, 'title');
  assert.equal(title.required, false);
  title.options.push('Custom title');
  assert.ok(!newQuestion(fields, 'title').options.includes('Custom title'));
  assert.match(fields.find((field) => field.type === 'phone').placeholder, /\+44/);
  assert.equal(formAddress('Friday’s Volunteer Registration'), 'fridays-volunteer-registration');
});

test('question ordering and key changes preserve conditional references', () => {
  const fields = [
    newQuestion([], 'name'),
    {
      id: 'detail',
      type: 'text',
      label: 'Details',
      show_when: { field: 'name', operator: 'equals', value: 'Yes' },
    },
  ];
  assert.equal(canMoveQuestion(fields, 1, -1), false);
  assert.equal(canMoveQuestion(fields, 0, 1), false);
  const updated = updateQuestion(fields, 0, { ...fields[0], id: 'full_name' });
  assert.equal(updated[1].show_when.field, 'full_name');
  assert.equal(fields[1].show_when.field, 'name');
});

test('question hints are bounded plain text and survive schema validation', () => {
  const field = { ...newQuestion([], 'phone'), help: 'UK or international number' };
  assert.equal(validateSchema({ fields: [field] }).fields[0].help, field.help);
  assert.throws(() => validateSchema({ fields: [{ ...field, help: {} }] }), /help text/);
  assert.throws(
    () => validateSchema({ fields: [{ ...field, placeholder: 'x'.repeat(161) }] }),
    /example answer/,
  );
});

test('Ramadan days and range selection stay correct across month and UK daylight-saving boundaries', () => {
  const season = { start_date: '2027-03-15', day_count: 30 };
  const days = seasonDays(season);
  assert.equal(days.at(-1).date, '2027-04-13');
  assert.equal(seasonLength(season.start_date, '2027-04-13'), 30);
  assert.equal(seasonLength(season.start_date, '2027-04-12'), 29);
  assert.throws(() => seasonLength(season.start_date, '2027-04-14'), /29- or 30-day/);
  assert.throws(() => seasonLength('2027-02-30', '2027-03-30'), /29- or 30-day/);
  assert.deepEqual(daysInRange(days, { from: '2027-03-31', to: '2027-04-02' }), [
    { number: 17, date: '2027-03-31' },
    { number: 18, date: '2027-04-01' },
    { number: 19, date: '2027-04-02' },
  ]);
});

test('page previews use accurate canonical URLs, distinct descriptions and private noindex', () => {
  const hall = pageMetadata('/services/hall-booking/?date=2027-03-15#enquire');
  assert.equal(hall.url, 'https://www.jicmasjid.org/services/hall-booking');
  assert.match(hall.description, /hall availability/);
  assert.notEqual(hall.description, pageMetadata('/education').description);
  for (const path of [
    '/admin/login',
    '/portal',
    '/tv179/mens-main',
    '/account/recovery',
    '/verify/example',
    '/ramadan/display',
    '/search',
  ])
    assert.equal(pageMetadata(path).noindex, true);
  assert.ok(publicMetadataPaths.every((path) => !pageMetadata(path).noindex));
  assert.equal(pageMetadata('/projects/timeline').path, '/projects/masjid-extension/timeline');
  assert.match(pageHead('/ramadan/suhoor'), /Sponsor a Suhoor/);
  assert.equal(
    pageMetadata('/forms/example', {
      title: 'My form',
      image: 'javascript:alert(1)',
    }).image.startsWith('https:'),
    true,
  );
});

test('static and client previews share one replaceable head block without duplicate canonicals', () => {
  const html =
    '<html><head><!-- jic:metadata:start --><title>Old</title><!-- jic:metadata:end --></head><body></body></html>';
  const next = withPageHead(withPageHead(html, '/education'), '/ramadan');
  assert.equal((next.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(!next.includes('<title>Old'));
  assert.match(next, /Ramadan \| Jamatia Islamic Centre/);
  assert.match(next, /data-react-helmet="true"/);
});
