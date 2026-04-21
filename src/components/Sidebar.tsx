import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Wallet, 
  Send, 
  RefreshCw, 
  User, 
  Settings, 
  ShieldCheck,
  X,
  TrendingUp,
  MessageSquare,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ className, isOpen, onClose }: SidebarProps) {
  const { profile, isAdmin } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
    { icon: Wallet, label: t('wallet'), path: '/wallet' },
    { icon: Send, label: t('sendMoney'), path: '/send' },
    { icon: TrendingUp, label: t('liveRates'), path: '/live-rates' },
    { icon: MessageSquare, label: t('messages'), path: '/messages' },
    { icon: Bell, label: t('notifications'), path: '/notifications' },
    { icon: User, label: t('profile'), path: '/profile' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  return (
    <aside className={cn(
      "fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-slate-950 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0",
      className
    )}>
      <div className="flex items-center justify-between p-6 lg:hidden">
        <span className="font-display font-bold text-lg tracking-tight">
          Tuktak<span className="text-brand-blue">Exchange</span>
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              isActive 
                ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
              "group-hover:text-brand-blue"
            )} />
            {item.label}
            
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/0 via-brand-blue/5 to-brand-blue/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-brand-blue/20 rounded-2xl p-4 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-blue/10 blur-2xl rounded-full group-hover:bg-brand-blue/20 transition-colors" />
          
          <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider mb-1 relative z-10">{t('kycStatus')}</p>
          <div className="flex items-center gap-2 relative z-10">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              profile?.kycStatus === 'verified' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : 
              profile?.kycStatus === 'pending' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            )} />
            <span className="text-sm font-medium capitalize">{profile?.kycStatus || t('none')}</span>
          </div>
          {profile?.kycStatus !== 'verified' && (
            <NavLink to="/profile" onClick={onClose} className="text-xs text-brand-blue hover:underline mt-2 block relative z-10">
              {t('completeVerification')} →
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  );
}
