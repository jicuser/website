import { visibleAnswers, visibleFields } from './customForms.js';
import { validateAnswers } from '../../supabase/functions/custom-forms/validation.mjs';

const groups = [
  [
    'contact',
    'Your contact details',
    [
      'name',
      'full_name',
      'title',
      'contact_name',
      'email',
      'phone',
      'telephone',
      'contact_email',
      'contact_phone',
      'contact',
      'organisation',
    ],
  ],
  ['attendee', 'About the attendee', ['attendee_name', 'attendee_age']],
  [
    'attendee-contact',
    'Attendee contact details',
    ['attendee_address', 'attendee_phone', 'attendee_email'],
  ],
  ['child', 'About your child', ['child_name', 'child_age', 'child_dob']],
  [
    'emergency',
    'Emergency contact',
    ['emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'],
  ],
  [
    'parent',
    'Parent or guardian',
    [
      'parent_name',
      'parent_phone',
      'parent_email',
      'parent_consent_signature',
      'parent_consent_date',
    ],
  ],
  ['health', 'Health information', ['medical_conditions', 'allergies', 'medications']],
  ['date', 'Preferred date and time', ['preferred_date', 'preferred_time']],
  ['funeral-location', 'Where is your loved one now?', ['current_location', 'location_details']],
];

/** Keep branch controls before their follow-ups; gather contact details after the request. */
export function formSteps(fields, answers = {}) {
  const controls = new Set(fields.map((field) => field.show_when?.field).filter(Boolean));
  const grouped = new Map();
  for (const field of visibleFields(fields, answers)) {
    const group = !controls.has(field.id) && groups.find(([, , ids]) => ids.includes(field.id));
    const conditional = field.show_when ? `:${JSON.stringify(field.show_when)}` : '';
    const key = group ? `${group[0]}${conditional}` : field.id;
    if (!grouped.has(key)) grouped.set(key, { key, title: group?.[1] || field.label, fields: [] });
    grouped.get(key).fields.push(field);
  }
  const ordered = [...grouped.values()];
  const contact = ordered.findIndex((step) => step.key === 'contact');
  if (contact >= 0) {
    const [details] = ordered.splice(contact, 1);
    // Explicit confirmations stay last, after someone has checked their details.
    const confirmation = ordered.findIndex((step) =>
      step.fields.every((field) => field.type === 'checkbox'),
    );
    ordered.splice(confirmation < 0 ? ordered.length : confirmation, 0, details);
  }
  return ordered.flatMap((step) => {
    const result = [];
    for (let index = 0; index < step.fields.length; index += 3)
      result.push({
        ...step,
        key: `${step.key}:${index}`,
        fields: step.fields.slice(index, index + 3),
      });
    return result;
  });
}

/** Reuse the published validation rules without requiring answers to later steps. */
export function formStepProblem(fields, answers, current = visibleFields(fields, answers)) {
  const visible = visibleAnswers(fields, answers);
  for (const field of current) {
    const ids = new Set([field.id, field.show_when?.field]);
    const values = Object.fromEntries(Object.entries(visible).filter(([id]) => ids.has(id)));
    try {
      validateAnswers(
        {
          fields: fields.map((item) => ({
            ...item,
            required: item.id === field.id && Boolean(item.required),
          })),
        },
        values,
      );
    } catch (error) {
      return { field: field.id, message: error.message };
    }
  }
  return null;
}

export function reviewAnswer(field, answers, uploads = {}) {
  const value = answers[field.id];
  if (value == null || value === '' || (Array.isArray(value) && !value.length))
    return 'Not provided';
  if (['file', 'image'].includes(field.type)) return uploads[field.id]?.name || 'Attachment added';
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  return Array.isArray(value) ? value.join(', ') : String(value);
}
