import { buildMonthlyTimetable } from './monthlyTimetable.js';

// Match the website's canonical navy and gold palette in theme.css.
const colors = {
  background: '#080f1d',
  heading: '#0c1930',
  surface: '#152238',
  alternate: '#0f1a2b',
  gold: '#d6af62',
  ink: '#0c1930',
  text: '#f4f6fa',
  muted: '#b7c3d5',
  border: '#3b4658',
};

const drawText = (
  ctx,
  value,
  x,
  y,
  { size = 28, weight = 500, color = colors.text, maxWidth } = {},
) => {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (maxWidth) ctx.fillText(String(value ?? ''), x, y, maxWidth);
  else ctx.fillText(String(value ?? ''), x, y);
};

function drawRule(ctx, x, y, x2, y2) {
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function createTimetableCanvas(monthlyPrayerTimes, currentMonth, jummahTimes, phone) {
  if (!monthlyPrayerTimes?.length) return;
  const timetable = buildMonthlyTimetable(monthlyPrayerTimes);
  const canvas = document.createElement('canvas');
  canvas.width = phone ? 1290 : 1800;
  canvas.height = phone ? 2796 : 2220;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create a timetable image.');

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const middle = canvas.width / 2;
  const left = phone ? 42 : 60;
  const tableWidth = canvas.width - left * 2;
  const brandY = phone ? 340 : 66;
  drawText(ctx, 'JAMATIA ISLAMIC CENTRE', middle, brandY, {
    size: phone ? 27 : 33,
    weight: 700,
    color: colors.gold,
  });
  drawText(ctx, `${currentMonth} Prayer Times`, middle, brandY + (phone ? 65 : 72), {
    size: phone ? 49 : 60,
    weight: 700,
    maxWidth: tableWidth,
  });
  drawText(
    ctx,
    'Birmingham · Start / Jamat · 12-hour times',
    middle,
    brandY + (phone ? 120 : 130),
    {
      size: phone ? 25 : 29,
      color: colors.muted,
    },
  );

  const top = phone ? 530 : 250;
  const groupHeight = phone ? 74 : 78;
  const labelHeight = phone ? 46 : 54;
  const body = top + groupHeight + labelHeight;
  // Reserve room for the legend and next Jummah even in a 31-day month.
  const rowHeight = Math.min(
    phone ? 60 : 52,
    Math.floor((canvas.height - body - 225) / timetable.rows.length),
  );
  const end = body + timetable.rows.length * rowHeight;
  const weights = timetable.columns.map(({ key }) =>
    key === 'dayName' ? 0.8 : key === 'day' ? 0.65 : key === 'sunrise' ? 1.05 : 1,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const positions = [left];
  weights.forEach((weight) =>
    positions.push(positions.at(-1) + (tableWidth * weight) / totalWeight),
  );

  ctx.fillStyle = colors.heading;
  ctx.fillRect(left, top, tableWidth, groupHeight + labelHeight);
  let columnIndex = 0;
  timetable.groups.forEach((group) => {
    const start = columnIndex;
    const after = start + group.columns.length;
    const width = positions[after] - positions[start];
    const x = (positions[start] + positions[after]) / 2;
    const heading =
      group.key === 'date' ? currentMonth.split(' ')[0].toUpperCase() : group.label.toUpperCase();
    drawText(
      ctx,
      heading,
      x,
      group.single
        ? top + (groupHeight + labelHeight) / 2
        : top + (group.arabic ? 22 : groupHeight / 2),
      {
        size: phone ? 23 : 30,
        weight: 700,
        color: colors.gold,
        maxWidth: width - 10,
      },
    );
    if (group.arabic)
      drawText(ctx, group.arabic, x, top + 53, {
        size: phone ? 27 : 31,
        color: colors.gold,
      });
    if (!group.single) {
      drawRule(ctx, positions[start], top + groupHeight, positions[after], top + groupHeight);
      group.columns.forEach((column, offset) => {
        const index = start + offset;
        const columnWidth = positions[index + 1] - positions[index];
        drawText(
          ctx,
          column.label.toUpperCase(),
          (positions[index] + positions[index + 1]) / 2,
          top + groupHeight + labelHeight / 2,
          {
            size: phone ? 22 : 27,
            weight: 700,
            color: colors.gold,
            maxWidth: columnWidth - 8,
          },
        );
        if (offset > 0) drawRule(ctx, positions[index], top + groupHeight, positions[index], end);
      });
    }
    drawRule(ctx, positions[start], top, positions[start], end);
    columnIndex = after;
  });

  timetable.rows.forEach((row, index) => {
    const y = body + index * rowHeight;
    ctx.fillStyle = row.isFriday ? colors.gold : index % 2 ? colors.alternate : colors.surface;
    ctx.fillRect(left, y, tableWidth, rowHeight);
    row.cells.forEach((cell, column) => {
      const columnWidth = positions[column + 1] - positions[column];
      drawText(
        ctx,
        cell.display,
        (positions[column] + positions[column + 1]) / 2,
        y + rowHeight / 2,
        {
          size: phone ? 29 : 35,
          weight: row.isFriday || column < 2 ? 700 : 500,
          color: row.isFriday ? colors.ink : colors.text,
          maxWidth: columnWidth - 9,
        },
      );
    });
    drawRule(ctx, left, y + rowHeight, left + tableWidth, y + rowHeight);
  });
  positions.forEach((x) => drawRule(ctx, x, body, x, end));
  drawRule(ctx, left, top, left + tableWidth, top);
  drawRule(ctx, left + tableWidth, top, left + tableWidth, end);
  drawRule(ctx, left, body, left + tableWidth, body);

  let footerY = end + 48;
  drawText(ctx, '" = same time as above · Gold rows = Friday', middle, footerY, {
    size: phone ? 26 : 30,
    color: colors.muted,
  });
  if (timetable.combinedMaghrib) {
    footerY += 40;
    drawText(ctx, 'Maghrib Jamat is at the Adhan time shown.', middle, footerY, {
      size: phone ? 24 : 28,
      color: colors.muted,
    });
  }
  if (jummahTimes?.length) {
    footerY += 44;
    drawText(
      ctx,
      `Next Jummah · ${jummahTimes.map((time) => `${time.name}: ${time.prayer}`).join(' · ')}`,
      middle,
      footerY,
      {
        size: phone ? 24 : 29,
        weight: 600,
        color: colors.gold,
        maxWidth: tableWidth,
      },
    );
  }
  drawText(ctx, 'jicmasjid.org', middle, footerY + 48, {
    size: phone ? 24 : 28,
    weight: 700,
    color: colors.gold,
  });
  return canvas;
}

export const createWallpaperCanvas = (rows, month, jummahTimes = []) =>
  createTimetableCanvas(rows, month, jummahTimes, true);

export const createMonthlyTimetableCanvas = (rows, month, jummahTimes = []) =>
  createTimetableCanvas(rows, month, jummahTimes, false);
