import { DEFAULT_TV_PRESET_NAMES } from '../../supabase/functions/_shared/tv.js';

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
  before: 'The reminder shown shortly before Jama‘ah.',
  jamaah: 'The display shown during Jama‘ah, before dhikr begins.',
  dhikr: 'The dhikr shown after each prayer.',
  jummah: 'The welcome display for Friday prayers.',
  ramadan: 'The du‘a display used during Ramadan.',
};

export function tvPresetLabel(key, names = {}) {
  const name = names?.[key]?.trim();
  if (!name || name === key || name === DEFAULT_TV_PRESET_NAMES[key])
    return TV_PRESET_LABELS[key] || key;
  return name;
}
