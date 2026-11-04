/** The Salah workspace already contains its timetable and navigation. */
export function isSalahRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/prayer-times' || path.startsWith('/prayer-times/');
}
