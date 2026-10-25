import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TV_WORKSPACE_TABS,
  TV_EDITOR_TABS,
  nextTvWorkspaceTab,
  nextTvEditorTab,
  canPublishTvChanges,
} from '../src/features/displays/tvWorkspaceModel.js';

test('screen navigation separates the display, schedule and screen settings', () => {
  assert.deepEqual(
    TV_WORKSPACE_TABS.map(({ id, label }) => [id, label]),
    [
      ['display', 'Display'],
      ['schedule', 'Schedule'],
      ['settings', 'Settings'],
    ],
  );
});
test('display editing groups layout, content and timing in their approved order', () => {
  assert.deepEqual(
    TV_EDITOR_TABS.map(({ id, label }) => [id, label]),
    [
      ['layout', 'Layout'],
      ['content', 'Content'],
      ['timing', 'Timing'],
    ],
  );
});
test('tab arrow keys wrap without escaping the tab group', () => {
  assert.equal(nextTvWorkspaceTab('display', 'ArrowRight'), 'schedule');
  assert.equal(nextTvWorkspaceTab('settings', 'ArrowRight'), 'display');
  assert.equal(nextTvWorkspaceTab('display', 'ArrowLeft'), 'settings');
  assert.equal(nextTvWorkspaceTab('schedule', 'ArrowLeft'), 'display');
  assert.equal(nextTvEditorTab('layout', 'ArrowLeft'), 'timing');
  assert.equal(nextTvEditorTab('timing', 'ArrowRight'), 'layout');
  assert.equal(nextTvEditorTab('layout', 'ArrowRight'), 'content');
  assert.equal(nextTvEditorTab('timing', 'ArrowLeft'), 'content');
});
test('tab Home and End keys move to the first and last task', () => {
  assert.equal(nextTvWorkspaceTab('schedule', 'Home'), 'display');
  assert.equal(nextTvWorkspaceTab('schedule', 'End'), 'settings');
  assert.equal(nextTvEditorTab('content', 'Home'), 'layout');
  assert.equal(nextTvEditorTab('content', 'End'), 'timing');
});
test('typing and Tab are not intercepted by task navigation', () => {
  for (const key of ['Tab', 'Enter', ' ', 'x', 'ArrowDown']) {
    assert.equal(nextTvWorkspaceTab('display', key), null);
    assert.equal(nextTvEditorTab('layout', key), null);
  }
});
test('only a changed, idle, conflict-free draft may be published', () => {
  for (const dirty of [false, true]) {
    for (const busy of [false, true]) {
      for (const remoteChanged of [false, true]) {
        assert.equal(
          canPublishTvChanges({ dirty, busy, remoteChanged }),
          dirty && !busy && !remoteChanged,
        );
      }
    }
  }
});
test('missing publish state is not treated as permission to publish', () => {
  assert.equal(canPublishTvChanges(), false);
  assert.equal(canPublishTvChanges({}), false);
});
