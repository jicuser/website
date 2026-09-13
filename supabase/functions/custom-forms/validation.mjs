const types = new Set(['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'multiselect', 'checkbox', 'image', 'file']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value)).length;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (message) => { throw new Error(message); };
export const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip'];

export function validateSchema(schema) {
  if (!object(schema) || !Array.isArray(schema.fields) || schema.fields.length < 1 || schema.fields.length > 40 || bytes(schema) > 48000) fail('Provide 1 to 40 form fields.');
  const prior = new Map();
  let uploads = 0;
  const fields = schema.fields.map((field) => {
    if (!object(field) || !/^[a-z][a-z0-9_]{0,39}$/.test(field.id ?? '') || prior.has(field.id) || !types.has(field.type) || typeof field.label !== 'string' || field.label.trim().length < 1 || field.label.length > 160 || (field.required !== undefined && typeof field.required !== 'boolean')) fail('Choose unique field IDs, types and labels.');
    if (['file', 'image'].includes(field.type) && ++uploads > 5) fail('Use at most five upload fields.');
    const result = { id: field.id, type: field.type, label: field.label.trim(), required: field.required === true };
    if (['select', 'multiselect'].includes(field.type)) {
      if (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 50 || field.options.some((value) => typeof value !== 'string' || !value.trim() || value.length > 120) || new Set(field.options).size !== field.options.length) fail('Provide 1 to 50 different options.');
      result.options = [...field.options];
    }
    if (field.show_when != null) {
      const condition = field.show_when, controlling = prior.get(condition.field);
      if (!object(condition) || !controlling || controlling.show_when || ['file', 'image', 'multiselect'].includes(controlling.type) || !['equals', 'not_equals'].includes(condition.operator) || !['string', 'number', 'boolean'].includes(typeof condition.value) || (typeof condition.value === 'number' && !Number.isFinite(condition.value))) fail('Visibility must use an earlier field without its own condition.');
      result.show_when = { field: condition.field, operator: condition.operator, value: condition.value };
    }
    prior.set(field.id, result);
    return result;
  });
  return { fields };
}

export function isFieldVisible(field, answers = {}) {
  if (!field.show_when) return true;
  const equal = Object.hasOwn(answers, field.show_when.field) && answers[field.show_when.field] === field.show_when.value;
  return field.show_when.operator === 'equals' ? equal : !equal;
}

export function validateAnswers(schema, answers) {
  const checked = validateSchema(schema);
  if (!object(answers) || bytes(answers) > 24000) fail('Please shorten the form answers.');
  const ids = new Set(checked.fields.map((field) => field.id));
  if (Object.keys(answers).some((id) => !ids.has(id))) fail('Unknown field answer.');
  const result = {};
  for (const field of checked.fields) {
    const value = answers[field.id];
    if (!isFieldVisible(field, answers)) {
      if (Object.hasOwn(answers, field.id)) fail('Omit hidden field answers.');
      continue;
    }
    const missing = value == null || value === '' || (Array.isArray(value) && !value.length);
    if (field.required && (missing || (field.type === 'checkbox' && value !== true))) fail(`${field.label} is required.`);
    if (missing) continue;
    const invalid = () => fail(`Check ${field.label}.`);
    switch (field.type) {
      case 'checkbox': if (typeof value !== 'boolean') invalid(); break;
      case 'number': if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) invalid(); break;
      case 'multiselect':
        if (!Array.isArray(value) || value.length > 50 || new Set(value).size !== value.length || value.some((item) => !field.options.includes(item))) invalid();
        break;
      default: {
        const max = { textarea: 6000, email: 254, phone: 40 }[field.type] ?? 500;
        if (typeof value !== 'string' || value.length > max) invalid();
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) invalid();
        if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) invalid();
        if (field.type === 'select' && !field.options.includes(value)) invalid();
        if (['image', 'file'].includes(field.type) && !uuid.test(value)) invalid();
      }
    }
    result[field.id] = value;
  }
  return result;
}

export function safeFilename(value) {
  const name = String(value ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f/\\<>:"|?*]/g, '_').replace(/^\.+/, '').trim().slice(0, 160);
  return name || 'attachment';
}

export function validateUpload(field, file) {
  if (!field || !['file', 'image'].includes(field.type) || !object(file)) fail('Choose an upload field.');
  if (!MIME_TYPES.includes(file.mime_type) || (field.type === 'image' && !file.mime_type.startsWith('image/'))) fail('Choose JPEG, PNG, WebP, PDF or ZIP.');
  if (!Number.isInteger(file.size_bytes) || file.size_bytes < 1 || file.size_bytes > 10 * 1024 * 1024) fail('Files must be smaller than 10 MiB.');
  return { file_name: safeFilename(file.file_name), mime_type: file.mime_type, size_bytes: file.size_bytes };
}

export function hasExpectedSignature(data, mime) {
  const prefix = (...values) => values.every((value, i) => data[i] === value);
  if (mime === 'image/png') return data.length >= 24 && prefix(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === 'image/jpeg') return data.length >= 4 && prefix(255, 216, 255);
  if (mime === 'image/webp') return data.length >= 12 && prefix(82, 73, 70, 70) && data[8] === 87 && data[9] === 69 && data[10] === 66 && data[11] === 80;
  if (mime === 'application/pdf') return data.length >= 8 && prefix(37, 80, 68, 70, 45);
  if (mime === 'application/zip') return data.length >= 4 && (prefix(80, 75, 3, 4) || prefix(80, 75, 5, 6) || prefix(80, 75, 7, 8));
  return false;
}

export function csvCell(value) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function responsesCsv(rows) {
  const fields = new Map();
  for (const row of rows) for (const field of row.schema_snapshot?.fields ?? []) if (!fields.has(field.id)) fields.set(field.id, field.label);
  const header = ['Response ID', 'Created at', 'Status', 'Version', ...[...fields].map(([id, label]) => `${label} [${id}]`)];
  return '\ufeff' + [header, ...rows.map((row) => [row.id, row.created_at, row.status, row.form_version, ...[...fields.keys()].map((id) => row.payload?.[id])])].map((cells) => cells.map(csvCell).join(',')).join('\r\n');
}
