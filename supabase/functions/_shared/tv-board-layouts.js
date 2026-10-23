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
  {
    id: 'iftar',
    name: 'Iftar sponsorships',
    description: 'Show Iftar meal sponsors, reserved days and available days.',
  },
  {
    id: 'suhoor',
    name: 'Suhoor sponsorships',
    description: 'Show Suhoor meal sponsors, reserved days and available days.',
  },
  {
    id: 'daily-giving',
    name: 'Daily Giving',
    description: 'Show the Ramadan Daily Giving sponsorship board.',
  },
];

export function tvBoardLayout(id, orientation = 'landscape') {
  const preset = TV_BOARD_LAYOUTS.find((item) => item.id === id);
  if (!preset || !['landscape', 'portrait'].includes(orientation))
    throw new Error('Choose a valid screen layout and screen shape.');
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
  // Keep the bottom 5% clear for the screen's separate connection code.
  let body;
  if (id === 'classic') {
    body = portrait
      ? [
          layer('times', 3, 11, 94, 37, { layout: 'vertical' }),
          layer('poster', 3, 50, 94, 38),
          layer('next', 3, 90, 94, 5),
        ]
      : [
          layer('times', 3, 15, 47, 70, { layout: 'vertical' }),
          layer('poster', 52, 15, 45, 70),
          layer('next', 3, 88, 94, 7),
        ];
  } else if (['iftar', 'suhoor', 'daily-giving'].includes(id)) {
    const content = { ramadan_kind: id === 'daily-giving' ? 'daily' : id };
    body = [layer('ramadan', 3, portrait ? 11 : 15, 94, portrait ? 84 : 80, content)];
  } else {
    body = portrait
      ? [
          layer(id === 'countdown' ? 'next' : 'poster', 3, 11, 94, 50),
          layer('times', 3, 63, 94, 32, { layout: 'vertical' }),
        ]
      : [
          layer(id === 'countdown' ? 'next' : 'poster', 3, 15, 94, 54),
          layer('times', 3, 72, 94, 23, { layout: 'horizontal' }),
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
