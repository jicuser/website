import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverStreamWorkspace, streamEndSnapshot } from '../src/lib/streamRecovery.js';

const liveForm = {
  scene_mode: 'teaching', active_scene_id: 'lesson', muted: true,
  scenes: [{ id: 'lesson', name: 'Lesson layout', layers: [{ id: 'clock', type: 'clock' }] }],
};
const live = { presentation: { id: 'current-session' }, settings: liveForm, updated_at: 'server-revision' };
const edited = { ...liveForm, muted: false };

test('a fresh login recovers the server session without browser storage', () => {
  const recovered = recoverStreamWorkspace(live, null);
  assert.equal(recovered?.managedId, 'current-session');
  assert.equal(recovered?.stage, 3);
  assert.deepEqual(recovered?.form, liveForm);
  assert.deepEqual(recovered?.baseline, liveForm);
  assert.equal(recovered?.revision, 'server-revision');
  assert.equal(recovered?.recoveredLive, true);
});

test('a corrupt browser draft does not hide the active server session', () => {
  const recovered = recoverStreamWorkspace(live, { stage: 3, form: { scenes: 'broken' } });
  assert.equal(recovered?.managedId, 'current-session');
});

test('no active session and no draft leaves a clean setup', () => {
  assert.equal(recoverStreamWorkspace({ ...live, presentation: null }, null), null);
});

test('unpublished edits to the same session survive refresh', () => {
  const recovered = recoverStreamWorkspace(live, {
    form: edited, stage: 3, managedId: 'current-session', baseline: liveForm,
    revision: 'draft-revision', streamName: 'Sunday lesson',
  });
  assert.deepEqual(recovered.form, edited);
  assert.equal(recovered.managedId, 'current-session');
  assert.equal(recovered.revision, 'draft-revision');
  assert.equal(recovered.streamName, 'Sunday lesson');
  assert.equal(recovered.recoveredLive, false);
});

test('a different saved draft is not silently adopted into the running session', () => {
  const recovered = recoverStreamWorkspace(live, {
    form: edited, stage: 3, managedId: 'old-session', streamName: 'Next lesson',
  });
  assert.equal(recovered.managedId, null);
  assert.deepEqual(recovered.form, edited);
  assert.equal(recovered.streamName, 'Next lesson');
});

test('an ended session is not resurrected from a browser draft', () => {
  const recovered = recoverStreamWorkspace({ ...live, presentation: null }, {
    form: edited, stage: 3, managedId: 'current-session', streamName: 'Sunday lesson',
  });
  assert.equal(recovered.managedId, null);
});

test('a deliberately named new setup stays separate from the current session', () => {
  const recovered = recoverStreamWorkspace(live, { stage: 2, streamName: 'Next lesson', form: null });
  assert.equal(recovered?.managedId, null);
  assert.equal(recovered?.stage, 2);
  assert.equal(recovered?.streamName, 'Next lesson');
  assert.equal(recovered?.form, null);
});

test('ending a session from a different workspace saves the server layout, not the other draft', () => {
  const snapshot = streamEndSnapshot(live, {
    form: edited, managedId: 'old-session', savedTemplate: { id: 'other-template' }, streamName: 'Next lesson',
  });
  assert.deepEqual(snapshot.form, liveForm);
  assert.equal(snapshot.template, null);
  assert.equal(snapshot.name, '');
});

test('ending the managed session keeps its edits and chosen save name', () => {
  const template = { id: 'lesson-template' };
  const snapshot = streamEndSnapshot(live, {
    form: edited, managedId: 'current-session', savedTemplate: template, streamName: 'Sunday lesson',
  });
  assert.deepEqual(snapshot.form, edited);
  assert.equal(snapshot.template, template);
  assert.equal(snapshot.name, 'Sunday lesson');
});

test('recovery does not mutate the server snapshot or browser draft', () => {
  const source = structuredClone(live);
  const draft = { form: edited, stage: 3, managedId: 'old-session' };
  const savedDraft = structuredClone(draft);
  recoverStreamWorkspace(source, draft);
  assert.deepEqual(source, live);
  assert.deepEqual(draft, savedDraft);
});

test('ending another session preserves a new setup that has only been named', () => {
  const snapshot = streamEndSnapshot(live, {
    managedId: null, form: null, streamName: 'Next lesson',
  });
  assert.equal(snapshot.keepDraft, true);
});

test('ending the managed session clears its workspace after saving a snapshot', () => {
  const snapshot = streamEndSnapshot(live, {
    managedId: 'current-session', form: edited, streamName: 'Sunday lesson',
  });
  assert.equal(snapshot.keepDraft, false);
});
