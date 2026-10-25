export const TV_WORKSPACE_TABS = [
  { id: 'display', label: 'Display' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'settings', label: 'Settings' },
];

export const TV_EDITOR_TABS = [
  { id: 'layout', label: 'Layout' },
  { id: 'content', label: 'Content' },
  { id: 'timing', label: 'Timing' },
];

function nextTab(tabs, current, key) {
  const ids = tabs.map(({ id }) => id);
  const index = Math.max(0, ids.indexOf(current));
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids.at(-1);
  if (key === 'ArrowRight') return ids[(index + 1) % ids.length];
  if (key === 'ArrowLeft') return ids[(index + ids.length - 1) % ids.length];
  return null;
}

export function nextTvWorkspaceTab(current, key) {
  return nextTab(TV_WORKSPACE_TABS, current, key);
}

export function nextTvEditorTab(current, key) {
  return nextTab(TV_EDITOR_TABS, current, key);
}

export function canPublishTvChanges({ dirty = false, busy = false, remoteChanged = false } = {}) {
  return Boolean(dirty && !busy && !remoteChanged);
}
