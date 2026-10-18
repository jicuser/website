const groups = [
  ['Screen shape', ['display_orientation']],
  ['Colour scheme', ['display_theme']],
  ['Layouts and items', ['display_layouts']],
  ['Section names', ['preset_names']],
  ['Posters and rotation', ['poster_ids', 'include_events', 'rotation_seconds']],
  ['Scheduled notices', ['scheduled_scenes']],
  [
    'Prayer messages and timing',
    [
      'prayer_enabled',
      'jamaah_lead_minutes',
      'before_jamaah_message',
      'jamaah_message',
      'jamaah_submessage',
      'dhikr_delay_fajr',
      'dhikr_delay_dhuhr',
      'dhikr_delay_asr',
      'dhikr_delay_maghrib',
      'dhikr_delay_isha',
      'auto_jummah',
      'jummah_notice',
      'ramadan_calendar',
      'calendar_offset',
      'taraweeh_dua',
    ],
  ],
];

export function tvSettingsChanges(saved, draft) {
  return groups
    .filter(([, keys]) =>
      keys.some((key) => JSON.stringify(saved[key]) !== JSON.stringify(draft[key])),
    )
    .map(([label]) => label);
}
