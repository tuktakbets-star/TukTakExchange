import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { firebaseService, where } from '../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import AdminLoginModal from './AdminLoginModal';
import BackButton from './BackButton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Menu,
  Wallet as WalletIcon,
  Settings,
  Globe,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [logoClicks, setLogoClicks] = useState(0);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = firebaseService.subscribeToCollection('wallets', [where('uid', '==', profile.uid)], (data) => {
      setWallets(data);
    });
    return () => unsub();
  }, [profile?.uid]);

  const vndBalance = wallets.find(w => w.currency === 'VND')?.balance || 0;
  const usdBalance = wallets.find(w => w.currency === 'USD')?.balance || 0;

  useEffect(() => {
    const shown = sessionStorage.getItem('logo_animated');
    if (!shown) {
      setIsFirstLoad(true);
      sessionStorage.setItem('logo_animated', 'true');
    }
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Secret admin access logic
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        toast.success(t('accessing_admin'), { id: 'admin-hint' });
      }
      return next;
    });
  };

  useEffect(() => {
    if (logoClicks >= 5) {
      setLogoClicks(0);
      setIsAdminModalOpen(true);
    }
    const timer = setTimeout(() => setLogoClicks(0), 3000);
    return () => clearTimeout(timer);
  }, [logoClicks]);

  return (
    <>
      <nav className="h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50 px-3 sm:px-4 lg:px-8 flex items-center justify-between flex-nowrap gap-2">
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          <BackButton />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="lg:hidden text-slate-400 hover:text-white h-8 w-8 sm:h-9 sm:w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Link to="/" onClick={handleLogoClick} className="cursor-pointer select-none shrink-0">
            <motion.div 
              initial={isFirstLoad ? { opacity: 0 } : { opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: isFirstLoad ? 2.5 : 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20 overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet text-white"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>';
                  }}
                />
              </div>
              <span className="font-display font-bold text-sm sm:text-lg tracking-tight whitespace-nowrap hidden xs:block">
                Tuktak<span className="text-brand-blue">Exchange</span>
              </span>
            </motion.div>
          </Link>
        </div>

        {/* Multi-currency Balance Display (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-3 md:gap-6 px-3 md:px-6 py-1.5 bg-white/5 border border-white/10 rounded-full shrink min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">VND</span>
            <span className="text-xs md:text-sm font-display font-bold">₫{vndBalance.toLocaleString()}</span>
          </div>
          <div className="w-px h-3 md:h-4 bg-white/10 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">USD</span>
            <span className="text-xs md:text-sm font-display font-bold">${usdBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Mobile Balance Display */}
        <div className="flex sm:hidden items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-full">
          <span className="text-[10px] font-display font-bold">₫{vndBalance.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
          <div className="hidden xl:flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1.5 w-48 xl:w-64">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder={t('search')}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 sm:h-10 sm:w-10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white z-[60]">
              <DropdownMenuItem onClick={() => changeLanguage('en')} className="cursor-pointer focus:bg-white/5">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('bn')} className="cursor-pointer focus:bg-white/5">বাংলা (Bengali)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('hi')} className="cursor-pointer focus:bg-white/5">हिन्दी (Hindi)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ne')} className="cursor-pointer focus:bg-white/5">नेपाली (Nepali)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('ur')} className="cursor-pointer focus:bg-white/5">اردو (Urdu)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/messages" className="hidden xs:block">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 sm:h-10 sm:w-10">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>

          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 sm:h-10 sm:w-10 relative">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full border border-slate-950" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 sm:gap-2 p-0.5 sm:p-1 rounded-full hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-white/10">
                <AvatarImage src={profile?.photoURL} alt={profile?.displayName} />
                <AvatarFallback className="bg-brand-blue/20 text-brand-blue text-[10px] sm:text-xs">
                  {profile?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-900 border-slate-800 text-slate-200" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{profile?.displayName}</p>
                    <p className="text-xs leading-none text-slate-400 truncate">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem render={<Link to="/profile" />} className="focus:bg-white/5 focus:text-white cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/settings" />} className="focus:bg-white/5 focus:text-white cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem 
                className="focus:bg-red-500/10 focus:text-red-500 cursor-pointer text-red-400"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <AdminLoginModal 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
      />
    </>
  );
}
