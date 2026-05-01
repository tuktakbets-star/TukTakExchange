import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ClipboardList, 
  MessageSquare, 
  History, 
  Wallet, 
  UserCircle, 
  LogOut, 
  Menu, 
  X,
  BadgeDollarSign,
  ChevronRight,
  Bell,
  Search,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabaseService } from '@/lib/supabaseService';

export default function OperatorLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(3); // Demo badge
  const [operator, setOperator] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(['/operator/orders']);
  const location = useLocation();
  const navigate = useNavigate();
  const operatorSession = JSON.parse(sessionStorage.getItem('operator_session') || '{}');

  useEffect(() => {
    fetchOperatorData();
  }, []);

  const fetchOperatorData = async () => {
    if (!operatorSession.id) return;
    const { data } = await supabaseService.getDocument('sub_admins', operatorSession.id);
    if (data) {
      setOperator(data);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/operator/dashboard' },
    { icon: ClipboardList, label: 'Orders', path: '/operator/orders', subItems: [
      { label: 'Add Money', path: '/operator/orders/add-money' },
      { label: 'Cash In', path: '/operator/orders/cash-in' },
      { label: 'Exchange', path: '/operator/orders/exchange' },
      { label: 'Withdraw', path: '/operator/orders/withdraw' },
      { label: 'Recharge', path: '/operator/orders/recharge' },
    ]},
    { icon: MessageSquare, label: 'Messages', path: '/operator/messages', badge: unreadMessages },
    { icon: History, label: 'My History', path: '/operator/history' },
    { icon: Wallet, label: 'My Wallet', path: '/operator/wallet' },
    { icon: UserCircle, label: 'My Profile', path: '/operator/profile' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('operator_session');
    toast.success('Logged out successfully');
    navigate('/operator/login');
  };

  const isActive = (path: string) => {
    if (path === '/operator/dashboard') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const isExpanded = (path: string) => expandedItems.includes(path);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 bg-[#0d1117] border-r border-white/5 z-40">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <BadgeDollarSign className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-black tracking-tighter cursor-pointer" onClick={() => navigate('/operator/dashboard')}>
                Tuktak<span className="text-blue-500">Ex</span>
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Operator Panel
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const expanded = isExpanded(item.path);

            return (
              <div key={item.path}>
                <div
                  onClick={() => {
                    if (item.subItems) {
                      toggleExpand(item.path);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group cursor-pointer",
                    active 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full font-black">
                        {item.badge}
                      </span>
                    )}
                    {item.subItems && (
                      <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-90")} />
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {item.subItems && expanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 ml-4 space-y-1 overflow-hidden"
                    >
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={cn(
                            "block px-8 py-2.5 rounded-xl text-xs font-bold transition-all",
                            location.pathname === sub.path 
                              ? "text-blue-400 bg-blue-400/10" 
                              : "text-slate-500 hover:text-slate-200"
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 uppercase font-black text-blue-500 text-sm">
              {operator?.username?.[0] || 'OP'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">{operator?.full_name || operator?.username || 'Operator'}</span>
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full h-12 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all font-bold gap-3"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen">
        {/* Header - Desktop */}
        <header className="sticky top-0 z-30 h-20 bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5 px-8 hidden lg:flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search orders, users, phone..."
              className="w-full h-11 bg-white/5 border-white/10 pl-12 rounded-xl text-sm font-medium focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/10 transition-all group">
              <Bell className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0d1117]" />
            </button>
            <button className="relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/10 transition-all group">
              <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0d1117]" />
            </button>
            <div className="h-8 w-[1px] bg-white/5 mx-2" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">My Balance</p>
              <p className="text-lg font-black text-blue-500 leading-none">
                ৳{(operator?.wallet_balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        {/* Mobile Nav */}
        <header className="lg:hidden h-16 bg-[#0d1117] border-b border-white/5 px-4 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-slate-400" />
          </button>
          <span className="font-display font-black text-xl tracking-tighter" onClick={() => navigate('/operator/dashboard')}>
            Tuktak<span className="text-blue-500">Ex</span>
          </span>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-400" />
            <div className="w-8 h-8 rounded-full bg-slate-800" />
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-[#0d1117] z-[70] lg:hidden p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <span className="text-xl font-display font-black tracking-tighter">
                  Tuktak<span className="text-blue-500">Ex</span>
                </span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                  const active = isActive(item.path);
                  const expanded = isExpanded(item.path);
                  
                  return (
                    <div key={item.path}>
                      <div
                        onClick={() => {
                          if (item.subItems) {
                            toggleExpand(item.path);
                          } else {
                            navigate(item.path);
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between px-4 py-4 rounded-2xl transition-all",
                          active 
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" 
                            : "text-slate-400"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <item.icon className="w-5 h-5" />
                          <span className="font-bold">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && <span className="bg-red-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full">{item.badge}</span>}
                          {item.subItems && <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {item.subItems && expanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 ml-6 space-y-2 overflow-hidden"
                          >
                            {item.subItems.map((sub) => (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  "block px-6 py-3 rounded-xl text-sm font-bold",
                                  location.pathname === sub.path ? "text-blue-400 bg-blue-400/10" : "text-slate-500"
                                )}
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 uppercase font-black text-blue-500 text-sm">
                     {operator?.username?.[0] || 'OP'}
                   </div>
                   <div>
                     <p className="font-bold text-sm">{operator?.username || 'Operator'}</p>
                     <p className="text-xs text-green-500 font-bold">Online</p>
                   </div>
                </div>
                <Button onClick={handleLogout} variant="ghost" className="w-full text-red-400 font-bold">Logout</Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
