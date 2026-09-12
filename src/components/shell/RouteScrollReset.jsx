import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToAnchor } from '@/lib/scrollToAnchor';

// Run after a route commits, including standalone pages such as Admin.
export default function RouteScrollReset() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    return scrollToAnchor(hash);
  }, [pathname, hash]);

  return null;
}
