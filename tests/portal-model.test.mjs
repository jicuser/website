import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPortalData, familyRecords, formatPortalDate, linkedStudents, loadPortalData,
  magicLinkOptions, portalArea, portalAreas, portalSearch, studentAttendance, studentCourses } from '../src/features/portal/model.js';

const fixture = () => ({ ...emptyPortalData(),
  learning_students: [{ id: 'a', guardian_id: 'parent' }, { id: 'b', user_id: 'student' }, { id: 'c' }, { id: 'unlinked' }],
  learning_guardians: [{ student_id: 'c', user_id: 'parent' }],
  learning_courses: [{ id: 'course', title: 'Madrassah' }, { id: 'old' }],
  learning_enrolments: [{ student_id: 'a', course_id: 'course', active: true }, { student_id: 'a', course_id: 'old', active: false }],
});

test('family selectors use verified relationship IDs, not staff scope or missing fields', () => {
  const data = fixture();
  assert.deepEqual(linkedStudents(data, 'parent').map((row) => row.id), ['a', 'c']);
  assert.deepEqual(linkedStudents(data, 'student').map((row) => row.id), ['b']);
  assert.deepEqual(linkedStudents(data, 'teacher'), []);
  assert.deepEqual(linkedStudents(data, undefined), []);
  assert.deepEqual(linkedStudents(null, 'parent'), []);
});

test('only active enrolments resolve to known family courses', () => {
  assert.deepEqual(studentCourses(fixture(), 'a').map((row) => row.id), ['course']);
  assert.deepEqual(studentCourses(fixture(), undefined), []);
});

test('family progress excludes staff drafts and records for other children and courses', () => {
  const data = fixture();
  data.learning_records = [
    { id: 'shown', student_id: 'a', course_id: 'course', published: true, score: 0, max_score: 10 },
    { id: 'draft', student_id: 'a', course_id: 'course', published: false },
    { id: 'other-child', student_id: 'b', course_id: 'course', published: true },
    { id: 'other-course', student_id: 'a', course_id: 'old', published: true },
  ];
  assert.deepEqual(familyRecords(data, 'a', 'course').map((row) => row.id), ['shown']);
  assert.equal(familyRecords(data, 'a', 'course')[0].score, 0);
  assert.deepEqual(familyRecords(data, undefined), []);
});

test('attendance joins saved sessions and does not invent marks for unmarked sessions', () => {
  const data = fixture();
  data.learning_sessions = [
    { id: 's1', course_id: 'course', starts_at: '2026-10-15T16:00:00Z' },
    { id: 's2', course_id: 'course', starts_at: '2026-10-16T16:00:00Z' },
  ];
  data.learning_attendance = [
    { student_id: 'a', session_id: 's1', status: 'present' },
    { student_id: 'b', session_id: 's1', status: 'absent' },
    { student_id: 'a', session_id: 'missing', status: 'absent' },
  ];
  const result = studentAttendance(data, 'a', 'course');
  assert.equal(result.length, 1);
  assert.equal(result[0].status, 'present');
  assert.equal(result[0].session.id, 's1');
});

test('area selection rejects owner tools in member deep links and handles the existing form route', () => {
  const auth = { user: { id: 'parent' }, profile: { is_active: true }, isOwner: false };
  const areas = portalAreas(fixture(), auth);
  assert.ok(areas.some(([id]) => id === 'family'));
  assert.ok(areas.some(([id]) => id === 'fees'));
  assert.equal(portalArea(new URLSearchParams('tab=manage'), areas), 'home');
  assert.equal(portalArea(new URLSearchParams('tab=forms'), areas), 'forms');
  assert.equal(portalArea(new URLSearchParams('form=id&tab=home'), areas), 'tasks');
  assert.deepEqual(portalAreas(fixture(), { ...auth, profile: { is_active: false } }), []);
  assert.ok(portalAreas(fixture(), { ...auth, isOwner: true }).some(([id]) => id === 'manage'));
});

test('navigation removes stale form and family selections rather than trapping users on the old tab', () => {
  const params = new URLSearchParams('tab=tasks&form=123&student=a&course=b');
  const result = portalSearch(params, 'fees');
  assert.equal(result.get('tab'), 'fees');
  for (const key of ['form', 'student', 'course']) assert.equal(result.has(key), false);
  assert.equal(params.get('form'), '123');
});

test('passwordless credentials cannot create accounts and redirect to the fixed portal path', () => {
  assert.deepEqual(magicLinkOptions('  parent@example.test  ', 'https://jic.example.test'), {
    email: 'parent@example.test', options: { shouldCreateUser: false, emailRedirectTo: 'https://jic.example.test/portal' },
  });
  for (const email of ['', 'not-email', 'a b@example.test']) assert.throws(() => magicLinkOptions(email, 'https://jic.example.test'));
  assert.throws(() => magicLinkOptions('a@example.test', 'javascript:alert(1)'));
});

test('partial data failures remain isolated, bounded and cancellable', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const client = { from(name) {
    const call = { name }; calls.push(call);
    return { select(value) { call.select = value; return this; }, limit(value) { call.limit = value; return this; },
      order(value) { call.order = value; return this; }, abortSignal(value) { call.signal = value; return this; },
      then(resolve) { return Promise.resolve(name === 'learning_students' ? { error: new Error('denied') } :
        { data: [{ id: name }] }).then(resolve); } };
  } };
  const result = await loadPortalData(client, signal);
  assert.deepEqual(result.data.learning_students, []);
  assert.equal(result.data.user_notifications[0].id, 'user_notifications');
  assert.deepEqual(result.failures, ['learning_students']);
  assert.ok(calls.every((call) => call.limit === 500 && call.signal === signal));
  assert.equal(calls.find((call) => call.name === 'learning_meetings').order, 'requested_at');
});

test('missing and malformed dates never render Invalid Date', () => {
  assert.equal(formatPortalDate(undefined), 'Not scheduled');
  assert.equal(formatPortalDate('not a date'), 'Not scheduled');
  assert.match(formatPortalDate('2026-10-15T16:00:00Z'), /17:00/);
});
