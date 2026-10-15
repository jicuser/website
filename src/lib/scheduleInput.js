const STATUSES = new Set(['available', 'pending', 'booked', 'closed']);

function times(input) {
  const start = input.start_time || null;
  const end = input.end_time || null;
  for (const value of [start, end]) {
    if (value !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new Error('Enter a valid time.');
    }
  }
  if (end && !start) throw new Error('Add a start time, or leave both times empty.');
  if (start && end && end <= start) throw new Error('End time must be after start time.');
  return { start_time: start, end_time: end };
}

export function courseInput(input) {
  const title = String(input.title || '').trim();
  const location = String(input.location || '').trim() || 'Jamatia Islamic Centre';
  const day = Number(input.day_of_week);
  if (!title || title.length > 160) throw new Error('Enter a course name of 1–160 characters.');
  if (location.length > 240) throw new Error('Keep the location within 240 characters.');
  if (!Number.isInteger(day) || day < 1 || day > 7) throw new Error('Choose a valid weekday.');
  return {
    title,
    day_of_week: day,
    ...times(input),
    location,
    active: input.active === true,
    planner_visible: input.planner_visible === true,
  };
}

export function hallInput(input) {
  const date = input.booking_date;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error('Choose a valid hall date.');
  }
  if (!STATUSES.has(input.status)) throw new Error('Choose a valid availability status.');
  return { booking_date: date, ...times(input), status: input.status };
}

// The database is authoritative. A zero-row update must never report success.
export async function saveScheduleRecord(client, table, id, input) {
  const payload =
    table === 'course_schedule'
      ? courseInput(input)
      : table === 'hall_bookings'
        ? hallInput(input)
        : null;
  if (!payload) throw new Error('Unknown schedule.');
  const query = id
    ? client.from(table).update(payload).eq('id', id)
    : client.from(table).insert(payload);
  const result = await query.select('id').single();
  if (result.error || !result.data?.id)
    throw new Error(
      'The schedule was not saved. Check your access and connection, then try again.',
    );
  return result.data.id;
}
