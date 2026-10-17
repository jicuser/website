/** Only known account destinations can be restored after authentication. */
export function portalDestination(value) {
  if (typeof value !== 'string' || value.length > 500) return '';
  try {
    const url = new URL(value, 'https://jic.invalid');
    if (
      url.origin !== 'https://jic.invalid' ||
      !['/account/certificates', '/account/invoices', '/fundraise/new'].includes(url.pathname)
    )
      return '';
    const params = new URLSearchParams();
    const kind = url.searchParams.get('request');
    if (
      url.pathname === '/account/certificates' &&
      ['nikah', 'shahadah', 'course', 'ijazah'].includes(kind)
    )
      params.set('request', kind);
    return url.pathname + (params.size ? `?${params}` : '');
  } catch {
    return '';
  }
}

export const portalLoginHref = (destination) => {
  const next = portalDestination(destination);
  return next ? `/portal?${new URLSearchParams({ next })}` : '/portal';
};
