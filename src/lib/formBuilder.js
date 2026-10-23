import { pageSlug } from './pageContent.js';

export const QUESTION_PRESETS = [
  { id: 'name', name: 'Name', field: { label: 'Your name', type: 'text', required: true } },
  { id: 'email', name: 'Email', field: { label: 'Email address', type: 'email', required: true } },
  {
    id: 'phone',
    name: 'Phone',
    field: {
      label: 'Phone number',
      type: 'phone',
      required: false,
      placeholder: '07700 900000 or +44…',
    },
  },
  {
    id: 'title',
    name: 'Name title',
    field: {
      label: 'Title',
      type: 'select',
      required: false,
      options: ['Mr', 'Mrs', 'Miss', 'Ms', 'Mx', 'Dr', 'Other'],
    },
  },
  { id: 'date', name: 'Date', field: { label: 'Preferred date', type: 'date', required: true } },
  {
    id: 'message',
    name: 'Message',
    field: { label: 'How can we help?', type: 'textarea', required: true },
  },
];

export function newQuestion(fields, presetId) {
  const preset = QUESTION_PRESETS.find((item) => item.id === presetId);
  const base = preset?.id || 'question';
  let id = base,
    number = 2;
  while (fields.some((field) => field.id === id)) id = `${base}_${number++}`;
  return {
    id,
    ...(preset ? structuredClone(preset.field) : { label: '', type: 'text', required: false }),
  };
}

export function starterQuestions(template) {
  const ids =
    template === 'registration'
      ? ['name', 'email', 'phone']
      : template === 'blank'
        ? []
        : ['name', 'email', 'message'];
  return ids.length
    ? ids.reduce((fields, id) => [...fields, newQuestion(fields, id)], [])
    : [newQuestion([])];
}

export const formAddress = (title) => pageSlug(title).slice(0, 80);

export function canMoveQuestion(fields, index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= fields.length) return false;
  const next = [...fields];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next.every((field, position) => {
    const parent = next.findIndex((item) => item.id === field.show_when?.field);
    return !field.show_when || (parent >= 0 && parent < position);
  });
}

export function updateQuestion(fields, index, next) {
  const oldId = fields[index].id;
  return fields.map((field, position) =>
    position === index
      ? next
      : field.show_when?.field === oldId && next.id !== oldId
        ? { ...field, show_when: { ...field.show_when, field: next.id } }
        : field,
  );
}
