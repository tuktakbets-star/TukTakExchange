import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Wallet, 
  Send, 
  ArrowUpRight, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  MessageSquare,
  Bell,
  Heart,
  ArrowDownLeft,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    totalBalance: 0,
    pendingDeposits: 0,
    pendingSends: 0,
    pendingWithdraws: 0,
    pendingRecharges: 0,
    donations: 0,
    disputes: 0,
    messages: 0,
    notifications: 0,
    rates: [] as any[]
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => {
      setStats(prev => ({ ...prev, users: data.length }));
    });

    const unsubWallets = firebaseService.subscribeToCollection('wallets', [], (data) => {
      const total = data.reduce((acc, curr) => {
        const amount = curr.currency === 'VND' ? curr.balance : curr.balance * 25000;
        return acc + amount;
      }, 0);
      setStats(prev => ({ ...prev, totalBalance: total }));
    });

    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      const pendingD = data.filter(tx => tx.type === 'deposit' && tx.status === 'pending').length;
      const pendingS = data.filter(tx => tx.type === 'send' && tx.status === 'pending').length;
      const pendingW = data.filter(tx => tx.type === 'withdraw' && tx.status === 'pending').length;
      const pendingR = data.filter(tx => tx.type === 'recharge' && tx.status === 'pending').length;
      const disputes = data.filter(tx => tx.status === 'disputed').length;
      const donations = data.filter(tx => tx.type === 'donation').reduce((acc, curr) => acc + curr.amount, 0);
      
      setStats(prev => ({ 
        ...prev, 
        pendingDeposits: pendingD,
        pendingSends: pendingS,
        pendingWithdraws: pendingW,
        pendingRecharges: pendingR,
        disputes,
        donations
      }));
      setRecentActivity(data.slice(0, 8));
    });

    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      setStats(prev => ({ ...prev, rates: data }));
    });

    const unsubMessages = firebaseService.subscribeToCollection('chats', [], (data) => {
      setStats(prev => ({ ...prev, messages: data.length }));
    });

    const unsubNotifications = firebaseService.subscribeToCollection('notifications', [], (data) => {
      setStats(prev => ({ ...prev, notifications: data.length }));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubWallets();
      unsubTX();
      unsubRates();
      unsubMessages();
      unsubNotifications();
    };
  }, []);

  const statCards = [
    { label: t('totalUsers'), value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', path: '/admin/users' },
    { label: t('totalBalance'), value: `₫${stats.totalBalance.toLocaleString()}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', path: '/admin/users' },
    { label: t('pendingDeposits'), value: stats.pendingDeposits, icon: ArrowDownLeft, color: 'text-yellow-500', bg: 'bg-yellow-500/10', path: '/admin/deposits' },
    { label: t('pendingSends'), value: stats.pendingSends, icon: Send, color: 'text-purple-500', bg: 'bg-purple-500/10', path: '/admin/send-money' },
    { label: t('pendingWithdraws'), value: stats.pendingWithdraws, icon: ArrowUpRight, color: 'text-orange-500', bg: 'bg-orange-500/10', path: '/admin/withdraw' },
    { label: t('pendingRecharges'), value: stats.pendingRecharges, icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/10', path: '/admin/recharge' },
    { label: t('totalDonations'), value: `₫${stats.donations.toLocaleString()}`, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10', path: '/admin' },
    { label: t('reports_disputes'), value: stats.disputes, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', path: '/admin/disputes' },
    { label: t('messages'), value: stats.messages, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10', path: '/admin/messages' },
    { label: t('notifications'), value: stats.notifications, icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/admin/notifications' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('systemOverview')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-xs font-bold uppercase tracking-wider">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {t('systemLive')}
          </div>
          <Button variant="confirm" className="rounded-xl">
            {t('download_report')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(card.path)}
            className="cursor-pointer group"
          >
            <Card className="glass-dark border-white/5 rounded-[2rem] hover:border-white/10 transition-all duration-300 group-hover:-translate-y-1">
              <CardContent className="p-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", card.bg)}>
                  <card.icon className={cn("w-6 h-6", card.color)} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-2xl font-display font-bold truncate">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-dark border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-display font-bold">{t('recentActivity')}</h3>
            <Button variant="ghost" className="text-slate-400 hover:text-white">{t('viewAll')}</Button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((tx, idx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12",
                    tx.status === 'completed' ? "bg-green-500/10 text-green-500" : 
                    tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-6 h-6" /> : 
                     tx.type === 'withdraw' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold">{t('transaction_id', { id: tx.id.slice(-6).toUpperCase() })}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">{t(tx.type)} • {t(tx.status)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-lg">{tx.amount.toLocaleString()} {tx.currency}</p>
                  <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-dark border-white/5 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-display font-bold mb-8">{t('rates')}</h3>
          <div className="space-y-6">
            {stats.rates.map((rate, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-600/10 rounded-xl flex items-center justify-center font-bold text-red-500 text-xs">VND</div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center font-bold text-purple-500 text-xs">{rate.target}</div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-lg">{rate.rate}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('updatedToday')}</p>
                </div>
              </div>
            ))}
            <Button 
              variant="next"
              className="w-full h-14 rounded-2xl font-bold"
              onClick={() => navigate('/admin/rates')}
            >
              {t('manageRates')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
