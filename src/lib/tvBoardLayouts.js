// These presets use the existing saved-scene contract. Choosing one changes
// only the current orientation's everyday layout, never prayer or stream scenes.
export const TV_BOARD_LAYOUTS = [
  {
    id: 'classic',
    name: 'Timetable & notices',
    description: 'Prayer times beside a rotating notice. A clear view of both.',
  },
  {
    id: 'countdown',
    name: 'Countdown',
    description: 'A large countdown to the next jama’ah, with the timetable below.',
  },
  {
    id: 'noticeboard',
    name: 'Noticeboard',
    description: 'Give posters more room, with prayer times always in view.',
  },
];

export function tvBoardLayout(id, orientation = 'landscape') {
  const preset = TV_BOARD_LAYOUTS.find((item) => item.id === id);
  if (!preset || !['landscape', 'portrait'].includes(orientation))
    throw new Error('Choose a valid prayer board layout and screen shape.');
  const portrait = orientation === 'portrait';
  const layer = (type, x, y, width, height, extra = {}) => ({
    id: `board-${type}`,
    type,
    x,
    y,
    width,
    height,
    ...extra,
  });
  const header = [
    layer('brand', 3, 2, portrait ? 30 : 22, portrait ? 7 : 10),
    layer('clock', portrait ? 35 : 47, 2, portrait ? 62 : 50, portrait ? 7 : 10),
  ];
  let body;
  if (id === 'classic') {
    body = portrait
      ? [
          layer('times', 3, 11, 94, 37, { layout: 'vertical' }),
          layer('poster', 3, 50, 94, 38),
          layer('next', 3, 90, 94, 8),
        ]
      : [
          layer('times', 3, 15, 47, 70, { layout: 'vertical' }),
          layer('poster', 52, 15, 45, 70),
          layer('next', 3, 88, 94, 10),
        ];
  } else {
    body = portrait
      ? [
          layer(id === 'countdown' ? 'next' : 'poster', 3, 11, 94, 50),
          layer('times', 3, 63, 94, 35, { layout: 'vertical' }),
        ]
      : [
          layer(id === 'countdown' ? 'next' : 'poster', 3, 15, 94, 54),
          layer('times', 3, 72, 94, 26, { layout: 'horizontal' }),
        ];
  }
  return {
    id: `standby-board-${id}-${orientation}`,
    name: preset.name,
    overlap: true,
    layers: [...header, ...body],
  };
}

export function tvBoardLayoutId(scene) {
  return (
    TV_BOARD_LAYOUTS.find((item) =>
      ['landscape', 'portrait'].some((shape) => scene?.id === `standby-board-${item.id}-${shape}`),
    )?.id || ''
  );
}

export function withTvBoardLayout(settings, id) {
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  return {
    ...settings.display_layouts,
    [orientation]: {
      ...settings.display_layouts?.[orientation],
      standby: tvBoardLayout(id, orientation),
    },
  };
}
