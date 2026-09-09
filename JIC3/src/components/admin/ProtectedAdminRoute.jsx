import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedAdminRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
