import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTvSettingsDraft,
  hasTvSettingsChanges,
  tvSettingsDraftReducer,
} from '../src/lib/tvSettingsDraft.js';
import {
  restoreTvLocalDraft,
  serializeTvLocalDraft,
  tvLocalDraftKey,
} from '../src/lib/tvLocalDraft.js';

const userId = 'staff-one';
const screenId = 'mens-main';
const data = {
  settings: { jamaah_message: 'Please remain quiet' },
  updated_at: '2026-10-25T10:00:00Z',
};
const changedDraft = () =>
  tvSettingsDraftReducer(createTvSettingsDraft(screenId, data), {
    type: 'edit',
    key: 'jamaah_message',
    value: 'Please silence your phone',
  });

test('explicit tab drafts restore edits without changing the published baseline or revision', () => {
  const raw = serializeTvLocalDraft(changedDraft(), userId, '2026-10-25T10:01:00Z');
  const restored = restoreTvLocalDraft(raw, { userId, screenId, data });
  assert.equal(restored.state.form.jamaah_message, 'Please silence your phone');
  assert.equal(JSON.parse(restored.state.baseline).jamaah_message, 'Please remain quiet');
  assert.equal(restored.state.revision, data.updated_at);
  assert.equal(restored.state.remoteChanged, false);
  assert.equal(hasTvSettingsChanges(restored.state), true);
  assert.equal(data.settings.jamaah_message, 'Please remain quiet');
});

test('a saved draft is scoped to both the staff account and the selected screen', () => {
  const raw = serializeTvLocalDraft(changedDraft(), userId);
  assert.notEqual(tvLocalDraftKey(userId, screenId), tvLocalDraftKey('staff-two', screenId));
  assert.notEqual(tvLocalDraftKey(userId, screenId), tvLocalDraftKey(userId, 'shoe-area'));
  assert.equal(tvLocalDraftKey(null, screenId), null);
  assert.equal(restoreTvLocalDraft(raw, { userId: 'staff-two', screenId, data }), null);
  assert.equal(restoreTvLocalDraft(raw, { userId, screenId: 'shoe-area', data }), null);
});

test('restoring an older draft locks publishing and never rebases its optimistic revision', () => {
  const raw = serializeTvLocalDraft(changedDraft(), userId);
  const newer = {
    settings: { jamaah_message: 'A different operator published this' },
    updated_at: '2026-10-25T10:02:00Z',
  };
  const restored = restoreTvLocalDraft(raw, { userId, screenId, data: newer });
  assert.equal(restored.state.form.jamaah_message, 'Please silence your phone');
  assert.equal(restored.state.revision, data.updated_at);
  assert.equal(restored.state.remoteChanged, true);
  assert.equal(JSON.parse(restored.state.baseline).jamaah_message, newer.settings.jamaah_message);
});

test('an already-published or unchanged draft is not restored as unpublished work', () => {
  assert.equal(serializeTvLocalDraft(createTvSettingsDraft(screenId, data), userId), null);
  const changed = changedDraft();
  const raw = serializeTvLocalDraft(changed, userId);
  const published = { settings: changed.form, updated_at: '2026-10-25T10:03:00Z' };
  assert.equal(restoreTvLocalDraft(raw, { userId, screenId, data: published }), null);
});

test('corrupt or unsupported saved data cannot prevent the display editor from loading', () => {
  for (const raw of [null, '', '{broken', '{}', 'null', '[]']) {
    assert.equal(restoreTvLocalDraft(raw, { userId, screenId, data }), null);
  }
  const saved = JSON.parse(serializeTvLocalDraft(changedDraft(), userId));
  for (const patch of [
    { version: 99 },
    { revision: 'invalid' },
    { form: null },
    { baseline: 'invalid' },
  ]) {
    assert.equal(
      restoreTvLocalDraft(JSON.stringify({ ...saved, ...patch }), { userId, screenId, data }),
      null,
    );
  }
});
