import React, { useState } from 'react';
import LearningResources from './LearningResources';
import FeeLedger from './FeeLedger';
import { supabase } from '@/lib/supabaseClient';
import { ActionForm, Field, Select, TextField, checked, dateLabel } from './shared';

export default function Learning({ data, auth, reload, onError }) {
  const [department, setDepartment] = useState('adult');
  const [courseId, setCourseId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [recordKind, setRecordKind] = useState('progress');
  const courses = data.learning_courses.filter((row) => row.department === department);
  const course = courses.find((row) => row.id === courseId);
  const students = data.learning_students.filter((student) =>
    data.learning_enrolments.some(
      (entry) => entry.course_id === course?.id && entry.student_id === student.id && entry.active,
    ),
  );
  const teacher = Boolean(
    course &&
    (auth.isOwner ||
      (data.learning_department_heads || []).some(
        (row) => row.department === course.department && row.user_id === auth.user.id,
      ) ||
      data.learning_staff.some(
        (row) => row.course_id === course.id && row.user_id === auth.user.id,
      )),
  );
  const ownStudent = students.some(
    (row) =>
      row.id === studentId &&
      (row.user_id === auth.user.id ||
        row.guardian_id === auth.user.id ||
        (data.learning_guardians || []).some(
          (g) => g.student_id === row.id && g.user_id === auth.user.id,
        )),
  );
  const records = data.learning_records.filter(
    (row) => row.course_id === course?.id && (!studentId || row.student_id === studentId),
  );
  const sessions = data.learning_sessions
    .filter((row) => row.course_id === course?.id)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const meetings = data.learning_meetings.filter(
    (row) => row.course_id === course?.id && (!studentId || row.student_id === studentId),
  );
  const contributions = data.student_contributions.filter(
    (row) => row.course_id === course?.id && (!studentId || row.student_id === studentId),
  );
  const studentName = (id) =>
    data.learning_students.find((row) => row.id === id)?.display_name || 'Student';
  const update = async (table, id, values) => {
    try {
      await checked(supabase.from(table).update(values).eq('id', id).select('id').single());
      await reload();
    } catch (error) {
      onError(error.message);
    }
  };
  return (
    <>
      <div className="workspace-grid">
        <Field label="Learning area">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCourseId('');
              setStudentId('');
            }}
          >
            <option value="adult">Adult courses & classes</option>
            <option value="madrassah">Madrassah</option>
          </select>
        </Field>
        <Select
          label="Course"
          options={courses}
          value={courseId}
          onChange={(value) => {
            setCourseId(value);
            setStudentId('');
          }}
        />
        {course && (
          <Select
            label="Student (optional filter)"
            options={students}
            value={studentId}
            onChange={setStudentId}
            required={false}
          />
        )}
      </div>
      {!course && (
        <p className="workspace-card">
          Choose a course to see your learning, progress and meetings.
          {courses.length === 0 && ' No courses are linked to your account in this area yet.'}
        </p>
      )}
      {course && (
        <>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <LearningResources key={course.id} courseId={course.id} canTeach={teacher} />
          <h2>Progress, plans & assessments</h2>
          {records.length === 0 && <p>No learning records to show.</p>}
          {records.map((record) => (
            <article className="workspace-card" key={record.id}>
              <p className="workspace-meta">
                {studentName(record.student_id)} · {record.kind} ·{' '}
                {record.published ? 'Published' : 'Staff draft'}
              </p>
              <h3>{record.title}</h3>
              <p>{record.body}</p>
              {record.score != null && (
                <p>
                  Mark: {record.score} / {record.max_score}
                </p>
              )}
              {record.due_on && <p>Target date: {record.due_on}</p>}
              {record.kind === 'plan' && (
                <>
                  <p>
                    {record.completed_at
                      ? `Completed ${dateLabel(record.completed_at)}`
                      : 'In progress'}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await checked(
                          supabase.rpc('set_learning_plan_complete', {
                            p_id: record.id,
                            p_complete: !record.completed_at,
                          }),
                        );
                        await reload();
                      } catch (error) {
                        onError(error.message);
                      }
                    }}
                  >
                    {record.completed_at ? 'Reopen plan' : 'Mark plan complete'}
                  </button>
                </>
              )}

              {teacher && (
                <button
                  onClick={() =>
                    update('learning_records', record.id, { published: !record.published })
                  }
                >
                  {record.published ? 'Return to draft' : 'Publish to student and parent'}
                </button>
              )}
            </article>
          ))}
          {teacher && (
            <ActionForm
              title="Add a learning record"
              button="Save draft"
              onSubmit={async (form) => {
                await checked(
                  supabase
                    .from('learning_records')
                    .insert({
                      course_id: course.id,
                      student_id: form.get('student'),
                      kind: form.get('kind'),
                      title: form.get('title'),
                      body: form.get('body'),
                      due_on: form.get('due') || null,
                      score:
                        form.get('kind') === 'assessment' && form.get('score') !== ''
                          ? Number(form.get('score'))
                          : null,
                      max_score:
                        form.get('kind') === 'assessment' && form.get('maximum') !== ''
                          ? Number(form.get('maximum'))
                          : null,
                      published: false,
                    })
                    .select('id')
                    .single(),
                );
                await reload();
              }}
            >
              <Field label="Student">
                <select required name="student">
                  <option value="">Choose…</option>
                  {students.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  name="kind"
                  value={recordKind}
                  onChange={(e) => setRecordKind(e.target.value)}
                >
                  {['progress', 'plan', 'assessment'].map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </Field>
              <TextField label="Title" name="title" />
              {recordKind === 'assessment' && (
                <div className="workspace-grid">
                  <TextField
                    name="score"
                    label="Mark (optional)"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    required={false}
                  />
                  <TextField
                    name="maximum"
                    label="Out of (required with mark)"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    required={false}
                  />
                </div>
              )}
              <TextField name="due" label="Target date (optional)" type="date" required={false} />
              <Field label="Notes or marking">
                <textarea name="body" required maxLength={10000} rows={5} />
              </Field>
            </ActionForm>
          )}
          <h2>Class sessions {teacher ? '& registers' : ''}</h2>
          {sessions.length === 0 && <p>No sessions scheduled.</p>}
          {sessions.map((session) => (
            <article className="workspace-card" key={session.id}>
              <h3>{session.title}</h3>
              <p>{dateLabel(session.starts_at)}</p>
              {teacher ? (
                <Register
                  session={session}
                  students={students}
                  attendance={data.learning_attendance}
                  reload={reload}
                />
              ) : (
                data.learning_attendance
                  .filter(
                    (row) =>
                      row.session_id === session.id && (!studentId || row.student_id === studentId),
                  )
                  .map((row) => (
                    <p key={row.student_id}>
                      {studentName(row.student_id)} · {row.status}
                    </p>
                  ))
              )}
            </article>
          ))}
          {teacher && (
            <ActionForm
              title="Schedule a class"
              onSubmit={async (form) => {
                const start = new Date(form.get('start'));
                const end = form.get('end') ? new Date(form.get('end')) : null;
                if (end && end <= start) throw new Error('The class must finish after it starts.');
                await checked(
                  supabase
                    .from('learning_sessions')
                    .insert({
                      course_id: course.id,
                      title: form.get('title'),
                      starts_at: start.toISOString(),
                      ends_at: end?.toISOString() || null,
                    })
                    .select('id')
                    .single(),
                );
                await reload();
              }}
            >
              <TextField name="title" label="Class title" />
              <TextField name="start" label="Starts (your local time)" type="datetime-local" />
              <TextField
                name="end"
                label="Ends (your local time)"
                type="datetime-local"
                required={false}
              />
            </ActionForm>
          )}
          {studentId && (
            <FeeLedger
              key={`${studentId}-${course.id}`}
              studentId={studentId}
              courseId={course.id}
              canManage={teacher}
            />
          )}
          <h2>Meetings</h2>
          {meetings.length === 0 && <p>No meetings requested.</p>}
          {meetings.map((meeting) => (
            <article className="workspace-card" key={meeting.id}>
              <h3>
                {studentName(meeting.student_id)} · {meeting.status}
              </h3>
              <p>{dateLabel(meeting.proposed_at)}</p>
              <p>{meeting.notes}</p>
              {teacher && (
                <ActionForm
                  onSubmit={async (form) => {
                    await checked(
                      supabase
                        .from('learning_meetings')
                        .update({
                          status: form.get('status'),
                          proposed_at: form.get('at')
                            ? new Date(form.get('at')).toISOString()
                            : meeting.proposed_at,
                        })
                        .eq('id', meeting.id)
                        .select('id')
                        .single(),
                    );
                    await reload();
                  }}
                >
                  <Field label="Status">
                    <select name="status" defaultValue={meeting.status}>
                      {['requested', 'confirmed', 'completed', 'cancelled'].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                  <TextField
                    label="New time (optional, your local time)"
                    name="at"
                    type="datetime-local"
                    required={false}
                  />
                </ActionForm>
              )}
            </article>
          ))}
          {ownStudent && (
            <ActionForm
              title="Request a meeting"
              button="Send request"
              onSubmit={async (form) => {
                await checked(
                  supabase.rpc('request_learning_meeting', {
                    p_student_id: studentId,
                    p_course_id: course.id,
                    p_notes: form.get('notes'),
                    p_proposed_at: form.get('at') ? new Date(form.get('at')).toISOString() : null,
                  }),
                );
                await reload();
              }}
            >
              <TextField
                label="Preferred time (your local time)"
                name="at"
                type="datetime-local"
                required={false}
              />
              <Field label="What would you like to discuss?">
                <textarea name="notes" required maxLength={4000} />
              </Field>
            </ActionForm>
          )}
          <h2>Student poetry & reflections</h2>
          <p className="workspace-meta">
            Submissions are reviewed by the course’s teaching team before publication within this
            course.
          </p>
          {contributions.map((entry) => (
            <article className="workspace-card" key={entry.id}>
              <h3>{entry.title}</h3>
              <p className="workspace-meta">
                {studentName(entry.student_id)} ·{' '}
                {entry.published ? 'Published to course' : 'Awaiting review'}
              </p>
              <p>{entry.body}</p>
              {teacher && (
                <button
                  onClick={() =>
                    update('student_contributions', entry.id, { published: !entry.published })
                  }
                >
                  {entry.published ? 'Unpublish' : 'Approve and publish'}
                </button>
              )}
            </article>
          ))}
          {ownStudent && (
            <ActionForm
              title="Share your writing"
              button="Send for review"
              onSubmit={async (form) => {
                await checked(
                  supabase.rpc('submit_student_contribution', {
                    p_student_id: studentId,
                    p_course_id: course.id,
                    p_title: form.get('title'),
                    p_body: form.get('body'),
                    p_kind: form.get('kind'),
                  }),
                );
                await reload();
              }}
            >
              <TextField label="Title" name="title" />
              <Field label="Type">
                <select name="kind">
                  <option value="poetry">Poetry</option>
                  <option value="reflection">Reflection</option>
                </select>
              </Field>
              <Field label="Your writing">
                <textarea required name="body" maxLength={10000} rows={6} />
              </Field>
            </ActionForm>
          )}
          {!studentId && students.length > 0 && (
            <p>Choose a student above to request a meeting or submit writing.</p>
          )}
        </>
      )}
    </>
  );
}
function Register({ session, students, attendance, reload }) {
  const [marks, setMarks] = useState(() =>
    Object.fromEntries(
      attendance.filter((row) => row.session_id === session.id).map((row) => [row.student_id, row]),
    ),
  );
  return (
    <ActionForm
      button="Save register"
      onSubmit={async () => {
        const values = Object.values(marks).map(({ student_id, status, note }) => ({
          student_id,
          status,
          note: note || '',
        }));
        if (!values.length) throw new Error('Mark at least one student.');
        await checked(
          supabase.rpc('mark_class_register', { p_session_id: session.id, p_marks: values }),
        );
        await reload();
      }}
    >
      {students.map((student) => (
        <div key={student.id}>
          <Field label={student.display_name}>
            <select
              value={marks[student.id]?.status || ''}
              onChange={(event) =>
                setMarks((previous) => ({
                  ...previous,
                  [student.id]: {
                    student_id: student.id,
                    status: event.target.value,
                    note: previous[student.id]?.note || '',
                  },
                }))
              }
            >
              <option value="" disabled>
                Not marked
              </option>
              {['present', 'absent', 'late', 'excused'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Note (optional)">
            <input
              maxLength={1000}
              disabled={!marks[student.id]}
              value={marks[student.id]?.note || ''}
              onChange={(event) =>
                setMarks((previous) => ({
                  ...previous,
                  [student.id]: { ...previous[student.id], note: event.target.value },
                }))
              }
            />
          </Field>
        </div>
      ))}
    </ActionForm>
  );
}
