import { december2026TimetableDesign } from '../data/december2026TimetableDesign.js';
import { recordDate } from './monthlyTimetable.js';
import { displayTime, displayZawal } from './timetable.js';

export const TIMETABLE_HEADER = '/brand/timetable-header.jpg';
export const emptyTimetableDesign = {
  hijriDay: '',
  hijriLength: '30',
  hijriHeading: '',
  hijriMonthLabel: '',
  hijriNextMonth: '',
  hijriDates: {},
  zawalOffset: '',
  notice: '',
  noticeDate: '',
  printCells: {},
};

export function normalizeTimetableDesign(value = {}) {
  const settings = { ...emptyTimetableDesign };
  for (const key of Object.keys(settings)) {
    if (key === 'hijriDates' || key === 'printCells') {
      const object = value[key];
      settings[key] = object && typeof object === 'object' && !Array.isArray(object) ? object : {};
    } else settings[key] = String(value[key] ?? settings[key]);
  }
  return settings;
}

export function timetableDesignDraft(record) {
  return {
    design: normalizeTimetableDesign(record?.design),
    published: record ? Boolean(record.published) : true,
    revision: Number(record?.revision || 0),
  };
}

export function timetableDesignPayload(month, draft) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid timetable month.');
  const design = normalizeTimetableDesign(draft.design);
  if (
    design.hijriDay &&
    (!/^\d+$/.test(design.hijriDay) ||
      Number(design.hijriDay) < 1 ||
      Number(design.hijriDay) > Number(design.hijriLength))
  )
    throw new Error('Check the Hijri date on the first day.');
  if (!['29', '30'].includes(design.hijriLength))
    throw new Error('Choose 29 or 30 days for the Hijri month.');
  if (design.zawalOffset && (!/^\d+$/.test(design.zawalOffset) || Number(design.zawalOffset) > 60))
    throw new Error('Use a Zawal offset between 0 and 60 minutes.');
  if (
    design.hijriHeading.length > 80 ||
    design.hijriMonthLabel.length > 40 ||
    design.hijriNextMonth.length > 40 ||
    design.notice.length > 110
  )
    throw new Error('Shorten the timetable heading or notice.');
  if (design.noticeDate && !design.noticeDate.startsWith(`${month}-`))
    throw new Error('The notice date must be in this timetable month.');
  for (const [date, label] of Object.entries(design.hijriDates)) {
    if (!date.startsWith(`${month}-`) || typeof label !== 'string' || label.length > 40)
      throw new Error('Check the confirmed Hijri dates for this month.');
  }
  return {
    p_month: `${month}-01`,
    p_design: design,
    p_published: Boolean(draft.published),
    p_expected_revision: draft.revision,
  };
}

export async function saveTimetableDesign(client, month, draft) {
  const payload = timetableDesignPayload(month, draft);
  const { data, error } = await client.rpc('save_prayer_timetable_month', payload);
  if (error) throw new Error(error.message || 'The timetable design was not saved.');
  if (data?.month !== payload.p_month || data?.revision !== draft.revision + 1)
    throw new Error('The design save could not be confirmed. Reload before trying again.');
  return timetableDesignDraft(data);
}

export function printedCellValue(record, key) {
  return key === 'zawal' ? displayZawal(record) : displayTime(record?.[key]);
}

export function printedTimetableValuesMatch(rows, printCells = {}) {
  const entries = Object.entries(printCells);
  const byDate = new Map(rows.map((row) => [recordDate(row), row]));
  return (
    entries.length > 0 &&
    byDate.size === entries.length &&
    entries.every(([date, fields]) => {
      const row = byDate.get(date);
      return (
        row &&
        Object.entries(fields).every(([key, cell]) => printedCellValue(row, key) === cell.value)
      );
    })
  );
}

const stable = (value) =>
  value && typeof value === 'object'
    ? Array.isArray(value)
      ? value.map(stable)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, stable(value[key])]),
        )
    : value;

// The approved assets are used only while both the saved layout and its source times match.
// A later editor change must immediately switch to a fresh render, never an outdated PNG.
export function approvedTimetableAssets(rows, design, jummahTimes = []) {
  if (
    JSON.stringify(stable(normalizeTimetableDesign(design))) !==
    JSON.stringify(stable(normalizeTimetableDesign(december2026TimetableDesign)))
  )
    return null;
  const byDate = new Map(rows.map((row) => [recordDate(row), row]));
  const cells = december2026TimetableDesign.printCells;
  if (!printedTimetableValuesMatch(rows, cells)) return null;
  for (const [date, fields] of Object.entries(cells)) {
    const row = byDate.get(date);
    if (
      !row ||
      Object.entries(fields).some(([key, cell]) => printedCellValue(row, key) !== cell.value)
    )
      return null;
    if (displayTime(row.maghrib_jamah) !== displayTime(row.maghrib_begins)) return null;
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 5) {
      if (
        displayTime(row.jummah_1_jamah || jummahTimes[0]?.prayer) !== '12:35 PM' ||
        displayTime(row.jummah_2_jamah || jummahTimes[1]?.prayer) !== '1:30 PM'
      )
        return null;
    }
  }
  const base = '/downloads/december-2026/';
  return {
    'monthly-timetable': {
      url: `${base}timetable.png`,
      pdf: `${base}timetable.pdf`,
      sharePath: base,
    },
    'phone-wallpaper': { url: `${base}phone-wallpaper.png`, sharePath: `${base}phone-wallpaper/` },
  };
}
