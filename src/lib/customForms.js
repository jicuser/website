import {
  isFieldVisible,
  validateSchema,
} from '../../supabase/functions/custom-forms/validation.mjs';
export const FIELD_TYPES = [
  ['text', 'Short answer'],
  ['textarea', 'Long answer'],
  ['email', 'Email'],
  ['phone', 'Telephone'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['select', 'Choose one'],
  ['multiselect', 'Choose several'],
  ['checkbox', 'Confirmation'],
  ['image', 'Photograph'],
  ['file', 'Document or ZIP'],
];

export function visibleFields(fields, answers) {
  return fields.filter((field) => isFieldVisible(field, answers));
}

export function visibleAnswers(fields, answers) {
  return Object.fromEntries(
    visibleFields(fields, answers)
      .filter((field) => Object.hasOwn(answers, field.id))
      .map((field) => [field.id, answers[field.id]]),
  );
}

export function validateDraft(draft) {
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(draft.slug))
    return 'Use a 3–80 character address with lowercase letters, numbers and hyphens.';
  if (!draft.title?.trim() || draft.title.length > 160)
    return 'Add a title of up to 160 characters.';
  if (!draft.task_title?.trim() || draft.task_title.length > 160)
    return 'Add an action title of up to 160 characters.';
  if (
    !Number.isInteger(Number(draft.due_hours)) ||
    Number(draft.due_hours) < 1 ||
    Number(draft.due_hours) > 8760
  )
    return 'Choose a due time between 1 and 8,760 hours.';
  try {
    validateSchema(draft.schema);
  } catch (error) {
    return error.message;
  }
  return '';
}

export function formTitle(row) {
  return (
    row.schema_snapshot?.title ||
    {
      contact: 'Contact',
      madrassah: 'Madrassah enquiry',
      itikaaf: 'I’tikaf registration',
      custom: 'Custom form',
    }[row.kind] ||
    'Form'
  );
}

export function safeDownloadUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function fileAccept(type) {
  return type === 'image'
    ? 'image/jpeg,image/png,image/webp'
    : 'image/jpeg,image/png,image/webp,application/pdf,application/zip,application/x-zip-compressed';
}

export async function formAction(client, body) {
  const { data, error } = await client.functions.invoke('custom-forms', { body });
  if (error) {
    let message = '';
    try {
      message = (await error.context?.json())?.error || '';
    } catch {
      /* Non-JSON gateway response. */
    }
    throw new Error(message || 'This request could not be completed. Please try again.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
