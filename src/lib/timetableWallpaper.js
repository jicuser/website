import { recordDate } from './monthlyTimetable.js';
import { displayTime } from './timetable.js';
import { timetablePresentation } from './timetablePresentation.js';

// One A4 master, in points. The phone image is this same artwork scaled uniformly,
// with space above it for the lock-screen clock. Do not independently reflow it.
export const timetableGeometry = Object.freeze({
  width: 595.32,
  height: 841.92,
  margin: 14.3,
  titleY: 127.1,
  titleHeight: 23.6,
  headerHeight: 45.5,
  tableBottom: 697.2,
  gridWidth: 0.75,
  titleRadius: 6,
  phoneWidth: 1290,
  phoneHeight: 2796,
  phoneTop: 570,
});
const weights = {
  dayName: 38,
  day: 40,
  hijri: 43,
  fajr_begins: 47,
  fajr_jamah: 48,
  sunrise: 49,
  zawal: 49,
  zuhr_begins: 50,
  zuhr_jamah: 49,
  asr_begins: 50,
  asr_jamah: 50,
  maghrib_begins: 55,
  maghrib_jamah: 50,
  isha_begins: 51,
  isha_jamah: 52,
};
const bodyFont = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
const headingFont = 'Georgia, "Times New Roman", serif';
const smallFont = 'Arial, Helvetica, sans-serif';

function createTimetableCanvas(rows, month, jummahTimes, phone, options = {}) {
  if (!rows?.length) return undefined;
  const g = timetableGeometry;
  const canvas = document.createElement('canvas');
  canvas.width = phone ? g.phoneWidth : 2480;
  canvas.height = phone ? g.phoneHeight : Math.round((canvas.width * g.height) / g.width);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create a timetable image.');
  const scale = canvas.width / g.width;
  const offset = phone ? g.phoneTop : 0;
  const X = (x) => x * scale;
  const Y = (y) => offset + y * scale;
  const L = g.margin,
    R = g.width - L,
    TW = R - L,
    middle = g.width / 2;
  const colors = {
    ink: '#122a43',
    navy: '#103958',
    grid: '#8196a4',
    alternate: '#eaf2f7',
    friday: '#ffeb2f',
  };
  const rect = (x, y, width, height, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(X(x), Y(y), X(width), X(height));
  };
  const text = (
    value,
    x,
    y,
    {
      size = 10,
      family = bodyFont,
      weight = 400,
      fill = colors.ink,
      italic = false,
      maxWidth = TW,
    } = {},
  ) => {
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${size * scale}px ${family}`;
    ctx.fillStyle = fill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(value ?? ''), X(x), Y(y), X(maxWidth));
  };
  const rule = (x, y, x2, y2, color = colors.grid, width = g.gridWidth) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = X(width);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x2), Y(y2));
    ctx.stroke();
  };
  const rounded = (x, y, width, height, radius, fill, topOnly = false) => {
    ctx.beginPath();
    ctx.moveTo(X(x + radius), Y(y));
    ctx.lineTo(X(x + width - radius), Y(y));
    ctx.quadraticCurveTo(X(x + width), Y(y), X(x + width), Y(y + radius));
    if (topOnly) {
      ctx.lineTo(X(x + width), Y(y + height));
      ctx.lineTo(X(x), Y(y + height));
    } else {
      ctx.lineTo(X(x + width), Y(y + height - radius));
      ctx.quadraticCurveTo(X(x + width), Y(y + height), X(x + width - radius), Y(y + height));
      ctx.lineTo(X(x + radius), Y(y + height));
      ctx.quadraticCurveTo(X(x), Y(y + height), X(x), Y(y + height - radius));
    }
    ctx.lineTo(X(x), Y(y + radius));
    ctx.quadraticCurveTo(X(x), Y(y), X(x + radius), Y(y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (options.header)
    ctx.drawImage(options.header, 0, Y(0), canvas.width, X((g.width * 230) / 1094));
  else {
    text('JAMATIA ISLAMIC CENTRE', middle, 53, { size: 24, family: headingFont, weight: 700 });
    text('179–183 Woodlands Road, Sparkhill, Birmingham B11 4ER', middle, 79, {
      size: 10,
      family: smallFont,
    });
    text('Tel: 0121 778 6612  |  jicmasjid.org', middle, 96, { size: 9, family: smallFont });
  }
  const navy = ctx.createLinearGradient(0, Y(g.titleY), 0, Y(g.tableBottom));
  navy.addColorStop(0, '#103958');
  navy.addColorStop(1, '#082f4d');
  rounded(L, g.titleY, TW, g.titleHeight, g.titleRadius, navy, true);
  text(
    `${month.toUpperCase()}${options.hijriHeading ? `  |  ${options.hijriHeading.toUpperCase()}` : ''}`,
    middle,
    g.titleY + 16.05,
    { family: headingFont, size: 11.8, fill: '#fff', maxWidth: TW - 12 },
  );
  const table = timetablePresentation(rows, options);
  const headerY = g.titleY + g.titleHeight,
    bodyY = headerY + g.headerHeight;
  const noticeIndex =
    options.notice && options.noticeDate
      ? table.rows.findIndex((row) => row.isoDate === options.noticeDate)
      : -1;
  const noticeHeight = options.notice ? 19 : 0;
  const rowHeight =
    (g.tableBottom - bodyY - (noticeIndex >= 0 ? noticeHeight : 0)) / table.rows.length;
  const total = table.columns.reduce((sum, column) => sum + (weights[column.key] || 50), 0);
  const xs = [L];
  table.columns.forEach((column) =>
    xs.push(xs.at(-1) + (TW * (weights[column.key] || 50)) / total),
  );
  rect(L, headerY, TW, g.headerHeight, navy);
  rule(L, headerY, R, headerY, '#eaf0f5', 0.9);
  const groups = table.groups.flatMap((group) =>
    group.key === 'date'
      ? group.columns.map((column) => ({
          key: column.key,
          label: column.label,
          single: true,
          columns: [column],
        }))
      : [group],
  );
  let column = 0;
  const groupHeight = 28.3;
  for (const group of groups) {
    const start = column,
      after = start + group.columns.length;
    const center = (xs[start] + xs[after]) / 2,
      width = xs[after] - xs[start];
    rule(xs[start], headerY, xs[start], bodyY, '#edf2f5');
    if (group.key === 'hijri' && options.hijriMonthLabel) {
      text('HIJRI', center, headerY + 12.5, {
        family: headingFont,
        weight: 700,
        size: 6.7,
        fill: '#fff',
        maxWidth: width - 3,
      });
      const label = options.hijriMonthLabel.replace(/-/g, '- ').split(/\s+/);
      const lines = label.length > 1 ? [label.slice(0, -1).join(' '), label.at(-1)] : label;
      lines.forEach((line, i) =>
        text(line, center, headerY + 23.5 + i * 8.5, {
          family: headingFont,
          weight: 700,
          size: 6.55,
          fill: '#fff',
          maxWidth: width - 3,
        }),
      );
    } else if (!group.single && group.columns.length > 1) {
      text(group.label.toUpperCase(), center, headerY + 11.5, {
        family: headingFont,
        weight: 700,
        size: 7.7,
        fill: '#fff',
        maxWidth: width - 3,
      });
      if (group.arabic)
        text(group.arabic, center, headerY + 23, {
          family: '"Noto Naskh Arabic", Arial, serif',
          weight: 700,
          size: 8.7,
          fill: '#fff',
        });
      rule(xs[start], headerY + groupHeight, xs[after], headerY + groupHeight, '#edf2f5');
      group.columns.forEach((entry, i) => {
        if (i) rule(xs[start + i], headerY + groupHeight, xs[start + i], bodyY, '#edf2f5');
        text(
          i === 0 ? 'START' : 'JAMAAT',
          (xs[start + i] + xs[start + i + 1]) / 2,
          headerY + 40.2,
          {
            family: headingFont,
            weight: 700,
            size: 7.2,
            fill: '#fff',
            maxWidth: xs[start + i + 1] - xs[start + i] - 3,
          },
        );
      });
    } else {
      const arabic =
        group.arabic || (group.key === 'sunrise' ? 'شروق' : group.key === 'zawal' ? 'زوال' : '');
      text(group.label.toUpperCase(), center, headerY + (arabic ? 20.5 : 26), {
        family: headingFont,
        weight: 700,
        size: group.key === 'maghrib' ? 6.65 : 7.15,
        fill: '#fff',
        maxWidth: width - 3,
      });
      if (arabic)
        text(arabic, center, headerY + 33, {
          family: '"Noto Naskh Arabic", Arial, serif',
          weight: 700,
          size: 8.6,
          fill: '#fff',
        });
    }
    column = after;
  }
  rule(R, headerY, R, bodyY, '#edf2f5');
  for (const [index, row] of table.rows.entries()) {
    const y =
      bodyY + index * rowHeight + (noticeIndex >= 0 && index >= noticeIndex ? noticeHeight : 0);
    rect(L, y, TW, rowHeight, row.isFriday ? colors.friday : index % 2 ? colors.alternate : '#fff');
    row.cells.forEach((cell, i) => {
      if (cell.key === 'hijri' && !/^\d+$/.test(cell.display) && cell.display !== '—') {
        rect(xs[i], y, xs[i + 1] - xs[i], rowHeight, '#8fc4de');
        text(cell.display, (xs[i] + xs[i + 1]) / 2, y + rowHeight / 2 + 2.65, {
          family: smallFont,
          size: 8,
          weight: 700,
          maxWidth: xs[i + 1] - xs[i] - 3,
        });
      } else
        text(cell.display, (xs[i] + xs[i + 1]) / 2, y + rowHeight / 2 + 3.7, {
          size: ['dayName', 'day', 'hijri'].includes(cell.key) ? 10.6 : 11.6,
          weight: row.isFriday ? 700 : 400,
          maxWidth: xs[i + 1] - xs[i] - 2.5,
        });
    });
    rule(L, y + rowHeight, R, y + rowHeight);
  }
  xs.forEach((x) => rule(x, bodyY, x, g.tableBottom));
  rule(L, bodyY, R, bodyY, '#647d90', 0.9);
  rule(L, headerY, L, g.tableBottom, '#58768a', 0.9);
  rule(R, headerY, R, g.tableBottom, '#58768a', 0.9);
  rule(L, g.tableBottom, R, g.tableBottom, '#58768a', 0.9);
  if (options.notice) {
    const y = noticeIndex >= 0 ? bodyY + noticeIndex * rowHeight : g.tableBottom + 3;
    rect(L, y, TW, noticeHeight, '#b91c1c');
    text(options.notice, middle, y + 12.7, {
      family: smallFont,
      size: 8.5,
      weight: 700,
      fill: '#fff',
      maxWidth: TW - 8,
    });
  }
  const footerOffset = options.notice && noticeIndex < 0 ? noticeHeight + 3 : 0;
  text(
    'Islamic dates are tentative and may change depending on confirmed moon sighting.',
    middle,
    708.1 + footerOffset,
    { family: headingFont, weight: 700, size: 6.9, italic: true },
  );
  const fridays = rows.filter((row) => {
    const date = recordDate(row);
    return date && new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
  });
  const first = displayTime(jummahTimes[0]?.prayer || fridays[0]?.jummah_1_jamah);
  const second = displayTime(jummahTimes[1]?.prayer || fridays[0]?.jummah_2_jamah);
  const compact = (value) => value.replace(' ', '').toLowerCase();
  rounded(L, 718.3 + footerOffset, TW, 30.2, 7.6, navy);
  text(
    `JUMMA PRAYER - 1st Jamaat at ${compact(first)}  |  2nd Jamaat at ${compact(second)}`,
    middle,
    738 + footerOffset,
    { family: smallFont, size: 11.65, weight: 700, fill: '#fff', maxWidth: TW - 12 },
  );
  const changes = fridays.filter(
    (row) =>
      (row.jummah_1_jamah && displayTime(row.jummah_1_jamah) !== first) ||
      (row.jummah_2_jamah && displayTime(row.jummah_2_jamah) !== second),
  );
  const changesOffset = changes.length ? 12 : 0;
  if (changes.length)
    text(
      `Friday changes · ${changes.map((row) => `${recordDate(row).slice(-2)}: ${displayTime(row.jummah_1_jamah) === '—' ? first : displayTime(row.jummah_1_jamah)} / ${displayTime(row.jummah_2_jamah) === '—' ? second : displayTime(row.jummah_2_jamah)}`).join(' · ')}`,
      middle,
      760 + footerOffset,
      { family: smallFont, size: 7.2, maxWidth: TW },
    );
  text(
    'Metro Bank  |  Account Name: Jamatia Islamic Centre  |  Sort Code: 23-05-80  |  Account: 57434236',
    middle,
    767 + footerOffset + changesOffset,
    { family: smallFont, size: 8.5, weight: 700 },
  );
  text(
    'Charity No. 512810  |  179-183 Woodlands Road, Sparkhill, Birmingham B11 4ER  |  Tel: 0121 778 6612',
    middle,
    780 + footerOffset + changesOffset,
    { family: smallFont, size: 6.8, fill: '#344355' },
  );
  text(
    'Facebook: JIC Masjid  |  jicmasjid.org  |  info@jicmasjid.org  |  YouTube: JICMASJID',
    middle,
    791.2 + footerOffset + changesOffset,
    { family: smallFont, size: 6.8, fill: '#344355' },
  );
  return canvas;
}

export const createWallpaperCanvas = (rows, month, jummahTimes = [], options = {}) =>
  createTimetableCanvas(rows, month, jummahTimes, true, options);
export const createMonthlyTimetableCanvas = (rows, month, jummahTimes = [], options = {}) =>
  createTimetableCanvas(rows, month, jummahTimes, false, options);
