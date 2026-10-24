export const TV_WORKSPACE_TABS = [
  { id: 'display', label: 'Display' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'settings', label: 'Settings' },
];

export function nextTvWorkspaceTab(current, key) {
  const ids = TV_WORKSPACE_TABS.map(({ id }) => id);
  const index = Math.max(0, ids.indexOf(current));
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids.at(-1);
  if (key === 'ArrowRight') return ids[(index + 1) % ids.length];
  if (key === 'ArrowLeft') return ids[(index + ids.length - 1) % ids.length];
  return null;
}

export function canPublishTvChanges({ dirty = false, busy = false, remoteChanged = false } = {}) {
  return Boolean(dirty && !busy && !remoteChanged);
}
