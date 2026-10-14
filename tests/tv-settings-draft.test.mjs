import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTvSettingsDraft,
  hasTvSettingsChanges,
  tvSettingsDraftReducer,
} from '../src/lib/tvSettingsDraft.js';
import { tvPresetLabel, TV_PRESET_LABELS } from '../src/lib/tvEditorLabels.js';
import { DEFAULT_TV_PRESET_NAMES } from '../supabase/functions/_shared/tv.js';

const first = {
  settings: { jamaah_message: 'Please remain quiet' },
  updated_at: '2026-10-14T14:00:00Z',
};
const next = {
  settings: { jamaah_message: 'Prayer in progress' },
  updated_at: '2026-10-14T14:01:00Z',
};
const sync = (state, data) =>
  tvSettingsDraftReducer(state, { type: 'sync', screenId: 'mens-main', data });

test('old settings open as a normalized clean draft without changing the saved layout', () => {
  const state = createTvSettingsDraft('mens-main', first);
  assert.equal(hasTvSettingsChanges(state), false);
  assert.equal(state.form.jamaah_message, first.settings.jamaah_message);
  assert.ok(state.form.display_layouts.portrait.before.layers.length);
  assert.deepEqual(first.settings, { jamaah_message: 'Please remain quiet' });
});

test('polling preserves edits and the original optimistic-lock revision', () => {
  const initial = createTvSettingsDraft('mens-main', first);
  const edited = tvSettingsDraftReducer(initial, {
    type: 'edit',
    key: 'jamaah_message',
    value: 'Local draft',
  });
  assert.equal(sync(edited, first), edited);
  const conflict = sync(edited, next);
  assert.equal(conflict.form.jamaah_message, 'Local draft');
  assert.equal(conflict.revision, first.updated_at);
  assert.equal(conflict.remoteChanged, true);
  assert.equal(hasTvSettingsChanges(conflict), true);
});

test('clean drafts follow saved changes, and save responses defeat older in-flight polls', () => {
  const initial = createTvSettingsDraft('mens-main', first);
  const refreshed = sync(initial, next);
  assert.equal(refreshed.form.jamaah_message, next.settings.jamaah_message);
  const edited = tvSettingsDraftReducer(refreshed, {
    type: 'edit',
    key: 'jamaah_message',
    value: 'Changed',
  });
  const saved = tvSettingsDraftReducer(edited, {
    type: 'saved',
    screenId: 'mens-main',
    data: next,
  });
  assert.equal(hasTvSettingsChanges(saved), false);
  assert.equal(sync(saved, first), saved);
});

test('explicit reload and switching screens replace only the intended draft', () => {
  const edited = tvSettingsDraftReducer(createTvSettingsDraft('mens-main', first), {
    type: 'edit',
    key: 'jamaah_message',
    value: 'Draft',
  });
  const reloaded = tvSettingsDraftReducer(edited, {
    type: 'reload',
    screenId: 'mens-main',
    data: next,
  });
  assert.equal(hasTvSettingsChanges(reloaded), false);
  assert.equal(reloaded.form.jamaah_message, next.settings.jamaah_message);
  const switched = tvSettingsDraftReducer(edited, {
    type: 'sync',
    screenId: 'ladies-upstairs',
    data: first,
  });
  assert.equal(switched.screenId, 'ladies-upstairs');
  assert.equal(hasTvSettingsChanges(switched), false);
});

test('layout labels explain old preset IDs while preserving custom names', () => {
  for (const [key, label] of Object.entries(TV_PRESET_LABELS)) {
    assert.equal(tvPresetLabel(key), label);
    assert.equal(tvPresetLabel(key, { [key]: key }), label);
    assert.equal(tvPresetLabel(key, DEFAULT_TV_PRESET_NAMES), label);
    assert.equal(tvPresetLabel(key, { [key]: 'Our chosen name' }), 'Our chosen name');
  }
});
