import { normaliseTvSettings } from '../../supabase/functions/_shared/tv.js';
import { createTvSettingsDraft, hasTvSettingsChanges } from './tvSettingsDraft.js';

const VERSION = 1;
const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function tvLocalDraftKey(userId, screenId) {
  return userId && screenId ? `jic-tv-display-draft:${userId}:${screenId}` : null;
}

// Called only by the explicit Save draft action. Storage stays in the caller so
// opening an editor, previewing, and editing cannot write a draft automatically.
export function serializeTvLocalDraft(draft, userId, savedAt = new Date().toISOString()) {
  if (!userId || !draft.screenId || !hasTvSettingsChanges(draft)) return null;
  return JSON.stringify({
    version: VERSION,
    userId,
    screenId: draft.screenId,
    revision: draft.revision,
    baseline: draft.baseline,
    form: draft.form,
    savedAt,
  });
}

export function restoreTvLocalDraft(raw, { userId, screenId, data }) {
  if (!raw || !userId) return null;
  try {
    const saved = JSON.parse(raw);
    if (
      saved?.version !== VERSION ||
      saved.userId !== userId ||
      saved.screenId !== screenId ||
      typeof saved.revision !== 'string' ||
      !Number.isFinite(Date.parse(saved.revision)) ||
      !isRecord(saved.form) ||
      typeof saved.baseline !== 'string' ||
      !isRecord(JSON.parse(saved.baseline))
    )
      return null;

    const current = createTvSettingsDraft(screenId, data);
    const state = {
      ...current,
      form: { ...normaliseTvSettings(saved.form), scene_mode: 'normal' },
      // Keep the original revision: restoring must never silently rebase edits.
      revision: saved.revision,
      remoteChanged: saved.revision !== current.revision,
    };
    // Already-published drafts must not reappear after a successful save, even
    // if the browser had been unable to remove its old storage entry.
    if (!hasTvSettingsChanges(state)) return null;
    return { state, savedAt: saved.savedAt };
  } catch {
    // Unavailable or damaged tab storage must never stop the live editor loading.
    return null;
  }
}
