import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ActionForm, Field, TextField, checked } from '@/components/workspace/shared';
export default function ClassSettings({ data, reload }) {
  const [forms, setForms] = useState([]);
  const [links, setLinks] = useState([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      checked(supabase.from('custom_forms').select('id,title').order('title').limit(500)),
      checked(supabase.from('learning_course_forms').select('course_id,form_id').limit(1000)),
    ])
      .then(([f, l]) => {
        if (active) {
          setForms(f || []);
          setLinks(l || []);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section aria-label="Class settings">
      <h2>Classes & registration forms</h2>
      <p>
        Link an existing registration form so its responses can be reviewed for this class. An
        interest form alone never creates a place.
      </p>
      {failed && (
        <p role="alert">Form links could not be loaded. Refresh records before editing links.</p>
      )}
      {data.learning_courses.map((course) => (
        <details key={course.id} className="workspace-card">
          <summary>
            {course.title}
            {course.archived ? ' · Archived' : ''}
          </summary>
          <ActionForm
            title="Edit class"
            onSubmit={async (form) => {
              await checked(
                supabase
                  .from('learning_courses')
                  .update({
                    title: form.get('title'),
                    description: form.get('description'),
                    capacity: form.get('capacity') ? Number(form.get('capacity')) : null,
                    archived: form.has('archived'),
                  })
                  .eq('id', course.id)
                  .select('id')
                  .single(),
              );
              await reload();
            }}
          >
            <TextField label="Class name" name="title" defaultValue={course.title} />
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={course.description || ''}
                maxLength={6000}
              />
            </Field>
            <TextField
              label="Maximum class places (optional)"
              name="capacity"
              type="number"
              min={1}
              max={1000}
              required={false}
              defaultValue={course.capacity || ''}
            />
            <label>
              <input type="checkbox" name="archived" defaultChecked={course.archived} /> Archive
              class (keep records; stop new places and teaching access)
            </label>
          </ActionForm>
          {!failed && (
            <ActionForm
              title="Link a registration form"
              button="Link form"
              onSubmit={async (form) => {
                const formId = String(form.get('form'));
                await checked(
                  supabase
                    .from('learning_course_forms')
                    .upsert(
                      { course_id: course.id, form_id: formId },
                      { onConflict: 'course_id,form_id', ignoreDuplicates: true },
                    )
                    .select('form_id'),
                );
                setLinks((current) =>
                  current.some((x) => x.course_id === course.id && x.form_id === formId)
                    ? current
                    : [...current, { course_id: course.id, form_id: formId }],
                );
              }}
            >
              <Field label="Registration form">
                <select name="form" required>
                  <option value="">Choose a form…</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          )}
          {links
            .filter((l) => l.course_id === course.id)
            .map((l) => (
              <p key={l.form_id}>
                Linked: {forms.find((f) => f.id === l.form_id)?.title || 'Registration form'}
              </p>
            ))}
        </details>
      ))}
    </section>
  );
}
