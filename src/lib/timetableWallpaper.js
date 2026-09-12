const clean = (value) =>
  value && value !== 'N/A'
    ? String(value)
        .replace(/^0/, '')
        .replace(/\s?[AP]M$/i, '')
    : '—';

const drawText = (ctx, text, x, y, options = {}) => {
  const { size = 28, weight = 500, align = 'left', color = '#f7f1e3' } = options;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text ?? ''), x, y);
};

const roundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

export const createWallpaperCanvas = (monthlyPrayerTimes, currentMonth) => {
  if (!monthlyPrayerTimes?.length) return;

  // 19.5:9 portrait canvas: suitable for current iPhone/Android home and lock screens.
  const canvas = document.createElement('canvas');
  canvas.width = 1290;
  canvas.height = 2796;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create a timetable image.');

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#05090e');
  bg.addColorStop(0.46, '#07131f');
  bg.addColorStop(1, '#03070b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft gold glow and understated mosque-arch motif.
  const glow = ctx.createRadialGradient(1040, 520, 30, 1040, 520, 640);
  glow.addColorStop(0, 'rgba(220,182,80,.18)');
  glow.addColorStop(1, 'rgba(220,182,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, 1180);

  ctx.strokeStyle = 'rgba(220,182,80,.10)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 740);
  ctx.quadraticCurveTo(645, 70, 1220, 740);
  ctx.stroke();

  // Leave the top ~300px quiet so lock-screen clock/widgets remain readable.
  drawText(ctx, 'JAMATIA ISLAMIC CENTRE', 645, 340, {
    size: 27,
    weight: 750,
    align: 'center',
    color: '#dfb650',
  });
  drawText(ctx, `${currentMonth} Prayer Times`, 645, 405, {
    size: 52,
    weight: 760,
    align: 'center',
    color: '#ffffff',
  });
  drawText(ctx, 'Birmingham · Start above / Jama‘ah below · 12-hour times', 645, 459, {
    size: 24,
    align: 'center',
    color: '#9eabb7',
  });

  const left = 46;
  const right = 46;
  const tableWidth = canvas.width - left - right;
  const top = 535;
  const headerH = 64;
  const rows = monthlyPrayerTimes.length;
  const availableRowsHeight = 2050;
  const rowH = Math.min(63, Math.floor(availableRowsHeight / Math.max(rows, 1)));
  const dateW = 150;
  const prayerW = (tableWidth - dateW) / 6;
  const prayers = [
    ['Fajr', 'fajr_begins', 'fajr_jamah'],
    ['Sunrise', 'sunrise', null],
    ['Dhuhr', 'zuhr_begins', 'zuhr_jamah'],
    ['Asr', 'asr_begins', 'asr_jamah'],
    ['Maghrib', 'maghrib_begins', 'maghrib_jamah'],
    ['Isha', 'isha_begins', 'isha_jamah'],
  ];

  ctx.fillStyle = 'rgba(10,24,38,.94)';
  roundRect(ctx, left, top, tableWidth, headerH + rows * rowH + 18, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,182,80,.13)';
  roundRect(ctx, left + 8, top + 8, tableWidth - 16, headerH - 8, 20);
  ctx.fill();

  drawText(ctx, 'DATE', left + dateW / 2, top + headerH / 2 + 2, {
    size: 26,
    weight: 760,
    align: 'center',
    color: '#dfb650',
  });
  prayers.forEach(([label], index) => {
    drawText(
      ctx,
      label.toUpperCase(),
      left + dateW + prayerW * index + prayerW / 2,
      top + headerH / 2 + 2,
      { size: 25, weight: 760, align: 'center', color: '#dfb650' },
    );
  });

  monthlyPrayerTimes.forEach((day, row) => {
    const y = top + headerH + row * rowH;
    const friday = day.dayName === 'Fri';
    if (friday || row % 2 === 0) {
      ctx.fillStyle = friday ? '#e9c760' : '#172b3d';
      ctx.fillRect(left + 10, y, tableWidth - 20, rowH);
    }

    ctx.strokeStyle = 'rgba(255,255,255,.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 18, y + rowH);
    ctx.lineTo(left + tableWidth - 18, y + rowH);
    ctx.stroke();

    const dateLabel = `${day.dayName || ''} ${day.day ?? '—'}`.trim();
    drawText(ctx, dateLabel, left + dateW / 2, y + rowH / 2, {
      size: 28,
      weight: 750,
      align: 'center',
      color: friday ? '#101820' : '#ffffff',
    });

    prayers.forEach(([, beginsKey, jamahKey], index) => {
      const x = left + dateW + prayerW * index + prayerW / 2;
      drawText(ctx, clean(day[beginsKey]), x, y + rowH * 0.27, {
        size: 28,
        weight: 650,
        align: 'center',
        color: friday ? '#101820' : '#dce8f1',
      });
      drawText(ctx, jamahKey ? clean(day[jamahKey]) : '', x, y + rowH * 0.74, {
        size: 29,
        weight: 800,
        align: 'center',
        color: friday ? '#101820' : '#ffffff',
      });
    });
  });

  // Vertical rules and Friday bands make each date easy to follow across.
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  for (let col = 0; col < 6; col++) {
    const x = left + dateW + prayerW * col;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + headerH + rows * rowH);
    ctx.stroke();
  }

  const footerY = Math.min(2660, top + headerH + rows * rowH + 82);
  drawText(ctx, 'Top: prayer starts · Bottom: Jama‘ah · Gold rows: Friday', 645, footerY, {
    size: 27,
    align: 'center',
    color: '#dce8f1',
  });
  drawText(ctx, 'jicmasjid.org', 645, footerY + 48, {
    size: 22,
    weight: 720,
    align: 'center',
    color: '#dfb650',
  });

  return canvas;
};
