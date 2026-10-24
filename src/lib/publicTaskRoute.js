// Keep task surfaces and the prayer dock on the same policy, including shared URLs.
export function isPublicTaskRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (
    ['/forms', '/ramadan', '/fundraise', '/get-involved'].some(
      (root) => path === root || path.startsWith(`${root}/`),
    ) || ['/donate', '/contact', '/prayer-times/reminders', '/services/hall-booking'].includes(path)
  );
}
