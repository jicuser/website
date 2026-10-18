import { DEFAULT_TV_PRESET_NAMES, TV_PRESET_KEYS } from '../../supabase/functions/_shared/tv.js';

export const TV_PRESET_LABELS = {
  standby: 'Everyday display',
  before: 'Before prayer',
  jamaah: 'Prayer in progress',
  dhikr: 'After-prayer dhikr',
  jummah: 'Friday prayers',
  ramadan: 'Ramadan',
};

export const TV_PRESET_DESCRIPTIONS = {
  standby: 'The usual display between prayers and presentations.',
  before: 'A reminder before Jama‘ah, using the lead time set for this screen.',
  jamaah: 'Shown from Jama‘ah time until the dhikr screen starts.',
  dhikr: 'Shown after the delay set for each prayer.',
  jummah: 'The welcome display for Friday prayers.',
  ramadan: 'The du‘a display used during Ramadan.',
};

export function tvPresetLabel(key, names = {}) {
  const name = names?.[key]?.trim();
  if (!name || name === key || name === DEFAULT_TV_PRESET_NAMES[key])
    return TV_PRESET_LABELS[key] || key;
  return name;
}

export function tvEditorSections(screenId, names = {}) {
  return TV_PRESET_KEYS.filter((id) => screenId !== 'shoe-area' || id === 'standby').map((id) => ({
    id,
    name: tvPresetLabel(id, names),
    description: TV_PRESET_DESCRIPTIONS[id],
  }));
}
