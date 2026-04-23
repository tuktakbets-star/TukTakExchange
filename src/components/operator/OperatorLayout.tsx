import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import OperatorSidebar from './OperatorSidebar';

export default function OperatorLayout() {
  const { profile, isSubAdmin, isAdmin, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Allow subadmin or admin
  const isAuthorized = (isSubAdmin || isAdmin) && sessionStorage.getItem('mgmt_verified') === 'true';

  if (!isAuthorized) {
    return <Navigate to="/subadmin-login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <OperatorSidebar />
      
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
