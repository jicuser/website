import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ActionForm, Field, TextField, checked } from './shared';

function Options({ rows }) {
  return (
    <>
      <option value="">Choose…</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.display_name || row.title}
        </option>
      ))}
    </>
  );
}
export default function Manage({ data, reload, onError }) {
  const [people, setPeople] = useState([]);
  useEffect(() => {
    let active = true;
    checked(supabase.rpc('task_assignees', { p_form_id: null }))
      .then((rows) => {
        if (active) setPeople(rows || []);
      })
      .catch((error) => {
        if (active) onError(error.message);
      });
    return () => {
      active = false;
    };
  }, [onError]);
  const remove = async (table, values) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      let query = supabase.from(table).delete();
      for (const [key, value] of Object.entries(values)) query = query.eq(key, value);
      const result = await checked(query.select());
      if (!result?.length) throw new Error('The assignment was not removed.');
      await reload();
    } catch (error) {
      onError(error.message);
    }
  };
  return (
    <>
      <h2>Courses & people</h2>
      <p>
        Use existing accounts. Invite new users through Staff & access in website administration
        before linking them here.
      </p>
      <div className="workspace-grid">
        <ActionForm
          title="Create a course"
          onSubmit={async (form) => {
            await checked(
              supabase
                .from('learning_courses')
                .insert({
                  title: form.get('title'),
                  description: form.get('description'),
                  department: form.get('department'),
                  published: form.has('published'),
                })
                .select('id')
                .single(),
            );
            await reload();
          }}
        >
          <TextField name="title" label="Course name" />
          <Field label="Area">
            <select name="department">
              <option value="adult">Adult courses & classes</option>
              <option value="madrassah">Madrassah</option>
            </select>
          </Field>
          <Field label="Description">
            <textarea name="description" maxLength={5000} />
          </Field>
          <label>
            <input type="checkbox" name="published" /> Published course
          </label>
        </ActionForm>
        <ActionForm
          title="Add a student"
          onSubmit={async (form) => {
            await checked(
              supabase
                .from('learning_students')
                .insert({
                  display_name: form.get('name'),
                  user_id: form.get('user') || null,
                  guardian_id: form.get('guardian') || null,
                })
                .select('id')
                .single(),
            );
            await reload();
          }}
        >
          <TextField name="name" label="Student’s name" />
          <Field label="Student account (optional)">
            <select name="user">
              <Options rows={people} />
            </select>
          </Field>
          <Field label="Parent or guardian account (optional)">
            <select name="guardian">
              <Options rows={people} />
            </select>
          </Field>
        </ActionForm>
        <ActionForm
          title="Enrol a student"
          onSubmit={async (form) => {
            await checked(
              supabase
                .from('learning_enrolments')
                .upsert(
                  {
                    course_id: form.get('course'),
                    student_id: form.get('student'),
                    active: form.has('active'),
                  },
                  { onConflict: 'course_id,student_id' },
                )
                .select('student_id')
                .single(),
            );
            await reload();
          }}
        >
          <Field label="Course">
            <select name="course" required>
              <Options rows={data.learning_courses} />
            </select>
          </Field>
          <Field label="Student">
            <select name="student" required>
              <Options rows={data.learning_students} />
            </select>
          </Field>
          <label>
            <input name="active" type="checkbox" defaultChecked /> Active enrolment
          </label>
        </ActionForm>
        <ActionForm
          title="Assign a teacher"
          onSubmit={async (form) => {
            await checked(
              supabase
                .from('learning_staff')
                .upsert(
                  {
                    course_id: form.get('course'),
                    user_id: form.get('user'),
                    role: form.get('role'),
                  },
                  { onConflict: 'course_id,user_id' },
                )
                .select('user_id')
                .single(),
            );
            await reload();
          }}
        >
          <Field label="Course">
            <select required name="course">
              <Options rows={data.learning_courses} />
            </select>
          </Field>
          <Field label="Account">
            <select required name="user">
              <Options rows={people} />
            </select>
          </Field>
          <Field label="Role">
            <select name="role">
              <option value="teacher">Teacher</option>
              <option value="head_teacher">Head teacher</option>
            </select>
          </Field>
        </ActionForm>
      </div>
      <h2>Account links</h2>
      {data.learning_students.map((student) => (
        <details className="workspace-card" key={student.id}>
          <summary>{student.display_name}</summary>
          <ActionForm
            title="Update student accounts"
            onSubmit={async (form) => {
              await checked(
                supabase
                  .from('learning_students')
                  .update({
                    display_name: form.get('name'),
                    user_id: form.get('user') || null,
                    guardian_id: form.get('guardian') || null,
                  })
                  .eq('id', student.id)
                  .select('id')
                  .single(),
              );
              await reload();
            }}
          >
            <TextField name="name" label="Student name" defaultValue={student.display_name} />
            <Field label="Student account">
              <select name="user" defaultValue={student.user_id || ''}>
                <Options rows={people} />
              </select>
            </Field>
            <Field label="Parent or guardian account">
              <select name="guardian" defaultValue={student.guardian_id || ''}>
                <Options rows={people} />
              </select>
            </Field>
          </ActionForm>
        </details>
      ))}
      <h2>Teaching assignments</h2>
      {data.learning_staff.map((row) => (
        <article className="workspace-card" key={`${row.course_id}-${row.user_id}`}>
          <p>
            {data.learning_courses.find((course) => course.id === row.course_id)?.title} ·{' '}
            {people.find((person) => person.id === row.user_id)?.display_name || 'Account'} ·{' '}
            {row.role.replaceAll('_', ' ')}
          </p>
          <button
            onClick={() =>
              remove('learning_staff', { course_id: row.course_id, user_id: row.user_id })
            }
          >
            Remove assignment
          </button>
        </article>
      ))}
      <h2>Automatic actions from forms</h2>
      <p>
        Choose who is responsible and how soon the action is due. They receive an alert when a
        matching form arrives. Payment confirmation is a staff action; it does not verify a bank
        payment.
      </p>
      {['contact', 'madrassah', 'itikaaf'].map((kind) => (
        <FormRouting
          key={kind}
          kind={kind}
          existing={data.form_workflows.find((row) => row.kind === kind)}
          people={people}
          reload={reload}
        />
      ))}
    </>
  );
}
function FormRouting({ kind, existing, people, reload }) {
  return (
    <ActionForm
      title={kind === 'itikaaf' ? 'I’tikaf forms' : `${kind} forms`}
      button="Save form routing"
      onSubmit={async (form) => {
        await checked(
          supabase
            .from('form_workflows')
            .upsert(
              {
                kind,
                assigned_to: form.get('user'),
                title: form.get('title'),
                due_hours: Number(form.get('hours')),
                enabled: form.has('enabled'),
              },
              { onConflict: 'kind' },
            )
            .select('kind')
            .single(),
        );
        await reload();
      }}
    >
      <Field label="Responsible account">
        <select required name="user" defaultValue={existing?.assigned_to || ''}>
          <Options rows={people} />
        </select>
      </Field>
      <p className="workspace-meta">
        The selected person must have access to this form type. The server checks this when saving.
      </p>
      <TextField
        label="Action title"
        name="title"
        defaultValue={existing?.title || 'Reply to enquiry'}
      />
      <TextField
        label="Due within hours"
        name="hours"
        type="number"
        min={1}
        max={8760}
        defaultValue={existing?.due_hours || 48}
      />
      <label>
        <input type="checkbox" name="enabled" defaultChecked={existing?.enabled || false} />{' '}
        Automatically create actions
      </label>
    </ActionForm>
  );
}
