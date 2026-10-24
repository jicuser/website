import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TV_WORKSPACE_TABS,
  nextTvWorkspaceTab,
  canPublishTvChanges,
} from '../src/features/displays/tvWorkspaceModel.js';

test('workspace keeps the four compact tasks in the approved order', () => {
  assert.deepEqual(TV_WORKSPACE_TABS.map(({ id, label }) => [id, label]), [
    ['display', 'Display'], ['scenes', 'Scenes'], ['schedule', 'Schedule'], ['settings', 'Settings'],
  ]);
});
test('tab arrow keys wrap without escaping the tab group', () => {
  assert.equal(nextTvWorkspaceTab('display', 'ArrowRight'), 'scenes');
  assert.equal(nextTvWorkspaceTab('settings', 'ArrowRight'), 'display');
  assert.equal(nextTvWorkspaceTab('display', 'ArrowLeft'), 'settings');
  assert.equal(nextTvWorkspaceTab('schedule', 'ArrowLeft'), 'scenes');
});
test('tab Home and End keys move to the first and last task', () => {
  assert.equal(nextTvWorkspaceTab('schedule', 'Home'), 'display');
  assert.equal(nextTvWorkspaceTab('scenes', 'End'), 'settings');
});
test('typing and Tab are not intercepted by task navigation', () => {
  for (const key of ['Tab', 'Enter', ' ', 'x', 'ArrowDown']) {
    assert.equal(nextTvWorkspaceTab('display', key), null);
  }
});
test('only a changed, idle, conflict-free draft may be published', () => {
  for (const dirty of [false, true]) {
    for (const busy of [false, true]) {
      for (const remoteChanged of [false, true]) {
        assert.equal(canPublishTvChanges({ dirty, busy, remoteChanged }), dirty && !busy && !remoteChanged);
      }
    }
  }
});
test('missing publish state is not treated as permission to publish', () => {
  assert.equal(canPublishTvChanges(), false);
  assert.equal(canPublishTvChanges({}), false);
});
