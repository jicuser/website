/** Presentation selectors only. Supabase RLS remains the security boundary. */
export const PORTAL_TABLES = [
  'learning_courses', 'learning_staff', 'learning_students', 'learning_guardians',
  'learning_department_heads', 'learning_enrolments', 'learning_sessions',
  'learning_attendance', 'learning_records', 'learning_meetings',
  'student_contributions', 'work_tasks', 'user_notifications', 'form_workflows',
];
export const emptyPortalData = () => Object.fromEntries(PORTAL_TABLES.map((name) => [name, []]));
const rows = (data, name) => Array.isArray(data?.[name]) ? data[name] : [];

export function linkedStudents(data, userId) {
  if (!userId) return [];
  const linked = new Set(rows(data, 'learning_guardians')
    .filter((row) => row.user_id === userId).map((row) => row.student_id));
  return rows(data, 'learning_students').filter((student) =>
    student.user_id === userId || student.guardian_id === userId || linked.has(student.id));
}

export function studentCourses(data, studentId) {
  if (!studentId) return [];
  const ids = new Set(rows(data, 'learning_enrolments')
    .filter((row) => row.student_id === studentId && row.active === true)
    .map((row) => row.course_id));
  return rows(data, 'learning_courses').filter((course) => ids.has(course.id));
}

export function familyRecords(data, studentId, courseId = '') {
  if (!studentId) return [];
  return rows(data, 'learning_records')
    .filter((row) => row.student_id === studentId && row.published === true &&
      (!courseId || row.course_id === courseId))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

export function studentAttendance(data, studentId, courseId = '') {
  if (!studentId) return [];
  const sessions = new Map(rows(data, 'learning_sessions').map((row) => [row.id, row]));
  return rows(data, 'learning_attendance')
    .filter((row) => row.student_id === studentId && sessions.has(row.session_id) &&
      (!courseId || sessions.get(row.session_id).course_id === courseId))
    .map((row) => ({ ...row, session: sessions.get(row.session_id) }))
    .sort((a, b) => String(b.session.starts_at).localeCompare(String(a.session.starts_at)));
}

export function portalAreas(data, auth) {
  const userId = auth?.user?.id;
  if (!userId || !auth.profile?.is_active) return [];
  const family = linkedStudents(data, userId).length > 0;
  const teacher = auth.isOwner || rows(data, 'learning_staff').some((row) => row.user_id === userId) ||
    rows(data, 'learning_department_heads').some((row) => row.user_id === userId);
  return [
    ['home', 'Overview'],
    ...(family ? [['family', 'My family']] : []),
    ['learning', teacher ? 'Learning & teaching' : 'My learning'],
    ['forms', 'Forms & replies'], ['fees', 'Fees & receipts'],
    ['tasks', 'My actions'], ['notifications', 'Updates'],
    ...(auth.isOwner ? [['manage', 'Manage learning'], ['talks', 'Talks']] : []),
  ];
}

export function portalArea(params, areas) {
  const requested = params.get('form') ? 'tasks' : params.get('tab') || 'home';
  return areas.some(([key]) => key === requested) ? requested : 'home';
}

export function portalSearch(params, area) {
  const next = new URLSearchParams(params);
  next.set('tab', area);
  if (area !== 'tasks') next.delete('form');
  if (area !== 'family') { next.delete('student'); next.delete('course'); next.delete('view'); }
  return next;
}

export function formatPortalDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleString('en-GB', {
    timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short',
  });
}

export function magicLinkOptions(email, origin) {
  const value = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254)
    throw new Error('Enter a valid email address.');
  const url = new URL('/portal', origin);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid sign-in destination.');
  return { email: value, options: { emailRedirectTo: url.href, shouldCreateUser: false } };
}

/** Bounded, independent reads; failed areas never retain stale private records. */
export async function loadPortalData(client, signal) {
  const unordered = new Set(['learning_staff', 'learning_guardians', 'learning_department_heads',
    'learning_enrolments', 'learning_attendance', 'form_workflows']);
  const failures = [];
  const entries = await Promise.all(PORTAL_TABLES.map(async (name) => {
    try {
      let query = client.from(name).select('*').limit(500);
      if (!unordered.has(name)) query = query.order(
        name === 'learning_meetings' ? 'requested_at' : 'created_at', { ascending: false });
      if (signal) query = query.abortSignal(signal);
      const result = await query;
      if (result.error) throw result.error;
      return [name, Array.isArray(result.data) ? result.data : []];
    } catch {
      failures.push(name);
      return [name, []];
    }
  }));
  return { data: Object.fromEntries(entries), failures };
}
