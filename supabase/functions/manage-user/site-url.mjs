// Only server configuration selects an email destination; never trust a request origin.
export function accountSetupUrl(siteUrl = 'https://lawngreen-kangaroo-881113.hostingersite.com') {
  const site = new URL(siteUrl);
  if (
    site.protocol !== 'https:' ||
    site.username ||
    site.password ||
    site.search ||
    site.hash ||
    site.pathname !== '/'
  )
    throw new Error('JIC_SITE_URL must be an HTTPS website origin.');
  return new URL('/admin/setup', site).href;
}
