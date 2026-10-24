import test from 'node:test';
import assert from 'node:assert/strict';
import { readFuneralFacilities, funeralImageUrl } from '../src/features/funerals/facilities.js';

test('funeral facilities include the six approved services with a prayer hall', () => {
  const facilities = readFuneralFacilities('[]');
  assert.equal(facilities.length, 6);
  assert.deepEqual(new Set(facilities.map(({ id }) => id)), new Set([
    'ambulance', 'hearse', 'washing', 'cold-room', 'prayer-hall', 'family-room',
  ]));
  assert.ok(facilities.every(({ image }) => image === ''));
});

test('existing admin photos, titles and visibility survive the redesign', () => {
  const facilities = readFuneralFacilities(JSON.stringify([
    { id: 'ambulance', title: 'Our collection service', image: '/images/our-ambulance.jpg', alt: 'JIC vehicle', visible: false },
    { id: 'prayer-hall', image: 'https://example.org/our-hall.jpg', visible: true },
  ]));
  const ambulance = facilities.find(({ id }) => id === 'ambulance');
  assert.equal(ambulance.title, 'Our collection service');
  assert.equal(ambulance.image, '/images/our-ambulance.jpg');
  assert.equal(ambulance.alt, 'JIC vehicle');
  assert.equal(ambulance.visible, false);
  assert.equal(facilities.find(({ id }) => id === 'prayer-hall')?.image, 'https://example.org/our-hall.jpg');
});

test('facility image URLs continue rejecting executable and insecure values', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,evil', '//evil.test/image.jpg', 'http://evil.test/image.jpg', 'https://user:pass@example.org/a.jpg', 'https://example.org/a b.jpg']) {
    assert.equal(funeralImageUrl(url), '', url);
  }
  assert.equal(funeralImageUrl('/images/hall.jpg'), '/images/hall.jpg');
  assert.equal(funeralImageUrl('https://example.org/hall.jpg'), 'https://example.org/hall.jpg');
});

test('malformed or empty saved content still returns valid facilities', () => {
  for (const raw of ['invalid json', null, {}, 'null']) {
    const facilities = readFuneralFacilities(raw);
    assert.equal(facilities.length, 6);
    assert.ok(facilities.every(({ title, visible }) => title && visible));
  }
});
