import { visibleAnswers } from '../../lib/customForms.js';
import { validateAnswers } from '../../../supabase/functions/custom-forms/validation.mjs';

export const BOOKING_LABELS = { nikah: 'Nikah only', both: 'Nikah & hall', hall: 'Hall only' };

/** Extra venue questions are stored in the existing enquiry, using its published schema. */
export function bookingQuestions(fields, kind) {
  if (!BOOKING_LABELS[kind]) return { fields, extra: [], message: null };
  const message =
    fields.find(
      (field) => field.id === 'message' && field.type === 'textarea' && !field.show_when,
    ) || fields.find((field) => field.type === 'textarea' && !field.show_when);
  if (!message) return { fields, extra: [], message: null };
  const extra = [];
  const add = (field) => {
    if (fields.length + extra.length < 40 && !fields.some((item) => item.id === field.id))
      extra.push(field);
  };
  if (!fields.some((field) => field.type === 'date'))
    add({ id: 'jic_booking_date', type: 'date', label: 'Preferred date' });
  if (
    !fields.some((field) =>
      ['attendees', 'guests', 'guest_count', 'guests_count'].includes(field.id),
    )
  )
    add({
      id: 'jic_booking_guests',
      type: 'number',
      label: 'Approximate number of guests',
      minimum: 1,
      integer: true,
    });
  if (
    kind !== 'nikah' &&
    !fields.some((field) => ['facilities', 'spaces', 'rooms'].includes(field.id))
  )
    add({
      id: 'jic_booking_spaces',
      type: 'multiselect',
      label: 'Which spaces would you like?',
      options: ['Men’s hall', 'Ladies’ hall', 'Kitchen & serving area'],
      help: 'Choose any you need. Leave blank if you would like to discuss the options.',
    });
  const insertion = fields.indexOf(message);
  return {
    fields: [...fields.slice(0, insertion), ...extra, ...fields.slice(insertion)],
    extra,
    message,
  };
}

export function bookingPayload(schema, answers, kind) {
  const questions = bookingQuestions(schema.fields, kind);
  if (!BOOKING_LABELS[kind]) return validateAnswers(schema, visibleAnswers(schema.fields, answers));
  if (!questions.message) throw new Error('Please contact the centre to arrange this booking.');
  const checked = validateAnswers(
    { fields: questions.fields },
    visibleAnswers(questions.fields, answers),
  );
  const payload = visibleAnswers(schema.fields, checked);
  const lines = [`Booking: ${BOOKING_LABELS[kind]}`];
  for (const field of questions.extra) {
    const value = checked[field.id];
    if (value !== undefined && value !== '')
      lines.push(`${field.label}: ${Array.isArray(value) ? value.join(', ') : value}`);
  }
  payload[questions.message.id] =
    `${lines.join('\n')}\n\n${payload[questions.message.id] || ''}`.trim();
  return validateAnswers(schema, payload);
}
