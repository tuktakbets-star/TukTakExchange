import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { profile, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, path: '/admin-dashboard' },
    { id: 'deposits', label: t('deposits'), icon: Wallet, path: '/admin-dashboard/deposits' },
    { id: 'send-money', label: t('sendMoney'), icon: Send, path: '/admin-dashboard/send-money' },
    { id: 'exchange', label: 'Exchanges', icon: RefreshCw, path: '/admin-dashboard/exchange' },
    { id: 'withdraw', label: t('withdraw'), icon: ArrowUpRight, path: '/admin-dashboard/withdraw' },
    { id: 'recharge', label: t('recharge'), icon: Zap, path: '/admin-dashboard/recharge' },
    { id: 'users', label: t('users'), icon: Users, path: '/admin-dashboard/users' },
    { id: 'rates', label: t('rates'), icon: TrendingUp, path: '/admin-dashboard/rates' },
    { id: 'notifications', label: t('notifications'), icon: Bell, path: '/admin-dashboard/notifications' },
    { id: 'messages', label: t('messages'), icon: MessageSquare, path: '/admin-dashboard/messages' },
    { id: 'disputes', label: t('disputes'), icon: AlertTriangle, path: '/admin-dashboard/disputes', color: 'text-red-500' },
    { id: 'settings', label: t('settings'), icon: SettingsIcon, path: '/admin-dashboard/settings' },
  ];

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Access Denied</div>;
  }

  // Double Security: Force re-authentication for every new browser session
  if (sessionStorage.getItem('mgmt_verified') !== 'true') {
    return <Navigate to="/secure-admin-login-987" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ease-in-out lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-20"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className={cn("flex items-center gap-3 transition-opacity duration-300", !isSidebarOpen && "lg:opacity-0")}>
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                <span className="font-display font-bold text-xl">T</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight">{t('adminPortal')}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5 lg:hidden" /> : <Menu className="w-5 h-5" />}
              <span className="hidden lg:block">
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </span>
            </Button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin/');
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", item.color)} />
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5 bg-slate-900/50">
            <div className={cn("flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-4 transition-all", !isSidebarOpen && "justify-center p-2")}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600/20 to-orange-600/20 flex items-center justify-center text-red-500 font-bold shrink-0">
                {profile?.displayName?.charAt(0)}
              </div>
              {isSidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{profile?.displayName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('systemAdmin')}</p>
                </div>
              )}
            </div>
            <Button 
              variant="cancel" 
              className={cn(
                "w-full justify-start text-white rounded-2xl transition-colors",
                !isSidebarOpen && "justify-center px-0"
              )}
              onClick={logout}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="ml-3 font-bold">{t('logout')}</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="hover:text-white cursor-pointer" onClick={() => navigate('/admin-dashboard')}>Admin</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white font-medium capitalize">
                {location.pathname.split('/').pop() || 'Dashboard'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <Input 
                placeholder={t('search')} 
                className="pl-11 bg-white/5 border-white/10 w-80 h-11 rounded-2xl focus:ring-red-500/20 focus:border-red-500 transition-all" 
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 w-11">
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
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
