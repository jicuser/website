import test from 'node:test';
import assert from 'node:assert/strict';
import {
  programmeForForm,
  programmeJourney,
  programmeRegistrationPath,
  programmeSlugFromSearch,
} from '../src/lib/programmeJourney.js';

const page = {
  slug: 'arabic-course',
  title: 'Arabic course',
  placement: '/education/courses',
  form: { slug: 'arabic-registration', open: true },
};

test('registration keeps the programme reference across a copied or refreshed form URL', () => {
  const target = programmeRegistrationPath(page);
  assert.equal(target, '/forms/arabic-registration?programme=arabic-course');
  const query = new URL(target, 'https://jicmasjid.org').search;
  const requested = programmeSlugFromSearch(query);
  assert.deepEqual(programmeForForm(page, 'arabic-registration', requested), {
    slug: page.slug,
    title: page.title,
    placement: page.placement,
    to: '/pages/arabic-course',
  });
});

test('form references reject external URLs, ambiguous values and malformed slugs', () => {
  for (const query of [
    '',
    '?programme=',
    '?programme=https%3A%2F%2Fexample.org',
    '?programme=%2F%2Fevil.example',
    '?programme=arabic%2Fcourse',
    '?programme=%252Fpages%252Farabic-course',
    '?programme=arabic-course&programme=other-course',
    '?programme=Arabic-Course',
    '?programme=ab',
    `?programme=${'a'.repeat(81)}`,
  ])
    assert.equal(programmeSlugFromSearch(query), null, query);
});

test('only the server-confirmed page and form relationship provides a return destination', () => {
  for (const candidate of [
    null,
    { ...page, slug: 'another-course' },
    { ...page, form: null },
    { ...page, form: { slug: 'other-registration' } },
    { ...page, placement: 'https://example.org' },
    { ...page, placement: '/admin' },
    { ...page, title: '' },
  ])
    assert.equal(programmeForForm(candidate, 'arabic-registration', 'arabic-course'), null);
  assert.equal(programmeForForm(page, 'other-registration', 'arabic-course'), null);
  assert.equal(programmeForForm(page, 'arabic-registration', null), null);
  assert.equal(programmeForForm(null, 'arabic-registration', undefined), null);
});

test('a closed form can still return to its published programme details', () => {
  assert.equal(
    programmeForForm(
      { ...page, form: { ...page.form, open: false } },
      'arabic-registration',
      'arabic-course',
    ).to,
    '/pages/arabic-course',
  );
});

test('programme context accepts only known public placements and safe local destinations', () => {
  assert.equal(programmeJourney({ ...page, slug: '../admin' }), null);
  assert.equal(programmeJourney({ ...page, placement: '//example.org' }), null);
  assert.equal(programmeRegistrationPath({ ...page, form: null }), null);
  assert.equal(programmeRegistrationPath({ ...page, form: { slug: '../admin' } }), null);
  assert.equal(programmeJourney(page).placement, '/education/courses');
});
