import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, PencilOff, LogOut, CheckCircle, AlertCircle, Loader2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useContent } from '@/context/ContentContext';

export default function AdminBar() {
  const { user, signOut, can } = useAuth();
  const { editMode, toggleEditMode, saving, saveMsg } = useContent();
  const canEdit = can('content');
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 text-white text-sm max-w-[95vw]">
      <Link to="/admin" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 font-medium"><LayoutDashboard size={14}/><span className="hidden sm:inline">Dashboard</span></Link>
      {canEdit && <button onClick={toggleEditMode} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${editMode?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>{editMode?<Pencil size={14}/>:<PencilOff size={14}/>}<span>{editMode?'Editing':'Quick edit'}</span></button>}
      {saving && <Loader2 size={13} className="animate-spin text-gray-400"/>}
      {saveMsg==='Saved' && <CheckCircle size={13} className="text-teal-400"/>}
      {saveMsg==='Error saving' && <AlertCircle size={13} className="text-red-400"/>}
      <span className="hidden lg:inline text-xs text-gray-500">{user?.email}</span>
      <button onClick={signOut} className="text-gray-400 hover:text-red-400"><LogOut size={15}/></button>
    </div>
  );
}
