export function csvCell(value) {
  const text =
    value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function formsCsv(rows) {
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row.payload || {})))].sort();
  return [
    ['id', 'form', 'status', 'submitted', ...fields],
    ...rows.map((row) => [
      row.id,
      row.kind,
      row.status,
      row.created_at,
      ...fields.map((field) => row.payload?.[field] ?? ''),
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}
