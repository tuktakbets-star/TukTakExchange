import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Send, RefreshCw, User, Settings, Globe, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BottomNav() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/wallet', icon: Wallet, label: t('wallet') },
    { to: '/send', icon: Send, label: t('sendMoney') },
    { to: '/messages', icon: MessageSquare, label: t('messages') },
    { to: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-2 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-1 min-w-[56px] transition-colors
              ${isActive ? 'text-brand-blue' : 'text-slate-500'}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium truncate max-w-[60px]">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
