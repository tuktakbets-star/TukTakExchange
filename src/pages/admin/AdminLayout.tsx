import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Wallet, 
  Send, 
  ArrowUpRight, 
  Zap, 
  Users, 
  TrendingUp, 
  Bell, 
  MessageSquare, 
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Search,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  History,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '../../lib/firebase';
import { firebaseService } from '../../lib/firebaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingKYCCount, setPendingKYCCount] = useState(0);

  React.useEffect(() => {
    const unsub = firebaseService.subscribeToCollection('kycSubmissions', [], (data) => {
      setPendingKYCCount(data.filter(k => k.status === 'pending').length);
    });
    return unsub;
  }, []);

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, path: '/admin-dashboard' },
    { id: 'deposits', label: t('deposits'), icon: Wallet, path: '/admin-dashboard/deposits' },
    { id: 'send-money', label: t('sendMoney'), icon: Send, path: '/admin-dashboard/send-money' },
    { id: 'exchange', label: 'Exchanges', icon: RefreshCw, path: '/admin-dashboard/exchange' },
    { id: 'withdraw', label: t('withdraw'), icon: ArrowUpRight, path: '/admin-dashboard/withdraw' },
    { id: 'recharge', label: t('recharge'), icon: Zap, path: '/admin-dashboard/recharge' },
    { id: 'sub-admins', label: 'Sub Admins', icon: ShieldCheck, path: '/admin-dashboard/sub-admins' },
    { id: 'sub-admin-logs', label: 'Operator Logs', icon: History, path: '/admin-dashboard/sub-admin-logs' },
    { id: 'users', label: t('users'), icon: Users, path: '/admin-dashboard/users', badge: pendingKYCCount > 0 ? pendingKYCCount : null },
    { id: 'rates', label: t('rates'), icon: TrendingUp, path: '/admin-dashboard/rates' },
    { id: 'notifications', label: t('notifications'), icon: Bell, path: '/admin-dashboard/notifications' },
    { id: 'messages', label: t('messages'), icon: MessageSquare, path: '/admin-dashboard/messages' },
    { id: 'disputes', label: t('disputes'), icon: AlertTriangle, path: '/admin-dashboard/disputes', color: 'text-red-500' },
    { id: 'settings', label: t('settings'), icon: SettingsIcon, path: '/admin-dashboard/settings' },
  ];

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="lg:hidden h-16 bg-slate-900 border-b border-white/5 px-4 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-400"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <span className="font-display font-bold text-lg tracking-tight">Tuktak Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative text-slate-400" onClick={() => navigate('/admin-dashboard/notifications')}>
            <Bell className="w-5 h-5" />
            {pendingKYCCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
          </Button>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-red-500" onClick={() => navigate('/admin-dashboard/settings')}>
            {profile?.displayName?.[0] || 'A'}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay and Side Nav */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed lg:static inset-y-0 left-0 z-[60] w-72 bg-slate-900 border-r border-white/5 flex flex-col h-full"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                    <span className="font-display font-bold text-xl">T</span>
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight">{t('adminPortal')}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-400 hover:text-white lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group",
                        isActive 
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "group-hover:text-red-500", item.color)} />
                        <span className="font-bold text-sm tracking-tight">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {!item.badge && isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/5">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl h-12"
                  onClick={() => {
                    logout();
                    navigate('/overview');
                  }}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="font-bold">{t('logout')}</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative overflow-hidden bg-slate-950">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 items-center justify-between px-10 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
               <Menu className="w-5 h-5" />
            </Button>
            <div className="relative group w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <Input 
                placeholder={t('search_placeholder', 'Search everything...')} 
                className="pl-11 bg-white/5 border-white/10 h-11 rounded-2xl focus:ring-red-500/20 focus:border-red-500/50 transition-all" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('system_online', 'System Online')}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 w-11"
                onClick={() => navigate('/admin-dashboard/notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 w-11"
                onClick={() => navigate('/admin-dashboard/settings')}
              >
                <SettingsIcon className="w-5 h-5" />
              </Button>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-white leading-none mb-1">{profile?.displayName || 'Admin'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{t('superAdmin')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 p-[1px]">
                  <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center">
                    <span className="font-bold text-red-500">{profile?.displayName?.[0] || 'A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content with constrained width for readability */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
