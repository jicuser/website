/** One placement rule prevents the same programme appearing as a poster and a second card. */
export function posterAppearsOnPage(poster, pathname, pages = []) {
  if (pathname === '/education/courses') {
    return pages.some((page) => page.source_poster_id === poster.id && page.placement === pathname);
  }
  const group = pathname === '/' ? 'home' : pathname.split('/')[1];
  return (poster.groups || []).includes(group);
}
