import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { adminScrollKey } from '@/lib/adminRoute';

// Run after a route commits, including standalone pages such as Admin.
export default function RouteScrollReset() {
  const { pathname, hash, search } = useLocation();
  const adminDestination = adminScrollKey(pathname, search);

  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    return scrollToAnchor(hash);
  }, [pathname, hash, adminDestination]);

  return null;
}
