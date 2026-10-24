// Keep task surfaces and the prayer dock on the same policy, including shared URLs.
export function isPublicTaskRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (
    ['/forms', '/ramadan', '/fundraise', '/get-involved', '/services', '/funerals'].some(
      (root) => path === root || path.startsWith(`${root}/`),
    ) || ['/donate', '/contact', '/prayer-times/reminders', '/services/hall-booking'].includes(path)
  );
}

export function isPublicReadingRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path.startsWith('/worship/');
}

export function prefersQuietPrayerDock(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return !['/', '/prayer-times', '/prayer-times/monthly', '/prayer-times/jummah'].includes(path);
}
