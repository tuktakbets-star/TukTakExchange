import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BadgeDollarSign, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  ChevronDown,
  Lock,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowRightLeft,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const [showRoleModal, setShowRoleModal] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    
    if (now - lastClickTime > 2000) {
      setLogoClicks(1);
    } else {
      const newCount = logoClicks + 1;
      if (newCount >= 5) {
        setLogoClicks(0);
        e.preventDefault();
        setShowRoleModal(true);
        return;
      } else {
        setLogoClicks(newCount);
      }
    }
    setLastClickTime(now);
  };

  const notifications = [
    t('activity_1'),
    t('activity_2'),
    t('activity_3'),
    t('activity_4'),
    t('activity_5')
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationIndex((prev) => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)' },
    { code: 'ne', name: 'नेपाली (Nepali)' },
    { code: 'ur', name: 'اردو (Urdu)' },
    { code: 'vi', name: 'Tiếng Việt (Vietnamese)' }
  ];

  const handleGetStarted = () => {
    navigate('/auth?mode=register');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 overflow-x-hidden pt-[4rem]">
      {/* Background Animation */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-dark border-b border-white/5 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center transform transition duration-500 group-hover:rotate-12 group-hover:scale-110">
                <BadgeDollarSign className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-display font-black tracking-tighter text-white leading-none">
                Tuktak<span className="text-blue-500">Exchange</span>
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                Fast & Secure
              </span>
            </div>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden lg:flex items-center gap-8 mx-auto">
            <Link to="/" className="text-sm font-bold text-blue-400">{t('overview')}</Link>
            <Link to="/about" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">{t('about')}</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Lang Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 items-center gap-1 sm:gap-2 rounded-lg bg-transparent px-2 sm:px-3 text-slate-400 hover:text-white hover:bg-white/5 transition-colors online-none focus:ring-0">
                <Globe className="w-4 h-4" />
                <span className="uppercase text-[10px] font-bold">{i18n.language}</span>
                <ChevronDown className="w-3 h-3 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-white/10 text-white max-h-[300px] overflow-y-auto w-[200px]">
                {languages.map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={cn(
                      "cursor-pointer",
                      i18n.language === lang.code && "bg-blue-600/20 text-blue-400"
                    )}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="blue" size="sm" className="font-bold sm:px-6 h-9 sm:h-10">
                  {t('login')}
                </Button>
              </Link>
              <div onClick={handleGetStarted} className="cursor-pointer">
                <Button variant="confirm" size="sm" className="hidden sm:flex font-bold px-6 h-10">
                  {t('getStarted')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-[3.5rem]">
        {/* Hero Section */}
        <section className="pt-8 pb-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest leading-none">
                {t('hero_trust_badge')}
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-display font-black leading-[1.1] mb-6 px-2"
            >
              {t('hero_title_1')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500">
                {t('hero_title_2')}
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-6 leading-relaxed font-medium px-4"
            >
              {t('hero_subtitle_landing')}
            </motion.p>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-[13px] sm:text-[15px] font-medium text-amber-400/90 bg-amber-400/5 border border-amber-400/10 rounded-xl px-4 py-2.5 mb-10 max-w-xl mx-auto leading-relaxed"
            >
              <ShieldCheck className="w-4 h-4 inline-block mr-2 mb-0.5" />
              {t('trust_message')}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0"
            >
              <Link to="/auth" className="w-full sm:w-auto">
                <Button variant="blue" className="w-full h-14 sm:h-16 px-10 text-lg rounded-2xl font-bold group">
                  {t('login')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/live-rates" className="w-full sm:w-auto">
                <Button variant="dark" className="w-full h-14 sm:h-16 px-10 text-lg rounded-2xl font-bold backdrop-blur-xl transition-all border border-white/5 hover:border-white/20">
                  <ArrowRightLeft className="mr-2 w-5 h-5 text-blue-500" />
                  {t('live_rate_view')}
                </Button>
              </Link>
              <div onClick={handleGetStarted} className="w-full sm:w-auto cursor-pointer">
                <Button variant="confirm" className="w-full h-14 sm:h-16 px-10 text-lg rounded-2xl font-bold group">
                  {t('getStarted')}
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Live Activity Section */}
        <section className="py-8 bg-white/5 border-y border-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center h-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={notificationIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 text-sm sm:text-lg font-bold text-slate-200"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                {notifications[notificationIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-24 px-4 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: Lock,
                  title: t('feature_secure_title'),
                  desc: t('feature_secure_desc'),
                  color: "blue"
                },
                {
                  icon: Zap,
                  title: t('feature_fast_title'),
                  desc: t('feature_fast_desc'),
                  color: "purple"
                },
                {
                  icon: Globe,
                  title: t('feature_global_title'),
                  desc: t('feature_global_desc'),
                  color: "cyan"
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -10 }}
                  className="glass-dark p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
                    feature.color === 'blue' ? "bg-blue-600/20 text-blue-400" : 
                    feature.color === 'purple' ? "bg-purple-600/20 text-purple-400" : 
                    "bg-cyan-600/20 text-cyan-400"
                  )}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats/Trust Indicator */}
        <section className="pb-24 px-4">
          <div className="max-w-4xl mx-auto glass shadow-2xl rounded-[2.5rem] p-8 sm:p-12 text-center relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full" />
            <div className="grid sm:grid-cols-3 gap-8">
              <div>
                <h4 className="text-3xl sm:text-4xl font-black mb-2 text-blue-500">10,000+</h4>
                <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">{t('stats_customers')}</p>
              </div>
              <div className="sm:border-x border-white/10 px-4">
                <h4 className="text-3xl sm:text-4xl font-black mb-2 text-green-500">50+</h4>
                <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">{t('stats_agents')}</p>
              </div>
              <div>
                <h4 className="text-3xl sm:text-4xl font-black mb-2 text-purple-500">100%</h4>
                <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">{t('stats_secure')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass-dark border-t border-white/5 pt-20 pb-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8 mb-12">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BadgeDollarSign className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">
                Tuktak<span className="text-blue-500">Exchange</span>
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed pr-4">
              {t('footer_desc')}
            </p>
          </div>
          
          <div>
            <h5 className="font-bold mb-6">{t('important_links')}</h5>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">{t('about_us')}</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-white transition-colors">{t('contact')}</Link></li>
              <li><Link to="/faq" className="text-slate-400 hover:text-white transition-colors">{t('faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-6">{t('legal_info')}</h5>
            <ul className="space-y-4">
              <li><Link to="/terms" className="text-slate-400 hover:text-white transition-colors">{t('terms')}</Link></li>
              <li><Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">{t('privacy_policy')}</Link></li>
              <li><Link to="/cookies" className="text-slate-400 hover:text-white transition-colors">{t('cookie_policy')}</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h5 className="font-bold mb-4">{t('stay_connected')}</h5>
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/20 hover:border-blue-500/30 transition-all cursor-pointer group">
                  <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed italic">
              {t('honesty_motto')}
            </p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 Tuktak Exchange. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Fully Verified Hub
            </div>
          </div>
        </div>
      </footer>

      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRoleModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-display font-black tracking-tight">🔐 TukTak Secure Access</h2>
                <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Authorized Personnel Only</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => navigate('/secure-admin-login-987')}
                  className="group relative flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-blue-600/10 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">👑</span>
                  </div>
                  <span className="font-bold text-sm">Admin Panel</span>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform rounded-b-3xl" />
                </button>

                <button 
                  onClick={() => navigate('/operator/login')}
                  className="group relative flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-purple-600/10 hover:border-purple-500/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <span className="font-bold text-sm">Operator Panel</span>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform rounded-b-3xl" />
                </button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setShowRoleModal(false)}
                className="w-full text-slate-500 hover:text-white"
              >
                ← Back to Site
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
