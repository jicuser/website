import { displayTime } from './timetable.js';

const legacyMessages = new Set([
  'Live prayer information is shown automatically.',
  'Friday khutbah and jama‘ah times are shown automatically.',
]);

export function headerTickerItems(next, jummahTimes = [], saved = '[]') {
  const items = next
    ? [{ label: 'Next jama’ah', text: `${next.name} · ${displayTime(next.time)}` }]
    : [];
  const friday = jummahTimes
    .map((session, index) => {
      const time = displayTime(session?.prayer);
      return time ? `Jummah ${index + 1} · ${time}` : '';
    })
    .filter(Boolean);
  if (friday.length) items.push({ label: 'Friday', text: friday.join(' / ') });
  try {
    const notices = JSON.parse(saved);
    if (Array.isArray(notices)) {
      for (const notice of notices) {
        if (typeof notice?.text !== 'string' || !notice.text.trim()) continue;
        const text = notice.text.trim();
        if (legacyMessages.has(text)) continue;
        items.push({
          label: typeof notice.label === 'string' ? notice.label.trim() || 'Update' : 'Update',
          text,
        });
      }
    }
  } catch {
    // The live timetable remains useful if optional CMS messages are unavailable.
  }
  return items;
}
