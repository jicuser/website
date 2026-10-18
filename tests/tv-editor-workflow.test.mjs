import test from 'node:test';
import assert from 'node:assert/strict';
import * as labels from '../src/lib/tvEditorLabels.js';
import { DEFAULT_TV_PRESET_NAMES } from '../supabase/functions/_shared/tv.js';

test('hall editors offer each automatic section once in its display order', () => {
  for (const screenId of ['mens-main', 'ladies-upstairs']) {
    const sections = labels.tvEditorSections(screenId);
    assert.deepEqual(
      sections.map((section) => section.id),
      ['standby', 'before', 'jamaah', 'dhikr', 'jummah', 'ramadan'],
    );
    assert.equal(new Set(sections.map((section) => section.id)).size, sections.length);
    assert.ok(sections.every((section) => section.name.trim() && section.description.trim()));
  }
});

test('shoe-area editing exposes only its supported everyday section', () => {
  const sections = labels.tvEditorSections('shoe-area', { standby: 'Entrance notices' });
  assert.deepEqual(
    sections.map((section) => section.id),
    ['standby'],
  );
  assert.equal(sections[0].name, 'Entrance notices');
});

test('selecting sections preserves saved names and returns independent display metadata', () => {
  const names = Object.freeze({ ...DEFAULT_TV_PRESET_NAMES, before: 'Prepare for Jama‘ah' });
  const saved = JSON.stringify(names);
  const sections = labels.tvEditorSections('mens-main', names);
  assert.equal(sections.find((section) => section.id === 'before').name, names.before);
  sections[0].name = 'Temporary editor change';
  sections[0].description = 'Temporary description';
  const reopened = labels.tvEditorSections('mens-main', names);
  assert.equal(reopened[0].name, labels.tvPresetLabel('standby', names));
  assert.notEqual(reopened[0].description, sections[0].description);
  assert.equal(JSON.stringify(names), saved);
});
