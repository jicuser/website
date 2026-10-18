import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import FeeLedger from '@/components/workspace/FeeLedger';
import LearningResources from '@/components/workspace/LearningResources';
import { familyRecords, formatPortalDate, linkedStudents, studentAttendance, studentCourses } from './model';

function MeetingRequest({ studentId, courseId, onSaved }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <form className="workspace-card workspace-form" aria-label="Request a meeting" onSubmit={async (event) => {
      event.preventDefault();
      if (pending.current) return;
      const element = event.currentTarget;
      const form = new FormData(element);
      const notes = String(form.get('notes') || '').trim();
      if (!notes) { setError('Tell the teaching team what you would like to discuss.'); return; }
      pending.current = true; setBusy(true); setMessage(''); setError('');
      try {
        const preferred = form.get('preferred');
        const date = preferred ? new Date(String(preferred)) : null;
        if (date && (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()))
          throw new Error('Choose a future preferred time.');
        const result = await supabase.rpc('request_learning_meeting', {
          p_student_id: studentId, p_course_id: courseId, p_notes: notes,
          p_proposed_at: date ? date.toISOString() : null,
        });
        if (result.error) throw new Error('The request could not be confirmed. Refresh before trying again.');
        element.reset(); setMessage('Meeting requested. The teaching team will confirm the details.');
        await onSaved();
      } catch (failure) { setError(failure.message); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <h3>Request a meeting</h3>
      <fieldset disabled={busy}>
        <label className="workspace-field"><span>What would you like to discuss?</span>
          <textarea name="notes" required maxLength={4000} rows={3} /></label>
        <label className="workspace-field"><span>Preferred time (optional, your local time)</span>
          <input name="preferred" type="datetime-local" /></label>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send meeting request'}</button>
      </fieldset>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default function FamilyDashboard({ data, auth, reload, failures = [] }) {
  const [params, setParams] = useSearchParams();
  const students = linkedStudents(data, auth.user.id);
  const student = students.find((row) => row.id === params.get('student')) || students[0];
  const courses = studentCourses(data, student?.id);
  const course = courses.find((row) => row.id === params.get('course')) || courses[0];
  const views = ['progress', 'attendance', 'materials', 'fees', 'meetings'];
  const view = views.includes(params.get('view')) ? params.get('view') : 'progress';
  function choose(key, value) {
    const next = new URLSearchParams(params);
    next.set('tab', 'family'); next.set(key, value);
    if (key === 'student') next.delete('course');
    setParams(next);
  }
  if (!student) return <p className="workspace-card">No family records are linked to this account. Contact the centre if you need family access.</p>;
  const records = familyRecords(data, student.id, course?.id);
  const attendance = studentAttendance(data, student.id, course?.id);
  const meetings = data.learning_meetings.filter((row) => row.student_id === student.id &&
    (!course || row.course_id === course.id));
  const relevantFailure = failures.some((name) => name.startsWith('learning_'));
  return (
    <section aria-label="My family">
      <div className="portal-family-picker">
        {students.map((row) => (
          <button type="button" key={row.id} aria-pressed={row.id === student.id}
            onClick={() => choose('student', row.id)}>{row.display_name || 'Student'}</button>
        ))}
      </div>
      <div className="workspace-header">
        <div><p className="workspace-kicker">Student information</p><h2>{student.display_name}</h2></div>
        <label className="workspace-field"><span>Class or course</span>
          <select value={course?.id || ''} onChange={(event) => choose('course', event.target.value)}>
            {!courses.length && <option value="">No active enrolment</option>}
            {courses.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select>
        </label>
      </div>
      {relevantFailure && <p role="status">Some family information could not be loaded. Refresh to try again.</p>}
      <nav className="workspace-tabs" aria-label="Family information">
        {views.map((key) => <button type="button" key={key} aria-current={view === key ? 'page' : undefined}
          onClick={() => choose('view', key)}>{key[0].toUpperCase() + key.slice(1)}</button>)}
      </nav>
      {view === 'progress' && <div className="portal-records">
        {!records.length && <p className="workspace-card">No published progress records are available for this selection.</p>}
        {records.map((record) => <article className="workspace-card" key={record.id}>
          <p className="workspace-kicker">{record.kind}</p><h3>{record.title}</h3>
          <p className="portal-preserve-lines">{record.body}</p>
          {record.score != null && record.max_score != null && <p><strong>Mark: {record.score} / {record.max_score}</strong></p>}
          {record.kind === 'plan' && <p>{record.completed_at ? 'Completed' : 'In progress'}</p>}
          {record.due_on && <p>Target date: {record.due_on}</p>}
        </article>)}
      </div>}
      {view === 'attendance' && <section className="workspace-card">
        <h3>Recorded attendance</h3>
        <p className="workspace-meta">Only sessions with a saved register are listed. Unmarked sessions are not absences.</p>
        {!attendance.length && <p>No attendance records are available for this selection.</p>}
        <ul className="portal-record-list">{attendance.map((row) => <li key={`${row.session_id}-${row.student_id}`}>
          <span><strong>{row.session.title}</strong><small>{formatPortalDate(row.session.starts_at)}</small></span>
          <span className="portal-status">{row.status}</span>
        </li>)}</ul>
      </section>}
      {view === 'materials' && (course ? <LearningResources key={course.id} courseId={course.id} canTeach={false} /> : <p>Choose an active course to view its materials.</p>)}
      {view === 'fees' && (course ? <FeeLedger key={`${student.id}-${course.id}`} studentId={student.id} courseId={course.id} canManage={false} /> : <p>Choose an active course to view its fees.</p>)}
      {view === 'meetings' && <>
        <section className="workspace-card"><h3>Your meeting requests</h3>
          {!meetings.length && <p>No meeting requests are available for this selection.</p>}
          <ul className="portal-record-list">{meetings.map((meeting) => <li key={meeting.id}>
            <span><strong>{formatPortalDate(meeting.proposed_at)}</strong><small>{meeting.notes}</small></span>
            <span className="portal-status">{meeting.status}</span>
          </li>)}</ul>
        </section>
        {course && <MeetingRequest key={`${student.id}-${course.id}`} studentId={student.id} courseId={course.id} onSaved={reload} />}
      </>}
    </section>
  );
}
