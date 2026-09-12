import React, { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EDITABLE_PAGES } from '@/content/editablePages';
const WebsitePageEditor = lazy(() => import('@/components/admin/WebsitePageEditor'));

export default function AdminBar() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const [editing, setEditing] = useState(false);
  const editable = can('content') && EDITABLE_PAGES.some((page) => page.path === pathname);
  return (
    <>
      <div className="jic-admin-bar">
        <Link to="/admin">
          <LayoutDashboard size={17} />
          Admin
        </Link>
        {editable && (
          <button onClick={() => setEditing(true)}>
            <Pencil size={17} />
            Edit this page
          </button>
        )}
      </div>
      {editing && (
        <Suspense
          fallback={
            <p className="jic-admin-bar" role="status">
              Opening editor…
            </p>
          }
        >
          <WebsitePageEditor path={pathname} onClose={() => setEditing(false)} />
        </Suspense>
      )}
    </>
  );
}
