import { csvCell } from './formExport.js';

export function submissionsCsv(rows) {
  const keys = [
    ...new Set(rows.flatMap((row) => Object.keys(row.answers || row.payload || {}))),
  ].sort();
  return [
    ['id', 'form', 'status', 'submitted', ...keys],
    ...rows.map((row) => [
      row.id,
      row.form_title || row.title || row.kind,
      row.status,
      row.created_at,
      ...keys.map((key) => (row.answers || row.payload || {})[key] ?? ''),
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}

/** Every matching page is read; limits stop an export explicitly, never truncate it silently. */
export async function collectPages(
  fetchPage,
  { signal, onProgress = () => {}, maxRows = 25000 } = {},
) {
  const rows = [];
  const size = 100;
  for (let offset = 0; ; offset += size) {
    signal?.throwIfAborted();
    const page = await fetchPage(offset, size);
    signal?.throwIfAborted();
    if (!Array.isArray(page)) throw new Error('The export could not be loaded.');
    if (rows.length + page.length > maxRows) {
      throw new Error(
        `More than ${maxRows.toLocaleString()} responses match. Narrow the date or form filters and export again.`,
      );
    }
    rows.push(...page);
    onProgress(rows.length);
    if (page.length < size) return rows;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
