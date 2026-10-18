import test from 'node:test';
import assert from 'node:assert/strict';
import { tvSettingsChanges } from '../src/lib/tvSettingsReview.js';

test('review names the changed settings without exposing raw keys or mutating the saved baseline', () => {
  const saved = {
    display_theme: 'midnight',
    display_layouts: { landscape: { standby: { layers: [] } } },
    poster_ids: ['one'],
    jamaah_lead_minutes: 1,
  };
  const baseline = structuredClone(saved);
  const draft = { ...saved, display_theme: 'pearl', jamaah_lead_minutes: 3 };
  assert.deepEqual(tvSettingsChanges(saved, draft), [
    'Colour scheme',
    'Prayer messages and timing',
  ]);
  assert.deepEqual(saved, baseline);
  assert.deepEqual(tvSettingsChanges(saved, structuredClone(saved)), []);
});

test('nested item changes and poster selections appear in the review', () => {
  const saved = {
    display_layouts: { portrait: { standby: { layers: [{ hidden: false }] } } },
    poster_ids: [],
  };
  const draft = {
    display_layouts: { portrait: { standby: { layers: [{ hidden: true }] } } },
    poster_ids: ['poster'],
  };
  assert.deepEqual(tvSettingsChanges(saved, draft), ['Layouts and items', 'Posters and rotation']);
});
