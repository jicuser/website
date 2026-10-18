const copy = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** Keep absence as well as a custom scene: both are meaningful defaults. */
export function snapshotTvBoardLayout(settings) {
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const layouts = settings.display_layouts;
  const scenes = layouts?.[orientation];
  return {
    orientation,
    layoutsWasObject: layouts != null && typeof layouts === 'object',
    layoutsValue: layouts == null ? layouts : undefined,
    hadOrientation: Object.hasOwn(layouts || {}, orientation),
    orientationWasObject: scenes != null && typeof scenes === 'object',
    orientationValue: scenes == null ? scenes : undefined,
    hadStandby: Object.hasOwn(scenes || {}, 'standby'),
    standby: copy(scenes?.standby),
  };
}

/** Restore only the replaced scene, retaining edits to every other moment. */
export function restoreTvBoardLayout(settings, snapshot) {
  const layouts = { ...settings.display_layouts };
  const scenes = { ...layouts[snapshot.orientation] };
  if (snapshot.hadStandby) scenes.standby = copy(snapshot.standby);
  else delete scenes.standby;
  if (Object.keys(scenes).length) layouts[snapshot.orientation] = scenes;
  else if (snapshot.hadOrientation)
    layouts[snapshot.orientation] = snapshot.orientationWasObject
      ? scenes
      : snapshot.orientationValue;
  else delete layouts[snapshot.orientation];
  return Object.keys(layouts).length || snapshot.layoutsWasObject ? layouts : snapshot.layoutsValue;
}

export function canRestoreTvBoardLayout(settings, change) {
  if (!change) return false;
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  return (
    orientation === change.snapshot.orientation &&
    JSON.stringify(settings.display_layouts?.[orientation]?.standby) ===
      JSON.stringify(change.applied)
  );
}
