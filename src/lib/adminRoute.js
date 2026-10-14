// Query parameters identify screens inside Admin. Filters and unrelated public
// page parameters must not move the reader back to the top.
export function adminScrollKey(pathname, search) {
  if (pathname !== '/admin' && pathname !== '/admin/') return '';
  const params = new URLSearchParams(search);
  return JSON.stringify(
    ['section', 'view', 'form', 'tab', 'page', 'kind'].map((key) => params.get(key) || ''),
  );
}
