// Preserve bookmarked Contact Us inbox links within the unified Forms workspace.
export function contactInboxDestination(search) {
  const params = new URLSearchParams(search);
  if (params.get('section') !== 'messages') return null;
  params.set('section', 'forms');
  params.set('view', 'responses');
  params.set('kind', 'contact');
  params.delete('form');
  params.delete('tab');
  return `/admin?${params.toString()}`;
}

// Query parameters identify screens inside Admin. Filters and unrelated public
// page parameters must not move the reader back to the top.
export function adminScrollKey(pathname, search) {
  if (pathname !== '/admin' && pathname !== '/admin/') return '';
  const params = new URLSearchParams(search);
  return JSON.stringify(
    ['section', 'view', 'form', 'tab', 'page', 'kind'].map((key) => params.get(key) || ''),
  );
}
