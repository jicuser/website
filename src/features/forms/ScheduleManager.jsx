import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const WEEKDAYS = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
  [6, 'Saturday'],
  [7, 'Sunday'],
];

const blankCourse = {
  title: '',
  day_of_week: 1,
  start_time: '',
  end_time: '',
  location: 'Jamatia Islamic Centre',
  active: true,
  planner_visible: true,
};

const blankHall = {
  booking_date: '',
  start_time: '',
  end_time: '',
  status: 'available',
};

function normaliseTime(value) {
  return value ? String(value).slice(0, 5) : '';
}

function validateTimes(start, end) {
  if (start && end && end <= start) return 'End time must be after start time.';
  return '';
}

function CoursePlanner({ rows }) {
  const byDay = useMemo(
    () =>
      Object.fromEntries(
        WEEKDAYS.map(([day]) => [
          day,
          rows
            .filter(
              (row) => row.active && row.planner_visible && Number(row.day_of_week) === Number(day),
            )
            .sort((a, b) => normaliseTime(a.start_time).localeCompare(normaliseTime(b.start_time))),
        ]),
      ),
    [rows],
  );

  return (
    <section className="admin-panel" aria-labelledby="weekly-course-planner">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">AUTO PLANNER</span>
          <h3 id="weekly-course-planner">Weekly course & class planner</h3>
          <p>Any active course with an assigned day appears here automatically. Do not add it twice.</p>
        </div>
      </div>
      <div className="content-summary-grid">
        {WEEKDAYS.map(([day, label]) => (
          <div key={day}>
            <strong>{label}</strong>
            {byDay[day].length ? (
              byDay[day].map((row) => (
                <span key={row.id}>
                  {row.title}
                  {row.start_time ? ` · ${normaliseTime(row.start_time)}` : ''}
                  {row.end_time ? `–${normaliseTime(row.end_time)}` : ''}
                </span>
              ))
            ) : (
              <span>Nothing scheduled</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ScheduleManager() {
  const auth = useAuth();
  const canManage = auth.isOwner || auth.can('events');
  const [courses, setCourses] = useState([]);
  const [hallRows, setHallRows] = useState([]);
  const [course, setCourse] = useState(blankCourse);
  const [hall, setHall] = useState(blankHall);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingHall, setEditingHall] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const [courseResult, hallResult] = await Promise.all([
      supabase.from('course_schedule').select('*').order('day_of_week').order('start_time'),
      supabase.from('hall_bookings').select('*').order('booking_date').order('start_time'),
    ]);
    if (courseResult.error) setError(courseResult.error.message);
    if (hallResult.error) setError((current) => current || hallResult.error.message);
    setCourses(courseResult.data || []);
    setHallRows(hallResult.data || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCourse(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!course.title.trim()) {
      setError('Add a course or class name.');
      return;
    }
    const timeProblem = validateTimes(course.start_time, course.end_time);
    if (timeProblem) {
      setError(timeProblem);
      return;
    }
    setBusy(true);
    const payload = {
      ...course,
      title: course.title.trim(),
      day_of_week: Number(course.day_of_week),
      start_time: course.start_time || null,
      end_time: course.end_time || null,
      location: course.location.trim() || 'Jamatia Islamic Centre',
    };
    const result = editingCourse
      ? await supabase.from('course_schedule').update(payload).eq('id', editingCourse)
      : await supabase.from('course_schedule').insert(payload);
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setCourse(blankCourse);
    setEditingCourse(null);
    setMessage('Course schedule saved. The weekly planner has been updated.');
    await load();
  }

  async function saveHall(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!hall.booking_date) {
      setError('Choose the hall date.');
      return;
    }
    const timeProblem = validateTimes(hall.start_time, hall.end_time);
    if (timeProblem) {
      setError(timeProblem);
      return;
    }
    setBusy(true);
    const payload = {
      ...hall,
      start_time: hall.start_time || null,
      end_time: hall.end_time || null,
    };
    const result = editingHall
      ? await supabase.from('hall_bookings').update(payload).eq('id', editingHall)
      : await supabase.from('hall_bookings').insert(payload);
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setHall(blankHall);
    setEditingHall(null);
    setMessage('Hall availability saved. The public hall calendar will use this status.');
    await load();
  }

  async function remove(table, id, label) {
    if (!window.confirm(`Delete this ${label}?`)) return;
    setError('');
    const { error: failure } = await supabase.from(table).delete().eq('id', id);
    if (failure) setError(failure.message);
    else await load();
  }

  if (!canManage)
    return (
      <section className="community-workspace">
        <h2>Schedule</h2>
        <p>You need Events access to manage hall availability and course schedules.</p>
      </section>
    );

  return (
    <section className="community-workspace" aria-label="Schedule management">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">SCHEDULE</span>
          <h2>Bookings, courses & classes</h2>
          <p>One place for hall availability and recurring course/class times.</p>
        </div>
        <button className="admin-button" disabled={busy} onClick={load}>
          Refresh
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <CoursePlanner rows={courses} />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="admin-panel">
          <div className="admin-heading">
            <div>
              <CalendarDays aria-hidden="true" />
              <h3>{editingCourse ? 'Edit course/class time' : 'Add course/class time'}</h3>
            </div>
            {editingCourse && (
              <button
                className="admin-button"
                type="button"
                onClick={() => {
                  setEditingCourse(null);
                  setCourse(blankCourse);
                }}
              >
                <X size={16} /> Cancel
              </button>
            )}
          </div>
          <form className="grid gap-3" onSubmit={saveCourse}>
            <label>
              Course or class
              <input
                value={course.title}
                onChange={(event) => setCourse({ ...course, title: event.target.value })}
                required
              />
            </label>
            <label>
              Day
              <select
                value={course.day_of_week}
                onChange={(event) => setCourse({ ...course, day_of_week: Number(event.target.value) })}
              >
                {WEEKDAYS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Start
                <input
                  type="time"
                  value={course.start_time}
                  onChange={(event) => setCourse({ ...course, start_time: event.target.value })}
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={course.end_time}
                  onChange={(event) => setCourse({ ...course, end_time: event.target.value })}
                />
              </label>
            </div>
            <label>
              Location
              <input
                value={course.location}
                onChange={(event) => setCourse({ ...course, location: event.target.value })}
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={course.active}
                onChange={(event) => setCourse({ ...course, active: event.target.checked })}
              />
              Active
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={course.planner_visible}
                onChange={(event) =>
                  setCourse({ ...course, planner_visible: event.target.checked })
                }
              />
              Show automatically on planner
            </label>
            <button className="admin-button primary" disabled={busy}>
              <Save size={16} /> Save course schedule
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {courses.map((row) => (
              <div className="admin-panel" key={row.id}>
                <strong>{row.title}</strong>
                <p>
                  {WEEKDAYS.find(([day]) => day === Number(row.day_of_week))?.[1]}
                  {row.start_time ? ` · ${normaliseTime(row.start_time)}` : ''}
                  {row.end_time ? `–${normaliseTime(row.end_time)}` : ''}
                  {!row.active ? ' · Hidden' : ''}
                </p>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    onClick={() => {
                      setEditingCourse(row.id);
                      setCourse({
                        title: row.title || '',
                        day_of_week: Number(row.day_of_week) || 1,
                        start_time: normaliseTime(row.start_time),
                        end_time: normaliseTime(row.end_time),
                        location: row.location || 'Jamatia Islamic Centre',
                        active: row.active !== false,
                        planner_visible: row.planner_visible !== false,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-button"
                    onClick={() => remove('course_schedule', row.id, 'course schedule')}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-heading">
            <div>
              <Clock3 aria-hidden="true" />
              <h3>{editingHall ? 'Edit hall date' : 'Set hall availability'}</h3>
            </div>
            {editingHall && (
              <button
                className="admin-button"
                type="button"
                onClick={() => {
                  setEditingHall(null);
                  setHall(blankHall);
                }}
              >
                <X size={16} /> Cancel
              </button>
            )}
          </div>
          <form className="grid gap-3" onSubmit={saveHall}>
            <label>
              Date
              <input
                type="date"
                value={hall.booking_date}
                onChange={(event) => setHall({ ...hall, booking_date: event.target.value })}
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Start
                <input
                  type="time"
                  value={hall.start_time}
                  onChange={(event) => setHall({ ...hall, start_time: event.target.value })}
                />
              </label>
              <label>
                End
                <input
                  type="time"
                  value={hall.end_time}
                  onChange={(event) => setHall({ ...hall, end_time: event.target.value })}
                />
              </label>
            </div>
            <label>
              Status
              <select
                value={hall.status}
                onChange={(event) => setHall({ ...hall, status: event.target.value })}
              >
                <option value="available">Available</option>
                <option value="pending">Pending / provisional</option>
                <option value="booked">Booked</option>
                <option value="closed">Unavailable / blocked</option>
              </select>
            </label>
            <button className="admin-button primary" disabled={busy}>
              <Save size={16} /> Save hall date
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {hallRows.length ? (
              hallRows.map((row) => (
                <div className="admin-panel" key={row.id}>
                  <strong>{row.booking_date}</strong>
                  <p>
                    {row.status}
                    {row.start_time ? ` · ${normaliseTime(row.start_time)}` : ''}
                    {row.end_time ? `–${normaliseTime(row.end_time)}` : ''}
                  </p>
                  <div className="admin-actions">
                    <button
                      className="admin-button"
                      onClick={() => {
                        setEditingHall(row.id);
                        setHall({
                          booking_date: row.booking_date || '',
                          start_time: normaliseTime(row.start_time),
                          end_time: normaliseTime(row.end_time),
                          status: row.status || 'available',
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-button"
                      onClick={() => remove('hall_bookings', row.id, 'hall date')}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No hall dates have been set yet. Unlisted dates show as available once the live schedule is enabled.</p>
            )}
          </div>
        </section>
      </div>

      <p className="mt-4 text-sm">
        A hall booking form submission is a request only. Change the hall date to Pending, Booked or
        Unavailable here after staff review it.
      </p>
    </section>
  );
}
