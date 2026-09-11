import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, LogOut, CheckCircle, AlertCircle, Loader2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';

export default function AdminBar() {
  const { user, signOut, can } = useAuth();
  const { saving, saveMsg } = useContent();
  const canEdit = can('content');
  return (
    <div className="jic-admin-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 text-white text-sm max-w-[95vw]">
      <Link
        to="/admin"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 hover:bg-amber-300 font-medium"
      >
        <LayoutDashboard size={14} />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {canEdit && (
        <Link to="/admin" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
          <Pencil size={14} />
          Edit pages
        </Link>
      )}
      {saving && <Loader2 size={13} className="animate-spin text-gray-400" />}
      {saveMsg === 'Saved' && <CheckCircle size={13} className="text-teal-400" />}
      {saveMsg === 'Error saving' && <AlertCircle size={13} className="text-red-400" />}
      <span className="hidden lg:inline text-xs text-gray-500">{user?.email}</span>
      <button aria-label="Sign out" onClick={signOut} className="text-gray-400 hover:text-red-400">
        <LogOut size={15} />
      </button>
    </div>
  );
}
