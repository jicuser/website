import { normaliseTvSettings } from '../../supabase/functions/_shared/tv.js';

export function createTvSettingsDraft(screenId, data) {
  const form = { ...normaliseTvSettings(data.settings), scene_mode: 'normal' };
  return {
    screenId,
    form,
    baseline: JSON.stringify(form),
    revision: data.updated_at,
    remoteChanged: false,
  };
}

export function hasTvSettingsChanges(state) {
  return JSON.stringify(state.form) !== state.baseline;
}

export function tvSettingsDraftReducer(state, action) {
  if (action.type === 'edit')
    return { ...state, form: { ...state.form, [action.key]: action.value } };
  if (action.type === 'saved' || action.type === 'reload')
    return createTvSettingsDraft(action.screenId, action.data);
  if (action.type !== 'sync') return state;
  if (action.screenId !== state.screenId)
    return createTvSettingsDraft(action.screenId, action.data);
  if (action.data.updated_at === state.revision) return state;
  // A poll started before a save can arrive after the save response.
  if (Date.parse(action.data.updated_at) < Date.parse(state.revision)) return state;
  if (hasTvSettingsChanges(state)) return { ...state, remoteChanged: true };
  return createTvSettingsDraft(action.screenId, action.data);
}
