import { tvScene } from '../../supabase/functions/_shared/tv.js';
import { automaticTvNotice, tvPrayerSequence, tvSpecialNotice } from './tvPrayerSequence.js';

// The overview and receiving screen use the same prayer/seasonal priority.
export function tvAutomaticState(settings, now, prayers, screenId) {
  const sequence = tvPrayerSequence(
    now,
    prayers.todaysTimes,
    prayers.jummahTimes,
    settings,
    screenId,
  );
  const automaticNotice = automaticTvNotice(
    now,
    prayers.todaysTimes,
    prayers.jummahTimes,
    settings,
    screenId,
  );
  const notice =
    tvScene(settings, now.getTime()) === 'normal'
      ? tvSpecialNotice(now, settings, screenId) ||
        (automaticNotice === 'fasting' && Math.floor(now.getTime() / 20000) % 3 !== 0
          ? null
          : automaticNotice)
      : null;
  return {
    sequence,
    notice,
    preset: sequence?.phase || (notice === 'jummah' ? 'jummah' : notice ? 'ramadan' : null),
  };
}
